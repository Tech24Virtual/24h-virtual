import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant, tenantWhere } from '@/lib/campaign-os/tenancy';
import type { CallFlow, CallFlowOwnerKind, RoutingEntryType } from '@/lib/campaign-os/types';

/**
 * Call Flows. Backed by `client_departments` table (kept for back-compat).
 * Filterable by client and/or location. Owner kind determines whether this
 * flow lives directly under a client or under a location.
 */
export function useCallFlows(opts: {
  clientLeadId?: string | null;
  wlClientId?: string | null;
  clientLocationId?: string | null;
  ownerKind?: CallFlowOwnerKind | null;
} = {}) {
  return useQuery({
    queryKey: ['campaign-os', 'call-flows', opts],
    queryFn: async (): Promise<CallFlow[]> => {
      const tenant = await resolveTenant();
      let q = (supabase as any).from('client_departments').select('*').order('display_name', { nullsFirst: false }).order('department_name');
      if (opts.clientLeadId) q = q.eq('client_lead_id', opts.clientLeadId);
      if (opts.wlClientId) q = q.eq('wl_client_id', opts.wlClientId);
      if (opts.clientLocationId) q = q.eq('client_location_id', opts.clientLocationId);
      if (opts.ownerKind) q = q.eq('owner_kind', opts.ownerKind);
      q = tenantWhere(q, tenant);
      const { data, error } = await q;
      if (error) throw error;
      return (data as CallFlow[]) ?? [];
    },
  });
}

export function useCallFlow(id: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'call-flow', id],
    enabled: !!id,
    queryFn: async (): Promise<CallFlow | null> => {
      const { data, error } = await (supabase as any)
        .from('client_departments')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as CallFlow | null) ?? null;
    },
  });
}

export interface CreateCallFlowInput {
  client_lead_id?: string | null;
  wl_client_id?: string | null;
  wl_partner_id?: string | null;
  client_location_id?: string | null;
  display_name: string;
  routing_entry_type?: RoutingEntryType;
  notes?: string | null;
  /** When true (default), also create the matching campaign row. */
  autoCreateCampaign?: boolean;
}

/**
 * Creates a call flow and (by default) auto-creates its single campaign.
 */
export function useCreateCallFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCallFlowInput): Promise<{ callFlow: CallFlow; campaignId: string | null }> => {
      const tenant_kind = input.wl_client_id ? 'wl_partner' : 'direct_24h';
      const owner_kind: CallFlowOwnerKind = input.client_location_id ? 'location' : 'client';
      const payload = {
        tenant_kind,
        wl_partner_id: input.wl_partner_id ?? null,
        wl_client_id: input.wl_client_id ?? null,
        client_lead_id: input.client_lead_id ?? null,
        client_location_id: input.client_location_id ?? null,
        owner_kind,
        routing_entry_type: input.routing_entry_type ?? 'direct',
        display_name: input.display_name,
        department_name: input.display_name, // mirror for back-compat
        department_type: 'custom',
        lifecycle: 'lead',
        notes: input.notes ?? null,
      };
      const { data: flow, error } = await (supabase as any)
        .from('client_departments')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;

      let campaignId: string | null = null;
      if (input.autoCreateCampaign !== false) {
        const campaignPayload = {
          tenant_kind,
          wl_partner_id: input.wl_partner_id ?? null,
          wl_client_id: input.wl_client_id ?? null,
          client_lead_id: input.client_lead_id ?? null,
          client_department_id: (flow as CallFlow).id,
          display_name: input.display_name,
          status: 'draft',
        };
        const { data: campaign, error: cErr } = await (supabase as any)
          .from('campaigns')
          .insert(campaignPayload)
          .select('id')
          .single();
        if (cErr) throw cErr;
        campaignId = (campaign as { id: string }).id;
      }

      return { callFlow: flow as CallFlow, campaignId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'call-flows'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'campaigns'] });
    },
  });
}

export function useUpdateCallFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Pick<CallFlow, 'display_name' | 'routing_entry_type' | 'notes' | 'lifecycle'>> }) => {
      const patch: Record<string, unknown> = { ...input.patch };
      if (typeof patch.display_name === 'string') {
        patch.department_name = patch.display_name;
      }
      const { data, error } = await (supabase as any)
        .from('client_departments')
        .update(patch)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as CallFlow;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'call-flows'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'call-flow', vars.id] });
    },
  });
}
