import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Five9Campaign {
  name: string;
  type: string;
  state: string;
  description: string;
}

export interface CampaignMapping {
  id: string;
  campaign_id: string;
  five9_campaign_name: string;
  five9_campaign_type: string | null;
  verified_at: string | null;
  created_at: string;
}

export function useFive9Campaigns() {
  return useQuery({
    queryKey: ['five9', 'live-campaigns'],
    retry: 1,
    queryFn: async (): Promise<Five9Campaign[]> => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      let res: Response;
      try {
        res = await fetch(`${supabaseUrl}/functions/v1/five9-proxy?action=campaigns`, {
          headers: { apikey: anonKey },
          signal: AbortSignal.timeout(10_000),
        });
      } catch (e: any) {
        if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
          throw new Error('Five9 API timed out — check Five9 connectivity');
        }
        throw e;
      }
      if (!res.ok) throw new Error('Five9 API unavailable');
      const json = await res.json();
      return (json.data as Five9Campaign[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCampaignMapping(campaignId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'five9-campaign-mapping', campaignId ?? 'none'],
    enabled: !!campaignId,
    queryFn: async (): Promise<CampaignMapping | null> => {
      const { data, error } = await (supabase as any)
        .from('five9_campaign_mappings')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CampaignMapping | null;
    },
  });
}

export function useSaveCampaignMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, five9CampaignName, five9CampaignType }: {
      campaignId: string;
      five9CampaignName: string;
      five9CampaignType?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from('five9_campaign_mappings')
        .upsert({
          campaign_id: campaignId,
          five9_campaign_name: five9CampaignName,
          five9_campaign_type: five9CampaignType ?? null,
          verified_at: new Date().toISOString(),
          created_by: user?.id ?? null,
        }, { onConflict: 'campaign_id' });
      if (error) throw error;
    },
    onSuccess: (_, { campaignId }) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'five9-campaign-mapping', campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'go-live-snapshot'] });
    },
  });
}

export function useVariableCoverage(departmentId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'five9-variable-coverage', departmentId ?? 'none'],
    enabled: !!departmentId,
    queryFn: async (): Promise<number> => {
      const { count, error } = await (supabase as any)
        .from('five9_variable_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('client_department_id', departmentId)
        .eq('is_active', true);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useVerifyMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, mappedName }: { campaignId: string; mappedName: string }) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/five9-proxy?action=campaigns`, {
        headers: { apikey: anonKey },
      });
      if (!res.ok) throw new Error('Failed to reach Five9');
      const json = await res.json();
      const campaigns = (json.data as Five9Campaign[]) ?? [];
      const found = campaigns.some((c) => c.name.toLowerCase() === mappedName.toLowerCase());
      if (!found) throw new Error(`"${mappedName}" was not found in Five9's live campaign list`);

      // Update verified_at to now
      const { error } = await (supabase as any)
        .from('five9_campaign_mappings')
        .update({ verified_at: new Date().toISOString() })
        .eq('campaign_id', campaignId);
      if (error) throw error;

      return { found: true };
    },
    onSuccess: (_, { campaignId }) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'five9-campaign-mapping', campaignId] });
      qc.invalidateQueries({ queryKey: ['five9', 'live-campaigns'] });
    },
  });
}
