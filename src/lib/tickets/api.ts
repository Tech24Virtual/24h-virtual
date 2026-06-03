// Single client entry point for ticket mutations (T-0 skeleton).
//
// All ticket status, assignment, claim, forward, and message mutations route
// through the `update-ticket-status` edge function so the role/transition/tenant
// contract is enforced server-side in one place.
//
// SLICE T-0: types + invocation wrapper only. No call sites yet — pages still
// write directly to the tables. Migration of call sites happens in T-3 and T-4.

import { supabase } from '@/integrations/supabase/client';

export type TicketTable = 'support_tickets' | 'wl_client_tickets';

export type TicketAction =
  | 'open'
  | 'in_progress'
  | 'resolve'
  | 'close'
  | 'assign'
  | 'unassign'
  | 'claim'
  | 'forward_to_24h'
  | 'unlink_forward'
  | 'post_message';

// Tenancy lanes carried by support_tickets.tenant_kind (added in T-1).
export type TicketTenantKind = 'direct' | 'wl_forwarded';

// Author roles used on ticket_replies / wl_client_ticket_replies (added in T-1).
export type DirectTicketAuthorRole =
  | 'admin'
  | 'agent'
  | 'supervisor'
  | 'sales'
  | 'billing'
  | 'tech'
  | 'hr'
  | 'direct_client'
  | 'partner_forwarder'
  | 'system';

export type WLTicketAuthorRole =
  | 'partner_owner'
  | 'partner_manager'
  | 'partner_agent'
  | 'partner_internal'
  | 'wl_end_client';

// Forwarding rules locked at planning (tightening edit #3).
export const FORWARD_SUMMARY_MIN = 20;
export const FORWARD_SUMMARY_MAX = 2000;

export interface UpdateTicketPayload {
  table: TicketTable;
  id: string;
  action: TicketAction;
  // assign / unassign / claim
  assignee_id?: string | null;
  // post_message
  body?: string;
  internal_note?: boolean;
  // forward_to_24h (required when action='forward_to_24h')
  forward_summary?: string;
  target_work_queue?: string;
  // unlink_forward
  forward_id?: string;
}

export interface UpdateTicketResponse {
  ok: boolean;
  skeleton?: boolean;
  slice?: string;
  message?: string;
  echo?: Record<string, unknown>;
}

/**
 * Invokes the `update-ticket-status` edge function.
 *
 * T-0 NOTE: The edge function currently returns 501 (skeleton). Do not call
 * this from production code paths until T-3 (direct lane) and T-4 (WL lane)
 * land. Use this only in tests or scratch tooling for now.
 */
export async function updateTicketStatus(
  payload: UpdateTicketPayload,
): Promise<UpdateTicketResponse> {
  const { data, error } = await supabase.functions.invoke('update-ticket-status', {
    body: payload,
  });
  if (error) throw new Error(error.message);
  if ((data as UpdateTicketResponse | null)?.ok === false && !(data as UpdateTicketResponse).skeleton) {
    throw new Error((data as { error?: string })?.error ?? 'update-ticket-status failed');
  }
  return data as UpdateTicketResponse;
}
