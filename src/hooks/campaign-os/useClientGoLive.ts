/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GoLiveSnapshot } from './useGoLiveSnapshot';

/** All campaigns the client can see, joined with their go-live snapshots. */
export interface ClientCampaignReadiness {
  id: string;
  display_name: string;
  status: string;
  snapshot: GoLiveSnapshot | null;
}

export function useMyClientGoLiveReadiness() {
  return useQuery({
    queryKey: ['campaign-os', 'client', 'go-live-readiness'],
    queryFn: async (): Promise<ClientCampaignReadiness[]> => {
      const { data, error } = await (supabase as any)
        .from('campaigns')
        .select('id, display_name, status, campaign_go_live_status_snapshots(*)')
        .neq('status', 'archived')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        display_name: row.display_name,
        status: row.status,
        snapshot: (row.campaign_go_live_status_snapshots as GoLiveSnapshot | null) ?? null,
      }));
    },
  });
}

export function useConfirmGoLive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await (supabase as any).rpc('client_confirm_go_live', {
        p_campaign_id: campaignId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'client', 'go-live-readiness'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'go-live-snapshot'] });
    },
  });
}
