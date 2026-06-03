
-- ── Phase 28.A — pricing_experiments method/governance fields ─
ALTER TABLE public.pricing_experiments
  ADD COLUMN IF NOT EXISTS allocation_mode TEXT NOT NULL DEFAULT 'fixed'
    CHECK (allocation_mode IN ('fixed','bandit','sequential')),
  ADD COLUMN IF NOT EXISTS bandit_algorithm TEXT NOT NULL DEFAULT 'thompson'
    CHECK (bandit_algorithm IN ('thompson','ucb1')),
  ADD COLUMN IF NOT EXISTS max_exposure_per_variant INTEGER,
  ADD COLUMN IF NOT EXISTS kill_switch_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sequential_looks INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS min_effect_size NUMERIC,
  ADD COLUMN IF NOT EXISTS loss_threshold_pct NUMERIC;

-- ── Phase 28.B — Allocation log (append-only) ─────────────────
CREATE TABLE IF NOT EXISTS public.experiment_allocation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.pricing_experiments(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  weight NUMERIC,
  sample_size_at_decision INTEGER,
  reward_count_at_decision INTEGER,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alloc_log_exp_time
  ON public.experiment_allocation_log(experiment_id, created_at DESC);

ALTER TABLE public.experiment_allocation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alloc_log_admin_all" ON public.experiment_allocation_log;
CREATE POLICY "alloc_log_admin_all"
  ON public.experiment_allocation_log
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated to insert (selection engine logs from client) ─
DROP POLICY IF EXISTS "alloc_log_authenticated_insert" ON public.experiment_allocation_log;
CREATE POLICY "alloc_log_authenticated_insert"
  ON public.experiment_allocation_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── Phase 28.C — Allocation view (per-variant cumulative reward) ─
CREATE OR REPLACE VIEW public.v_experiment_allocation
WITH (security_invoker = true)
AS
WITH base AS (
  SELECT
    r.experiment_id,
    r.experiment_name,
    r.experiment_status,
    r.variant_key,
    r.leads_assigned,
    r.leads_converted,
    e.allocation_mode,
    e.bandit_algorithm,
    e.max_exposure_per_variant,
    e.kill_switch_active,
    e.min_sample_per_variant
  FROM public.v_pricing_experiment_results r
  JOIN public.pricing_experiments e ON e.id = r.experiment_id
)
SELECT
  b.experiment_id,
  b.experiment_name,
  b.experiment_status,
  b.allocation_mode,
  b.bandit_algorithm,
  b.kill_switch_active,
  b.max_exposure_per_variant,
  b.min_sample_per_variant,
  b.variant_key,
  b.leads_assigned,
  b.leads_converted,
  -- Beta-Bernoulli posterior with uniform prior Beta(1,1):
  -- alpha = 1 + conversions, beta = 1 + (assigned - conversions)
  (1 + b.leads_converted)::numeric AS posterior_alpha,
  (1 + GREATEST(b.leads_assigned - b.leads_converted, 0))::numeric AS posterior_beta,
  CASE WHEN b.leads_assigned > 0
       THEN b.leads_converted::numeric / b.leads_assigned
       ELSE NULL END AS conversion_rate,
  -- mean of Beta(α,β) = α/(α+β)
  ((1 + b.leads_converted)::numeric
    / NULLIF(((1 + b.leads_converted) + (1 + GREATEST(b.leads_assigned - b.leads_converted, 0)))::numeric, 0)
  ) AS posterior_mean,
  CASE
    WHEN b.max_exposure_per_variant IS NOT NULL
         AND b.leads_assigned >= b.max_exposure_per_variant THEN true
    ELSE false
  END AS max_exposure_reached
FROM base b;

-- ── Phase 28.D — Replace v_experiment_decisions w/ allocation aware ─
DROP VIEW IF EXISTS public.v_bi_experiment_decisions;
DROP VIEW IF EXISTS public.v_experiment_decisions;

CREATE OR REPLACE VIEW public.v_experiment_decisions
WITH (security_invoker = true)
AS
WITH base AS (
  SELECT
    r.experiment_id,
    r.experiment_name,
    r.experiment_status,
    r.variant_key,
    r.assignments,
    r.leads_assigned,
    r.leads_converted,
    r.active_subs,
    r.active_known_mrr_usd,
    r.avg_active_known_mrr_usd,
    e.min_sample_per_variant,
    e.primary_metric,
    e.variants,
    e.allocation_mode,
    e.bandit_algorithm,
    e.max_exposure_per_variant,
    e.kill_switch_active,
    e.sequential_looks,
    e.loss_threshold_pct
  FROM public.v_pricing_experiment_results r
  JOIN public.pricing_experiments e ON e.id = r.experiment_id
),
control AS (
  SELECT experiment_id,
         leads_assigned AS c_n,
         leads_converted AS c_x
  FROM base
  WHERE variant_key = 'control'
),
joined AS (
  SELECT b.*, c.c_n, c.c_x,
    CASE WHEN b.leads_assigned > 0 THEN b.leads_converted::numeric / b.leads_assigned ELSE NULL END AS p_variant,
    CASE WHEN c.c_n > 0 THEN c.c_x::numeric / c.c_n ELSE NULL END AS p_control
  FROM base b
  LEFT JOIN control c ON c.experiment_id = b.experiment_id
),
scored AS (
  SELECT j.*,
    CASE
      WHEN j.variant_key = 'control' THEN NULL
      WHEN j.p_variant IS NULL OR j.p_control IS NULL THEN NULL
      WHEN ((j.p_variant * (1 - j.p_variant) / NULLIF(j.leads_assigned,0))
          + (j.p_control * (1 - j.p_control) / NULLIF(j.c_n,0))) <= 0 THEN NULL
      ELSE (j.p_variant - j.p_control) /
           sqrt((j.p_variant * (1 - j.p_variant) / NULLIF(j.leads_assigned,0))
              + (j.p_control * (1 - j.p_control) / NULLIF(j.c_n,0)))
    END AS z_score
  FROM joined j
),
-- Pocock-style bonferroni boundary: alpha_per_look = 0.05 / sequential_looks
-- two-sided z critical = ±qnorm(1 - alpha/2). For looks=5 → ~2.807.
-- We approximate with sqrt(2)*erfinv(...) using numeric constants table.
seq_bound AS (
  SELECT
    s.*,
    CASE s.sequential_looks
      WHEN 1 THEN 1.96
      WHEN 2 THEN 2.24
      WHEN 3 THEN 2.39
      WHEN 4 THEN 2.49
      WHEN 5 THEN 2.57
      WHEN 6 THEN 2.64
      WHEN 7 THEN 2.69
      WHEN 8 THEN 2.74
      WHEN 9 THEN 2.78
      ELSE 2.81
    END AS sequential_z_critical
  FROM scored s
)
SELECT
  s.experiment_id,
  s.experiment_name,
  s.experiment_status,
  s.allocation_mode,
  s.bandit_algorithm,
  s.kill_switch_active,
  s.max_exposure_per_variant,
  s.variant_key,
  s.assignments,
  s.leads_assigned,
  s.leads_converted,
  s.active_subs,
  s.active_known_mrr_usd,
  s.avg_active_known_mrr_usd,
  s.min_sample_per_variant,
  s.p_variant AS conversion_rate,
  s.p_control AS control_conversion_rate,
  s.z_score,
  s.sequential_z_critical,
  CASE
    WHEN s.kill_switch_active THEN 'killed'
    WHEN s.max_exposure_per_variant IS NOT NULL
         AND s.leads_assigned >= s.max_exposure_per_variant THEN 'max_exposure_reached'
    WHEN s.variant_key = 'control' THEN 'baseline'
    WHEN s.leads_assigned < s.min_sample_per_variant THEN 'insufficient_sample'
    WHEN s.z_score IS NULL THEN 'directional_only'
    -- Sequential mode: stricter boundary
    WHEN s.allocation_mode = 'sequential' AND s.z_score >= s.sequential_z_critical THEN 'early_stop_winner'
    WHEN s.allocation_mode = 'sequential' AND s.z_score <= -s.sequential_z_critical THEN 'early_stop_futility'
    WHEN abs(s.z_score) >= 1.96 AND s.z_score > 0 THEN 'statistically_supported_winner'
    WHEN abs(s.z_score) >= 1.96 AND s.z_score < 0 THEN 'statistically_supported_loser'
    ELSE 'directional_only'
  END AS confidence_label,
  CASE
    WHEN s.kill_switch_active THEN 'no_action'
    WHEN s.experiment_status NOT IN ('active','live') THEN 'no_action'
    WHEN s.variant_key = 'control' THEN 'baseline'
    WHEN s.max_exposure_per_variant IS NOT NULL
         AND s.leads_assigned >= s.max_exposure_per_variant
         AND s.z_score IS NOT NULL AND s.z_score >= 1.96 THEN 'promote_winner'
    WHEN s.max_exposure_per_variant IS NOT NULL
         AND s.leads_assigned >= s.max_exposure_per_variant THEN 'archive_inconclusive'
    WHEN s.allocation_mode = 'sequential' AND s.z_score IS NOT NULL
         AND s.z_score >= s.sequential_z_critical THEN 'promote_winner'
    WHEN s.allocation_mode = 'sequential' AND s.z_score IS NOT NULL
         AND s.z_score <= -s.sequential_z_critical THEN 'archive_loser'
    WHEN s.leads_assigned < s.min_sample_per_variant THEN 'keep_running'
    WHEN s.z_score IS NOT NULL AND s.z_score >= 1.96 THEN 'promote_winner'
    WHEN s.z_score IS NOT NULL AND s.z_score <= -1.96 THEN 'archive_loser'
    ELSE 'archive_inconclusive'
  END AS recommendation
FROM seq_bound s;

-- ── BI mirrors ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_bi_experiment_decisions
WITH (security_invoker = true)
AS SELECT * FROM public.v_experiment_decisions;

CREATE OR REPLACE VIEW public.v_bi_experiment_allocation
WITH (security_invoker = true)
AS SELECT * FROM public.v_experiment_allocation;
