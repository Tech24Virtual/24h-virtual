// update-feedback-status — single mutation entry point for feedback queues.
// Enforces V1 role/transition matrix in ONE place. Never trusts client role.
//
// Body:
//   { table: 'feedback'|'wl_partner_feedback',
//     id: string,
//     action: 'triage'|'in_progress'|'resolve'|'close'|'assign'|'claim'
//             |'acknowledge_escalation',
//     assignee_id?: string|null,   // for 'assign'
//     internal_note?: string }     // required on triage/resolve/close
//
// V1 PERMISSIONS:
//   feedback (admin queue):
//     - All transitions: admin only.
//     - assign target must be a user with role='admin' (narrow list).
//   wl_partner_feedback (partner queue):
//     - All transitions: a white_label user whose partner_id matches the row.
//     - assign target must be the same partner user (V1: self only — no team table).
//   acknowledge_escalation: admin only; flips bridge open->acknowledged.
//   On resolve/close of a feedback row that has a bridge link, bridge auto-flips
//   to 'resolved'.
//   No status -> 'new'. No reopen in V1.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import {
  notifyFeedback,
  getAdminUserIds,
  getPartnerOwnerUserIds,
  shortTitle,
} from "../_shared/notifyFeedback.ts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ACTION_TO_STATUS: Record<string, string | null> = {
  triage: "triaged",
  in_progress: "in_progress",
  resolve: "resolved",
  close: "closed",
  assign: null,
  unassign: null,
  claim: null,
  acknowledge_escalation: null,
  link_handoff: null,
  unlink_handoff: null,
  post_message: null,
};

const HANDOFF_KINDS = new Set(["engineering","billing","ops_task","support_ticket","external"]);

