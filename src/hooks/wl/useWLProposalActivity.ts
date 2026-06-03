import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type WLProposalActivityEvent =
  | 'share_link_created'
  | 'share_link_revoked'
  | 'marked_sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'exported_pdf'
  | 'recipient_updated'
  | 'task_created'
  | 'client_portal_viewed'
  | 'client_portal_acknowledged'
  | 'submitted_to_fulfillment';

export interface WLProposalActivity {
  id: string;
  partner_id: string;
  proposal_id: string;
  share_id: string | null;
  event_type: WLProposalActivityEvent;
  actor_user_id: string | null;
  actor_label: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useWLProposalActivity(proposalId: string | undefined) {
  return useQuery({
    queryKey: ['wl-proposal-activity', proposalId],
    enabled: !!proposalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_proposal_activity')
        .select(
          'id, partner_id, proposal_id, share_id, event_type, actor_user_id, actor_label, metadata, created_at',
        )
        .eq('proposal_id', proposalId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WLProposalActivity[];
    },
  });
}

export function useWLProposalActivityMutations(proposalId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['wl-proposal-activity', proposalId] });
  };

  const logActivity = useMutation({
    mutationFn: async (params: {
      partner_id: string;
      event_type: WLProposalActivityEvent;
      share_id?: string | null;
      actor_label?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      if (!proposalId) throw new Error('Missing proposal');
      const { error } = await supabase
        .from('wl_partner_proposal_activity')
        .insert({
          partner_id: params.partner_id,
          proposal_id: proposalId,
          share_id: params.share_id ?? null,
          event_type: params.event_type,
          actor_user_id: user?.id ?? null,
          actor_label: params.actor_label ?? null,
          metadata: (params.metadata ?? {}) as never,
        });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    // Best-effort: do not toast errors — activity logging must never block UX
    onError: (e: Error) => {
      console.warn('Activity log insert failed:', e.message);
    },
  });

  return { logActivity };
}
