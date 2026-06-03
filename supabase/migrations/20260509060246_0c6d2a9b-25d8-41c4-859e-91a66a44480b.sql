
-- Stage probabilities table
CREATE TABLE IF NOT EXISTS public.forecast_stage_probabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_type deal_type NOT NULL,
  stage deal_stage NOT NULL,
  probability numeric(5,4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_type, stage)
);

ALTER TABLE public.forecast_stage_probabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on forecast_stage_probabilities"
  ON public.forecast_stage_probabilities
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_forecast_stage_probabilities_updated
  BEFORE UPDATE ON public.forecast_stage_probabilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Forecast assumptions (singleton-style)
CREATE TABLE IF NOT EXISTS public.forecast_assumptions (
  assumption_key text PRIMARY KEY DEFAULT 'default',
  baseline_monthly_churn_rate numeric(6,4) NOT NULL DEFAULT 0.025,
  baseline_monthly_expansion_rate numeric(6,4) NOT NULL DEFAULT 0.005,
  new_business_mrr_direct numeric(12,2) NOT NULL DEFAULT 0,
  new_business_mrr_wl numeric(12,2) NOT NULL DEFAULT 0,
  horizon_months integer NOT NULL DEFAULT 12 CHECK (horizon_months BETWEEN 1 AND 24),
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forecast_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on forecast_assumptions"
  ON public.forecast_assumptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_forecast_assumptions_updated
  BEFORE UPDATE ON public.forecast_assumptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default stage probabilities (idempotent)
INSERT INTO public.forecast_stage_probabilities (deal_type, stage, probability) VALUES
  ('renewal','identified',0.5000),
  ('renewal','outreach_started',0.5500),
  ('renewal','proposal_prepared',0.6000),
  ('renewal','proposal_sent',0.7000),
  ('renewal','negotiation',0.7500),
  ('renewal','verbally_approved',0.9000),
  ('renewal','implemented',1.0000),
  ('renewal','closed_won',1.0000),
  ('renewal','closed_lost',0.0000),
  ('renewal','deferred',0.3000),
  ('expansion','identified',0.1000),
  ('expansion','outreach_started',0.1500),
  ('expansion','proposal_prepared',0.2500),
  ('expansion','proposal_sent',0.4000),
  ('expansion','negotiation',0.5500),
  ('expansion','verbally_approved',0.8500),
  ('expansion','implemented',1.0000),
  ('expansion','closed_won',1.0000),
  ('expansion','closed_lost',0.0000),
  ('expansion','deferred',0.1000),
  ('downsell','identified',0.4000),
  ('downsell','outreach_started',0.4500),
  ('downsell','proposal_prepared',0.5500),
  ('downsell','proposal_sent',0.6500),
  ('downsell','negotiation',0.7000),
  ('downsell','verbally_approved',0.8500),
  ('downsell','implemented',1.0000),
  ('downsell','closed_won',1.0000),
  ('downsell','closed_lost',0.0000),
  ('downsell','deferred',0.2000),
  ('save','identified',0.3000),
  ('save','outreach_started',0.4000),
  ('save','proposal_prepared',0.5000),
  ('save','proposal_sent',0.6000),
  ('save','negotiation',0.7000),
  ('save','verbally_approved',0.9000),
  ('save','implemented',1.0000),
  ('save','closed_won',1.0000),
  ('save','closed_lost',0.0000),
  ('save','deferred',0.2000)
ON CONFLICT (deal_type, stage) DO NOTHING;

INSERT INTO public.forecast_assumptions (assumption_key) VALUES ('default')
ON CONFLICT (assumption_key) DO NOTHING;

-- Horizon helper view: 12 months from current month
CREATE OR REPLACE VIEW public.v_forecast_horizon
WITH (security_invoker = true) AS
WITH a AS (SELECT horizon_months FROM public.forecast_assumptions WHERE assumption_key='default')
SELECT
  gs::date AS month_start,
  (gs + interval '1 month' - interval '1 day')::date AS month_end,
  to_char(gs,'YYYY-MM') AS period,
  ROW_NUMBER() OVER (ORDER BY gs)::int AS month_index
FROM a, generate_series(
  date_trunc('month', now()),
  date_trunc('month', now()) + ((a.horizon_months - 1) || ' months')::interval,
  interval '1 month'
) gs;

-- Existing base projection (carry current active MRR forward with baseline churn)
CREATE OR REPLACE VIEW public.v_forecast_existing_base
WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    COALESCE(SUM(mrr_usd) FILTER (WHERE subscription_state='active'), 0)::numeric AS starting_mrr
  FROM public.v_subscription_snapshot
),
a AS (SELECT baseline_monthly_churn_rate, baseline_monthly_expansion_rate FROM public.forecast_assumptions WHERE assumption_key='default'),
h AS (SELECT * FROM public.v_forecast_horizon)
SELECT
  h.period,
  h.month_start,
  h.month_index,
  ROUND(base.starting_mrr * power(1 - a.baseline_monthly_churn_rate + a.baseline_monthly_expansion_rate, h.month_index - 1)::numeric, 2) AS projected_base_mrr,
  ROUND(base.starting_mrr::numeric, 2) AS starting_mrr,
  a.baseline_monthly_churn_rate,
  a.baseline_monthly_expansion_rate
