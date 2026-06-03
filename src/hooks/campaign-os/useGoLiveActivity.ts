import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GoLiveActivityRow {
  check_key: 'script' | 'faqs' | 'policies' | 'training' | string;
  check_label: string;
  last_updated_at: string | null;
  actor_id: string | null;
  actor_name: string | null;
  detail: string | null;
}

export function useGoLiveActivity(campaignId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'go-live-activity', campaignId ?? 'none'],
    enabled: !!campaignId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<GoLiveActivityRow[]> => {
      const { data, error } = await (supabase as any).rpc('get_campaign_go_live_activity', {
        p_campaign_id: campaignId,
      });
      if (error) throw error;
      return (data ?? []) as GoLiveActivityRow[];
    },
  });
}
