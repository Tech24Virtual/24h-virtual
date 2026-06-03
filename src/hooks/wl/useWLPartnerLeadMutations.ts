import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWLPartnerId } from './useWLPartnerId';
import { toast } from 'sonner';
import type { WLPartnerLead, WLPipelineStage, WLTemperature } from './useWLPartnerLeads';

export interface WLLeadInput {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  pipeline_stage?: WLPipelineStage;
  temperature?: WLTemperature | null;
  source?: string | null;
  service_interest?: string | null;
  estimated_value?: number | null;
  currency?: string | null;
  notes?: string | null;
  next_followup_at?: string | null;
}

export function useWLPartnerLeadMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: partnerId } = useWLPartnerId();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['wl-partner-leads', partnerId] });
  };

  const createLead = useMutation({
    mutationFn: async (input: WLLeadInput) => {
      if (!partnerId) throw new Error('No partner context');
      const { data, error } = await supabase
        .from('wl_partner_leads')
        .insert({
          ...input,
          partner_id: partnerId,
          created_by: user?.id ?? null,
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as WLPartnerLead;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Lead created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WLLeadInput> }) => {
      const { data, error } = await supabase
        .from('wl_partner_leads')
        .update({ ...updates, last_activity_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as WLPartnerLead;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Lead updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: WLPipelineStage }) => {
      const { error } = await supabase
        .from('wl_partner_leads')
        .update({ pipeline_stage: stage, last_activity_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTemperature = useMutation({
    mutationFn: async ({ id, temperature }: { id: string; temperature: WLTemperature | null }) => {
      const { error } = await supabase
        .from('wl_partner_leads')
        .update({ temperature, last_activity_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wl_partner_leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Lead deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createLead, updateLead, updateStage, updateTemperature, deleteLead };
}
