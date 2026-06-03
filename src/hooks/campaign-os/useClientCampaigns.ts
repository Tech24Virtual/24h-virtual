/**
 * Phase G — Direct Client read hooks for Campaign OS.
 *
 * RLS already filters rows to those the calling client can read; these
 * hooks add UX-friendly defaults (only non-archived campaigns, ordered).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Campaign, CampaignScenario, ClientDepartment } from '@/lib/campaign-os/types';

export function useMyClientCampaigns() {
  return useQuery({
    queryKey: ['campaign-os', 'client', 'my-campaigns'],
    queryFn: async (): Promise<(Campaign & { department: ClientDepartment | null })[]> => {
      const { data, error } = await (supabase as any)
        .from('campaigns')
        .select('*, department:client_departments(*)')
        .neq('status', 'archived')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyClientCampaign(campaignId: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'client', 'campaign', campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaigns')
        .select('*, department:client_departments(*)')
        .eq('id', campaignId!)
        .maybeSingle();
      if (error) throw error;
      return data as (Campaign & { department: ClientDepartment | null }) | null;
    },
  });
}

export function useMyClientCampaignScenarios(campaignId: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'client', 'scenarios', campaignId],
    enabled: !!campaignId,
    queryFn: async (): Promise<CampaignScenario[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_scenarios')
        .select('*')
        .eq('campaign_id', campaignId!)
        .eq('status', 'approved')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as CampaignScenario[]) ?? [];
    },
  });
}
