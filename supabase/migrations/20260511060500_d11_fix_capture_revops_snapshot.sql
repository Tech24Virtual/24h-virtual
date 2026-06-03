-- D-11 fix: `capture_revops_snapshot()` queried non-existent columns on
-- `v_exec_direct_vs_wl_summary`.
--
-- The original SELECT block (migration 20260510021549, lines 142-147) was:
--   SELECT
--     COALESCE(SUM(CASE WHEN tier = 'direct' THEN ending_mrr_usd END), 0) AS direct_mrr,
--     COALESCE(SUM(CASE WHEN tier = 'wl'     THEN ending_mrr_usd END), 0) AS wl_mrr_proxy
--    INTO v_dvw
--    FROM public.v_exec_direct_vs_wl_summary
--    WHERE month_start = date_trunc('month', p_period_start)::date;
--
-- But `v_exec_direct_vs_wl_summary` (defined in 20260508212348) exposes:
--   stream, active_subs, canceled_subs, known_mrr_usd, wl_recurring_proxy_usd,
--   new_subs_30d, churned_subs_30d, churned_mrr_30d, basis
-- — there is no `tier`, no `ending_mrr_usd`, and the view is not month-keyed.
-- Calling the RPC raised: 42703 column "tier" does not exist.
--
-- Fix:
--  - Use the view's real columns: `stream` (∈ {'direct','wl'}), `known_mrr_usd`,
--    `wl_recurring_proxy_usd`.
--  - Drop the `WHERE month_start = ...` filter — the view is an as-of-now
--    snapshot, not month-keyed. The captured value is the direct-vs-WL split
--    at capture time, which is the contract this view documents.
--  - Record this honestly in `extras.captured_period.notes`.
--
-- Everything else in the function (signature, gating, idempotency, return type,
-- grants) is preserved exactly. This is a pure CREATE OR REPLACE.

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

  -- Pull canonical metrics
  SELECT * INTO v_spine FROM public.v_exec_mrr_spine
   WHERE month_start = date_trunc('month', p_period_start)::date;
  SELECT * INTO v_mov FROM public.v_subscription_movements
   WHERE month_start = date_trunc('month', p_period_start)::date;

  -- D-11 fix: v_exec_direct_vs_wl_summary is an as-of-capture snapshot keyed
  -- by `stream` ∈ {'direct','wl'}, with `known_mrr_usd` and
  -- `wl_recurring_proxy_usd` columns. It is NOT month-keyed, so we do not
  -- filter by month here. The captured value represents the direct/WL split
  -- at capture time, which is the contract the view documents.
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

  -- Header
  INSERT INTO public.revops_period_snapshots
    (period_start_date, period_end_date, label, captured_by,
     linked_forecast_snapshot_id, linked_board_pack_ref, notes, extras)
  VALUES
    (p_period_start, p_period_end, v_label, auth.uid(),
     p_forecast_snapshot_id, p_board_pack_ref, p_notes, v_extras)
  RETURNING id INTO v_id;

  -- Metrics
  INSERT INTO public.revops_snapshot_metrics
    (snapshot_id, starting_mrr_usd, ending_mrr_usd, net_new_mrr_usd,
     new_mrr_usd, churned_mrr_usd, expansion_mrr_usd, contraction_mrr_usd,
     new_subs, churned_subs, ending_active_subs,
     nrr_pct, grr_pct, direct_mrr_usd, wl_recurring_proxy_usd)
  VALUES
    (v_id, v_spine.starting_mrr_usd, v_spine.ending_mrr_usd, v_spine.net_new_mrr_usd,
     v_mov.new_mrr_usd, v_mov.churned_mrr_usd, v_mov.expansion_mrr_usd, v_mov.contraction_mrr_usd,
     v_mov.new_subs, v_mov.churned_subs, v_spine.ending_active_subs,
     v_ret.nrr_pct, v_ret.grr_pct, v_dvw.direct_mrr, v_dvw.wl_mrr_proxy);

  -- Pipeline: open deals by deal_type × stage at capture time
  INSERT INTO public.revops_snapshot_pipeline (snapshot_id, bucket, deal_type, stage, count, weighted_count)
  SELECT v_id, 'open_deals', d.deal_type::text, d.stage::text, COUNT(*)::int, NULL
  FROM public.v_open_deals_pipeline d
  GROUP BY d.deal_type, d.stage;

  -- Pipeline: renewal workflows by stage
  INSERT INTO public.revops_snapshot_pipeline (snapshot_id, bucket, deal_type, stage, count, weighted_count)
  SELECT v_id, 'renewal_workflows', NULL, COALESCE(stage::text, 'unknown'), COUNT(*)::int, NULL
  FROM public.v_renewal_workflows_pipeline
  GROUP BY stage;

  -- Capacity: gaps for the snapshot's month + GTM variance
  INSERT INTO public.revops_snapshot_capacity
    (snapshot_id, scope, function, demand, current_supply, gap_now, over_under_pct,
     gtm_target_new_mrr, gtm_forecast_new_mrr, gtm_variance_pct)
  SELECT
    v_id,
    g.scope,
    g.function,
    g.demand,
    g.current_supply,
    g.gap_now,
    g.over_under_pct,
    NULL, NULL, NULL
  FROM public.v_capacity_gaps g
  WHERE g.period = date_trunc('month', p_period_start)::date;

  -- GTM variance summary as a separate scope='gtm' row per scope
  INSERT INTO public.revops_snapshot_capacity
    (snapshot_id, scope, function, demand, current_supply, gap_now, over_under_pct,
     gtm_target_new_mrr, gtm_forecast_new_mrr, gtm_variance_pct)
  SELECT
    v_id, v.scope, 'gtm_new_mrr', NULL, NULL, NULL, NULL,
    v.target_new_business_mrr, v.forecast_new_business_mrr, v.variance_pct
  FROM public.v_gtm_target_variance v
  WHERE v.period = date_trunc('month', p_period_start)::date;

  RETURN v_id;
END;
$$;

-- Grants are preserved from migration 20260510021549; CREATE OR REPLACE
-- keeps existing privileges intact, so we do not need to re-issue REVOKE/GRANT.
