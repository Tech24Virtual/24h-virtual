
-- Phase 36: Forecast Accuracy & Calibration

-- 1) Snapshot table
CREATE TABLE public.forecast_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  label text,
  notes text,
  horizon_start date NOT NULL,
  horizon_end date NOT NULL,
  parameters jsonb NOT NULL,        -- { assumptions: {...}, probabilities: [...] }
  payload jsonb NOT NULL,           -- array of v_forecast_assembled rows at capture time
  parameters_hash text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual'  -- manual | auto
);

ALTER TABLE public.forecast_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forecast_snapshots admin all"
  ON public.forecast_snapshots FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_forecast_snapshots_generated_at ON public.forecast_snapshots(generated_at DESC);

-- 2) Capture RPC
CREATE OR REPLACE FUNCTION public.capture_forecast_snapshot(
  p_label text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_assumptions jsonb;
  v_probs jsonb;
  v_payload jsonb;
  v_horizon int;
  v_start date;
  v_end date;
  v_hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  SELECT to_jsonb(fa.*) INTO v_assumptions
    FROM public.forecast_assumptions fa WHERE assumption_key = 'default';
  SELECT COALESCE(jsonb_agg(to_jsonb(p.*) ORDER BY p.deal_type, p.stage), '[]'::jsonb) INTO v_probs
    FROM public.forecast_stage_probabilities p;
  SELECT COALESCE(jsonb_agg(to_jsonb(v.*) ORDER BY (v.month_index)), '[]'::jsonb) INTO v_payload
    FROM public.v_forecast_assembled v;

  v_horizon := COALESCE((v_assumptions->>'horizon_months')::int, 12);
  v_start := date_trunc('month', now())::date;
  v_end := (v_start + (v_horizon || ' months')::interval)::date;
  v_hash := md5(v_assumptions::text || v_probs::text);

  INSERT INTO public.forecast_snapshots
    (label, notes, horizon_start, horizon_end, parameters, payload, parameters_hash, created_by, source)
  VALUES
    (p_label, p_notes, v_start, v_end,
     jsonb_build_object('assumptions', v_assumptions, 'probabilities', v_probs),
     v_payload, v_hash, auth.uid(), 'manual')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_forecast_snapshot(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_forecast_snapshot(text, text) TO authenticated;

-- 3) Forecast vs actuals view
-- Unnests snapshot payload, joins to v_subscription_movements for completed months only.
CREATE OR REPLACE VIEW public.v_forecast_vs_actuals
WITH (security_invoker = true)
AS
WITH expanded AS (
  SELECT
    s.id AS snapshot_id,
    s.label AS snapshot_label,
    s.generated_at,
    (row_elem->>'period')::text AS period,
    (row_elem->>'month_start')::date AS month_start,
    (row_elem->>'month_index')::int AS month_index,
    NULLIF(row_elem->>'projected_base_mrr','')::numeric AS forecast_base_mrr,
    NULLIF(row_elem->>'baseline_churn_amount','')::numeric AS forecast_churn,
    NULLIF(row_elem->>'baseline_expansion_amount','')::numeric AS forecast_expansion,
    NULLIF(row_elem->>'new_business_mrr','')::numeric AS forecast_new_business,
    NULLIF(row_elem->>'projected_ending_mrr','')::numeric AS forecast_ending_mrr
  FROM public.forecast_snapshots s
  CROSS JOIN LATERAL jsonb_array_elements(s.payload) AS row_elem
)
SELECT
  e.snapshot_id,
  e.snapshot_label,
  e.generated_at,
  e.period,
  e.month_start,
  e.month_index,
  e.forecast_new_business,
  e.forecast_churn,
  e.forecast_expansion,
  e.forecast_ending_mrr,
  m.new_mrr_usd AS actual_new_business,
  m.churned_mrr_usd AS actual_churn,
  GREATEST(COALESCE(m.expansion_mrr_usd,0) - COALESCE(m.contraction_mrr_usd,0), 0) AS actual_net_expansion,
  (m.new_mrr_usd - COALESCE(e.forecast_new_business,0)) AS variance_new_business,
  (COALESCE(e.forecast_churn,0) - m.churned_mrr_usd) AS variance_churn,
  ((COALESCE(m.expansion_mrr_usd,0) - COALESCE(m.contraction_mrr_usd,0)) - COALESCE(e.forecast_expansion,0)) AS variance_expansion,
  CASE WHEN COALESCE(e.forecast_new_business,0) = 0 THEN NULL
       ELSE (m.new_mrr_usd - e.forecast_new_business) / e.forecast_new_business END AS pct_variance_new_business,
  CASE WHEN COALESCE(e.forecast_churn,0) = 0 THEN NULL
       ELSE (e.forecast_churn - m.churned_mrr_usd) / e.forecast_churn END AS pct_variance_churn,
  CASE WHEN COALESCE(e.forecast_expansion,0) = 0 THEN NULL
       ELSE ((COALESCE(m.expansion_mrr_usd,0) - COALESCE(m.contraction_mrr_usd,0)) - e.forecast_expansion) / e.forecast_expansion END AS pct_variance_expansion
FROM expanded e
JOIN public.v_subscription_movements m
  ON date_trunc('month', m.month_start)::date = e.month_start
WHERE e.month_start < date_trunc('month', now())::date;  -- only completed months

-- 4) Stage performance view (per deal_type aggregate; per-stage realized rate deferred until stage history exists)
CREATE OR REPLACE VIEW public.v_forecast_stage_performance
WITH (security_invoker = true)
AS
WITH closed_deals AS (
  SELECT
    deal_type,
    COUNT(*) FILTER (WHERE status = 'won') AS won_count,
    COUNT(*) FILTER (WHERE status = 'lost') AS lost_count,
    COUNT(*) FILTER (WHERE status IN ('won','lost')) AS decided_count
  FROM public.renewal_expansion_deals
  WHERE updated_at >= now() - interval '180 days'
    AND status IN ('won','lost')
  GROUP BY deal_type
),
configured AS (
  SELECT
    deal_type::text AS deal_type,
    AVG(probability) AS avg_configured_probability,
    COUNT(*) AS stage_count
  FROM public.forecast_stage_probabilities
  GROUP BY deal_type
)
SELECT
  c.deal_type,
  c.avg_configured_probability,
  c.stage_count,
  COALESCE(cd.decided_count, 0) AS sample_size,
  COALESCE(cd.won_count, 0) AS won_count,
  COALESCE(cd.lost_count, 0) AS lost_count,
  CASE WHEN COALESCE(cd.decided_count,0) = 0 THEN NULL
       ELSE cd.won_count::numeric / cd.decided_count END AS realized_win_rate,
  CASE WHEN COALESCE(cd.decided_count,0) = 0 THEN NULL
       ELSE (cd.won_count::numeric / cd.decided_count) - c.avg_configured_probability END AS calibration_delta
