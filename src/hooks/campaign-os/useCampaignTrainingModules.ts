import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant } from '@/lib/campaign-os/tenancy';

export interface CampaignTrainingModule {
  id: string;
  campaign_id: string;
  tenant_kind: string;
  wl_partner_id: string | null;
  client_lead_id: string | null;
  wl_client_id: string | null;
  title: string;
  summary: string | null;
  body_md: string;
  required: boolean;
  sort_order: number;
  status: 'draft' | 'published' | 'archived';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCampaignTrainingModules(campaignId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'training-modules', campaignId ?? 'none'],
    enabled: !!campaignId,
    queryFn: async (): Promise<CampaignTrainingModule[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_modules')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CampaignTrainingModule[];
    },
  });
}

/** Agent-facing — returns published modules across all campaigns. RLS filters. */
export function useAgentPublishedModules() {
  return useQuery({
    queryKey: ['campaign-os', 'agent-published-modules'],
    queryFn: async (): Promise<CampaignTrainingModule[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_modules')
        .select('*')
        .eq('status', 'published')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CampaignTrainingModule[];
    },
  });
}

export interface UpsertModuleInput {
  id?: string;
  campaign_id: string;
  title: string;
  summary?: string | null;
  body_md: string;
  required: boolean;
  sort_order: number;
  status: 'draft' | 'published' | 'archived';
}

export function useUpsertTrainingModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertModuleInput) => {
      const tenant = await resolveTenant();
      const { data: campaign } = await (supabase as any)
        .from('campaigns')
        .select('tenant_kind, wl_partner_id, client_lead_id, wl_client_id')
        .eq('id', input.campaign_id)
        .maybeSingle();
      const { data: user } = await supabase.auth.getUser();
      const payload = {
        ...input,
        tenant_kind: campaign?.tenant_kind ?? tenant?.tenant_kind ?? 'direct_24h',
        wl_partner_id: campaign?.wl_partner_id ?? null,
        client_lead_id: campaign?.client_lead_id ?? null,
        wl_client_id: campaign?.wl_client_id ?? null,
        created_by: user.user?.id ?? null,
      };
      if (input.id) {
        const { id, ...update } = payload;
        const { data, error } = await (supabase as any)
          .from('campaign_training_modules')
          .update(update)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any)
        .from('campaign_training_modules')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'training-modules', vars.campaign_id] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'training-coverage', vars.campaign_id] });
    },
  });
}

export function useDeleteTrainingModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, campaign_id: _campaign_id }: { id: string; campaign_id: string }) => {
      const { error } = await (supabase as any)
        .from('campaign_training_modules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'training-modules', vars.campaign_id] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'training-coverage', vars.campaign_id] });
    },
  });
}
