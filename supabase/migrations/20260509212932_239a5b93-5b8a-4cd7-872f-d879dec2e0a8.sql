
-- ============================================================================
-- Phase 37 — GTM & Capacity Planning from Forecasts
-- ============================================================================

-- Enum-like check helpers via CHECK constraints (no new enums; keep simple)

-- A. CAPACITY ASSUMPTIONS --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.capacity_assumptions (
  scope text PRIMARY KEY CHECK (scope IN ('direct','wl','both')),
  csm_accounts_per_head integer NOT NULL DEFAULT 40 CHECK (csm_accounts_per_head > 0),
  support_tickets_per_agent_per_month integer NOT NULL DEFAULT 600 CHECK (support_tickets_per_agent_per_month > 0),
  implementation_projects_per_specialist integer NOT NULL DEFAULT 12 CHECK (implementation_projects_per_specialist > 0),
  wl_rollout_per_ops_head integer NOT NULL DEFAULT 4 CHECK (wl_rollout_per_ops_head > 0),
  arpu_assumption numeric(12,2) NOT NULL DEFAULT 500 CHECK (arpu_assumption > 0),
  tickets_per_account_per_month numeric(8,2) NOT NULL DEFAULT 4 CHECK (tickets_per_account_per_month >= 0),
  new_projects_per_new_account numeric(6,2) NOT NULL DEFAULT 1 CHECK (new_projects_per_new_account >= 0),
  active boolean NOT NULL DEFAULT true,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.capacity_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on capacity_assumptions"
  ON public.capacity_assumptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_capacity_assumptions_updated
  BEFORE UPDATE ON public.capacity_assumptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.capacity_assumptions (scope) VALUES ('both')
  ON CONFLICT (scope) DO NOTHING;

-- C. CAPACITY SUPPLY -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.capacity_supply (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('direct','wl','both')),
  function text NOT NULL CHECK (function IN ('csm','support','implementation','wl_ops')),
  current_headcount numeric(6,2) NOT NULL DEFAULT 0 CHECK (current_headcount >= 0),
  planned_headcount numeric(6,2) CHECK (planned_headcount IS NULL OR planned_headcount >= 0),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, function, effective_date)
);

ALTER TABLE public.capacity_supply ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on capacity_supply"
  ON public.capacity_supply
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_capacity_supply_updated
  BEFORE UPDATE ON public.capacity_supply
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_capacity_supply_scope_fn_date
  ON public.capacity_supply (scope, function, effective_date DESC);

-- E. GTM TARGETS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gtm_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period date NOT NULL,
  scope text NOT NULL CHECK (scope IN ('direct','wl','both')),
  target_new_business_mrr numeric(12,2),
  target_nrr numeric(6,4) CHECK (target_nrr IS NULL OR (target_nrr >= 0 AND target_nrr <= 3)),
  target_renewal_rate numeric(6,4) CHECK (target_renewal_rate IS NULL OR (target_renewal_rate >= 0 AND target_renewal_rate <= 1)),
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period, scope)
);

ALTER TABLE public.gtm_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on gtm_targets"
  ON public.gtm_targets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_gtm_targets_updated
  BEFORE UPDATE ON public.gtm_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_gtm_targets_period_scope
  ON public.gtm_targets (period, scope);

-- B. DEMAND DERIVATION VIEWS -----------------------------------------------
-- Approximate accounts = projected_ending_mrr / arpu_assumption
-- New accounts        = (new_business_mrr_direct + new_business_mrr_wl) / arpu_assumption
-- Implementation load = new accounts × new_projects_per_new_account
-- Support load        = active accounts × tickets_per_account_per_month
-- WL ops load         = (forecasted WL new business MRR / arpu) ÷ wl_rollout_per_ops_head

CREATE OR REPLACE VIEW public.v_capacity_demand
WITH (security_invoker = true)
AS
WITH a AS (
  SELECT * FROM public.capacity_assumptions WHERE active AND scope = 'both' LIMIT 1
)
SELECT
  f.month_start::date           AS period,
  f.period                      AS period_label,
  f.month_index,
  'both'::text                  AS scope,
  f.projected_ending_mrr,
  f.new_business_mrr_direct,
  f.new_business_mrr_wl,
  ROUND( (f.projected_ending_mrr / NULLIF(a.arpu_assumption,0))::numeric, 2)                                  AS forecasted_active_accounts,
  ROUND( ((COALESCE(f.new_business_mrr_direct,0) + COALESCE(f.new_business_mrr_wl,0))
            / NULLIF(a.arpu_assumption,0))::numeric, 2)                                                       AS forecasted_new_accounts,
  ROUND( ((f.projected_ending_mrr / NULLIF(a.arpu_assumption,0)) / a.csm_accounts_per_head)::numeric, 2)      AS needed_csm_heads,
  ROUND( (((f.projected_ending_mrr / NULLIF(a.arpu_assumption,0)) * a.tickets_per_account_per_month)
            / NULLIF(a.support_tickets_per_agent_per_month,0))::numeric, 2)                                   AS needed_support_heads,
  ROUND( (((COALESCE(f.new_business_mrr_direct,0) + COALESCE(f.new_business_mrr_wl,0))
            / NULLIF(a.arpu_assumption,0)) * a.new_projects_per_new_account
            / NULLIF(a.implementation_projects_per_specialist,0))::numeric, 2)                                AS needed_implementation_heads,
  ROUND( ((COALESCE(f.new_business_mrr_wl,0) / NULLIF(a.arpu_assumption,0))
            / NULLIF(a.wl_rollout_per_ops_head,0))::numeric, 2)                                               AS needed_wl_ops_heads,
  a.arpu_assumption,
  a.csm_accounts_per_head,
  a.tickets_per_account_per_month,
  a.support_tickets_per_agent_per_month,
  a.new_projects_per_new_account,
  a.implementation_projects_per_specialist,
  a.wl_rollout_per_ops_head
