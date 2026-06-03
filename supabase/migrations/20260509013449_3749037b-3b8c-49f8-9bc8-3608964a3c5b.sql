-- Phase 19 — CAC / LTV / Payback Modeling
-- Admin-only governed views. Honesty contract:
--   * CAC inputs are drawn ONLY from sales_commissions (status in approved/paid).
--     No ad spend table exists yet, so non-sales channels return NULL CAC.
--   * LTV is conservative: avg known monthly MRR * avg observed churned lifetime
--     (in months) from v_subscription_churn_events. Censored (still-active)
--     subscriptions are NOT extrapolated. If <3 churn events in scope, NULL.
--   * Payback months = CAC / avg known MRR. NULL when either input is NULL.
--   * All views SECURITY INVOKER, scoped via existing leads / sales_commissions
--     RLS (admin only in practice).

-- 1. Per-lead acquisition cost (commission proxy)
CREATE OR REPLACE VIEW public.v_unit_econ_lead_cost
WITH (security_invoker = true) AS
SELECT
  l.id AS lead_id,
  COALESCE(SUM(sc.commission_amount) FILTER (
    WHERE sc.status IN ('approved','paid')
  ), 0)::numeric AS known_acq_cost_usd,
  COUNT(sc.id) FILTER (WHERE sc.status IN ('approved','paid')) AS commission_events,
  CASE
    WHEN COUNT(sc.id) FILTER (WHERE sc.status IN ('approved','paid')) > 0
      THEN 'sales_commissions'
    ELSE 'unknown'
  END AS cost_basis
FROM public.leads l
LEFT JOIN public.sales_commissions sc ON sc.lead_id = l.id
GROUP BY l.id;

COMMENT ON VIEW public.v_unit_econ_lead_cost IS
'Phase 19: per-lead acquisition cost proxy from approved/paid sales commissions. cost_basis=unknown means we have no recorded cost.';

-- 2. CAC / LTV / Payback by channel
CREATE OR REPLACE VIEW public.v_unit_econ_channel
WITH (security_invoker = true) AS
WITH attr AS (
  SELECT a.channel, a.lead_id, a.converted, a.acquisition_type
  FROM public.v_growth_attribution_lead a
),
costs AS (
  SELECT a.channel,
         SUM(c.known_acq_cost_usd) AS total_known_cost_usd,
         COUNT(*) FILTER (WHERE c.commission_events > 0) AS leads_with_known_cost,
         COUNT(*) FILTER (WHERE c.commission_events > 0 AND a.converted) AS conversions_with_known_cost,
         COUNT(*) FILTER (WHERE a.converted) AS conversions_total
  FROM attr a
  JOIN public.v_unit_econ_lead_cost c ON c.lead_id = a.lead_id
  GROUP BY a.channel
),
mrr AS (
  SELECT a.channel,
         AVG(s.mrr_usd) FILTER (WHERE s.mrr_usd IS NOT NULL) AS avg_known_mrr_usd,
         COUNT(*) FILTER (WHERE s.mrr_usd IS NOT NULL) AS subs_with_known_mrr
  FROM attr a
  JOIN public.v_subscription_snapshot s ON s.lead_id = a.lead_id
  GROUP BY a.channel
),
life AS (
  SELECT a.channel,
         AVG(ce.lifetime_days)::numeric / 30.0 AS avg_lifetime_months,
         COUNT(*) AS churn_events
  FROM attr a
  JOIN public.v_subscription_churn_events ce ON ce.lead_id = a.lead_id
  GROUP BY a.channel
)
SELECT
  c.channel,
  c.conversions_total,
  c.conversions_with_known_cost,
  c.total_known_cost_usd,
  CASE WHEN c.conversions_with_known_cost > 0
       THEN (c.total_known_cost_usd / c.conversions_with_known_cost)::numeric
       ELSE NULL END AS cac_usd,
  m.avg_known_mrr_usd,
  m.subs_with_known_mrr,
  CASE WHEN l.churn_events >= 3 THEN l.avg_lifetime_months ELSE NULL END AS avg_lifetime_months,
  l.churn_events,
  CASE
    WHEN m.avg_known_mrr_usd IS NOT NULL AND l.churn_events >= 3
      THEN (m.avg_known_mrr_usd * l.avg_lifetime_months)::numeric
    ELSE NULL
  END AS ltv_usd,
  CASE
    WHEN c.conversions_with_known_cost > 0
     AND m.avg_known_mrr_usd IS NOT NULL
     AND m.avg_known_mrr_usd > 0
      THEN ((c.total_known_cost_usd / c.conversions_with_known_cost) / m.avg_known_mrr_usd)::numeric
    ELSE NULL
  END AS payback_months,
  CASE
    WHEN c.conversions_with_known_cost = 0 THEN 'cost_unknown'
    WHEN m.avg_known_mrr_usd IS NULL THEN 'mrr_unknown'
    WHEN l.churn_events < 3 THEN 'lifetime_insufficient'
    ELSE 'ok'
  END AS coverage_flag
FROM costs c
LEFT JOIN mrr m ON m.channel = c.channel
LEFT JOIN life l ON l.channel = c.channel;

COMMENT ON VIEW public.v_unit_econ_channel IS
'Phase 19: CAC/LTV/Payback per growth channel. CAC uses commission proxy only. LTV requires >=3 observed churn events in channel. Payback in months.';

