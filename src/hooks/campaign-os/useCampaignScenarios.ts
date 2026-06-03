/**
 * Phase 4 Wave 1 — Scenarios under a single campaign. RLS enforces tenant.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignScenario } from '@/lib/campaign-os/types';

export function useCampaignScenarios(campaignId: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'scenarios', campaignId],
    enabled: !!campaignId,
    queryFn: async (): Promise<CampaignScenario[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_scenarios')
        .select('*')
        .eq('campaign_id', campaignId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as CampaignScenario[]) ?? [];
    },
  });
}
