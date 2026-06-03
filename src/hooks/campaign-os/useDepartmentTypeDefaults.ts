import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DepartmentTypeEnum } from '@/lib/campaign-os/types';

/**
 * Phase 3 — Reads the department-type defaults catalog. Admin-only writes are
 * enforced at the database via `has_role('admin')`.
 */
export interface DepartmentTypeDefault {
  department_type: DepartmentTypeEnum;
  default_field_group_json: any;
  default_faqs_json: any;
  default_five9_mappings_json: any;
  notes: string | null;
  updated_at: string;
  updated_by: string | null;
}

export function useDepartmentTypeDefaults() {
  return useQuery({
    queryKey: ['campaign-os', 'department-type-defaults'],
    queryFn: async (): Promise<DepartmentTypeDefault[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_department_type_defaults')
        .select('*')
        .order('department_type');
      if (error) throw error;
      return (data as DepartmentTypeDefault[]) ?? [];
    },
  });
}

export function useUpsertDepartmentTypeDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<DepartmentTypeDefault> & { department_type: DepartmentTypeEnum }) => {
      const { error } = await (supabase as any)
        .from('campaign_department_type_defaults')
        .upsert(payload, { onConflict: 'department_type' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-os', 'department-type-defaults'] }),
  });
}
