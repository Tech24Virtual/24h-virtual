
-- Phase 38 — Finance & RevOps Snapshotting / Period Close

-- 1) Header table
CREATE TABLE public.revops_period_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start_date date NOT NULL,
  period_end_date date NOT NULL,
  label text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_forecast_snapshot_id uuid REFERENCES public.forecast_snapshots(id) ON DELETE SET NULL,
  linked_board_pack_ref text,
  notes text,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT revops_period_snapshots_period_chk CHECK (period_end_date >= period_start_date),
  CONSTRAINT revops_period_snapshots_label_uniq UNIQUE (label)
);

CREATE INDEX idx_revops_snap_period ON public.revops_period_snapshots(period_start_date DESC);

ALTER TABLE public.revops_period_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revops_period_snapshots admin all"
  ON public.revops_period_snapshots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Metrics fact (one row per snapshot)
CREATE TABLE public.revops_snapshot_metrics (
  snapshot_id uuid PRIMARY KEY REFERENCES public.revops_period_snapshots(id) ON DELETE CASCADE,
  starting_mrr_usd numeric,
  ending_mrr_usd numeric,
  net_new_mrr_usd numeric,
  new_mrr_usd numeric,
  churned_mrr_usd numeric,
  expansion_mrr_usd numeric,
  contraction_mrr_usd numeric,
  new_subs integer,
  churned_subs integer,
  ending_active_subs integer,
  nrr_pct numeric,
  grr_pct numeric,
  direct_mrr_usd numeric,
  wl_recurring_proxy_usd numeric
);

ALTER TABLE public.revops_snapshot_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revops_snapshot_metrics admin all"
  ON public.revops_snapshot_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Pipeline fact (rows per stage/type bucket)
CREATE TABLE public.revops_snapshot_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.revops_period_snapshots(id) ON DELETE CASCADE,
  bucket text NOT NULL,            -- e.g. 'open_deals' | 'renewal_workflows'
  deal_type text,
  stage text,
  count integer NOT NULL DEFAULT 0,
  weighted_count numeric,
  notes text
);
CREATE INDEX idx_revops_snap_pipeline_snap ON public.revops_snapshot_pipeline(snapshot_id);

ALTER TABLE public.revops_snapshot_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revops_snapshot_pipeline admin all"
  ON public.revops_snapshot_pipeline FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Capacity fact (rows per scope/function)
CREATE TABLE public.revops_snapshot_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.revops_period_snapshots(id) ON DELETE CASCADE,
  scope text NOT NULL,
  function text NOT NULL,
  demand numeric,
  current_supply numeric,
  gap_now numeric,
  over_under_pct numeric,
  gtm_target_new_mrr numeric,
  gtm_forecast_new_mrr numeric,
  gtm_variance_pct numeric
);
CREATE INDEX idx_revops_snap_capacity_snap ON public.revops_snapshot_capacity(snapshot_id);

