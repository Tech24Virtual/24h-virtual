import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignAudience, ResolvedField } from '@/lib/campaign-os/types';

/**
 * FOUNDATION HOOK — Phase 3+ Campaign OS UI. Not surfaced to any persona yet.
 *
 * ALWAYS reads through the `resolve_fields_for_audience` SECURITY DEFINER RPC
 * — never selects `campaign_fields` directly. The RPC strips internal-only
 * fields and applies audience-specific visibility rules at the database
 * boundary so internal data physically cannot reach a client/partner session.
 */
export function useCampaignFields(departmentId: string | null | undefined, audience: CampaignAudience) {
  return useQuery({
    queryKey: ['campaign-os', 'fields', departmentId, audience],
    enabled: !!departmentId,
    queryFn: async (): Promise<ResolvedField[]> => {
      const { data, error } = await (supabase as any).rpc('resolve_fields_for_audience', {
        _client_department_id: departmentId,
        _audience: audience,
      });
      if (error) throw error;
      return (data as ResolvedField[]) ?? [];
    },
  });
}
