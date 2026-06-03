import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant, tenantWhere } from '@/lib/campaign-os/tenancy';
import type { ClientContact } from '@/lib/campaign-os/types';

/**
 * FOUNDATION HOOK — Phase 3+ Campaign OS UI. Read-only. Not surfaced to any
 * persona yet.
 */
export function useClientContacts() {
  return useQuery({
    queryKey: ['campaign-os', 'client-contacts'],
    queryFn: async (): Promise<ClientContact[]> => {
      const tenant = await resolveTenant();
      let q = (supabase as any).from('client_contacts').select('*').order('is_primary', { ascending: false });
      q = tenantWhere(q, tenant);
      const { data, error } = await q;
      if (error) throw error;
      return (data as ClientContact[]) ?? [];
    },
  });
}
