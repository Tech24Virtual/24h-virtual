/**
 * Phase G — Supervisor scope management hooks.
 *
 * Admin-only writes. Supervisors can SELECT their own assignments via RLS.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SupervisorAssignment } from '@/lib/supervisorScope';
import type { CampaignTenantKind } from '@/lib/campaign-os/types';

const KEY = ['campaign-os', 'supervisor-assignments'] as const;

export function useSupervisorAssignments(supervisorUserId?: string | null) {
  return useQuery({
    queryKey: [...KEY, supervisorUserId ?? 'all'],
    queryFn: async (): Promise<SupervisorAssignment[]> => {
      let q = (supabase as any)
        .from('supervisor_tenant_assignments')
        .select('*')
        .order('created_at', { ascending: false });
      if (supervisorUserId) q = q.eq('supervisor_user_id', supervisorUserId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as SupervisorAssignment[]) ?? [];
    },
  });
}

export interface NewAssignmentInput {
  supervisor_user_id: string;
  tenant_kind: CampaignTenantKind;
  client_lead_id?: string | null;
  wl_partner_id?: string | null;
  wl_client_id?: string | null;
}

export function useGrantSupervisorAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewAssignmentInput) => {
      const { data, error } = await (supabase as any)
        .from('supervisor_tenant_assignments')
        .insert({
          supervisor_user_id: input.supervisor_user_id,
          tenant_kind: input.tenant_kind,
          client_lead_id: input.client_lead_id ?? null,
          wl_partner_id: input.wl_partner_id ?? null,
          wl_client_id: input.wl_client_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SupervisorAssignment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRevokeSupervisorAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('supervisor_tenant_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
