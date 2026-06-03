// update-ticket-status — single mutation entry point for tickets.
// Enforces role/transition matrix in ONE place. Never trusts client role.
//
// Three-lane model:
//   - direct       : 24H staff <-> direct client (support_tickets, tenant_kind='direct')
//   - wl_partner   : WL partner team <-> WL end-client (wl_client_tickets)
//   - wl_forwarded : 24H internal thread linked from a WL ticket
//                    (support_tickets, tenant_kind='wl_forwarded' + wl_ticket_forwards)
//
// Body:
//   { table: 'support_tickets'|'wl_client_tickets',
//     id: string (uuid),
//     action: TicketAction,
//     assignee_id?: string|null,   // assign
//     body?: string,               // post_message
//     is_internal?: boolean,       // post_message
//     forward_summary?: string,    // forward_to_24h; required, 20-2000 chars
//     target_work_queue?: string,  // forward_to_24h
//     forward_id?: string,         // unlink_forward
//   }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export const TICKET_ACTIONS = [
  "open",
  "in_progress",
  "resolve",
  "close",
  "assign",
  "unassign",
  "claim",
  "forward_to_24h",
  "unlink_forward",
  "post_message",
] as const;
export type TicketAction = (typeof TICKET_ACTIONS)[number];

const TICKET_TABLES = new Set(["support_tickets", "wl_client_tickets"]);

export const FORWARD_SUMMARY_MIN = 20;
export const FORWARD_SUMMARY_MAX = 2000;

// Internal staff roles (excludes client-facing roles like 'client', 'white_label', 'wl_client', etc.)
const STAFF_ROLES = new Set(["admin", "agent", "supervisor", "tech", "hr", "billing", "sales"]);

