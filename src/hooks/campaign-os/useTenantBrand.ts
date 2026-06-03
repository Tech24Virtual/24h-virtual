import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant } from '@/lib/campaign-os/tenancy';
import type { TenantBrand } from '@/lib/campaign-os/types';

/**
 * FOUNDATION HOOK — Phase 3+ Campaign OS UI. Read-only. Not surfaced to any
 * persona yet.
 */
export function useTenantBrand() {
  return useQuery({
    queryKey: ['campaign-os', 'tenant-brand'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<TenantBrand | null> => {
      const tenant = await resolveTenant();
      if (!tenant) return null;
      // v_tenant_brand uses security_invoker, so RLS on base tables filters automatically
      const { data, error } = await (supabase as any)
        .from('v_tenant_brand')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as TenantBrand | null) ?? null;
    },
  });
}