FROM h CROSS JOIN base CROSS JOIN a;

-- Renewals due per month, weighted by linked deal stage probability if any
CREATE OR REPLACE VIEW public.v_forecast_renewals
WITH (security_invoker = true) AS
WITH h AS (SELECT * FROM public.v_forecast_horizon),
rw AS (
  SELECT
    rw.id, rw.renewal_date, rw.stage AS workflow_stage,
    date_trunc('month', rw.renewal_date)::date AS month_start
  FROM public.renewal_workflows rw
  WHERE rw.renewal_date >= date_trunc('month', now())
    AND rw.renewal_date < date_trunc('month', now()) + interval '24 months'
    AND rw.stage NOT IN ('renewed','downgraded','churned','lapsed')
),
linked AS (
  SELECT d.related_renewal_workflow_id AS rw_id,
         COALESCE(p.probability, 0.5) AS prob
  FROM public.renewal_expansion_deals d
  LEFT JOIN public.forecast_stage_probabilities p
    ON p.deal_type = d.deal_type AND p.stage = d.stage
  WHERE d.related_renewal_workflow_id IS NOT NULL
    AND d.status = 'open'
)
SELECT
  h.period,
  h.month_start,
  h.month_index,
  COUNT(rw.id)::int                                              AS renewals_due,
  COUNT(rw.id) FILTER (WHERE l.rw_id IS NOT NULL)::int           AS renewals_with_open_deal,
  COALESCE(ROUND(SUM(COALESCE(l.prob, 0.85))::numeric, 4), 0)    AS weighted_expected_renewed_count,
  COUNT(rw.id) - COALESCE(ROUND(SUM(COALESCE(l.prob, 0.85))::numeric, 4), 0)
                                                                 AS weighted_expected_lost_count
FROM h
LEFT JOIN rw ON rw.month_start = h.month_start
LEFT JOIN linked l ON l.rw_id = rw.id
GROUP BY h.period, h.month_start, h.month_index
ORDER BY h.month_index;

-- Expansion deals weighted by stage probability and expected close month
CREATE OR REPLACE VIEW public.v_forecast_expansion_deals
WITH (security_invoker = true) AS
WITH h AS (SELECT * FROM public.v_forecast_horizon),
deals AS (
  SELECT
    d.id, d.deal_type, d.stage, d.expected_close_date,
    COALESCE(p.probability, 0.2) AS prob,
    COALESCE(date_trunc('month', d.expected_close_date)::date,
             date_trunc('month', d.stage_changed_at + interval '30 days')::date) AS month_start
  FROM public.renewal_expansion_deals d
  LEFT JOIN public.forecast_stage_probabilities p
    ON p.deal_type = d.deal_type AND p.stage = d.stage
  WHERE d.status = 'open'
    AND d.deal_type IN ('expansion','downsell','save')
)
SELECT
  h.period,
  h.month_start,
  h.month_index,
  COUNT(d.id) FILTER (WHERE d.deal_type='expansion')::int                                  AS expansion_deals_open,
  COALESCE(ROUND(SUM(d.prob) FILTER (WHERE d.deal_type='expansion')::numeric, 4), 0)       AS weighted_expansion_count,
  COUNT(d.id) FILTER (WHERE d.deal_type='downsell')::int                                   AS downsell_deals_open,
  COALESCE(ROUND(SUM(d.prob) FILTER (WHERE d.deal_type='downsell')::numeric, 4), 0)        AS weighted_downsell_count,
  COUNT(d.id) FILTER (WHERE d.deal_type='save')::int                                       AS save_deals_open,
  COALESCE(ROUND(SUM(d.prob) FILTER (WHERE d.deal_type='save')::numeric, 4), 0)            AS weighted_save_count
