import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignsClientRow {
  id: string;
  name: string;
  kind: 'direct_24h' | 'wl_client';
  partner_id?: string | null;
  partner_name?: string | null;
  email?: string | null;
}

/**
 * Returns the unified list of "clients" for the new Campaigns IA:
 * direct active leads + white-label clients.
 */
export function useClientsList() {
  return useQuery({
    queryKey: ['campaign-os', 'clients-list'],
    queryFn: async (): Promise<CampaignsClientRow[]> => {
      const [leadsRes, wlRes] = await Promise.all([
        (supabase as any)
          .from('leads')
          .select('id, name, email, pipeline_stage')
          .in('pipeline_stage', ['active', 'ready_for_billing', 'qualified'])
          .order('name'),
        (supabase as any)
          .from('white_label_clients')
          .select('id, client_name, partner_id, white_label_partners:partner_id (company_name)')
          .order('client_name'),
      ]);
      if (leadsRes.error) throw leadsRes.error;
      if (wlRes.error) throw wlRes.error;
      const direct: CampaignsClientRow[] = ((leadsRes.data as any[]) ?? []).map((l) => ({
        id: l.id,
        name: l.name ?? '(unnamed)',
        kind: 'direct_24h',
        email: l.email ?? null,
      }));
      const wl: CampaignsClientRow[] = ((wlRes.data as any[]) ?? []).map((c) => ({
        id: c.id,
        name: c.client_name ?? '(unnamed)',
        kind: 'wl_client',
        partner_id: c.partner_id,
        partner_name: c.white_label_partners?.company_name ?? null,
      }));
      return [...direct, ...wl];
    },
  });
}
