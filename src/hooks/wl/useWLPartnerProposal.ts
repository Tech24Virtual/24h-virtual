import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WLPartnerProposalWithLead } from './useWLPartnerProposals';

export function useWLPartnerProposal(id: string | undefined) {
  return useQuery({
    queryKey: ['wl-partner-proposal', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_proposals')
        .select('*, lead:wl_partner_leads(id, name, email, company)')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return (data as unknown) as WLPartnerProposalWithLead | null;
    },
  });
}
