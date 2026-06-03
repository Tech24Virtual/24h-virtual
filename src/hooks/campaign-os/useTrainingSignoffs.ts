import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrainingSignoff {
  id: string;
  completion_id: string;
  module_id: string;
  campaign_id: string;
  agent_id: string;
  signed_off_by: string;
  signed_off_at: string;
  signoff_note: string | null;
}

export function useSignoffs(campaignId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'signoffs', campaignId ?? 'all'],
    queryFn: async (): Promise<TrainingSignoff[]> => {
      let q = (supabase as any).from('campaign_training_signoffs').select('*').order('signed_off_at', { ascending: false });
      if (campaignId) q = q.eq('campaign_id', campaignId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TrainingSignoff[];
    },
  });
}

export function useMySignoffs() {
  return useQuery({
    queryKey: ['campaign-os', 'my-signoffs'],
    queryFn: async (): Promise<TrainingSignoff[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await (supabase as any)
        .from('campaign_training_signoffs')
        .select('*')
        .eq('agent_id', u.user.id);
      if (error) throw error;
      return (data ?? []) as TrainingSignoff[];
    },
  });
}

export function useCreateSignoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { completion_id: string; module_id: string; campaign_id: string; agent_id: string; signoff_note?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('campaign_training_signoffs')
        .insert({
          completion_id: input.completion_id,
          module_id: input.module_id,
          campaign_id: input.campaign_id,
          agent_id: input.agent_id,
          signed_off_by: u.user.id,
          signoff_note: input.signoff_note ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'signoffs'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'my-signoffs'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'training-coverage'] });
    },
  });
}
