import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string | null;
  tenant_kind: string;
  wl_partner_id: string | null;
  client_lead_id: string | null;
  wl_client_id: string | null;
  source_campaign_id: string | null;
  snapshot: any;
  created_by: string | null;
  created_at: string;
}

export function useCampaignTemplates() {
  return useQuery({
    queryKey: ['campaign-os', 'templates'],
    queryFn: async (): Promise<CampaignTemplate[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CampaignTemplate[];
    },
  });
}

export function useSaveCampaignAsTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { campaign_id: string; name: string; description?: string }) => {
      const { data, error } = await (supabase as any).rpc('save_campaign_as_template', {
        p_campaign_id: input.campaign_id,
        p_name: input.name,
        p_description: input.description ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'templates'] });
    },
  });
}

export function useCloneTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      template_id: string;
      target_department_id: string;
      new_campaign_name: string;
    }) => {
      const { data, error } = await (supabase as any).rpc('clone_template_into_department', {
        p_template_id: input.template_id,
        p_target_department_id: input.target_department_id,
        p_new_campaign_name: input.new_campaign_name,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'campaigns'] });
    },
  });
}
