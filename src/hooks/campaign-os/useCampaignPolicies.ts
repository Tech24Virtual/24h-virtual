import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant } from '@/lib/campaign-os/tenancy';
import type { CampaignPolicy } from '@/lib/campaign-os/types';

/**
 * PHASE 3 — Effective Policy resolver.
 *
 * Calls `resolve_effective_policies(...)` RPC which applies precedence
 * (department > client > tenant > global) and returns one winning row per
 * `(policy_kind, title)`.
 */
export function useCampaignPolicies(departmentId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'policies-effective', departmentId ?? 'none'],
    enabled: !!departmentId,
    queryFn: async (): Promise<CampaignPolicy[]> => {
      const tenant = await resolveTenant();
      if (!tenant) return [];
      const { data, error } = await (supabase as any).rpc('resolve_effective_policies', {
        p_tenant_kind: tenant.tenant_kind,
        p_wl_partner_id: tenant.wl_partner_id,
        p_wl_client_id: tenant.wl_client_id,
        p_client_lead_id: tenant.client_lead_id,
        p_department_id: departmentId,
      });
      if (error) throw error;
      return (data as CampaignPolicy[]) ?? [];
    },
  });
}

export function useCampaignPoliciesCandidates(departmentId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'policies-candidates', departmentId ?? 'all'],
    queryFn: async (): Promise<CampaignPolicy[]> => {
      let q = (supabase as any).from('v_candidate_policies').select('*').order('precedence_rank', { ascending: false });
      if (departmentId) {
        q = q.or(`scope.eq.global,scope.eq.tenant,scope.eq.client,client_department_id.eq.${departmentId}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as CampaignPolicy[]) ?? [];
    },
  });
}