const ACTION_TO_STATUS: Record<string, string | null> = {
  open: "open",
  in_progress: "in_progress",
  resolve: "resolved",
  close: "closed",
  assign: null,
  unassign: null,
  claim: null,
  forward_to_24h: null,
  unlink_forward: null,
  post_message: null,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("ANON_KEY_JWT") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const anon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_JWT")
      || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Identity strictly from JWT — never trust IDs from request body.
    const userRes = await anon.auth.getUser();
    const userErr = userRes.error;
    const user = userRes.data?.user;
    if (userErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "Invalid JSON" }, 400);

    const table = body.table;
    const id = String(body.id ?? "");
    const action = String(body.action ?? "") as TicketAction;
    const assigneeId: string | null | undefined =
      body.assignee_id === null ? null
      : body.assignee_id ? String(body.assignee_id)
      : undefined;

    if (!TICKET_TABLES.has(table)) {
      return jsonResponse(
        { error: "Invalid table. Expected 'support_tickets' or 'wl_client_tickets'." },
        400,
      );
    }
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return jsonResponse({ error: "Invalid ticket id" }, 400);
    if (!TICKET_ACTIONS.includes(action)) {
      return jsonResponse({ error: `Invalid action. Allowed: ${TICKET_ACTIONS.join(", ")}` }, 400);
    }

    // Resolve caller roles via service-role client (never trust body)
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles: string[] = (roleRows ?? []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin");
    const isStaff = roles.some((r) => STAFF_ROLES.has(r));
    const isSupervisor = roles.includes("supervisor");
    const isWhiteLabel = roles.includes("white_label");
    const isClient = roles.includes("client");

    // ---------- LOAD TICKET ROW ----------
    let preRow: any = null;
    if (table === "support_tickets") {
      const { data: row } = await admin
        .from("support_tickets")
        .select("id, status, assigned_to, work_queue, tenant_kind, submitted_by, title, priority, partner_id, wl_client_id, resolved_at")
        .eq("id", id)
        .maybeSingle();
      if (!row) return jsonResponse({ error: "Not found" }, 404);
      preRow = row;
    } else {
      const { data: row } = await admin
        .from("wl_client_tickets")
        .select("id, status, assigned_to, partner_id, wl_client_id, subject, priority, is_escalated_to_24h, resolved_at")
        .eq("id", id)
        .maybeSingle();
      if (!row) return jsonResponse({ error: "Not found" }, 404);
      preRow = row;
    }

    // assigned_to is uuid on support_tickets, text on wl_client_tickets
    const isAssigned = String(preRow.assigned_to ?? "") === user.id;
    // ticket owner (submitter) only tracked on support_tickets
    const isOwner = table === "support_tickets" ? preRow.submitted_by === user.id : false;

    // ---------- AUTHZ per action ----------
    switch (action) {
      case "open":
        if (!isStaff) return jsonResponse({ error: "Staff role required" }, 403);
        break;

      case "in_progress":
        if (!isAdmin && !isAssigned)
          return jsonResponse({ error: "Assigned staff or admin required" }, 403);
        break;

      case "resolve":
        if (!isAdmin && !isAssigned)
          return jsonResponse({ error: "Assigned staff or admin required" }, 403);
        break;

      case "close":
        if (!isAdmin) return jsonResponse({ error: "Admin only" }, 403);
        break;

      case "assign":
        if (!isAdmin && !isSupervisor)
          return jsonResponse({ error: "Admin or supervisor required" }, 403);
        if (assigneeId === undefined) return jsonResponse({ error: "Missing assignee_id" }, 400);
        break;

      case "unassign":
        if (!isAdmin && !isSupervisor)
          return jsonResponse({ error: "Admin or supervisor required" }, 403);
        break;

      case "claim": {
        if (!isStaff) return jsonResponse({ error: "Staff role required" }, 403);
        if (!isAdmin && table === "support_tickets" && preRow.work_queue) {
          const staffRole = roles.find(r => STAFF_ROLES.has(r) && r !== "admin");
          if (staffRole && staffRole !== preRow.work_queue) {
            return jsonResponse({
              error: `Cannot claim ticket from queue '${preRow.work_queue}'`,
            }, 403);
          }
        }
        break;
      }

      case "forward_to_24h": {
        if (!isWhiteLabel) return jsonResponse({ error: "White label partner role required" }, 403);
        if (table !== "wl_client_tickets")
          return jsonResponse({ error: "forward_to_24h only applies to wl_client_tickets" }, 400);
        const summary = String(body.forward_summary ?? "").trim();
        if (summary.length < FORWARD_SUMMARY_MIN || summary.length > FORWARD_SUMMARY_MAX) {
          return jsonResponse(
            { error: `forward_summary must be ${FORWARD_SUMMARY_MIN}–${FORWARD_SUMMARY_MAX} characters` },
            400,
          );
        }
        break;
      }

      case "unlink_forward":
        if (!isAdmin) return jsonResponse({ error: "Admin only" }, 403);
        if (!body.forward_id) return jsonResponse({ error: "Missing forward_id" }, 400);
        break;

      case "post_message": {
        const canPostMessage = isAdmin || isAssigned || isOwner
          || (isClient && table === "support_tickets" && preRow.submitted_by === user.id)
          || (isWhiteLabel && table === "wl_client_tickets");
        if (!canPostMessage)
          return jsonResponse({ error: "Assigned staff, ticket owner, or admin required" }, 403);
        const msgBody = String(body.body ?? "").trim();
        if (!msgBody) return jsonResponse({ error: "Message body required" }, 400);
        if (msgBody.length > 4000)
          return jsonResponse({ error: "Message body too long (max 4000 chars)" }, 400);
        break;
      }
    }

    // ---------- ACTION: forward_to_24h ----------
    if (action === "forward_to_24h") {
      const summary = String(body.forward_summary ?? "").trim();
      const targetWorkQueue = body.target_work_queue ? String(body.target_work_queue) : null;

      if (preRow.is_escalated_to_24h) {
        return jsonResponse({ error: "Ticket is already forwarded to 24H" }, 409);
      }

      // a) INSERT into support_tickets with tenant_kind='wl_forwarded'
      const { data: newTicket, error: ticketErr } = await admin
        .from("support_tickets")
        .insert({
          title: `[WL Forwarded] ${preRow.subject ?? ""}`,
          description: summary,
          priority: preRow.priority ?? "medium",
          status: "open",
          source: "wl_forward",
          tenant_kind: "wl_forwarded",
          work_queue: targetWorkQueue,
          partner_id: preRow.partner_id,
          wl_client_id: preRow.wl_client_id,
          linked_wl_client_ticket_id: id,
          submitted_by: user.id,
          submitter_email: user.email ?? null,
        })
        .select("id, ticket_number")
        .single();
      if (ticketErr) {
        console.error("support_tickets insert failed", ticketErr);
        return jsonResponse({ error: "Failed to create forwarded ticket" }, 500);
      }

      // b) INSERT into wl_ticket_forwards linking both tickets
      const { data: fwdRow, error: fwdErr } = await admin
        .from("wl_ticket_forwards")
        .insert({
          wl_client_ticket_id: id,
          support_ticket_id: newTicket.id,
          partner_id: preRow.partner_id,
          forwarded_by: user.id,
          summary,
        })
        .select("id")
        .single();
      if (fwdErr) {
        console.error("wl_ticket_forwards insert failed", fwdErr);
        return jsonResponse({ error: "Failed to create forward link" }, 500);
      }

      // c+d+e) SET is_escalated_to_24h = true, mask_24h_from_client = true
      const { error: updateErr } = await admin
        .from("wl_client_tickets")
        .update({
          is_escalated_to_24h: true,
          mask_24h_from_client: true,
          linked_support_ticket_id: newTicket.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (updateErr) {
        console.error("wl_client_tickets update failed", updateErr);
        return jsonResponse({ error: "Failed to update ticket flags" }, 500);
      }

      await writeAuditLog(admin, user, action, table, id, {
        support_ticket_id: newTicket.id,
        forward_id: fwdRow.id,
        target_work_queue: targetWorkQueue,
      });

      return jsonResponse({
        ok: true,
        data: {
          forward_id: fwdRow.id,
          support_ticket_id: newTicket.id,
          support_ticket_number: newTicket.ticket_number,
        },
      });
    }

    // ---------- ACTION: unlink_forward ----------
    if (action === "unlink_forward") {
      const forwardId = String(body.forward_id);

      const { data: fwd } = await admin
        .from("wl_ticket_forwards")
        .select("id, wl_client_ticket_id, support_ticket_id")
        .eq("id", forwardId)
        .maybeSingle();
      if (!fwd) return jsonResponse({ error: "Forward link not found" }, 404);

      const { error: delErr } = await admin.from("wl_ticket_forwards").delete().eq("id", forwardId);
      if (delErr) { console.error(delErr); return jsonResponse({ error: "Delete failed" }, 500); }

      // Set is_escalated_to_24h = false on the WL ticket
      await admin
        .from("wl_client_tickets")
        .update({ is_escalated_to_24h: false, updated_at: new Date().toISOString() })
        .eq("id", fwd.wl_client_ticket_id);

      await writeAuditLog(admin, user, action, table, id, {
        forward_id: forwardId,
        support_ticket_id: fwd.support_ticket_id,
      });

      return jsonResponse({ ok: true });
    }

    // ---------- ACTION: post_message ----------
    if (action === "post_message") {
      const msgBody = String(body.body ?? "").trim();
      const isInternal = body.is_internal === true || body.internal_note === true;

      if (table === "support_tickets") {
        const { data: inserted, error: insErr } = await admin
          .from("ticket_replies")
          .insert({
            ticket_id: id,
            message: msgBody,
            author_id: user.id,
            author_name: user.email ?? null,
            is_internal: isInternal,
            author_role: roles[0] ?? null,
            visible_to_partner: !isInternal,
          })
          .select("*")
          .single();
        if (insErr) {
          console.error("ticket_replies insert failed", insErr);
          return jsonResponse({ error: "Insert failed" }, 500);
        }
        await writeAuditLog(admin, user, action, table, id, { reply_id: inserted.id, is_internal: isInternal });
        return jsonResponse({ ok: true, data: inserted });
      } else {
        // wl_client_tickets → wl_client_ticket_replies
        const authorType = isStaff ? "staff" : isWhiteLabel ? "partner" : "client";
        const { data: inserted, error: insErr } = await admin
          .from("wl_client_ticket_replies")
          .insert({
            ticket_id: id,
            message: msgBody,
            author_type: authorType,
            author_name: user.email ?? null,
            is_internal: isInternal,
            author_role: roles[0] ?? null,
          })
          .select("*")
          .single();
        if (insErr) {
          console.error("wl_client_ticket_replies insert failed", insErr);
          return jsonResponse({ error: "Insert failed" }, 500);
        }
        await writeAuditLog(admin, user, action, table, id, { reply_id: inserted.id, is_internal: isInternal });
        return jsonResponse({ ok: true, data: inserted });
      }
    }

    // ---------- BUILD STATUS / ASSIGNMENT UPDATE ----------
    const targetStatus = ACTION_TO_STATUS[action];
    const patch: Record<string, unknown> = {};
    if (targetStatus) patch.status = targetStatus;
    if (action === "resolve") patch.resolved_at = new Date().toISOString();
    if (action === "claim") patch.assigned_to = user.id;
    if (action === "assign") patch.assigned_to = assigneeId;
    if (action === "unassign") patch.assigned_to = null;
    patch.updated_at = new Date().toISOString();

    const { error: updErr } = await admin.from(table).update(patch).eq("id", id);
    if (updErr) { console.error(updErr); return jsonResponse({ error: "Update failed" }, 500); }

    const { data: updatedRow } = await admin.from(table).select("*").eq("id", id).maybeSingle();

    await writeAuditLog(admin, user, action, table, id, {
      from_status: preRow.status,
      to_status: targetStatus ?? undefined,
      ...(action === "assign" ? { assignee_id: assigneeId } : {}),
      ...(action === "claim" ? { claimed_by: user.id } : {}),
    });

    return jsonResponse({ ok: true, data: updatedRow });
  } catch (err) {
    console.error("update-ticket-status fatal:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

async function writeAuditLog(
  admin: ReturnType<typeof createClient>,
  user: { id: string; email?: string | null },
  action: string,
  targetTable: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await admin.from("audit_log").insert({
      actor_id: user.id,
      action,
      target_table: targetTable,
      target_id: targetId,
      metadata: {
        ...metadata,
        actor_email: user.email ?? null,
      },
    });
  } catch (e) {
    console.error("audit_log insert failed", e);
  }
}
