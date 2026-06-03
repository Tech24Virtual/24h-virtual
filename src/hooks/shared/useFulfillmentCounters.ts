/**
 * Phase 7 — Audience-scoped fulfillment counters.
 *
 * Admin/supervisor → reads internal_fulfillment_intakes (RLS-scoped).
 * Partner → reads wl_partner_onboarding_handoffs (RLS-scoped).
 *
 * Defensive: the partner branch ignores any caller-supplied partnerId and
 * relies on RLS to enforce isolation. No client-controlled partner filter.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AGING_THRESHOLDS } from '@/lib/wl/fulfillmentLifecycle';

export type FulfillmentAudience = 'admin' | 'supervisor' | 'partner';

export interface FulfillmentCounters {
  new: number;
  under_review: number;
  needs_info: number;
  activated_this_month: number;
  aging_over_48h: number;
  recent_resubmissions: number;
  approved: number;
  activation_in_progress: number;
}

export function useFulfillmentCounters(args: { audience: FulfillmentAudience }) {
  const { audience } = args;
  return useQuery({
    queryKey: ['fulfillment-counters', audience],
    staleTime: 30_000,
    queryFn: async (): Promise<FulfillmentCounters> => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const agingCutoff = new Date(
        Date.now() - AGING_THRESHOLDS.under_review_hours * 60 * 60 * 1000,
      );
      const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      if (audience === 'admin' || audience === 'supervisor') {
        const { data, error } = await supabase
          .from('internal_fulfillment_intakes')
          .select('status, submitted_at, activated_at, updated_at, source_handoff_id');
        if (error) throw error;
        const list = data ?? [];
        // Recent resubmissions: read from partner-side handoffs (resubmitted status)
        const { data: resubs } = await supabase
          .from('wl_partner_onboarding_handoffs')
          .select('last_resubmitted_at')
          .gte('last_resubmitted_at', recentCutoff.toISOString());
        return {
          new: list.filter((i) => i.status === 'new_submission').length,
          under_review: list.filter((i) => i.status === 'under_review').length,
          needs_info: list.filter((i) => i.status === 'needs_partner_update').length,
          approved: list.filter((i) => i.status === 'approved').length,
          activation_in_progress: list.filter(
            (i) => i.status === 'activation_in_progress',
          ).length,
          activated_this_month: list.filter(
            (i) => i.activated_at && new Date(i.activated_at) >= monthStart,
          ).length,
          aging_over_48h: list.filter(
            (i) =>
              i.status === 'under_review' &&
              i.updated_at &&
              new Date(i.updated_at) < agingCutoff,
          ).length,
          recent_resubmissions: (resubs ?? []).length,
        };
      }

      // partner — RLS scopes to the caller's partner_id
      const { data, error } = await supabase
        .from('wl_partner_onboarding_handoffs')
        .select('submission_status, last_resubmitted_at, completed_at, updated_at');
      if (error) throw error;
      const list = data ?? [];
      return {
        new: list.filter((i) => i.submission_status === 'submitted_to_fulfillment').length,
        under_review: list.filter((i) =>
          ['submitted_to_fulfillment', 'resubmitted'].includes(i.submission_status ?? ''),
        ).length,
        needs_info: list.filter((i) => i.submission_status === 'needs_more_info').length,
        approved: list.filter((i) => i.submission_status === 'approved_for_activation').length,
        activation_in_progress: list.filter(
          (i) => i.submission_status === 'activation_in_progress',
        ).length,
        activated_this_month: list.filter(
          (i) => i.completed_at && new Date(i.completed_at) >= monthStart,
        ).length,
        aging_over_48h: 0,
        recent_resubmissions: list.filter(
          (i) =>
            i.last_resubmitted_at &&
            new Date(i.last_resubmitted_at) >= recentCutoff,
        ).length,
      };
    },
  });
}
