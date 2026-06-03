import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant, tenantWhere } from '@/lib/campaign-os/tenancy';
import type { ClientLocation, LocationStatus } from '@/lib/campaign-os/types';

/**
 * Locations under a client. Top-level branches/franchise sites/offices.
 * Empty list is valid — a client may have zero locations.
 */
export function useClientLocations(opts: { clientLeadId?: string | null; wlClientId?: string | null } = {}) {
  return useQuery({
    queryKey: ['campaign-os', 'client-locations', opts.clientLeadId, opts.wlClientId],
    queryFn: async (): Promise<ClientLocation[]> => {
      const tenant = await resolveTenant();
      let q = (supabase as any).from('client_locations').select('*').order('name');
      if (opts.clientLeadId) q = q.eq('client_lead_id', opts.clientLeadId);
      if (opts.wlClientId) q = q.eq('wl_client_id', opts.wlClientId);
      q = tenantWhere(q, tenant);
      const { data, error } = await q;
      if (error) throw error;
      return (data as ClientLocation[]) ?? [];
    },
  });
}

export function useClientLocation(id: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'client-location', id],
    enabled: !!id,
    queryFn: async (): Promise<ClientLocation | null> => {
      const { data, error } = await (supabase as any)
        .from('client_locations')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as ClientLocation | null) ?? null;
    },
  });
}

export interface CreateLocationInput {
  client_lead_id?: string | null;
  wl_client_id?: string | null;
  wl_partner_id?: string | null;
  name: string;
  code?: string | null;
  address?: string | null;
  notes?: string | null;
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLocationInput) => {
      const tenant_kind = input.wl_client_id ? 'wl_partner' : 'direct_24h';
      const payload = {
        ...input,
        tenant_kind,
        status: 'active' as LocationStatus,
      };
      const { data, error } = await (supabase as any).from('client_locations').insert(payload).select('*').single();
      if (error) throw error;
      return data as ClientLocation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'client-locations'] });
    },
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Pick<ClientLocation, 'name' | 'code' | 'status' | 'address' | 'notes'>> }) => {
      const { data, error } = await (supabase as any)
        .from('client_locations')
        .update(input.patch)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as ClientLocation;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'client-locations'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'client-location', vars.id] });
    },
  });
}

export function useArchiveLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('client_locations')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-os', 'client-locations'] }),
  });
}
