/**
 * Phase 4 Wave 1 — Campaign read hooks. Tenant-scoped via central resolver.
 *
 * `useEligibleDepartments` enforces the eligibility rule (lifecycle in
 * approved_for_go_live | live AND no campaign row) — same predicate is shown
 * in the UI helper text. Server-side RLS is the ultimate enforcer.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant, tenantWhere } from '@/lib/campaign-os/tenancy';
import type { Campaign, ClientDepartment } from '@/lib/campaign-os/types';

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaign-os', 'campaigns'],
    queryFn: async (): Promise<Campaign[]> => {
      const tenant = await resolveTenant();
      let q = (supabase as any)
        .from('campaigns')
        .select('*')
        .order('updated_at', { ascending: false });
      q = tenantWhere(q, tenant);
      const { data, error } = await q;
      if (error) throw error;
      return (data as Campaign[]) ?? [];
    },
  });
}

export interface CampaignWithDepartment extends Campaign {
  department: ClientDepartment | null;
}

export function useCampaign(id: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'campaign', id],
    enabled: !!id,
    queryFn: async (): Promise<CampaignWithDepartment | null> => {
      const { data, error } = await (supabase as any)
        .from('campaigns')
        .select('*, department:client_departments(*)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as CampaignWithDepartment | null) ?? null;
    },
  });
}

/**
 * Departments eligible to receive a (first) campaign:
 *   lifecycle ∈ {approved_for_go_live, live} AND no campaign row exists.
 *
 * Implemented client-side as a two-query left-anti-join because PostgREST
 * doesn't expose a true LEFT JOIN ... IS NULL filter cleanly. RLS still
 * filters both queries to the caller's tenant.
 */
export function useEligibleDepartments() {
  return useQuery({
    queryKey: ['campaign-os', 'eligible-departments'],
    queryFn: async (): Promise<ClientDepartment[]> => {
      const tenant = await resolveTenant();
      let depQ = (supabase as any)
        .from('client_departments')
        .select('*')
        .in('lifecycle', ['approved_for_go_live', 'live'])
        .order('department_name');
      depQ = tenantWhere(depQ, tenant);
      const { data: depts, error: depErr } = await depQ;
      if (depErr) throw depErr;

      const { data: existing, error: campErr } = await (supabase as any)
        .from('campaigns')
        .select('client_department_id');
      if (campErr) throw campErr;
      const taken = new Set<string>((existing ?? []).map((r: any) => r.client_department_id));

      return ((depts as ClientDepartment[]) ?? []).filter((d) => !taken.has(d.id));
    },
  });
}
