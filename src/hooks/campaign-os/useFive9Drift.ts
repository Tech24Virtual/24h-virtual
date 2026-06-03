import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DriftSnapshot {
  id: string;
  client_department_id: string | null;
  captured_at: string;
  source: string;
  drift: {
    missing_in_five9?: string[];
    missing_in_os?: string[];
    type_mismatches?: Array<{ name: string; os_type: string | null; five9_type: string | null }>;
    kind_mismatches?: Array<{ name: string; os_kind: string | null; five9_kind: string | null }>;
    total_drift?: number;
  };
  captured_by: string | null;
}

export function useLatestFive9Drift(departmentId: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'five9-drift-latest', departmentId],
    enabled: !!departmentId,
    queryFn: async (): Promise<DriftSnapshot | null> => {
      const { data, error } = await (supabase as any)
        .from('five9_drift_snapshot_latest')
        .select('*')
        .eq('client_department_id', departmentId)
        .maybeSingle();
      if (error) throw error;
      return (data as DriftSnapshot | null) ?? null;
    },
  });
}

export interface DetectDriftInput {
  client_department_id: string;
  variables: Array<{ name: string; kind?: string | null; type?: string | null }>;
  source?: 'manual_paste' | 'csv_upload' | 'scheduled';
}

export function useDetectFive9Drift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DetectDriftInput) => {
      const { data, error } = await (supabase as any).functions.invoke('detect-five9-drift', {
        body: input,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'five9-drift-latest', input.client_department_id] });
    },
  });
}
