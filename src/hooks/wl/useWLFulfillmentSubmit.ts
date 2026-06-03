import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubmitInput {
  handoffId: string;
  proposalId: string;
  partnerId: string;
}

/**
 * Calls the SECURITY DEFINER RPC submit_fulfillment_intake.
 * Server validates required-item completeness + owner check.
 */
export function useWLFulfillmentSubmit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ handoffId }: SubmitInput) => {
      const { data, error } = await supabase.rpc('submit_fulfillment_intake', {
        p_handoff_id: handoffId,
      });
      if (error) {
        if (error.message.includes('MISSING_REQUIRED_ITEMS')) {
          throw new Error('Some required intake items are not yet provided.');
        }
        throw error;
      }
      return data as string;
    },
    onSuccess: async (_intakeId, { handoffId, proposalId, partnerId }) => {
      queryClient.invalidateQueries({ queryKey: ['wl-partner-handoff', handoffId] });
      queryClient.invalidateQueries({ queryKey: ['wl-partner-handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['wl-handoff-requests', handoffId] });
      queryClient.invalidateQueries({ queryKey: ['wl-proposal-activity', proposalId] });
      toast.success('Submitted to fulfillment');

      // Best-effort activity log — must not block or throw
      try {
        const { data: userData } = await supabase.auth.getUser();
        await supabase.from('wl_partner_proposal_activity').insert({
          partner_id: partnerId,
          proposal_id: proposalId,
          event_type: 'submitted_to_fulfillment',
          actor_user_id: userData.user?.id ?? null,
          metadata: {} as never,
        });
      } catch (e) {
        console.warn('submitted_to_fulfillment activity insert failed:', e);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
