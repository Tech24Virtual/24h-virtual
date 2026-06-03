import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant } from '@/lib/campaign-os/tenancy';
import type { CampaignFaq } from '@/lib/campaign-os/types';

/**
 * PHASE 3 — Effective FAQ resolver.
 *
 * Calls the SECURITY DEFINER RPC `resolve_effective_faqs(...)` which already
 * applies precedence (department > client > tenant > global) and returns one
 * winning row per `question`. No client-side reduction needed.
 *
 * For an unscoped admin call (no department), use `useCampaignFaqsCandidates`
 * which reads the `v_candidate_faqs` view directly.
 */
export function useCampaignFaqs(departmentId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'faqs-effective', departmentId ?? 'none'],
    enabled: !!departmentId,
    queryFn: async (): Promise<CampaignFaq[]> => {
      const tenant = await resolveTenant();
      if (!tenant) return [];
      const { data, error } = await (supabase as any).rpc('resolve_effective_faqs', {
        p_tenant_kind: tenant.tenant_kind,
        p_wl_partner_id: tenant.wl_partner_id,
        p_wl_client_id: tenant.wl_client_id,
        p_client_lead_id: tenant.client_lead_id,
        p_department_id: departmentId,
      });
      if (error) throw error;
      return (data as CampaignFaq[]) ?? [];
    },
  });
}

/**
 * Reads the candidate view directly (all approved + in-effect FAQ rows
 * annotated with `precedence_rank`). Useful for admin merge-preview UIs that
 * need to show every contributing row, not just the winner.
 */
export function useCampaignFaqsCandidates(departmentId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'faqs-candidates', departmentId ?? 'all'],
    queryFn: async (): Promise<CampaignFaq[]> => {
      let q = (supabase as any).from('v_candidate_faqs').select('*').order('precedence_rank', { ascending: false });
      if (departmentId) {
        q = q.or(`scope.eq.global,scope.eq.tenant,scope.eq.client,client_department_id.eq.${departmentId}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as CampaignFaq[]) ?? [];
    },
  });
}
