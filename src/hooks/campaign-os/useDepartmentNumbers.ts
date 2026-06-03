import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DepartmentNumber } from '@/lib/campaign-os/types';

/**
 * FOUNDATION HOOK — Phase 3+ Campaign OS UI. Read-only. Not surfaced to any
 * persona yet.
 */
export function useDepartmentNumbers(departmentId: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'department-numbers', departmentId],
    enabled: !!departmentId,
    queryFn: async (): Promise<DepartmentNumber[]> => {
      const { data, error } = await (supabase as any)
        .from('department_numbers')
        .select('*')
        .eq('client_department_id', departmentId!)
        .order('phone_role');
      if (error) throw error;
      return (data as DepartmentNumber[]) ?? [];
    },
  });
}