FROM public.v_forecast_assembled f
CROSS JOIN a
ORDER BY f.month_index;

-- Latest supply per (scope, function), capped to today
CREATE OR REPLACE VIEW public.v_capacity_supply_current
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (scope, function)
  scope,
  function,
  current_headcount,
  planned_headcount,
  effective_date,
  notes
FROM public.capacity_supply
WHERE effective_date <= CURRENT_DATE
ORDER BY scope, function, effective_date DESC;

-- D. GAP ANALYSIS ----------------------------------------------------------
CREATE OR REPLACE VIEW public.v_capacity_gaps
WITH (security_invoker = true)
AS
WITH demand AS (
  SELECT
    period, month_index, scope,
    needed_csm_heads,
    needed_support_heads,
    needed_implementation_heads,
    needed_wl_ops_heads
  FROM public.v_capacity_demand
),
supply AS (
  SELECT scope, function, current_headcount, planned_headcount
  FROM public.v_capacity_supply_current
),
unpivoted AS (
  SELECT period, month_index, scope, 'csm'::text AS function, needed_csm_heads AS demand FROM demand
  UNION ALL
  SELECT period, month_index, scope, 'support', needed_support_heads FROM demand
  UNION ALL
  SELECT period, month_index, scope, 'implementation', needed_implementation_heads FROM demand
  UNION ALL
  SELECT period, month_index, scope, 'wl_ops', needed_wl_ops_heads FROM demand
)
SELECT
  u.period,
  u.month_index,
  u.scope,
  u.function,
  u.demand,
  COALESCE(s.current_headcount, 0)                          AS current_supply,
  s.planned_headcount,
  ROUND((COALESCE(s.current_headcount,0) - u.demand)::numeric, 2)         AS gap_now,
  ROUND((COALESCE(s.planned_headcount, s.current_headcount, 0) - u.demand)::numeric, 2) AS gap_planned,
  CASE
    WHEN u.demand IS NULL OR u.demand = 0 THEN NULL
    ELSE ROUND(((COALESCE(s.current_headcount,0) - u.demand) / u.demand)::numeric, 4)
  END AS over_under_pct
FROM unpivoted u
LEFT JOIN supply s
  ON s.function = u.function
 AND (s.scope = u.scope OR s.scope = 'both' OR u.scope = 'both')
ORDER BY u.month_index, u.function;

-- E. GTM TARGET VARIANCE ---------------------------------------------------
CREATE OR REPLACE VIEW public.v_gtm_target_variance
WITH (security_invoker = true)
AS
SELECT
  t.period,
  t.scope,
  t.target_new_business_mrr,
  t.target_nrr,
  t.target_renewal_rate,
  COALESCE(f.new_business_mrr_direct,0) + COALESCE(f.new_business_mrr_wl,0) AS forecast_new_business_mrr,
  CASE
    WHEN t.target_new_business_mrr IS NULL OR t.target_new_business_mrr = 0 THEN NULL
    ELSE ROUND((((COALESCE(f.new_business_mrr_direct,0)+COALESCE(f.new_business_mrr_wl,0)) - t.target_new_business_mrr)
                / t.target_new_business_mrr)::numeric, 4)
  END AS new_business_variance_pct,
  f.projected_ending_mrr
FROM public.gtm_targets t
LEFT JOIN public.v_forecast_assembled f
  ON date_trunc('month', f.month_start)::date = date_trunc('month', t.period)::date
ORDER BY t.period, t.scope;

-- BI MIRRORS (admin SELECT) ------------------------------------------------
CREATE OR REPLACE VIEW public.v_bi_capacity_assumptions WITH (security_invoker = true) AS
  SELECT * FROM public.capacity_assumptions;
CREATE OR REPLACE VIEW public.v_bi_capacity_supply WITH (security_invoker = true) AS
  SELECT * FROM public.capacity_supply;
CREATE OR REPLACE VIEW public.v_bi_capacity_demand WITH (security_invoker = true) AS
  SELECT * FROM public.v_capacity_demand;
CREATE OR REPLACE VIEW public.v_bi_capacity_gaps WITH (security_invoker = true) AS
  SELECT * FROM public.v_capacity_gaps;
CREATE OR REPLACE VIEW public.v_bi_gtm_targets WITH (security_invoker = true) AS
  SELECT * FROM public.gtm_targets;
CREATE OR REPLACE VIEW public.v_bi_gtm_target_variance WITH (security_invoker = true) AS
  SELECT * FROM public.v_gtm_target_variance;

GRANT SELECT ON public.v_capacity_demand,
                 public.v_capacity_supply_current,
                 public.v_capacity_gaps,
                 public.v_gtm_target_variance,
                 public.v_bi_capacity_assumptions,
                 public.v_bi_capacity_supply,
                 public.v_bi_capacity_demand,
                 public.v_bi_capacity_gaps,
                 public.v_bi_gtm_targets,
                 public.v_bi_gtm_target_variance
              TO authenticated;
