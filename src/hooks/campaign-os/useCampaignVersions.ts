import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignPublishVersion {
  id: string;
  campaign_id: string;
  version: number;
  note: string | null;
  published_at: string;
  published_by: string | null;
  snapshot: any;
}

export function useCampaignVersions(campaignId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'publish-versions', campaignId ?? 'none'],
    enabled: !!campaignId,
    queryFn: async (): Promise<CampaignPublishVersion[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_publish_versions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('version', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CampaignPublishVersion[];
    },
  });
}
