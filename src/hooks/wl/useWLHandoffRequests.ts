import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WLHandoffRequest {
  id: string;
  partner_id: string;
  handoff_id: string;
  intake_id: string;
  request_type: 'missing_item' | 'missing_document' | 'clarification' | 'correction';
  title: string;
  message: string | null;
  target_item_key: string | null;
  status: 'open' | 'resolved' | 'cancelled';
  requested_by: string | null;
  resolved_by: string | null;
  requested_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useWLHandoffRequests(handoffId: string | undefined) {
  return useQuery({
    queryKey: ['wl-handoff-requests', handoffId],
    enabled: !!handoffId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_handoff_requests')
        .select('*')
        .eq('handoff_id', handoffId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WLHandoffRequest[];
    },
  });
}

export function useWLHandoffRequestMutations(handoffId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['wl-handoff-requests', handoffId] });

  const markResolved = useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('wl_partner_handoff_requests')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.user?.id ?? null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Marked resolved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { markResolved };
}
