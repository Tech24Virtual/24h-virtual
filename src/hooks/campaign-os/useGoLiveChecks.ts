import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GoLiveChecks {
  campaign_id: string;
  client_department_id: string | null;
  script_published: boolean;
  faqs_approved_count: number;
  policies_approved_count: number;
  required_modules: number;
  required_signoffs: number;
  faqs_ok: boolean;
  policies_ok: boolean;
  training_ok: boolean;
  all_ok: boolean;
}

export function useGoLiveChecks(campaignId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'go-live-checks', campaignId ?? 'none'],
    enabled: !!campaignId,
    queryFn: async (): Promise<GoLiveChecks | null> => {
      const { data, error } = await (supabase as any)
        .from('campaign_go_live_checks')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as GoLiveChecks | null;
    },
  });
}

export function useForceActivateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, reason }: { campaignId: string; reason: string }) => {
      const { data, error } = await (supabase as any).rpc('force_activate_campaign', {
        p_campaign_id: campaignId,
        p_reason: reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'go-live-checks', vars.campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'campaign', vars.campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'campaigns'] });
    },
  });
}
