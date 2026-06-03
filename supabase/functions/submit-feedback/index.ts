// submit-feedback — Unified Feedback Intake classifier
// Server-side classification — never trusts client for mode/origin/partner_id.
//
// Inputs (JSON body):
//   type: 'bug' | 'help' | 'idea' | 'feedback'
//   title?: string
//   description: string
//   priority?: 'low'|'normal'|'high'|'urgent'
//   page?: string
//   intent?: 'product' | 'support'   (only honored for wl_partner role)
//   portal_slug?: string             (set when caller is on /portal/:slug/*)
//   (attachment_url is REJECTED — upload UI not yet shipped; arbitrary URLs would let
//    a caller inject a link to any object path. Re-enable only with bucket+folder
//    server-side validation against caller's resolved partner/user scope.)
//   metadata?: Record<string, unknown>
//
// Output: { mode, queue, id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import {
  notifyFeedback,
  getAdminUserIds,
  getPartnerOwnerUserIds,
  shortTitle,
} from "../_shared/notifyFeedback.ts";

type Role =
  | "admin" | "supervisor" | "agent" | "sales" | "billing" | "tech" | "hr"
  | "client" | "affiliate" | "white_label" | "wl_client" | "referrer";

type SourceDashboard =
  | "admin" | "supervisor" | "agent" | "sales" | "billing" | "tech" | "hr"
  | "direct_client" | "affiliate" | "wl_partner_product" | "wl_partner_escalation"
  | "wl_partner" | "wl_end_client";

