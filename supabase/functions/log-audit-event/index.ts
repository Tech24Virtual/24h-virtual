// Edge function: write a client-initiated audit log entry.
// Used for actions that originate in the browser (impersonation toggles,
// dashboard switches, admin tool launches) where there's no DB trigger.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ACTIONS = new Set([
  "impersonation.client_view.entered",
  "impersonation.client_view.exited",
  "impersonation.dashboard.switched",
  "impersonation.wl_portal.opened",
  "impersonation.wl_portal.exited",
  "admin.tool.launched",
  "qa.seed_state.invoked",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller via JWT against anon-key client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const actor = userData.user;

    const body = await req.json().catch(() => ({}));
    const { action, target_table, target_id, tenant_context, metadata } = body ?? {};

    if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert with the service role (only safe path to write to audit_log)
    const admin = createClient(supabaseUrl, serviceKey);
    const { error: insertErr } = await admin.from("audit_log").insert({
      actor_id: actor.id,
      actor_email: actor.email ?? null,
      action,
      target_table: typeof target_table === "string" ? target_table : null,
      target_id: typeof target_id === "string" ? target_id : null,
      tenant_context: tenant_context ?? null,
      metadata: metadata ?? {},
      ip_address: req.headers.get("x-forwarded-for") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    });

    if (insertErr) {
      console.error("audit_log insert failed", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("log-audit-event error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
