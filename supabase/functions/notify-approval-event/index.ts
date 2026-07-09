// Phase 34 — Approval notifications fan-out.
// Fired by:
//   1. AFTER INSERT trigger on approval_requests (event = "created")
//   2. Cron-driven RPC dispatch_approval_sla_breaches  (event = "sla_breach")
//
// Fans out:
//   - In-app rows in public.notifications for every admin user
//   - One transactional email to ADMIN_EMAIL via Resend (HTML + text)
// Idempotency comes from the SQL side: it stamps created_notified_at /
// sla_notified_at before invoking us, so we won't be called twice for the
// same (request, event).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = "hello@24hvirtual.com";
const SITE_BASE = "https://24hv.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  type: "approval_required" | "approval_sla_breach";
  request_id: string;
  deal_id: string;
  required_role: string;
  tier: number;
  reason: string | null;
  policy_name: string | null;
  scope: string;
  deal_type: string;
  stage: string;
  estimated_discount_pct: number | null;
  is_non_standard_term: boolean;
  is_exception: boolean;
  hours_pending?: number | null;
  sla_hours?: number | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const p: Payload = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const isBreach = p.type === "approval_sla_breach";
    const title = isBreach
      ? `Approval pending past SLA — ${p.deal_type}`
      : `Approval required — ${p.deal_type}`;

    const detailBits: string[] = [];
    if (p.estimated_discount_pct != null) detailBits.push(`discount ${p.estimated_discount_pct}%`);
    else detailBits.push("discount unknown");
    if (p.is_non_standard_term) detailBits.push("non-standard term");
    if (p.is_exception) detailBits.push("exception");
    if (p.policy_name) detailBits.push(`policy: ${p.policy_name}`);
    if (isBreach && p.hours_pending != null) detailBits.push(`pending ${p.hours_pending.toFixed(1)}h (SLA ${p.sla_hours ?? "?"}h)`);

    const message = `${p.scope} · stage ${p.stage} · ${detailBits.join(" · ")}. ${p.reason ?? ""}`.trim();
    const actionUrl = `${SITE_BASE}/admin/intelligence?tab=approvals`; // absolute — used in the email HTML below, which needs a real browser link
    const inAppActionUrl = "/admin/intelligence?tab=approvals"; // relative — client-side SPA nav (Link/navigate) only resolves relative paths

    // 1) Fan out in-app notifications to every admin
    const { data: admins, error: adminsErr } = await supabase
      .from("user_roles").select("user_id").eq("role", "admin");
    if (adminsErr) console.warn("[notify-approval-event] admins query:", adminsErr.message);

    const rows = (admins ?? []).map((a: any) => ({
      user_id: a.user_id,
      title,
      message,
      type: isBreach ? "warning" : "info",
      category: "approval",
      action_url: inAppActionUrl,
    }));
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("notifications").insert(rows);
      if (insErr) console.warn("[notify-approval-event] notifications insert:", insErr.message);
    }

    // 2) Transactional email to admin inbox
    if (RESEND_API_KEY) {
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;">
          <h2 style="color:#005FB4;margin:0 0 12px;">${title}</h2>
          <p style="font-size:14px;line-height:1.6;color:#444;">${message}</p>
          <p style="font-size:13px;color:#666;">Required role: <b>${p.required_role}</b> · Tier ${p.tier}</p>
          <p style="margin:24px 0;">
            <a href="${actionUrl}" style="background:#E74A3E;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Open Approvals</a>
          </p>
          <p style="font-size:12px;color:#888;">Phase 34 — Commercial Approvals &amp; Discount Governance</p>
        </div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "24H Virtual Approvals <approvals@24hvirtual.com>",
          to: [ADMIN_EMAIL],
          subject: title,
          html,
          text: `${title}\n\n${message}\n\nOpen: ${actionUrl}`,
        }),
      });
      if (!r.ok) {
        console.warn("[notify-approval-event] resend failed:", r.status, await r.text());
      }
    } else {
      console.warn("[notify-approval-event] RESEND_API_KEY not set — skipping email");
    }

    return new Response(JSON.stringify({ ok: true, in_app: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[notify-approval-event] error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
