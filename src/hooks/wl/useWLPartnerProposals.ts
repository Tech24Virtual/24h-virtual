import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWLPartnerId } from './useWLPartnerId';
import type { WLProposalStatus } from './wlProposalTransitions';

export interface WLPartnerProposal {
  id: string;
  partner_id: string;
  lead_id: string | null;
  created_by: string | null;
  proposal_number: string;
  title: string;
  offering_name: string | null;
  scope_summary: string | null;
  amount: number | null;
  currency: string | null;
  notes: string | null;
  status: WLProposalStatus;
  valid_until: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  accepted_by_name: string | null;
  acceptance_note: string | null;
  declined_reason: string | null;
  last_recipient_name: string | null;
  last_recipient_email: string | null;
  checklist_template: string;
  created_at: string;
  updated_at: string;
}

export interface WLPartnerProposalWithLead extends WLPartnerProposal {
  lead: { id: string; name: string; email: string; company: string | null } | null;
}

/**
 * Partner-scoped proposals list. RLS enforces tenant isolation server-side.
 * Joins linked lead for display (RLS on wl_partner_leads also gates this).
 */
export function useWLPartnerProposals() {
  const { data: partnerId, isLoading: partnerLoading } = useWLPartnerId();

  return useQuery({
    queryKey: ['wl-partner-proposals', partnerId],
    enabled: !!partnerId && !partnerLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_proposals')
        .select('*, lead:wl_partner_leads(id, name, email, company)')
        .eq('partner_id', partnerId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as WLPartnerProposalWithLead[];
    },
  });
}
