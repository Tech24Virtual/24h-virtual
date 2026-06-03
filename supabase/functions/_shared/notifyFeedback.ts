// Shared feedback notification fan-out (Slice 2).
// All callers MUST pass a service-role admin client. notify_idempotent is
// granted only to service_role and enforces dedupe via partial unique index
// on (user_id, metadata->>'event_key').

export type FeedbackQueue = "direct" | "wl";
export type TenantKind = "direct_24h" | "wl_partner";
export type FeedbackBrand = "24h" | "partner";

export interface FeedbackEventMeta {
  queue: FeedbackQueue;
  tenant_kind: TenantKind;
  wl_partner_id: string | null;
  feedback_id: string;
  brand: FeedbackBrand;
}

export interface NotifyFeedbackInput {
  recipientUserIds: string[];
  event: string;             // e.g. "created", "status:resolved", "assignee:<id>"
  discriminator?: string;    // optional extra suffix; if present appended after event
  title: string;
  message: string;
  actionUrl?: string | null;
  type?: string;             // notif type
  category?: string;         // notif category
  meta: FeedbackEventMeta;
}

const WL_END_CLIENT_DENIED_EVENTS = [
  /^escalated$/,
  /^bridge_ack$/,
  /^bridge_resolved$/,
  /^assignee:/,
];

function endClientAllowed(event: string): boolean {
  // Only resolved/closed status events allowed for wl_client recipients.
  if (event.startsWith("status:")) {
    const s = event.slice("status:".length);
    return s === "resolved" || s === "closed";
  }
  // Slice 5: messages from partner (visible to submitter) are explicitly allowed
  // through to wl_client end-clients. Discriminator = message id.
  if (event.startsWith("msg:") || event === "msg") return true;
  if (WL_END_CLIENT_DENIED_EVENTS.some((re) => re.test(event))) return false;
  return false; // default-deny for any other event
}

export async function notifyFeedback(
  admin: any,
  input: NotifyFeedbackInput,
): Promise<void> {
  const recipients = Array.from(new Set(input.recipientUserIds.filter(Boolean)));
  if (recipients.length === 0) return;

  // Look up roles for recipients to apply WL end-client deny-list.
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", recipients);
  const rolesByUser = new Map<string, Set<string>>();
  for (const r of (roleRows ?? []) as Array<{ user_id: string; role: string }>) {
    if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, new Set());
    rolesByUser.get(r.user_id)!.add(r.role);
  }

  const eventTail = input.discriminator
    ? `${input.event}:${input.discriminator}`
    : input.event;
  const event_key = `fb:${input.meta.queue}:${input.meta.feedback_id}:${eventTail}`;

  const metadata = {
    event_key,
    queue: input.meta.queue,
    tenant_kind: input.meta.tenant_kind,
    wl_partner_id: input.meta.wl_partner_id,
    feedback_id: input.meta.feedback_id,
    brand: input.meta.brand,
  };

  for (const uid of recipients) {
    const userRoles = rolesByUser.get(uid) ?? new Set<string>();
    if (userRoles.has("wl_client") && !endClientAllowed(eventTail)) {
      continue; // deny-listed for end-clients
    }
    try {
      await admin.rpc("notify_idempotent", {
        p_user_id: uid,
        p_title: input.title,
        p_message: input.message,
        p_type: input.type ?? "info",
        p_category: input.category ?? "feedback",
        p_action_url: input.actionUrl ?? null,
        p_metadata: metadata,
      });
    } catch (e) {
      console.error("notifyFeedback rpc failed", { uid, event_key, e });
    }
  }
}

export async function getAdminUserIds(admin: any): Promise<string[]> {
  const { data } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  return (data ?? []).map((r: any) => r.user_id);
}

export async function getPartnerOwnerUserIds(admin: any, partnerId: string): Promise<string[]> {
  const { data } = await admin
    .from("white_label_partners")
    .select("user_id")
    .eq("id", partnerId);
  return (data ?? []).map((r: any) => r.user_id).filter(Boolean);
}

export function shortTitle(row: { title?: string | null; description?: string | null; type?: string | null }): string {
  const t = (row.title ?? "").trim();
  if (t) return t.slice(0, 80);
  const d = (row.description ?? "").trim();
  if (d) return d.slice(0, 80);
  return row.type ?? "feedback";
}
