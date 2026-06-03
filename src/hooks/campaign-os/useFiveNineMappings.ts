import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant, tenantWhere } from '@/lib/campaign-os/tenancy';
import type { Five9VariableMapping } from '@/lib/campaign-os/types';

/**
 * FOUNDATION HOOK — Phase 3+ Campaign OS UI. Read-only. Not surfaced to any
 * persona yet.
 */
export function useFiveNineMappings(departmentId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'five9-mappings', departmentId ?? 'all'],
    queryFn: async (): Promise<Five9VariableMapping[]> => {
      const tenant = await resolveTenant();
      let q = (supabase as any).from('five9_variable_mappings').select('*').order('five9_variable_name');
      q = tenantWhere(q, tenant);
      if (departmentId) q = q.eq('client_department_id', departmentId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as Five9VariableMapping[]) ?? [];
    },
  });
}