ALTER TABLE public.revops_snapshot_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revops_snapshot_capacity admin all"
  ON public.revops_snapshot_capacity FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) Capture RPC
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
  SELECT
    COALESCE(SUM(CASE WHEN tier = 'direct' THEN ending_mrr_usd END), 0) AS direct_mrr,
    COALESCE(SUM(CASE WHEN tier = 'wl' THEN ending_mrr_usd END), 0)     AS wl_mrr_proxy
   INTO v_dvw
   FROM public.v_exec_direct_vs_wl_summary
   WHERE month_start = date_trunc('month', p_period_start)::date;
  SELECT * INTO v_ret FROM public.v_exec_retention_rates
   WHERE month_start = date_trunc('month', p_period_start)::date;

  v_extras := jsonb_build_object(
    'sources', jsonb_build_array(
      'v_exec_mrr_spine','v_subscription_movements','v_exec_direct_vs_wl_summary',
      'v_exec_retention_rates','v_open_deals_pipeline','v_renewal_workflows_pipeline',
      'v_capacity_gaps','v_gtm_target_variance'
    ),
    'captured_period', jsonb_build_object('start', p_period_start, 'end', p_period_end)
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

REVOKE ALL ON FUNCTION public.capture_revops_snapshot(date,date,text,text,uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_revops_snapshot(date,date,text,text,uuid,text,boolean) TO authenticated;

-- 6) Read views
CREATE OR REPLACE VIEW public.v_revops_period_snapshots
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.label,
  s.period_start_date,
  s.period_end_date,
  s.captured_at,
  s.captured_by,
  s.linked_forecast_snapshot_id,
  s.linked_board_pack_ref,
  s.notes,
  s.extras,
  m.starting_mrr_usd,
  m.ending_mrr_usd,
  m.net_new_mrr_usd,
  m.new_mrr_usd,
  m.churned_mrr_usd,
  m.expansion_mrr_usd,
  m.contraction_mrr_usd,
  m.new_subs,
  m.churned_subs,
  m.ending_active_subs,
  m.nrr_pct,
  m.grr_pct,
  m.direct_mrr_usd,
  m.wl_recurring_proxy_usd
FROM public.revops_period_snapshots s
LEFT JOIN public.revops_snapshot_metrics m ON m.snapshot_id = s.id;

CREATE OR REPLACE VIEW public.v_revops_snapshot_pipeline_summary
WITH (security_invoker = true) AS
SELECT
  p.snapshot_id,
  s.label AS snapshot_label,
  s.period_start_date,
  p.bucket,
  p.deal_type,
  p.stage,
  p.count,
  p.weighted_count
FROM public.revops_snapshot_pipeline p
JOIN public.revops_period_snapshots s ON s.id = p.snapshot_id;

CREATE OR REPLACE VIEW public.v_revops_snapshot_capacity_summary
WITH (security_invoker = true) AS
SELECT
  c.snapshot_id,
  s.label AS snapshot_label,
  s.period_start_date,
  c.scope,
  c.function,
  c.demand,
  c.current_supply,
  c.gap_now,
  c.over_under_pct,
  c.gtm_target_new_mrr,
  c.gtm_forecast_new_mrr,
  c.gtm_variance_pct
FROM public.revops_snapshot_capacity c
JOIN public.revops_period_snapshots s ON s.id = c.snapshot_id;

CREATE OR REPLACE VIEW public.v_revops_snapshot_forecast_vs_actuals
WITH (security_invoker = true) AS
SELECT
  s.id AS snapshot_id,
  s.label AS snapshot_label,
  s.period_start_date,
  s.linked_forecast_snapshot_id,
  fva.period,
  fva.month_start,
  fva.forecast_new_business,
  fva.forecast_churn,
  fva.forecast_expansion,
  fva.forecast_ending_mrr,
  fva.actual_new_business,
  fva.actual_churn,
  fva.actual_net_expansion,
  fva.variance_new_business,
  fva.variance_churn,
  fva.variance_expansion,
  fva.pct_variance_new_business,
  fva.pct_variance_churn,
  fva.pct_variance_expansion
FROM public.revops_period_snapshots s
LEFT JOIN public.v_forecast_vs_actuals fva
  ON fva.snapshot_id = s.linked_forecast_snapshot_id
 AND fva.month_start = date_trunc('month', s.period_start_date)::date;

-- 7) BI mirrors (admin only)
CREATE OR REPLACE VIEW public.v_bi_revops_period_snapshots
WITH (security_invoker = true) AS SELECT * FROM public.v_revops_period_snapshots;

CREATE OR REPLACE VIEW public.v_bi_revops_snapshot_pipeline_summary
WITH (security_invoker = true) AS SELECT * FROM public.v_revops_snapshot_pipeline_summary;

CREATE OR REPLACE VIEW public.v_bi_revops_snapshot_capacity_summary
WITH (security_invoker = true) AS SELECT * FROM public.v_revops_snapshot_capacity_summary;

CREATE OR REPLACE VIEW public.v_bi_revops_snapshot_forecast_vs_actuals
WITH (security_invoker = true) AS SELECT * FROM public.v_revops_snapshot_forecast_vs_actuals;

GRANT SELECT ON public.v_bi_revops_period_snapshots TO authenticated;
GRANT SELECT ON public.v_bi_revops_snapshot_pipeline_summary TO authenticated;
GRANT SELECT ON public.v_bi_revops_snapshot_capacity_summary TO authenticated;
GRANT SELECT ON public.v_bi_revops_snapshot_forecast_vs_actuals TO authenticated;
