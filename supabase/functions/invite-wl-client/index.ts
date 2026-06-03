import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("ANON_KEY_JWT") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_JWT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity from JWT
    const anon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await anon.auth.getUser();
    if (authError || !caller) return jsonResponse({ error: "Unauthorized" }, 401);

    // Admin client bypasses RLS for all writes
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller has white_label role
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "white_label")
      .maybeSingle();
    if (!roleRow) return jsonResponse({ error: "white_label role required" }, 403);

    // Parse and validate body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "Invalid JSON" }, 400);

    const { wl_client_id, email, partner_id } = body;
    if (!wl_client_id || !email || !partner_id) {
      return jsonResponse({ error: "Missing required fields: wl_client_id, email, partner_id" }, 400);
    }

    // Verify caller owns this partner account
    const { data: partnerRow } = await admin
      .from("white_label_partners")
      .select("id")
      .eq("id", partner_id)
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!partnerRow) return jsonResponse({ error: "Partner not found or access denied" }, 403);

    // Fetch client row and verify it belongs to this partner
    const { data: clientRow, error: clientErr } = await admin
      .from("white_label_clients")
      .select("id, email, user_id, client_portal_slug, partner_id")
      .eq("id", wl_client_id)
      .eq("partner_id", partner_id)
      .maybeSingle();
    if (clientErr || !clientRow) return jsonResponse({ error: "Client not found" }, 404);

    // Idempotency guard — already invited
    if (clientRow.user_id) {
      return jsonResponse({ error: "Client has already been invited", user_id: clientRow.user_id }, 409);
    }

    // Build redirect URL for the portal
    const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://app.24hvirtual.com";
    const redirectTo = `${siteUrl}/wl-portal/dashboard`;

    // Send Supabase magic-link invite
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          wl_client_id,
          partner_id,
          role: "wl_client",
        },
      },
    );
    if (inviteErr) {
      console.error("inviteUserByEmail error:", inviteErr);
      return jsonResponse({ error: inviteErr.message }, 400);
    }

    const newUserId = inviteData.user.id;

    // Update white_label_clients.user_id
    const { error: updateErr } = await admin
      .from("white_label_clients")
      .update({ user_id: newUserId })
      .eq("id", wl_client_id);
    if (updateErr) {
      console.error("white_label_clients update error:", updateErr);
      return jsonResponse({ error: "Invite sent but failed to link user to client record" }, 500);
    }

    // Insert wl_client role into user_roles
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "wl_client" });
    if (roleErr) {
      // Log but don't fail — the invite itself succeeded
      console.error("user_roles insert error:", roleErr);
    }

    return jsonResponse({ success: true, user_id: newUserId });
  } catch (err) {
    console.error("invite-wl-client fatal:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