FROM configured c
LEFT JOIN closed_deals cd ON cd.deal_type::text = c.deal_type;

-- 5) Assumption performance view
CREATE OR REPLACE VIEW public.v_forecast_assumption_performance
WITH (security_invoker = true)
AS
WITH recent AS (
  SELECT
    AVG(new_mrr_usd) AS avg_new_mrr,
    AVG(churned_mrr_usd) AS avg_churn_mrr,
    AVG(GREATEST(COALESCE(expansion_mrr_usd,0) - COALESCE(contraction_mrr_usd,0), 0)) AS avg_net_expansion_mrr,
    COUNT(*) AS month_count
  FROM public.v_subscription_movements
  WHERE month_start >= (date_trunc('month', now()) - interval '6 months')
    AND month_start < date_trunc('month', now())
),
base AS (
  SELECT COALESCE(SUM(known_mrr_usd), 0) AS active_mrr
  FROM public.v_subscription_mrr_summary
)
SELECT
  fa.assumption_key,
  fa.baseline_monthly_churn_rate AS configured_churn_rate,
  fa.baseline_monthly_expansion_rate AS configured_expansion_rate,
  fa.new_business_mrr_direct AS configured_new_biz_direct,
  fa.new_business_mrr_wl AS configured_new_biz_wl,
  (fa.new_business_mrr_direct + fa.new_business_mrr_wl) AS configured_new_biz_total,
  r.month_count AS sample_months,
  r.avg_new_mrr AS realized_avg_new_biz,
  r.avg_churn_mrr AS realized_avg_churn_amount,
  r.avg_net_expansion_mrr AS realized_avg_expansion_amount,
  CASE WHEN b.active_mrr > 0 THEN r.avg_churn_mrr / b.active_mrr ELSE NULL END AS realized_churn_rate,
  CASE WHEN b.active_mrr > 0 THEN r.avg_net_expansion_mrr / b.active_mrr ELSE NULL END AS realized_expansion_rate,
  CASE WHEN b.active_mrr > 0
       THEN (r.avg_churn_mrr / b.active_mrr) - fa.baseline_monthly_churn_rate END AS churn_calibration_delta,
  CASE WHEN b.active_mrr > 0
       THEN (r.avg_net_expansion_mrr / b.active_mrr) - fa.baseline_monthly_expansion_rate END AS expansion_calibration_delta,
  (r.avg_new_mrr - (fa.new_business_mrr_direct + fa.new_business_mrr_wl)) AS new_biz_calibration_delta
FROM public.forecast_assumptions fa
CROSS JOIN recent r
CROSS JOIN base b
WHERE fa.assumption_key = 'default';

-- 6) BI mirrors
CREATE OR REPLACE VIEW public.v_bi_forecast_snapshots
WITH (security_invoker = true) AS
SELECT id, generated_at, label, notes, horizon_start, horizon_end,
       parameters_hash, source, created_by
FROM public.forecast_snapshots;

CREATE OR REPLACE VIEW public.v_bi_forecast_vs_actuals
WITH (security_invoker = true) AS
SELECT * FROM public.v_forecast_vs_actuals;

CREATE OR REPLACE VIEW public.v_bi_forecast_stage_performance
WITH (security_invoker = true) AS
SELECT * FROM public.v_forecast_stage_performance;

CREATE OR REPLACE VIEW public.v_bi_forecast_assumption_performance
WITH (security_invoker = true) AS
SELECT * FROM public.v_forecast_assumption_performance;

GRANT SELECT ON public.v_forecast_vs_actuals TO authenticated;
GRANT SELECT ON public.v_forecast_stage_performance TO authenticated;
GRANT SELECT ON public.v_forecast_assumption_performance TO authenticated;
GRANT SELECT ON public.v_bi_forecast_snapshots TO authenticated;
GRANT SELECT ON public.v_bi_forecast_vs_actuals TO authenticated;
GRANT SELECT ON public.v_bi_forecast_stage_performance TO authenticated;
GRANT SELECT ON public.v_bi_forecast_assumption_performance TO authenticated;
