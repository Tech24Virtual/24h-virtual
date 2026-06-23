import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin Portal",
  client: "Client Dashboard",
  sales: "Sales Portal",
  agent: "Agent Portal",
  supervisor: "Supervisor Portal",
  billing: "Billing Portal",
  tech: "Tech Support Portal",
  white_label: "White Label Portal",
  affiliate: "Affiliate Portal",
  referrer: "Referrer",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Validate caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller's JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { name, email, password, roles } = await req.json();

    if (!name || !email || !password || !roles || !Array.isArray(roles) || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, email, password, roles" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user (email_confirm = true so they can log in immediately)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Upsert profile so the row exists regardless of whether the trigger fired.
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: name }, { onConflict: "id" });

    // Link the new user to their lead record (matched by email) and backfill the
    // onboarding handoff that was seeded during lead conversion with client_user_id = null
    // (because the auth user doesn't exist at conversion time — it's created here).
    const { data: matchedLead } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (matchedLead) {
      // Stamp leads.user_id — idempotent, only if not already set
      await supabaseAdmin
        .from("leads")
        .update({ user_id: userId })
        .eq("id", matchedLead.id)
        .is("user_id", null);

      // Fix the onboarding handoff created during lead conversion with client_user_id = null
      await supabaseAdmin
        .from("client_onboarding_handoffs")
        .update({ client_user_id: userId })
        .eq("client_lead_id", matchedLead.id)
        .is("client_user_id", null);

      console.log(`Linked user ${userId} to lead ${matchedLead.id} and backfilled handoff`);
    }

    // Insert all selected roles directly — don't rely on the handle_new_user trigger.
    // upsert with ignoreDuplicates keeps this idempotent.
    if (roles.length > 0) {
      const { error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          roles.map((role: string) => ({ user_id: userId, role })),
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (rolesError) {
        console.error("Error inserting roles:", rolesError);
      }
    }

    // Auto-assign published required training modules to new agents
    if (roles.includes("agent")) {
      const { data: modules } = await supabaseAdmin
        .from("campaign_training_modules")
        .select("id")
        .eq("status", "published")
        .eq("required", true);

      if (modules && modules.length > 0) {
        await supabaseAdmin
          .from("campaign_training_assignments")
          .insert(
            modules.map((m: { id: string }) => ({
              module_id: m.id,
              agent_id: userId,
              trigger_type: "onboarding",
            }))
          );
        console.log(`Auto-assigned ${modules.length} training modules to agent ${userId}`);
      }
    }

    // Create welcome notification
    const portalList = roles.map((r: string) => ROLE_LABELS[r] || r).join(", ");
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Welcome to 24H Virtual",
      message: `Your account has been created. You have access to: ${portalList}.`,
      action_url: "/login",
    });

    // Send welcome email via Resend
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const loginUrl = "https://virtual-rep.lovable.app/login";
        const portalListHtml = roles
          .map((r: string) => `<li style="padding: 4px 0;">${ROLE_LABELS[r] || r}</li>`)
          .join("");

        await resend.emails.send({
          from: "24H Virtual <noreply@24hvirtual.com>",
          to: [email],
          subject: "Welcome to 24H Virtual — Your Account is Ready",
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Welcome to 24H Virtual</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi <strong>${name}</strong>,</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">Your account has been created by an administrator. You can log in using the credentials below.</p>
          
          <table width="100%" style="background-color:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 20px;">
              <p style="color:#6b7280;font-size:13px;margin:0 0 4px;">Email</p>
              <p style="color:#111827;font-size:15px;font-weight:600;margin:0;">${email}</p>
            </td></tr>
            <tr><td style="padding:12px 20px;border-top:1px solid #e5e7eb;">
              <p style="color:#6b7280;font-size:13px;margin:0 0 4px;">Temporary Password</p>
              <p style="color:#111827;font-size:15px;font-weight:600;margin:0;font-family:monospace;">${password}</p>
            </td></tr>
          </table>

          <p style="color:#374151;font-size:14px;margin:0 0 8px;font-weight:600;">Portal Access:</p>
          <ul style="color:#374151;font-size:14px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
            ${portalListHtml}
          </ul>

          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background-color:#1e40af;border-radius:8px;">
              <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Log In Now</a>
            </td></tr>
          </table>

          <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">Please change your password after your first login for security purposes.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">© 2024 24H Virtual. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
        console.log("Welcome email sent to", email);
      } catch (emailErr) {
        console.error("Failed to send welcome email:", emailErr);
        // Don't fail the invite if email fails
      }
    }

    return new Response(JSON.stringify({ userId, success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("invite-user error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
