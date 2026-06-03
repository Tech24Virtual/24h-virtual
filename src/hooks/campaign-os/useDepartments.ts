import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant, tenantWhere } from '@/lib/campaign-os/tenancy';
import type { ClientDepartment } from '@/lib/campaign-os/types';

/**
 * FOUNDATION HOOK — Phase 3+ Campaign OS UI. Read-only. Not surfaced to any
 * persona yet.
 */
export function useDepartments() {
  return useQuery({
    queryKey: ['campaign-os', 'departments'],
    queryFn: async (): Promise<ClientDepartment[]> => {
      const tenant = await resolveTenant();
      let q = (supabase as any).from('client_departments').select('*').order('department_name');
      q = tenantWhere(q, tenant);
      const { data, error } = await q;
      if (error) throw error;
      return (data as ClientDepartment[]) ?? [];
    },
  });
}

export function useDepartment(id: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'department', id],
    enabled: !!id,
    queryFn: async (): Promise<ClientDepartment | null> => {
      const { data, error } = await (supabase as any)
        .from('client_departments')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as ClientDepartment | null) ?? null;
    },
  });
}
