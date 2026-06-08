/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GoLiveSnapshot } from './useGoLiveSnapshot';

export interface ReadinessDashboardRow {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  tenant_kind: string;
  snapshot: GoLiveSnapshot | null;
}

/** Admin: all non-archived campaigns joined with their readiness snapshot. */
export function useGoLiveReadinessDashboard() {
  return useQuery({
    queryKey: ['campaign-os', 'admin', 'readiness-dashboard'],
    queryFn: async (): Promise<ReadinessDashboardRow[]> => {
      const { data, error } = await (supabase as any)
        .from('campaigns')
        .select('id, display_name, status, tenant_kind, campaign_go_live_status_snapshots(*)')
        .neq('status', 'archived')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        campaign_id: row.id,
        campaign_name: row.display_name,
        campaign_status: row.status,
        tenant_kind: row.tenant_kind,
        snapshot: (row.campaign_go_live_status_snapshots as GoLiveSnapshot | null) ?? null,
      }));
    },
  });
}
