// escalate-feedback — partner-initiated escalation bridge
// Strict server-side authorization. Default: partner-authored summary only,
// end-client identity excluded unless explicit opt-in.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { notifyFeedback, getAdminUserIds, shortTitle } from "../_shared/notifyFeedback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: userErr } = await anon.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    if (!body) return jsonResponse({ error: "Invalid JSON" }, 400);

    const wlFeedbackId = String(body.wl_feedback_id ?? "");
    const summary = String(body.partner_summary ?? "").trim();
    const includeIdentity = Boolean(body.include_end_client_identity);
    if (!wlFeedbackId || !summary) return jsonResponse({ error: "Missing fields" }, 400);
    if (summary.length > 8000) return jsonResponse({ error: "Summary too long" }, 400);

    // Verify caller is partner of record
    const { data: partner } = await admin
      .from("white_label_partners")
      .select("id, company_name, user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!partner) return jsonResponse({ error: "Not a partner" }, 403);

    // Load the WL feedback row & verify ownership
    const { data: wlRow, error: wlErr } = await admin
      .from("wl_partner_feedback")
      .select("*")
      .eq("id", wlFeedbackId)
      .single();
    if (wlErr || !wlRow) return jsonResponse({ error: "Not found" }, 404);
    if (wlRow.partner_id !== partner.id) return jsonResponse({ error: "Forbidden" }, 403);

    // Already escalated?
    const { data: existing } = await admin
      .from("wl_partner_feedback_escalations")
      .select("id")
      .eq("wl_feedback_id", wlFeedbackId)
      .maybeSingle();
    if (existing) return jsonResponse({ error: "Already escalated" }, 400);

    // Build sanitized direct-feedback row
    const sanitizedMeta: Record<string, unknown> = {
      partner_id: partner.id,
      partner_company: partner.company_name,
      original_wl_feedback_id: wlFeedbackId,
      original_type: wlRow.type,
      original_origin: wlRow.origin,
    };
    if (includeIdentity) {
      sanitizedMeta.end_client_name = wlRow.submitted_by_name;
      sanitizedMeta.end_client_email = wlRow.submitted_by_email;
    }

    const { data: directRow, error: dErr } = await admin.from("feedback").insert({
      user_id: user.id, // partner is the submitter on the direct side
      message: summary,
      type: wlRow.type,
      title: `[WL Escalation] ${wlRow.title ?? wlRow.description?.slice(0, 80)}`,
      description: summary,
      mode: "direct",
      status: "new",
      priority: wlRow.priority,
      source_dashboard: "wl_partner_escalation",
      role: "white_label",
      created_by_email: user.email,
      metadata: sanitizedMeta,
    }).select("id").single();
    if (dErr || !directRow) { console.error(dErr); return jsonResponse({ error: "Failed to create direct row" }, 500); }

    const { error: eErr } = await admin.from("wl_partner_feedback_escalations").insert({
      wl_feedback_id: wlFeedbackId,
      linked_feedback_id: directRow.id,
      partner_id: partner.id,
      escalated_by: user.id,
      partner_summary: summary,
      include_end_client_identity: includeIdentity,
      status: "open",
    });
    if (eErr) { console.error(eErr); return jsonResponse({ error: "Bridge insert failed" }, 500); }

    await admin.from("wl_partner_feedback").update({ status: "escalated" }).eq("id", wlFeedbackId);

    try {
      const recipients = await getAdminUserIds(admin);
      const st = shortTitle({ title: wlRow.title, description: wlRow.description, type: wlRow.type });
      await notifyFeedback(admin, {
        recipientUserIds: recipients,
        event: "escalated",
        title: "New escalation from partner",
        message: `Partner escalated '${st}' to 24H.`,
        actionUrl: "/admin/feedback",
        meta: { queue: "wl", tenant_kind: "wl_partner", wl_partner_id: partner.id, feedback_id: directRow.id, brand: "24h" },
      });
    } catch (e) { console.error("notify escalated failed", e); }

    return jsonResponse({ success: true, escalation_id: directRow.id });
  } catch (e) {
    console.error("escalate-feedback error", e);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