const TWENTY_FOUR_H_HOSTS = new Set(["lovable.app", "24hv.io", "www.24hv.io", "localhost", "127.0.0.1"]);
function is24HHost(host: string | null): boolean {
  if (!host) return true;
  if (TWENTY_FOUR_H_HOSTS.has(host)) return true;
  if (host.endsWith(".lovable.app")) return true;
  return false;
}

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
    if (!body || typeof body !== "object") return jsonResponse({ error: "Invalid JSON" }, 400);

    const description = String(body.description ?? "").trim();
    if (!description) return jsonResponse({ error: "description required" }, 400);
    if (description.length > 8000) return jsonResponse({ error: "description too long" }, 400);

    const type = String(body.type ?? "feedback");
    if (!["bug", "help", "idea", "feedback"].includes(type)) {
      return jsonResponse({ error: "invalid type" }, 400);
    }
    const priority = ["low", "normal", "high", "urgent"].includes(body.priority) ? body.priority : "normal";
    const title = body.title ? String(body.title).slice(0, 200) : null;
    const page = body.page ? String(body.page).slice(0, 500) : null;
    const intent = body.intent === "product" || body.intent === "support" ? body.intent : null;
    const portalSlug = body.portal_slug ? String(body.portal_slug) : null;
    // SECURITY: reject any client-supplied attachment_url until upload UI ships
    // with server-side bucket/folder/scope validation. Prevents arbitrary URL injection.
    if (body.attachment_url !== undefined && body.attachment_url !== null && body.attachment_url !== "") {
      return jsonResponse({ error: "attachments not yet supported" }, 400);
    }
    const attachmentUrl: string | null = null;
    const clientMetadata = (body.metadata && typeof body.metadata === "object") ? body.metadata : {};

    // Derive host (server-trusted, from request headers)
    let host: string | null = null;
    try {
      const origin = req.headers.get("origin") || req.headers.get("referer");
      if (origin) host = new URL(origin).hostname;
    } catch { /* noop */ }

    // Lookup roles (server-trusted)
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const roles: Role[] = (roleRows ?? []).map((r: any) => r.role);
    const has = (r: Role) => roles.includes(r);

    // Lookup partner of record for caller (if any)
    const { data: partnerRow } = await admin
      .from("white_label_partners")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const callerPartnerId = partnerRow?.id ?? null;

    // Resolve hostname → partner (server-trusted)
    let hostPartnerId: string | null = null;
    if (host && !is24HHost(host)) {
      const { data: branding } = await admin
        .from("white_label_branding")
        .select("partner_id")
        .eq("custom_domain", host)
        .maybeSingle();
      if (branding) {
        hostPartnerId = branding.partner_id;
      } else {
        const { data: alias } = await admin
          .from("white_label_domain_aliases")
          .select("partner_id")
          .eq("alias_hostname", host)
          .maybeSingle();
        if (alias) hostPartnerId = alias.partner_id;
      }
    }

    // Resolve portal slug → partner
    let slugPartnerId: string | null = null;
    if (portalSlug) {
      const { data: p } = await admin
        .from("white_label_partners")
        .select("id")
        .eq("partner_slug", portalSlug)
        .maybeSingle();
      slugPartnerId = p?.id ?? null;
    }

    const wlSurfacePartnerId = hostPartnerId ?? slugPartnerId;

    // Lookup wl_client membership (end client)
    let endClientPartnerId: string | null = null;
    if (has("wl_client")) {
      const { data: wlc } = await admin
        .from("white_label_clients")
        .select("partner_id")
        .eq("user_id", user.id)
        .maybeSingle();
      endClientPartnerId = (wlc as any)?.partner_id ?? null;
    }

    // ---------- Classification ----------
    const baseMeta = {
      ...clientMetadata,
      submitted_user_id: user.id,
      host: host ?? null,
      page,
      type,
    };

    // Branch A: WL end-client
    if (has("wl_client")) {
      // Partner_id must come from end-client record AND match host/slug if present
      if (!endClientPartnerId) return jsonResponse({ error: "End-client has no partner" }, 403);
      if (wlSurfacePartnerId && wlSurfacePartnerId !== endClientPartnerId) {
        return jsonResponse({ error: "Partner mismatch" }, 403);
      }
      const { data, error } = await admin.from("wl_partner_feedback").insert({
        partner_id: endClientPartnerId,
        origin: "end_client",
        submitted_by_type: "wl_end_client",
        submitted_by_user_id: user.id,
        submitted_by_email: user.email,
        type, title, description, priority,
        source_dashboard: "wl_end_client",
        page,
        attachment_url: attachmentUrl,
        metadata: baseMeta,
      }).select("id").single();
      if (error) { console.error(error); return jsonResponse({ error: "Insert failed" }, 500); }
      try {
        const recipients = await getPartnerOwnerUserIds(admin, endClientPartnerId);
        const st = shortTitle({ title, description, type });
        await notifyFeedback(admin, {
          recipientUserIds: recipients,
          event: "created",
          title: "New client request",
          message: `New request in your feedback queue: ${st}`,
          actionUrl: "/white-label-dashboard/feedback",
          meta: { queue: "wl", tenant_kind: "wl_partner", wl_partner_id: endClientPartnerId, feedback_id: data.id, brand: "partner" },
        });
      } catch (e) { console.error("notify wl created failed", e); }
      return jsonResponse({ mode: "wl_partner_mode", queue: "wl_partner_feedback", id: data.id });
    }

    // Branch B: WL partner
    if (has("white_label") && callerPartnerId) {
      // Partner host/slug must match caller's partner_id when present
      if (wlSurfacePartnerId && wlSurfacePartnerId !== callerPartnerId) {
        return jsonResponse({ error: "Partner mismatch" }, 403);
      }
      const partnerIntent = intent ?? "product";
      if (partnerIntent === "product") {
        const { data, error } = await admin.from("feedback").insert({
          user_id: user.id,
          message: description,
          type,
          page,
          title, description, priority,
          mode: "direct",
          status: "new",
          source_dashboard: "wl_partner_product",
          role: "white_label",
          attachment_url: attachmentUrl,
          created_by_email: user.email,
          metadata: { ...baseMeta, partner_id: callerPartnerId },
        }).select("id").single();
        if (error) { console.error(error); return jsonResponse({ error: "Insert failed" }, 500); }
        try {
          const recipients = await getAdminUserIds(admin);
          const st = shortTitle({ title, description, type });
          await notifyFeedback(admin, {
            recipientUserIds: recipients,
            event: "created",
            title: "New feedback submitted",
            message: `New direct feedback: ${st}`,
            actionUrl: "/admin/feedback",
            meta: { queue: "direct", tenant_kind: "direct_24h", wl_partner_id: null, feedback_id: data.id, brand: "24h" },
          });
        } catch (e) { console.error("notify direct created failed", e); }
        return jsonResponse({ mode: "direct_mode", queue: "feedback", id: data.id });
      }
      // partnerIntent === "support" → log into partner queue as partner_on_behalf
      const { data, error } = await admin.from("wl_partner_feedback").insert({
        partner_id: callerPartnerId,
        origin: "partner_on_behalf",
        submitted_by_type: "wl_partner",
        submitted_by_user_id: user.id,
        submitted_by_email: user.email,
        type, title, description, priority,
        source_dashboard: "wl_partner",
        page,
        attachment_url: attachmentUrl,
        metadata: baseMeta,
      }).select("id").single();
      if (error) { console.error(error); return jsonResponse({ error: "Insert failed" }, 500); }
      try {
        const recipients = await getPartnerOwnerUserIds(admin, callerPartnerId);
        const st = shortTitle({ title, description, type });
        await notifyFeedback(admin, {
          recipientUserIds: recipients,
          event: "created",
          title: "New client request",
          message: `New request in your feedback queue: ${st}`,
          actionUrl: "/white-label-dashboard/feedback",
          meta: { queue: "wl", tenant_kind: "wl_partner", wl_partner_id: callerPartnerId, feedback_id: data.id, brand: "partner" },
        });
      } catch (e) { console.error("notify wl created failed", e); }
      return jsonResponse({ mode: "wl_partner_mode", queue: "wl_partner_feedback", id: data.id });
    }

    // Branch D: mismatch — caller on partner surface but role doesn't match
    if (wlSurfacePartnerId) {
      return jsonResponse({ error: "Surface/role mismatch" }, 403);
    }

    // Branch C: 24H direct user (admin/staff/sales/billing/tech/hr/agent/affiliate/client/supervisor)
    let sourceDashboard: SourceDashboard = "direct_client";
    if (has("admin")) sourceDashboard = "admin";
    else if (has("supervisor")) sourceDashboard = "supervisor";
    else if (has("agent")) sourceDashboard = "agent";
    else if (has("sales")) sourceDashboard = "sales";
    else if (has("billing")) sourceDashboard = "billing";
    else if (has("tech")) sourceDashboard = "tech";
    else if (has("hr")) sourceDashboard = "hr";
    else if (has("affiliate")) sourceDashboard = "affiliate";
    else if (has("client")) sourceDashboard = "direct_client";

    const primaryRole = roles[0] ?? "client";

    const { data, error } = await admin.from("feedback").insert({
      user_id: user.id,
      message: description,
      type,
      page,
      title, description, priority,
      mode: "direct",
      status: "new",
      source_dashboard: sourceDashboard,
      role: primaryRole,
      attachment_url: attachmentUrl,
      created_by_email: user.email,
      metadata: baseMeta,
    }).select("id").single();
    if (error) { console.error(error); return jsonResponse({ error: "Insert failed" }, 500); }
    try {
      const recipients = await getAdminUserIds(admin);
      const st = shortTitle({ title, description, type });
      await notifyFeedback(admin, {
        recipientUserIds: recipients,
        event: "created",
        title: "New feedback submitted",
        message: `New direct feedback: ${st}`,
        actionUrl: "/admin/feedback",
        meta: { queue: "direct", tenant_kind: "direct_24h", wl_partner_id: null, feedback_id: data.id, brand: "24h" },
      });
    } catch (e) { console.error("notify direct created failed", e); }
    return jsonResponse({ mode: "direct_mode", queue: "feedback", id: data.id });
  } catch (e) {
    console.error("submit-feedback error", e);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
