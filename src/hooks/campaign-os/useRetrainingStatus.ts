import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RetrainingStatusRow {
  campaign_id: string;
  module_id: string;
  agent_id: string;
  signed_off_at: string;
  expires_at: string | null;
  needs_refresh: boolean;
  status: 'current' | 'expiring_soon' | 'expired' | 'needs_refresh';
}

export function useRetrainingStatus(campaignId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'retraining-status', campaignId ?? 'none'],
    enabled: !!campaignId,
    queryFn: async (): Promise<RetrainingStatusRow[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_signoff_status')
        .select('*')
        .eq('campaign_id', campaignId);
      if (error) {
        // View may not exist yet — return empty rather than error.
        console.warn('retraining status view missing', error.message);
        return [];
      }
      return (data ?? []) as RetrainingStatusRow[];
    },
  });
}
