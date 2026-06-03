import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Phase 3 — Standard 12 Five9 native variables reference.
 */
export interface Five9NativeVariable {
  variable_name: string;
  display_label: string;
  data_type: string;
  direction: 'in' | 'out' | 'both';
  description: string | null;
  sort_order: number;
}

export function useFive9NativeVariables() {
  return useQuery({
    queryKey: ['campaign-os', 'five9-native-variables'],
    queryFn: async (): Promise<Five9NativeVariable[]> => {
      const { data, error } = await (supabase as any)
        .from('five9_native_variables')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data as Five9NativeVariable[]) ?? [];
    },
  });
}
