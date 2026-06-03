/**
 * Phase G — WL Partner read hook for cross-client Campaign OS visibility.
 *
 * RLS scopes the row set to clients the partner owns. The hook groups results
 * by wl_client for the partner-side admin list.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Campaign, ClientDepartment } from '@/lib/campaign-os/types';

interface PartnerCampaignRow extends Campaign {
  department: ClientDepartment | null;
  wl_client?: { id: string; client_name: string } | null;
}

export interface PartnerCampaignGroup {
  wl_client_id: string;
  client_name: string;
  campaigns: PartnerCampaignRow[];
}

export function usePartnerCampaigns(partnerId: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'partner', 'campaigns', partnerId],
    enabled: !!partnerId,
    queryFn: async (): Promise<PartnerCampaignGroup[]> => {
      const { data, error } = await (supabase as any)
        .from('campaigns')
        .select(
          '*, department:client_departments(*), wl_client:white_label_clients(id, client_name)',
        )
        .eq('wl_partner_id', partnerId!)
        .neq('status', 'archived')
        .order('updated_at', { ascending: false });
      if (error) throw error;

      const rows = (data as PartnerCampaignRow[]) ?? [];
      const grouped = new Map<string, PartnerCampaignGroup>();
      for (const r of rows) {
        const cid = r.wl_client_id ?? 'unassigned';
        const name = r.wl_client?.client_name ?? 'Unassigned';
        if (!grouped.has(cid)) {
          grouped.set(cid, { wl_client_id: cid, client_name: name, campaigns: [] });
        }
        grouped.get(cid)!.campaigns.push(r);
      }
      return Array.from(grouped.values()).sort((a, b) =>
        a.client_name.localeCompare(b.client_name),
      );
    },
  });
}

export function usePartnerCampaign(campaignId: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'partner', 'campaign', campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaigns')
        .select(
          '*, department:client_departments(*), wl_client:white_label_clients(id, client_name)',
        )
        .eq('id', campaignId!)
        .maybeSingle();
      if (error) throw error;
      return data as PartnerCampaignRow | null;
    },
  });
}
