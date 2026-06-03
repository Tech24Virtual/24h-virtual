import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWLPartnerId } from './useWLPartnerId';

export type WLPipelineStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type WLTemperature = 'hot' | 'warm' | 'cold';

export interface WLPartnerLead {
  id: string;
  partner_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  pipeline_stage: WLPipelineStage;
  temperature: WLTemperature | null;
  source: string | null;
  service_interest: string | null;
  estimated_value: number | null;
  currency: string | null;
  assigned_to: string | null;
  notes: string | null;
  next_followup_at: string | null;
  last_activity_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Partner-scoped leads query. RLS enforces tenant isolation server-side; we also
 * filter by partner_id client-side as defense-in-depth and to keep cache keys clean.
 */
export function useWLPartnerLeads() {
  const { data: partnerId, isLoading: partnerLoading } = useWLPartnerId();

  return useQuery({
    queryKey: ['wl-partner-leads', partnerId],
    enabled: !!partnerId && !partnerLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_leads')
        .select('*')
        .eq('partner_id', partnerId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as WLPartnerLead[];
    },
  });
}
