/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GoLiveSnapshot } from './useGoLiveSnapshot';

export interface PendingGoLiveApproval {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  client_confirmed_at: string | null;
  snapshot: GoLiveSnapshot;
}

/** Campaigns where client has confirmed but supervisor has not yet approved. */
export function usePendingGoLiveApprovals() {
  return useQuery({
    queryKey: ['campaign-os', 'supervisor', 'go-live-approvals'],
    queryFn: async (): Promise<PendingGoLiveApproval[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_go_live_status_snapshots')
        .select('*, campaign:campaigns(id, display_name, status)')
        .eq('client_confirmed', true)
        .eq('supervisor_approved', false)
        .order('client_confirmed_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        campaign_id: row.campaign_id,
        campaign_name: row.campaign?.display_name ?? 'Unknown',
        campaign_status: row.campaign?.status ?? 'draft',
        client_confirmed_at: row.client_confirmed_at,
        snapshot: row as GoLiveSnapshot,
      }));
    },
  });
}

/** All non-archived campaigns with snapshots — for the full readiness view. */
export function useAllGoLiveSnapshots() {
  return useQuery({
    queryKey: ['campaign-os', 'supervisor', 'all-snapshots'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaign_go_live_status_snapshots')
        .select('*, campaign:campaigns(id, display_name, status)')
        .order('last_evaluated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<GoLiveSnapshot & { campaign: { id: string; display_name: string; status: string } | null }>;
    },
  });
}

export function useSupervisorApproveGoLive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await (supabase as any).rpc('supervisor_approve_go_live', {
        p_campaign_id: campaignId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'supervisor', 'go-live-approvals'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'supervisor', 'all-snapshots'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'go-live-snapshot'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'go-live-checks'] });
    },
  });
}