-- 3. Direct vs WL unit economics
CREATE OR REPLACE VIEW public.v_unit_econ_direct_vs_wl
WITH (security_invoker = true) AS
WITH attr AS (
  SELECT acquisition_type, lead_id, converted FROM public.v_growth_attribution_lead
),
costs AS (
  SELECT a.acquisition_type,
         SUM(c.known_acq_cost_usd) AS total_known_cost_usd,
         COUNT(*) FILTER (WHERE c.commission_events > 0 AND a.converted) AS conversions_with_known_cost,
         COUNT(*) FILTER (WHERE a.converted) AS conversions_total
  FROM attr a
  JOIN public.v_unit_econ_lead_cost c ON c.lead_id = a.lead_id
  GROUP BY a.acquisition_type
),
mrr AS (
  SELECT a.acquisition_type,
         AVG(s.mrr_usd) FILTER (WHERE s.mrr_usd IS NOT NULL) AS avg_known_mrr_usd,
         COUNT(*) FILTER (WHERE s.mrr_usd IS NOT NULL) AS subs_with_known_mrr
  FROM attr a JOIN public.v_subscription_snapshot s ON s.lead_id = a.lead_id
  GROUP BY a.acquisition_type
),
life AS (
  SELECT a.acquisition_type,
         AVG(ce.lifetime_days)::numeric / 30.0 AS avg_lifetime_months,
         COUNT(*) AS churn_events
  FROM attr a JOIN public.v_subscription_churn_events ce ON ce.lead_id = a.lead_id
  GROUP BY a.acquisition_type
)
SELECT
  c.acquisition_type,
  c.conversions_total,
  c.conversions_with_known_cost,
  c.total_known_cost_usd,
  CASE WHEN c.conversions_with_known_cost > 0
       THEN (c.total_known_cost_usd / c.conversions_with_known_cost)::numeric
       ELSE NULL END AS cac_usd,
  m.avg_known_mrr_usd,
  m.subs_with_known_mrr,
  CASE WHEN l.churn_events >= 3 THEN l.avg_lifetime_months ELSE NULL END AS avg_lifetime_months,
  l.churn_events,
  CASE WHEN m.avg_known_mrr_usd IS NOT NULL AND l.churn_events >= 3
       THEN (m.avg_known_mrr_usd * l.avg_lifetime_months)::numeric
       ELSE NULL END AS ltv_usd,
  CASE WHEN c.conversions_with_known_cost > 0 AND m.avg_known_mrr_usd > 0
       THEN ((c.total_known_cost_usd / c.conversions_with_known_cost) / m.avg_known_mrr_usd)::numeric
       ELSE NULL END AS payback_months,
  CASE
    WHEN c.conversions_with_known_cost = 0 THEN 'cost_unknown'
    WHEN m.avg_known_mrr_usd IS NULL THEN 'mrr_unknown'
    WHEN l.churn_events < 3 THEN 'lifetime_insufficient'
    ELSE 'ok'
  END AS coverage_flag,
  'WL acquisition cost is approximated by sales commissions only; partner-side cost not modeled.'::text AS note
FROM costs c
LEFT JOIN mrr m ON m.acquisition_type = c.acquisition_type
LEFT JOIN life l ON l.acquisition_type = c.acquisition_type;

COMMENT ON VIEW public.v_unit_econ_direct_vs_wl IS
'Phase 19: Direct vs WL unit economics. WL CAC excludes partner-side acquisition cost.';

-- 4. Cohort unit economics (lead month)
CREATE OR REPLACE VIEW public.v_unit_econ_cohort
WITH (security_invoker = true) AS
WITH attr AS (
  SELECT cohort_month, lead_id, converted FROM public.v_growth_attribution_lead
),
costs AS (
  SELECT a.cohort_month,
         SUM(c.known_acq_cost_usd) AS total_known_cost_usd,
         COUNT(*) FILTER (WHERE c.commission_events > 0 AND a.converted) AS conversions_with_known_cost,
         COUNT(*) FILTER (WHERE a.converted) AS conversions_total
  FROM attr a JOIN public.v_unit_econ_lead_cost c ON c.lead_id = a.lead_id
  GROUP BY a.cohort_month
),
mrr AS (
  SELECT a.cohort_month,
         AVG(s.mrr_usd) FILTER (WHERE s.mrr_usd IS NOT NULL) AS avg_known_mrr_usd
  FROM attr a JOIN public.v_subscription_snapshot s ON s.lead_id = a.lead_id
  GROUP BY a.cohort_month
)
SELECT
  c.cohort_month,
  c.conversions_total,
  c.conversions_with_known_cost,
  c.total_known_cost_usd,
  CASE WHEN c.conversions_with_known_cost > 0
       THEN (c.total_known_cost_usd / c.conversions_with_known_cost)::numeric
       ELSE NULL END AS cac_usd,
  m.avg_known_mrr_usd,
  CASE WHEN c.conversions_with_known_cost > 0 AND m.avg_known_mrr_usd > 0
       THEN ((c.total_known_cost_usd / c.conversions_with_known_cost) / m.avg_known_mrr_usd)::numeric
       ELSE NULL END AS payback_months
FROM costs c
LEFT JOIN mrr m ON m.cohort_month = c.cohort_month
ORDER BY c.cohort_month DESC;

COMMENT ON VIEW public.v_unit_econ_cohort IS
'Phase 19: Cohort-level CAC + payback. LTV omitted at cohort grain (insufficient churn observations).';

-- 5. BI mirrors
CREATE OR REPLACE VIEW public.v_bi_unit_econ_channel
WITH (security_invoker = true) AS SELECT * FROM public.v_unit_econ_channel;

CREATE OR REPLACE VIEW public.v_bi_unit_econ_direct_vs_wl
WITH (security_invoker = true) AS SELECT * FROM public.v_unit_econ_direct_vs_wl;

CREATE OR REPLACE VIEW public.v_bi_unit_econ_cohort
WITH (security_invoker = true) AS SELECT * FROM public.v_unit_econ_cohort;