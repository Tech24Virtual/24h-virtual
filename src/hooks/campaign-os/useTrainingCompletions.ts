import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrainingCompletion {
  id: string;
  module_id: string;
  campaign_id: string;
  agent_id: string;
  completed_at: string;
  agent_notes: string | null;
  created_at: string;
}

/** Agent's own completions. RLS-restricted to current user. */
export function useMyCompletions() {
  return useQuery({
    queryKey: ['campaign-os', 'my-completions'],
    queryFn: async (): Promise<TrainingCompletion[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await (supabase as any)
        .from('campaign_training_completions')
        .select('*')
        .eq('agent_id', u.user.id);
      if (error) throw error;
      return (data ?? []) as TrainingCompletion[];
    },
  });
}

/** Supervisor view of completions for a campaign (or all). */
export function useCampaignCompletions(campaignId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'completions', campaignId ?? 'all'],
    queryFn: async (): Promise<TrainingCompletion[]> => {
      let q = (supabase as any)
        .from('campaign_training_completions')
        .select('*')
        .order('completed_at', { ascending: false });
      if (campaignId) q = q.eq('campaign_id', campaignId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TrainingCompletion[];
    },
  });
}

export function useMarkComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ module_id, campaign_id, agent_notes }: { module_id: string; campaign_id: string; agent_notes?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('campaign_training_completions')
        .insert({ module_id, campaign_id, agent_id: u.user.id, agent_notes: agent_notes ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'my-completions'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'completions'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'training-coverage'] });
    },
  });
}

/** Supervisor rejects a completion (deletes so agent re-does it). */
export function useDeleteCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('campaign_training_completions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'completions'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'my-completions'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'training-coverage'] });
    },
  });
}
