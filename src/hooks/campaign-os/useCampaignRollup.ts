import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignRollupRow {
  campaign_id: string;
  tenant_kind: string;
  client_lead_id: string | null;
  wl_partner_id: string | null;
  wl_client_id: string | null;
  client_department_id: string | null;
  calls_30d: number;
  avg_handle_time_seconds: number;
  missed_pct: number | null;
  last_call_date: string | null;
  // joined:
  display_name?: string | null;
  status?: string | null;
  published_version_id?: string | null;
}

export function useCampaignRollup30d() {
  return useQuery({
    queryKey: ['campaign-os', 'rollup-30d'],
    queryFn: async (): Promise<CampaignRollupRow[]> => {
      const { data: rollups, error } = await (supabase as any)
        .from('v_campaign_rollup_30d')
        .select('*');
      if (error) throw error;

      const { data: campaigns, error: cErr } = await (supabase as any)
        .from('campaigns')
        .select('id, display_name, status, published_version_id, tenant_kind, client_lead_id, wl_partner_id, wl_client_id, client_department_id');
      if (cErr) throw cErr;

      const rollupMap = new Map<string, any>((rollups ?? []).map((r: any) => [r.campaign_id, r]));
      return (campaigns ?? []).map((c: any) => {
        const r = rollupMap.get(c.id);
        return {
          campaign_id: c.id,
          tenant_kind: c.tenant_kind,
          client_lead_id: c.client_lead_id,
          wl_partner_id: c.wl_partner_id,
          wl_client_id: c.wl_client_id,
          client_department_id: c.client_department_id,
          calls_30d: r?.calls_30d ?? 0,
          avg_handle_time_seconds: Number(r?.avg_handle_time_seconds ?? 0),
          missed_pct: r?.missed_pct != null ? Number(r.missed_pct) : null,
          last_call_date: r?.last_call_date ?? null,
          display_name: c.display_name,
          status: c.status,
          published_version_id: c.published_version_id,
        } as CampaignRollupRow;
      });
    },
  });
}

export function useTopCampaigns30d(limit = 5) {
  const q = useCampaignRollup30d();
  return {
    ...q,
    data: (q.data ?? [])
      .filter((r) => r.calls_30d > 0)
      .sort((a, b) => b.calls_30d - a.calls_30d)
      .slice(0, limit),
  };
}
