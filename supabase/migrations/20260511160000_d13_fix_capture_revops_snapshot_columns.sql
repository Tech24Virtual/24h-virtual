-- D-13 fix: `capture_revops_snapshot()` still references columns that don't
-- exist on two source views (inherited from the original v5-era function;
-- previously unreachable because the broken direct-vs-WL block fixed in D-11
-- short-circuited execution before this code ran).
--
-- Live error after PR #5 deploy:
--   POST /rpc/capture_revops_snapshot ... force=true
--   → {"code":"42703","message":"record \"v_ret\" has no field \"nrr_pct\""}
--
-- Verified column names on the live database:
--
--   v_exec_retention_rates exposes:
--     month_start, starting_mrr_usd, starting_active_subs, churned_mrr_usd,
--     churned_subs, revenue_churn_rate, logo_churn_rate,
--     gross_revenue_retention, net_revenue_retention, basis
--   → NOT nrr_pct / grr_pct
--
--   v_gtm_target_variance exposes (from view definition in 20260509212932):
--     period, scope, target_new_business_mrr, target_nrr, target_renewal_rate,
--     forecast_new_business_mrr, new_business_variance_pct, projected_ending_mrr
--   → NOT variance_pct
--
-- Fix: CREATE OR REPLACE with the correct column names. Function signature,
-- gating, idempotency, return type, and the D-11 direct-vs-WL fix are all
-- preserved exactly. This is the same function body shipped in
-- 20260511060500_d11_fix_capture_revops_snapshot.sql with two single-token
-- substitutions:
--   v_ret.nrr_pct       → v_ret.net_revenue_retention
--   v_ret.grr_pct       → v_ret.gross_revenue_retention
--   v.variance_pct      → v.new_business_variance_pct

CREATE OR REPLACE FUNCTION public.capture_revops_snapshot(
  p_period_start date,
  p_period_end date,
  p_label text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_forecast_snapshot_id uuid DEFAULT NULL,
  p_board_pack_ref text DEFAULT NULL,
  p_force boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_label text;
  v_existing uuid;
  v_spine record;
  v_mov record;
  v_dvw record;
  v_ret record;
  v_extras jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;
  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'period_end must be >= period_start';
  END IF;

  v_label := COALESCE(NULLIF(p_label, ''), to_char(p_period_start, 'YYYY-MM'));

  SELECT id INTO v_existing FROM public.revops_period_snapshots WHERE label = v_label;
  IF v_existing IS NOT NULL THEN
    IF NOT p_force THEN
      RAISE EXCEPTION 'snapshot already exists for label %, pass force=true to recapture', v_label;
    END IF;
    DELETE FROM public.revops_period_snapshots WHERE id = v_existing;
  END IF;

  SELECT * INTO v_spine FROM public.v_exec_mrr_spine
   WHERE month_start = date_trunc('month', p_period_start)::date;
  SELECT * INTO v_mov FROM public.v_subscription_movements
   WHERE month_start = date_trunc('month', p_period_start)::date;

  -- D-11 fix retained: v_exec_direct_vs_wl_summary is as-of-now, not month-keyed.
  SELECT
    COALESCE(SUM(CASE WHEN stream = 'direct' THEN known_mrr_usd END), 0)          AS direct_mrr,
    COALESCE(SUM(CASE WHEN stream = 'wl'     THEN wl_recurring_proxy_usd END), 0) AS wl_mrr_proxy
   INTO v_dvw
   FROM public.v_exec_direct_vs_wl_summary;

  SELECT * INTO v_ret FROM public.v_exec_retention_rates
   WHERE month_start = date_trunc('month', p_period_start)::date;

  v_extras := jsonb_build_object(
    'sources', jsonb_build_array(
      'v_exec_mrr_spine','v_subscription_movements','v_exec_direct_vs_wl_summary',
      'v_exec_retention_rates','v_open_deals_pipeline','v_renewal_workflows_pipeline',
      'v_capacity_gaps','v_gtm_target_variance'
    ),
    'captured_period', jsonb_build_object(
      'start', p_period_start,
      'end', p_period_end,
      'notes', 'direct_vs_wl_summary captured as-of capture time (not month-keyed)'
    )
  );

  INSERT INTO public.revops_period_snapshots
    (period_start_date, period_end_date, label, captured_by,
     linked_forecast_snapshot_id, linked_board_pack_ref, notes, extras)
  VALUES
    (p_period_start, p_period_end, v_label, auth.uid(),
     p_forecast_snapshot_id, p_board_pack_ref, p_notes, v_extras)
  RETURNING id INTO v_id;

  INSERT INTO public.revops_snapshot_metrics
    (snapshot_id, starting_mrr_usd, ending_mrr_usd, net_new_mrr_usd,
     new_mrr_usd, churned_mrr_usd, expansion_mrr_usd, contraction_mrr_usd,
     new_subs, churned_subs, ending_active_subs,
     nrr_pct, grr_pct, direct_mrr_usd, wl_recurring_proxy_usd)
  VALUES
    (v_id, v_spine.starting_mrr_usd, v_spine.ending_mrr_usd, v_spine.net_new_mrr_usd,
     v_mov.new_mrr_usd, v_mov.churned_mrr_usd, v_mov.expansion_mrr_usd, v_mov.contraction_mrr_usd,
     v_mov.new_subs, v_mov.churned_subs, v_spine.ending_active_subs,
     v_ret.net_revenue_retention,    -- D-13 fix: was v_ret.nrr_pct
     v_ret.gross_revenue_retention,  -- D-13 fix: was v_ret.grr_pct
     v_dvw.direct_mrr, v_dvw.wl_mrr_proxy);

  INSERT INTO public.revops_snapshot_pipeline (snapshot_id, bucket, deal_type, stage, count, weighted_count)
  SELECT v_id, 'open_deals', d.deal_type::text, d.stage::text, COUNT(*)::int, NULL
  FROM public.v_open_deals_pipeline d
  GROUP BY d.deal_type, d.stage;

  INSERT INTO public.revops_snapshot_pipeline (snapshot_id, bucket, deal_type, stage, count, weighted_count)
  SELECT v_id, 'renewal_workflows', NULL, COALESCE(stage::text, 'unknown'), COUNT(*)::int, NULL
  FROM public.v_renewal_workflows_pipeline
  GROUP BY stage;

  INSERT INTO public.revops_snapshot_capacity
    (snapshot_id, scope, function, demand, current_supply, gap_now, over_under_pct,
     gtm_target_new_mrr, gtm_forecast_new_mrr, gtm_variance_pct)
  SELECT
    v_id, g.scope, g.function, g.demand, g.current_supply, g.gap_now, g.over_under_pct,
    NULL, NULL, NULL
  FROM public.v_capacity_gaps g
  WHERE g.period = date_trunc('month', p_period_start)::date;

  INSERT INTO public.revops_snapshot_capacity
    (snapshot_id, scope, function, demand, current_supply, gap_now, over_under_pct,
     gtm_target_new_mrr, gtm_forecast_new_mrr, gtm_variance_pct)
  SELECT
    v_id, v.scope, 'gtm_new_mrr', NULL, NULL, NULL, NULL,
    v.target_new_business_mrr, v.forecast_new_business_mrr,
    v.new_business_variance_pct  -- D-13 fix: was v.variance_pct
  FROM public.v_gtm_target_variance v
  WHERE v.period = date_trunc('month', p_period_start)::date;

  RETURN v_id;
END;
$$;
