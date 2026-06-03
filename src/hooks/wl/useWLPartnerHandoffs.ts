import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWLPartnerId } from './useWLPartnerId';
import { toast } from 'sonner';
import type { ChecklistItem } from '@/components/white-label/onboarding/WLHandoffChecklist';
import type { WLSubmissionStatus } from '@/lib/wl/fulfillmentStatus';

export type WLHandoffStatus =
  | 'pending'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'blocked';

export interface WLPartnerHandoff {
  id: string;
  partner_id: string;
  proposal_id: string;
  lead_id: string | null;
  status: WLHandoffStatus;
  submission_status: WLSubmissionStatus;
  completion_percent: number;
  submitted_at: string | null;
  last_resubmitted_at: string | null;
  current_intake_id: string | null;
  client_name_snapshot: string | null;
  client_email_snapshot: string | null;
  company_snapshot: string | null;
  accepted_scope_snapshot: string | null;
  accepted_amount_snapshot: number | null;
  currency_snapshot: string | null;
  handoff_notes: string | null;
  onboarding_owner: string | null;
  kickoff_due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  checklist_state: ChecklistItem[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  proposal?: {
    id: string;
    title: string;
    proposal_number: string;
    accepted_at: string | null;
    checklist_template?: string | null;
  } | null;
  lead?: { id: string; name: string; email: string } | null;
}

export function useWLPartnerHandoffs() {
  const { data: partnerId, isLoading } = useWLPartnerId();

  return useQuery({
    queryKey: ['wl-partner-handoffs', partnerId],
    enabled: !!partnerId && !isLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_onboarding_handoffs')
        .select(
          '*, proposal:wl_partner_proposals(id, title, proposal_number, accepted_at, checklist_template), lead:wl_partner_leads(id, name, email)',
        )
        .eq('partner_id', partnerId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WLPartnerHandoff[];
    },
  });
}

export function useWLPartnerHandoff(id: string | undefined) {
  return useQuery({
    queryKey: ['wl-partner-handoff', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_onboarding_handoffs')
        .select(
          '*, proposal:wl_partner_proposals(id, title, proposal_number, accepted_at, checklist_template), lead:wl_partner_leads(id, name, email)',
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as WLPartnerHandoff | null) ?? null;
    },
  });
}

export function useWLHandoffByProposal(proposalId: string | undefined) {
  return useQuery({
    queryKey: ['wl-handoff-by-proposal', proposalId],
    enabled: !!proposalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_onboarding_handoffs')
        .select('id, status')
        .eq('proposal_id', proposalId!)
        .maybeSingle();
      if (error) throw error;
      return (data as { id: string; status: WLHandoffStatus } | null) ?? null;
    },
  });
}

export interface WLHandoffUpdate {
  status?: WLHandoffStatus;
  handoff_notes?: string | null;
  kickoff_due_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  checklist_state?: ChecklistItem[];
}

export function useWLPartnerHandoffMutations() {
  const queryClient = useQueryClient();
  const { data: partnerId } = useWLPartnerId();

  const invalidate = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['wl-partner-handoffs', partnerId] });
    if (id) queryClient.invalidateQueries({ queryKey: ['wl-partner-handoff', id] });
  };

  const updateHandoff = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: WLHandoffUpdate }) => {
      const cleaned: Record<string, unknown> = {};
      if ('status' in updates) cleaned.status = updates.status;
      if ('handoff_notes' in updates)
        cleaned.handoff_notes = updates.handoff_notes?.toString().slice(0, 5000) || null;
      if ('kickoff_due_at' in updates) cleaned.kickoff_due_at = updates.kickoff_due_at;
      if ('started_at' in updates) cleaned.started_at = updates.started_at;
      if ('completed_at' in updates) cleaned.completed_at = updates.completed_at;
      if ('checklist_state' in updates) cleaned.checklist_state = updates.checklist_state;

      // Auto-stamp lifecycle timestamps when transitioning
      if (updates.status === 'in_progress' && !('started_at' in updates)) {
        cleaned.started_at = new Date().toISOString();
      }
      if (updates.status === 'completed' && !('completed_at' in updates)) {
        cleaned.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('wl_partner_onboarding_handoffs')
        .update(cleaned)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WLPartnerHandoff;
    },
    onSuccess: (data) => {
      invalidate(data.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { updateHandoff };
}