FROM h
LEFT JOIN deals d ON d.month_start = h.month_start
GROUP BY h.period, h.month_start, h.month_index
ORDER BY h.month_index;

-- Assembled monthly forecast
CREATE OR REPLACE VIEW public.v_forecast_assembled
WITH (security_invoker = true) AS
WITH a AS (
  SELECT new_business_mrr_direct, new_business_mrr_wl,
         baseline_monthly_churn_rate, baseline_monthly_expansion_rate
  FROM public.forecast_assumptions WHERE assumption_key='default'
)
SELECT
  b.period,
  b.month_start,
  b.month_index,
  b.starting_mrr,
  b.projected_base_mrr,
  ROUND((b.projected_base_mrr * a.baseline_monthly_churn_rate)::numeric, 2)        AS baseline_churn_amount,
  ROUND((b.projected_base_mrr * a.baseline_monthly_expansion_rate)::numeric, 2)    AS baseline_expansion_amount,
  ROUND((a.new_business_mrr_direct + a.new_business_mrr_wl)::numeric, 2)           AS new_business_mrr,
  a.new_business_mrr_direct,
  a.new_business_mrr_wl,
  ROUND((b.projected_base_mrr
       + a.new_business_mrr_direct + a.new_business_mrr_wl
       + (b.projected_base_mrr * a.baseline_monthly_expansion_rate)
       - (b.projected_base_mrr * a.baseline_monthly_churn_rate))::numeric, 2)      AS projected_ending_mrr,
  r.renewals_due,
  r.weighted_expected_renewed_count,
  r.weighted_expected_lost_count,
  e.expansion_deals_open,
  e.weighted_expansion_count,
  e.downsell_deals_open,
  e.weighted_downsell_count,
  e.save_deals_open,
  e.weighted_save_count
FROM public.v_forecast_existing_base b
CROSS JOIN a
LEFT JOIN public.v_forecast_renewals r ON r.month_index = b.month_index
LEFT JOIN public.v_forecast_expansion_deals e ON e.month_index = b.month_index
ORDER BY b.month_index;

-- BI mirrors
CREATE OR REPLACE VIEW public.v_bi_forecast_existing_base    WITH (security_invoker=true) AS SELECT * FROM public.v_forecast_existing_base;
CREATE OR REPLACE VIEW public.v_bi_forecast_renewals         WITH (security_invoker=true) AS SELECT * FROM public.v_forecast_renewals;
CREATE OR REPLACE VIEW public.v_bi_forecast_expansion_deals  WITH (security_invoker=true) AS SELECT * FROM public.v_forecast_expansion_deals;
CREATE OR REPLACE VIEW public.v_bi_forecast_assembled        WITH (security_invoker=true) AS SELECT * FROM public.v_forecast_assembled;
CREATE OR REPLACE VIEW public.v_bi_forecast_stage_probabilities WITH (security_invoker=true) AS SELECT * FROM public.forecast_stage_probabilities;
CREATE OR REPLACE VIEW public.v_bi_forecast_assumptions      WITH (security_invoker=true) AS SELECT * FROM public.forecast_assumptions;

GRANT SELECT ON
  public.v_forecast_horizon,
  public.v_forecast_existing_base,
  public.v_forecast_renewals,
  public.v_forecast_expansion_deals,
  public.v_forecast_assembled,
  public.v_bi_forecast_existing_base,
  public.v_bi_forecast_renewals,
  public.v_bi_forecast_expansion_deals,
  public.v_bi_forecast_assembled,
  public.v_bi_forecast_stage_probabilities,
  public.v_bi_forecast_assumptions
  TO authenticated;