const NOTE_REQUIRED = new Set(["triage", "resolve", "close"]);

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

    const table = body.table;
    const id = String(body.id ?? "");
    const action = String(body.action ?? "");
    const assigneeId = body.assignee_id === null ? null : (body.assignee_id ? String(body.assignee_id) : undefined);
    const internalNote = body.internal_note ? String(body.internal_note).slice(0, 2000).trim() : "";

    if (table !== "feedback" && table !== "wl_partner_feedback") return jsonResponse({ error: "Invalid table" }, 400);
    if (!id) return jsonResponse({ error: "Missing id" }, 400);
    if (!(action in ACTION_TO_STATUS)) return jsonResponse({ error: "Invalid action" }, 400);
    if (NOTE_REQUIRED.has(action) && !internalNote) {
      return jsonResponse({ error: "Internal note required" }, 400);
    }

    // Resolve caller identity
    const [{ data: roleRows }, { data: partnerRow }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id),
      admin.from("white_label_partners").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    const roles: string[] = (roleRows ?? []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin");
    const callerPartnerId = partnerRow?.id ?? null;

    // ---------- AUTHZ + load pre-row ----------
    let preRow: any = null;
    let isSubmitter = false;       // direct (24H) submitter
    let isWlEndClient = false;     // WL end-client (matches submitted_by_user_id)
    let isPartnerOwner = false;    // legacy: caller owns the partner row (kept for back-compat)
    let isPartnerMember = false;   // 2B-2: caller is an active member of the partner team
    let memberRole: "owner" | "manager" | "agent" | null = null;
    let canManagePartner = false;  // 2B-2: owner or manager
    if (table === "feedback") {
      const { data: row } = await admin.from("feedback")
        .select("id, user_id, title, description, type, status, assigned_to")
        .eq("id", id).maybeSingle();
      if (!row) return jsonResponse({ error: "Not found" }, 404);
      preRow = row;
      isSubmitter = row.user_id === user.id;
      if (!isAdmin && !(action === "post_message" && isSubmitter)) {
        return jsonResponse({ error: "Admins only" }, 403);
      }
    } else {
      // wl_partner_feedback
      const { data: row } = await admin.from("wl_partner_feedback")
        .select("id, partner_id, status, title, description, type, submitted_by_user_id, assigned_to")
        .eq("id", id).maybeSingle();
      if (!row) return jsonResponse({ error: "Not found" }, 404);
      preRow = row;
      isWlEndClient = row.submitted_by_user_id === user.id;

      // Resolve membership (active only) against wl_partner_members.
      const { data: memberRow } = await admin
        .from("wl_partner_members")
        .select("role")
        .eq("partner_id", row.partner_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      memberRole = (memberRow?.role as any) ?? null;
      isPartnerMember = !!memberRole;
      isPartnerOwner = memberRole === "owner";
      canManagePartner = memberRole === "owner" || memberRole === "manager";

      if (action === "post_message") {
        // Slice 5: admin is excluded from the WL partner-owned thread.
        if (isAdmin && !isPartnerMember && !isWlEndClient) {
          return jsonResponse({ error: "Admins are not participants in WL partner feedback threads" }, 403);
        }
        if (!isPartnerMember && !isWlEndClient) {
          return jsonResponse({ error: "Forbidden" }, 403);
        }
      } else if (action === "claim") {
        // Any active member may self-claim when unassigned.
        if (!isPartnerMember) return jsonResponse({ error: "Forbidden" }, 403);
      } else if (action === "assign" || action === "unassign") {
        // Only owner/manager may assign, reassign, or unassign.
        if (!canManagePartner) return jsonResponse({ error: "Owner or manager only" }, 403);
      } else {
        // triage / in_progress / resolve / close / link_handoff / unlink_handoff
        if (!canManagePartner) return jsonResponse({ error: "Owner or manager only" }, 403);
        if (action === "acknowledge_escalation") {
          return jsonResponse({ error: "Not allowed on partner table" }, 400);
        }
      }
    }

    // ---------- HANDOFFS (bookkeeping only; no status side-effects, no notifications) ----------
    if (action === "link_handoff" || action === "unlink_handoff") {
      const isWlTbl = table === "wl_partner_feedback";
      const tenantKind = isWlTbl ? "wl_partner" : "direct_24h";
      const partnerIdForRow: string | null = isWlTbl ? (preRow?.partner_id ?? null) : null;

      if (action === "link_handoff") {
        const kind = String(body.handoff_kind ?? "");
        const label = String(body.handoff_label ?? "").trim().slice(0, 200);
        const rawUrl = body.handoff_url == null ? null : String(body.handoff_url).trim();
        const url = rawUrl ? rawUrl.slice(0, 2000) : null;
        if (!HANDOFF_KINDS.has(kind)) return jsonResponse({ error: "Invalid handoff_kind" }, 400);
        if (!label) return jsonResponse({ error: "handoff_label required" }, 400);
        if (url && !/^https?:\/\//i.test(url)) return jsonResponse({ error: "handoff_url must be http(s)" }, 400);

        const { data: inserted, error: insErr } = await admin
          .from("feedback_handoffs")
          .insert({
            source_table: table,
            source_id: id,
            tenant_kind: tenantKind,
            wl_partner_id: partnerIdForRow,
            kind,
            label,
            url,
            created_by: user.id,
          })
          .select("*")
          .single();
        if (insErr) { console.error(insErr); return jsonResponse({ error: "Insert failed" }, 500); }
        return jsonResponse({ ok: true, handoff: inserted });
      }

      // unlink_handoff
      const handoffId = String(body.handoff_id ?? "");
      if (!handoffId) return jsonResponse({ error: "Missing handoff_id" }, 400);
      const { data: ho } = await admin
        .from("feedback_handoffs")
        .select("id, source_table, source_id, tenant_kind, wl_partner_id")
        .eq("id", handoffId)
        .maybeSingle();
      if (!ho) return jsonResponse({ error: "Handoff not found" }, 404);
      if (ho.source_table !== table || ho.source_id !== id) {
        return jsonResponse({ error: "Handoff does not belong to this row" }, 400);
      }
      if (isWlTbl && ho.wl_partner_id !== callerPartnerId) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const { error: delErr } = await admin.from("feedback_handoffs").delete().eq("id", handoffId);
      if (delErr) { console.error(delErr); return jsonResponse({ error: "Delete failed" }, 500); }
      return jsonResponse({ ok: true });
    }

    // ---------- POST MESSAGE (24H + WL partner-owned thread; append-only; no status side-effects) ----------
    if (action === "post_message") {
      const rawBody = String(body.body ?? "").trim();
      if (!rawBody) return jsonResponse({ error: "Message body required" }, 400);
      if (rawBody.length > 4000) return jsonResponse({ error: "Message too long" }, 400);
      const parentStatus = String(preRow.status ?? "");

      if (table === "feedback") {
        // ----- 24H queue (Slice 4) -----
        let authorKind: "admin" | "submitter";
        let visibleToSubmitter: boolean;
        if (isSubmitter && !isAdmin) {
          if (parentStatus === "closed") {
            return jsonResponse({ error: "This feedback is closed; you can no longer add messages." }, 409);
          }
          authorKind = "submitter";
          visibleToSubmitter = true;
        } else {
          authorKind = "admin";
          const requested = body.visible_to_submitter === true;
          visibleToSubmitter = parentStatus === "closed" ? false : requested;
        }

        const { data: inserted, error: insErr } = await admin
          .from("feedback_messages")
          .insert({
            feedback_id: id,
            author_user_id: user.id,
            author_kind: authorKind,
            body: rawBody,
            visible_to_submitter: visibleToSubmitter,
          })
          .select("*")
          .single();
        if (insErr) { console.error("feedback_messages insert failed", insErr); return jsonResponse({ error: "Insert failed" }, 500); }

        const st = shortTitle(preRow ?? {});
        const meta = {
          queue: "direct" as const,
          tenant_kind: "direct_24h" as const,
          wl_partner_id: null,
          feedback_id: id,
          brand: "24h" as const,
        };
        try {
          if (authorKind === "admin" && visibleToSubmitter && preRow.user_id) {
            await notifyFeedback(admin, {
              recipientUserIds: [preRow.user_id],
              event: "msg",
              discriminator: inserted.id,
              title: "New reply on your feedback",
              message: `24H replied to '${st}'.`,
              actionUrl: "/client-dashboard/feedback",
              meta,
            });
          } else if (authorKind === "submitter") {
            const adminIds = await getAdminUserIds(admin);
            await notifyFeedback(admin, {
              recipientUserIds: adminIds,
              event: "msg",
              discriminator: inserted.id,
              title: "New reply from submitter",
              message: `New message on '${st}'.`,
              actionUrl: "/admin/feedback",
              meta,
            });
          }
        } catch (e) { console.error("notify post_message failed", e); }
        return jsonResponse({ ok: true, message: inserted });
      }

      // ----- WL partner-owned thread (Slice 5) -----
      // Reply matrix:
      //   end-client posts: allowed unless status='closed' (409); always visible.
      //   partner owner posts: allowed always; on status='closed' force visible_to_submitter=false.
      let authorKind: "partner" | "submitter";
      let authorRole: "partner_owner" | "partner_manager" | "partner_agent" | "wl_end_client";
      let visibleToSubmitter: boolean;

      // Active partner team member takes precedence (defensive: a user who is both
      // a member and somehow also recorded as the end-client posts as the partner).
      if (isPartnerMember && memberRole) {
        authorKind = "partner";
        authorRole = ("partner_" + memberRole) as
          | "partner_owner" | "partner_manager" | "partner_agent";
        const requested = body.visible_to_submitter !== false; // default visible
        visibleToSubmitter = parentStatus === "closed" ? false : requested;
      } else if (isWlEndClient) {
        if (parentStatus === "closed") {
          return jsonResponse({ error: "This request is closed; you can no longer add messages." }, 409);
        }
        authorKind = "submitter";
        authorRole = "wl_end_client";
        visibleToSubmitter = true;
      } else {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const { data: inserted, error: insErr } = await admin
        .from("wl_partner_feedback_messages")
        .insert({
          feedback_id: id,
          partner_id: preRow.partner_id,
          author_user_id: user.id,
          author_kind: authorKind,
          author_role: authorRole,
          body: rawBody,
          visible_to_submitter: visibleToSubmitter,
        })
        .select("*")
        .single();
      if (insErr) { console.error("wl_partner_feedback_messages insert failed", insErr); return jsonResponse({ error: "Insert failed" }, 500); }

      const st = shortTitle(preRow ?? {});
      const wlMeta = {
        queue: "wl" as const,
        tenant_kind: "wl_partner" as const,
        wl_partner_id: preRow.partner_id as string,
        feedback_id: id,
        brand: "partner" as const,
      };
      try {
        if (authorKind === "partner" && visibleToSubmitter && preRow.submitted_by_user_id) {
          // Partner replied visibly → notify end-client.
          // No 24H/platform references in title or message.
          await notifyFeedback(admin, {
            recipientUserIds: [preRow.submitted_by_user_id],
            event: "msg",
            discriminator: inserted.id,
            title: "New reply on your request",
            message: `New message on '${st}'.`,
            actionUrl: null,
            meta: wlMeta,
          });
        } else if (authorKind === "submitter") {
          // End-client replied → notify partner owner(s).
          const ownerIds = await getPartnerOwnerUserIds(admin, preRow.partner_id);
          await notifyFeedback(admin, {
            recipientUserIds: ownerIds,
            event: "msg",
            discriminator: inserted.id,
            title: "New reply from client",
            message: `New message on '${st}'.`,
            actionUrl: "/white-label-dashboard/feedback",
            meta: wlMeta,
          });
        }
        // Internal-only partner notes (visible_to_submitter=false) fire no notifications.
      } catch (e) { console.error("notify wl post_message failed", e); }

      return jsonResponse({ ok: true, message: inserted });
    }


    // ---------- assign target validation ----------
    if (action === "assign") {
      if (assigneeId === undefined) return jsonResponse({ error: "Missing assignee_id" }, 400);
      if (assigneeId !== null) {
        if (table === "feedback") {
          // Must be an admin
          const { data: targetRoles } = await admin
            .from("user_roles").select("role").eq("user_id", assigneeId).eq("role", "admin");
          if (!targetRoles || targetRoles.length === 0) {
            return jsonResponse({ error: "Assignee must be admin" }, 400);
          }
        } else {
          // Phase 2B: assignee must be an active member of the same partner team.
          // Owner/manager already gated above; agents cannot reach this branch.
          const { data: targetMember } = await admin
            .from("wl_partner_members")
            .select("user_id")
            .eq("partner_id", preRow.partner_id)
            .eq("user_id", assigneeId)
            .eq("status", "active")
            .maybeSingle();
          if (!targetMember) {
            return jsonResponse({ error: "Assignee must be an active partner team member" }, 400);
          }
        }
      }
    }

    // ---------- ACKNOWLEDGE ESCALATION ----------
    if (action === "acknowledge_escalation") {
      // id refers to a feedback row that has a bridge entry
      const { data: bridge } = await admin
        .from("wl_partner_feedback_escalations")
        .select("id, status, partner_id")
        .eq("linked_feedback_id", id)
        .maybeSingle();
      if (!bridge) return jsonResponse({ error: "No bridge for this feedback row" }, 404);
      const wasOpen = bridge.status === "open";
      if (wasOpen) {
        await admin.from("wl_partner_feedback_escalations").update({ status: "acknowledged" }).eq("id", bridge.id);
      }
      // Optional accompanying note on the feedback row
      if (internalNote) await appendInternalNote(admin, "feedback", id, user, internalNote);

      if (wasOpen && bridge.partner_id) {
        try {
          const recipients = await getPartnerOwnerUserIds(admin, bridge.partner_id);
          const st = shortTitle(preRow ?? {});
          await notifyFeedback(admin, {
            recipientUserIds: recipients,
            event: "bridge_ack",
            title: "Platform reviewing escalation",
            message: `Your escalation '${st}' is now being reviewed.`,
            actionUrl: "/white-label-dashboard/feedback",
            meta: { queue: "wl", tenant_kind: "wl_partner", wl_partner_id: bridge.partner_id, feedback_id: id, brand: "partner" },
          });
        } catch (e) { console.error("notify bridge_ack failed", e); }
      }
      return jsonResponse({ ok: true });
    }

    // ---------- BUILD UPDATE ----------
    const targetStatus = ACTION_TO_STATUS[action];
    const patch: Record<string, unknown> = {};
    if (targetStatus) patch.status = targetStatus;
    if (action === "resolve" || action === "close") patch.resolved_at = new Date().toISOString();
    if (action === "claim") patch.assigned_to = user.id;
    if (action === "assign") patch.assigned_to = assigneeId;
    if (action === "unassign") patch.assigned_to = null;

    if (Object.keys(patch).length > 0) {
      const { error: updErr } = await admin.from(table).update(patch).eq("id", id);
      if (updErr) { console.error(updErr); return jsonResponse({ error: "Update failed" }, 500); }
    }

    if (internalNote) await appendInternalNote(admin, table, id, user, internalNote);

    // ---------- NOTIFICATIONS ----------
    const isWl = table === "wl_partner_feedback";
    const queue: "direct" | "wl" = isWl ? "wl" : "direct";
    const tenant_kind = isWl ? "wl_partner" : "direct_24h";
    const wl_partner_id: string | null = isWl ? (preRow?.partner_id ?? null) : null;
    const brand24h = "24h" as const;
    const brandPartner = "partner" as const;
    const st = shortTitle(preRow ?? {});

    // Status → resolved/closed → notify submitter
    if ((action === "resolve" || action === "close") && preRow) {
      const newStatus = action === "resolve" ? "resolved" : "closed";
      const submitterId = isWl ? preRow.submitted_by_user_id : preRow.user_id;
      if (submitterId && preRow.status !== newStatus) {
        try {
          if (isWl) {
            const label = newStatus === "resolved" ? "Resolved" : "Closed";
            await notifyFeedback(admin, {
              recipientUserIds: [submitterId],
              event: `status:${newStatus}`,
              title: "Request update",
              message: `Your request '${st}' is now ${label}.`,
              actionUrl: "/portal/feedback",
              meta: { queue, tenant_kind, wl_partner_id, feedback_id: id, brand: brandPartner },
            });
          } else {
            const label = newStatus === "resolved" ? "resolved" : "closed";
            await notifyFeedback(admin, {
              recipientUserIds: [submitterId],
              event: `status:${newStatus}`,
              title: `Feedback ${label}`,
              message: `Your feedback '${st}' is now ${label}.`,
              actionUrl: "/feedback",
              meta: { queue, tenant_kind, wl_partner_id, feedback_id: id, brand: brand24h },
            });
          }
        } catch (e) { console.error("notify status failed", e); }
      }
    }

    // Assignment change → notify assignee
    if ((action === "assign" || action === "claim")) {
      const newAssignee = action === "claim" ? user.id : assigneeId;
      if (newAssignee && newAssignee !== preRow?.assigned_to) {
        try {
          if (isWl) {
            await notifyFeedback(admin, {
              recipientUserIds: [newAssignee],
              event: `assignee:${newAssignee}`,
              title: "Request assigned to you",
              message: `You've claimed '${st}'.`,
              actionUrl: "/white-label-dashboard/feedback",
              meta: { queue, tenant_kind, wl_partner_id, feedback_id: id, brand: brandPartner },
            });
          } else {
            await notifyFeedback(admin, {
              recipientUserIds: [newAssignee],
              event: `assignee:${newAssignee}`,
              title: "Feedback assigned to you",
              message: `You've been assigned '${st}'.`,
              actionUrl: "/admin/feedback",
              meta: { queue, tenant_kind, wl_partner_id, feedback_id: id, brand: brand24h },
            });
          }
        } catch (e) { console.error("notify assignee failed", e); }
      }
    }

    // Auto-flip bridge to 'resolved' when linked feedback row resolves/closes
    if (table === "feedback" && (action === "resolve" || action === "close")) {
      const { data: bridge } = await admin
        .from("wl_partner_feedback_escalations")
        .select("id, status, wl_feedback_id, partner_id")
        .eq("linked_feedback_id", id)
        .maybeSingle();
      if (bridge && bridge.status !== "resolved") {
        await admin.from("wl_partner_feedback_escalations")
          .update({ status: "resolved" }).eq("id", bridge.id);
        if (bridge.partner_id) {
          try {
            const recipients = await getPartnerOwnerUserIds(admin, bridge.partner_id);
            await notifyFeedback(admin, {
              recipientUserIds: recipients,
              event: "bridge_resolved",
              title: "Platform resolved escalation",
              message: `Your escalation '${st}' has been resolved by the platform.`,
              actionUrl: "/white-label-dashboard/feedback",
              meta: { queue: "wl", tenant_kind: "wl_partner", wl_partner_id: bridge.partner_id, feedback_id: id, brand: brandPartner },
            });
          } catch (e) { console.error("notify bridge_resolved failed", e); }
        }
      }
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("update-feedback-status error", e);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

async function appendInternalNote(
  admin: ReturnType<typeof createClient>,
  table: "feedback" | "wl_partner_feedback",
  id: string,
  user: { id: string; email?: string | null },
  body: string,
) {
  const { data: existing } = await admin.from(table).select("internal_notes").eq("id", id).maybeSingle();
  const notes = Array.isArray((existing as any)?.internal_notes) ? (existing as any).internal_notes : [];
  notes.push({
    author_id: user.id,
    author_email: user.email ?? null,
    body,
    at: new Date().toISOString(),
  });
  await admin.from(table).update({ internal_notes: notes }).eq("id", id);
}
