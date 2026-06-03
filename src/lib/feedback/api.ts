// Single client entry point for status + assignment + handoff mutations.
// Everything routes through the `update-feedback-status` edge function so the
// role/transition contract is enforced server-side in one place.

import { supabase } from '@/integrations/supabase/client';

export type FeedbackTable = 'feedback' | 'wl_partner_feedback';

export type FeedbackAction =
  | 'triage'
  | 'in_progress'
  | 'resolve'
  | 'close'
  | 'assign'
  | 'unassign'
  | 'claim'
  | 'acknowledge_escalation'
  | 'link_handoff'
  | 'unlink_handoff'
  | 'post_message';

export type HandoffKind = 'engineering' | 'billing' | 'ops_task' | 'support_ticket' | 'external';

export interface FeedbackHandoff {
  id: string;
  source_table: FeedbackTable;
  source_id: string;
  tenant_kind: 'direct_24h' | 'wl_partner';
  wl_partner_id: string | null;
  kind: HandoffKind;
  label: string;
  url: string | null;
  created_by: string;
  created_at: string;
}

export interface UpdateFeedbackPayload {
  table: FeedbackTable;
  id: string;
  action: FeedbackAction;
  assignee_id?: string | null;
  internal_note?: string;
  handoff_kind?: HandoffKind;
  handoff_label?: string;
  handoff_url?: string | null;
  handoff_id?: string;
  body?: string;
  visible_to_submitter?: boolean;
}

export async function updateFeedbackStatus(payload: UpdateFeedbackPayload) {
  const { data, error } = await supabase.functions.invoke('update-feedback-status', {
    body: payload,
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { ok: true; handoff?: FeedbackHandoff; message?: FeedbackMessage | WLPartnerFeedbackMessage };
}

// ----- Feedback messages (Slice 4; 24H queue only) -----

export interface FeedbackMessage {
  id: string;
  feedback_id: string;
  author_user_id: string;
  author_kind: 'admin' | 'submitter';
  body: string;
  visible_to_submitter: boolean;
  created_at: string;
}

export async function listFeedbackMessages(feedbackId: string): Promise<FeedbackMessage[]> {
  const { data, error } = await supabase
    .from('feedback_messages')
    .select('*')
    .eq('feedback_id', feedbackId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedbackMessage[];
}

export async function postFeedbackMessage(args: {
  feedbackId: string;
  body: string;
  visibleToSubmitter?: boolean;
}): Promise<FeedbackMessage> {
  const res = await updateFeedbackStatus({
    table: 'feedback',
    id: args.feedbackId,
    action: 'post_message',
    body: args.body,
    visible_to_submitter: !!args.visibleToSubmitter,
  });
  if (!res.message) throw new Error('No message returned');
  return res.message as FeedbackMessage;
}

// ----- WL partner-owned feedback messages (Slice 5) -----

export interface WLPartnerFeedbackMessage {
  id: string;
  feedback_id: string;
  partner_id: string;
  author_user_id: string;
  author_kind: 'partner' | 'submitter';
  author_role: 'partner_owner' | 'wl_end_client' | 'partner_internal';
  body: string;
  visible_to_submitter: boolean;
  created_at: string;
}

export async function listWLPartnerFeedbackMessages(feedbackId: string): Promise<WLPartnerFeedbackMessage[]> {
  const { data, error } = await supabase
    .from('wl_partner_feedback_messages' as any)
    .select('*')
    .eq('feedback_id', feedbackId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as WLPartnerFeedbackMessage[];
}

export async function postWLPartnerFeedbackMessage(args: {
  feedbackId: string;
  body: string;
  visibleToSubmitter?: boolean;
}): Promise<WLPartnerFeedbackMessage> {
  const res = await updateFeedbackStatus({
    table: 'wl_partner_feedback',
    id: args.feedbackId,
    action: 'post_message',
    body: args.body,
    visible_to_submitter: args.visibleToSubmitter !== false,
  });
  if (!res.message) throw new Error('No message returned');
  return res.message as unknown as WLPartnerFeedbackMessage;
}

export async function linkHandoff(args: {
  table: FeedbackTable;
  id: string;
  kind: HandoffKind;
  label: string;
  url?: string | null;
}): Promise<FeedbackHandoff> {
  const res = await updateFeedbackStatus({
    table: args.table,
    id: args.id,
    action: 'link_handoff',
    handoff_kind: args.kind,
    handoff_label: args.label,
    handoff_url: args.url ?? null,
  });
  if (!res.handoff) throw new Error('No handoff returned');
  return res.handoff;
}

export async function unlinkHandoff(args: {
  table: FeedbackTable;
  id: string;
  handoff_id: string;
}): Promise<void> {
  await updateFeedbackStatus({
    table: args.table,
    id: args.id,
    action: 'unlink_handoff',
    handoff_id: args.handoff_id,
  });
}

export async function listHandoffs(table: FeedbackTable, id: string): Promise<FeedbackHandoff[]> {
  const { data, error } = await supabase
    .from('feedback_handoffs')
    .select('*')
    .eq('source_table', table)
    .eq('source_id', id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedbackHandoff[];
}
