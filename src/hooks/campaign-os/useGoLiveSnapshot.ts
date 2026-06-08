import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GoLiveSnapshot {
  campaign_id: string;
  all_ok: boolean;
  faqs_ok: boolean;
  policies_ok: boolean;
  training_ok: boolean;
  script_published: boolean;
  supervisor_approved: boolean;
  supervisor_approved_at: string | null;
  supervisor_approved_by: string | null;
  client_confirmed: boolean;
  client_confirmed_at: string | null;
  five9_ok: boolean;
  last_evaluated_at: string;
}

/**
 * Reads the most recent persisted readiness snapshot for a campaign.
 * Distinct from `useGoLiveChecks` (which is a live view): the snapshot is
 * what the trigger-driven regression notifier compares against, so it tells
 * us "what state was this campaign in the last time something changed?".
 */
export function useGoLiveSnapshot(campaignId?: string | null) {
  return useQuery({
    queryKey: ['campaign-os', 'go-live-snapshot', campaignId ?? 'none'],
    enabled: !!campaignId,
    queryFn: async (): Promise<GoLiveSnapshot | null> => {
      const { data, error } = await (supabase as any)
        .from('campaign_go_live_status_snapshots')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as GoLiveSnapshot | null;
    },
  });
}
