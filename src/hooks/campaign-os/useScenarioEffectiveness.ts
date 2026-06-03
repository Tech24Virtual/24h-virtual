import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScenarioEffectivenessRow {
  scenario_id: string;
  campaign_id: string;
  scenario_title: string;
  resolved_count: number;
  escalated_count: number;
  no_contact_count: number;
  other_count: number;
  total_count: number;
  resolved_pct: number;
}

export function useScenarioEffectiveness(campaignId: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'scenario-effectiveness', campaignId],
    enabled: !!campaignId,
    queryFn: async (): Promise<ScenarioEffectivenessRow[]> => {
      const { data, error } = await (supabase as any)
        .from('v_scenario_outcome_rollup')
        .select('*')
        .eq('campaign_id', campaignId);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        scenario_id: r.scenario_id,
        campaign_id: r.campaign_id,
        scenario_title: r.scenario_title,
        resolved_count: r.resolved_count ?? 0,
        escalated_count: r.escalated_count ?? 0,
        no_contact_count: r.no_contact_count ?? 0,
        other_count: r.other_count ?? 0,
        total_count: r.total_count ?? 0,
        resolved_pct: r.total_count
          ? Math.round((r.resolved_count / r.total_count) * 1000) / 10
          : 0,
      }));
    },
  });
}
