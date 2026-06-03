
-- ── Phase 25.A — Saved scenarios ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  notes TEXT,
  baseline JSONB NOT NULL DEFAULT '{}'::jsonb,
  levers JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  scenario_key TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage saved_scenarios" ON public.saved_scenarios;
CREATE POLICY "Admin can manage saved_scenarios"
  ON public.saved_scenarios
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_saved_scenarios_updated ON public.saved_scenarios;
CREATE TRIGGER trg_saved_scenarios_updated
  BEFORE UPDATE ON public.saved_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Phase 25.B — Experiment lifecycle metadata ─────────────────
ALTER TABLE public.pricing_experiments
  ADD COLUMN IF NOT EXISTS primary_metric TEXT,
  ADD COLUMN IF NOT EXISTS secondary_metrics TEXT[],
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS decision_rule TEXT,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS min_sample_per_variant INTEGER NOT NULL DEFAULT 100;

-- ── Phase 25.C — Decision engine view ──────────────────────────
-- Composes v_pricing_experiment_results with sample-sufficiency,
-- two-proportion z-test vs control, and a decision recommendation.
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
    e.variants
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
  SELECT
    b.*,
    c.c_n,
    c.c_x,
    CASE WHEN b.leads_assigned > 0 THEN b.leads_converted::numeric / b.leads_assigned ELSE NULL END AS p_variant,
    CASE WHEN c.c_n > 0 THEN c.c_x::numeric / c.c_n ELSE NULL END AS p_control
  FROM base b
  LEFT JOIN control c ON c.experiment_id = b.experiment_id
),
scored AS (
  SELECT
    j.*,
    CASE
      WHEN j.variant_key = 'control' THEN NULL
      WHEN j.p_variant IS NULL OR j.p_control IS NULL THEN NULL
      WHEN (j.leads_assigned + COALESCE(j.c_n,0)) = 0 THEN NULL
      ELSE
        CASE
          WHEN ((j.p_variant * (1 - j.p_variant) / NULLIF(j.leads_assigned,0))
              + (j.p_control * (1 - j.p_control) / NULLIF(j.c_n,0))) <= 0 THEN NULL
          ELSE (j.p_variant - j.p_control) /
               sqrt((j.p_variant * (1 - j.p_variant) / NULLIF(j.leads_assigned,0))
                  + (j.p_control * (1 - j.p_control) / NULLIF(j.c_n,0)))
        END
    END AS z_score
  FROM joined j
)
SELECT
  s.experiment_id,
  s.experiment_name,
  s.experiment_status,
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
  CASE
    WHEN s.leads_assigned < s.min_sample_per_variant THEN 'insufficient_sample'
    WHEN s.variant_key = 'control' THEN 'baseline'
    WHEN s.z_score IS NULL THEN 'directional_only'
    WHEN abs(s.z_score) >= 1.96 AND s.z_score > 0 THEN 'statistically_supported_winner'
    WHEN abs(s.z_score) >= 1.96 AND s.z_score < 0 THEN 'statistically_supported_loser'
    ELSE 'directional_only'
  END AS confidence_label,
  CASE
    WHEN s.experiment_status NOT IN ('active','live') THEN 'no_action'
    WHEN s.leads_assigned < s.min_sample_per_variant THEN 'keep_running'
    WHEN s.variant_key = 'control' THEN 'baseline'
    WHEN s.z_score IS NOT NULL AND s.z_score >= 1.96 THEN 'promote_winner'
    WHEN s.z_score IS NOT NULL AND s.z_score <= -1.96 THEN 'archive_loser'
    ELSE 'archive_inconclusive'
  END AS recommendation
FROM scored s;

-- ── Phase 25.D — BI mirrors ────────────────────────────────────
CREATE OR REPLACE VIEW public.v_bi_experiment_decisions
WITH (security_invoker = true)
AS SELECT * FROM public.v_experiment_decisions;

CREATE OR REPLACE VIEW public.v_bi_saved_scenarios
WITH (security_invoker = true)
AS SELECT id, label, notes, scenario_key, archived, created_by, created_at, updated_at
   FROM public.saved_scenarios;
