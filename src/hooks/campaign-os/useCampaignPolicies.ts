import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant } from '@/lib/campaign-os/tenancy';
import type { CampaignPolicy } from '@/lib/campaign-os/types';

/**
 * PHASE 3 — Effective Policy resolver (admin UI variant).
 *
 * Queries campaign_policy_blocks directly for status='approved' and applies
 * client-side precedence deduplication (one winner per policy_kind+title).
 *
 * We intentionally bypass the resolve_effective_policies RPC here because:
 *   1. The RPC applies an effective_from/effective_to time-gate intended for
 *      live-call resolution. Policies with future effective dates are correctly
 *      excluded from the live resolver but should be fully visible to admins
 *      managing their content — otherwise every policy saved with a future date
 *      appears to vanish immediately after saving.
 *   2. The RPC's tenant-identity parameters return no rows for admin users who
 *      have no personal client_lead_id / wl_client_id (null params match nothing
 *      in the client/tenant scope branches of the WHERE clause).
 */
export function useCampaignPolicies(departmentId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'policies-effective', departmentId ?? 'none'],
    enabled: !!departmentId,
    queryFn: async (): Promise<CampaignPolicy[]> => {
      let q = (supabase as any)
        .from('campaign_policy_blocks')
        .select('*')
        .eq('status', 'approved');
      if (departmentId) {
        q = q.or(`scope.eq.global,scope.eq.tenant,scope.eq.client,client_department_id.eq.${departmentId}`);
      }
      const { data, error } = await q;
      if (error) throw error;

      const rows = ((data ?? []) as any[]).map((r) => ({
        ...r,
        precedence_rank:
          r.scope === 'call_flow' || r.scope === 'department' ? 5
          : r.scope === 'location' ? 4
          : r.scope === 'client'   ? 3
          : r.scope === 'tenant'   ? 2
          : 1,
      }));

      // Deduplicate: one winner per (policy_kind, title) — highest precedence,
      // then latest version, then most recently updated.
      const winners = new Map<string, any>();
      for (const r of rows) {
        const key = `${r.policy_kind}||${r.title}`;
        const existing = winners.get(key);
        if (
          !existing
          || r.precedence_rank > existing.precedence_rank
          || (r.precedence_rank === existing.precedence_rank && r.version > existing.version)
          || (r.precedence_rank === existing.precedence_rank && r.version === existing.version && r.updated_at > existing.updated_at)
        ) {
          winners.set(key, r);
        }
      }
      return Array.from(winners.values()).sort(
        (a, b) => b.precedence_rank - a.precedence_rank
      ) as CampaignPolicy[];
    },
  });
}

/**
 * Reads campaign_policy_blocks directly (draft + approved, not archived) annotated
 * with a client-computed precedence_rank. Querying the base table rather than
 * v_candidate_policies avoids two problems:
 *   1. v_candidate_policies filters status='approved', so newly-saved drafts are
 *      invisible — admins can't see what they just created.
 *   2. The view may be missing an explicit GRANT SELECT TO authenticated, causing
 *      silent 0-row responses via TanStack Query's error swallowing.
 */
export function useCampaignPoliciesCandidates(departmentId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'policies-candidates', departmentId ?? 'all'],
    queryFn: async (): Promise<CampaignPolicy[]> => {
      let q = (supabase as any)
        .from('campaign_policy_blocks')
        .select('*')
        .in('status', ['draft', 'approved']);
      if (departmentId) {
        q = q.or(`scope.eq.global,scope.eq.tenant,scope.eq.client,client_department_id.eq.${departmentId}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        precedence_rank:
          r.scope === 'call_flow' || r.scope === 'department' ? 5
          : r.scope === 'location' ? 4
          : r.scope === 'client'   ? 3
          : r.scope === 'tenant'   ? 2
          : 1,
      })).sort((a: any, b: any) => b.precedence_rank - a.precedence_rank) as CampaignPolicy[];
    },
  });
}
