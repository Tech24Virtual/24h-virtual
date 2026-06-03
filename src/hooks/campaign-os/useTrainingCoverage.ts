import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrainingCoverage {
  campaign_id: string;
  published_modules: number;
  required_modules: number;
  total_completions: number;
  total_signoffs: number;
  agents_started: number;
}

export function useTrainingCoverage(campaignId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'training-coverage', campaignId ?? 'none'],
    enabled: !!campaignId,
    queryFn: async (): Promise<TrainingCoverage | null> => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_coverage')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TrainingCoverage | null;
    },
  });
}
