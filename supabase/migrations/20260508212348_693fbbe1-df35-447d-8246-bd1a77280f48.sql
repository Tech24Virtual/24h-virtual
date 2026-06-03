-- Phase 18 — Executive Finance / Board Metrics Layer
-- Thin, honest views on top of Phase 17 canonical subscription truth.
-- All SECURITY INVOKER; inherit admin/billing RLS from underlying tables.
-- No new MRR/churn definitions; no fabricated CAC/LTV.

-- 24-month MRR spine: ending MRR per month using snapshot lifetimes.
CREATE OR REPLACE VIEW public.v_exec_mrr_spine
WITH (security_invoker = true) AS
WITH months AS (
  SELECT generate_series(
    date_trunc('month', now() - interval '23 months'),
    date_trunc('month', now()),
    interval '1 month'
  )::date AS month_start
),
spine AS (
  SELECT
    m.month_start,
    (m.month_start + interval '1 month')::date AS next_month,
    COALESCE(SUM(s.mrr_usd) FILTER (
      WHERE s.mrr_usd IS NOT NULL
        AND s.effective_start_at IS NOT NULL
        AND s.effective_start_at < (m.month_start + interval '1 month')
        AND (s.effective_end_at IS NULL
             OR s.effective_end_at >= (m.month_start + interval '1 month'))
    ), 0)::numeric AS ending_mrr_usd,
    COUNT(*) FILTER (
      WHERE s.effective_start_at IS NOT NULL
        AND s.effective_start_at < (m.month_start + interval '1 month')
        AND (s.effective_end_at IS NULL
             OR s.effective_end_at >= (m.month_start + interval '1 month'))
    )::int AS ending_active_subs
  FROM months m
  LEFT JOIN public.v_subscription_snapshot s ON true
  GROUP BY m.month_start
)
SELECT
  s.month_start,
  s.ending_mrr_usd,
  s.ending_active_subs,
  LAG(s.ending_mrr_usd)      OVER (ORDER BY s.month_start) AS starting_mrr_usd,
  LAG(s.ending_active_subs)  OVER (ORDER BY s.month_start) AS starting_active_subs,
  (s.ending_mrr_usd - COALESCE(LAG(s.ending_mrr_usd) OVER (ORDER BY s.month_start), 0))::numeric AS net_new_mrr_usd
FROM spine s
ORDER BY s.month_start;

-- MRR bridge: starting + new - churn (+ 0 expansion / 0 contraction) = ending.
-- Built from Phase 17 movements + spine. Expansion/contraction stay 0 until a movement event log exists.
CREATE OR REPLACE VIEW public.v_exec_mrr_bridge
WITH (security_invoker = true) AS
SELECT
  sp.month_start,
  COALESCE(sp.starting_mrr_usd, 0)::numeric AS starting_mrr_usd,
  COALESCE(mv.new_mrr_usd, 0)::numeric      AS new_mrr_usd,
  COALESCE(mv.expansion_mrr_usd, 0)::numeric AS expansion_mrr_usd,
  COALESCE(mv.contraction_mrr_usd, 0)::numeric AS contraction_mrr_usd,
  COALESCE(mv.churned_mrr_usd, 0)::numeric  AS churned_mrr_usd,
  sp.ending_mrr_usd,
  sp.net_new_mrr_usd,
  'derived'::text AS basis
FROM public.v_exec_mrr_spine sp
LEFT JOIN public.v_subscription_movements mv ON mv.month_start = sp.month_start
ORDER BY sp.month_start;

-- Retention / churn rates per month. Honest: NULL when starting denominator is 0.
CREATE OR REPLACE VIEW public.v_exec_retention_rates
WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    sp.month_start,
    sp.starting_mrr_usd,
    sp.starting_active_subs,
    sp.ending_mrr_usd,
    COALESCE(mv.churned_mrr_usd, 0)::numeric AS churned_mrr_usd,
    COALESCE(mv.churned_subs, 0)::int        AS churned_subs,
    COALESCE(mv.new_mrr_usd, 0)::numeric     AS new_mrr_usd
  FROM public.v_exec_mrr_spine sp
  LEFT JOIN public.v_subscription_movements mv ON mv.month_start = sp.month_start
)
SELECT
  month_start,
  starting_mrr_usd,
  starting_active_subs,
  churned_mrr_usd,
  churned_subs,
  CASE WHEN COALESCE(starting_mrr_usd,0) > 0
       THEN ROUND((churned_mrr_usd / starting_mrr_usd)::numeric, 4) END AS revenue_churn_rate,
  CASE WHEN COALESCE(starting_active_subs,0) > 0
       THEN ROUND((churned_subs::numeric / starting_active_subs::numeric), 4) END AS logo_churn_rate,
  -- GRR = (starting - churn - contraction) / starting. Contraction = 0 today.
  CASE WHEN COALESCE(starting_mrr_usd,0) > 0
       THEN ROUND(((starting_mrr_usd - churned_mrr_usd) / starting_mrr_usd)::numeric, 4) END AS gross_revenue_retention,
  -- NRR = (starting - churn - contraction + expansion) / starting. Expansion = 0 today.
  CASE WHEN COALESCE(starting_mrr_usd,0) > 0
       THEN ROUND(((starting_mrr_usd - churned_mrr_usd) / starting_mrr_usd)::numeric, 4) END AS net_revenue_retention,
  'derived (expansion/contraction not yet tracked)'::text AS basis
FROM base
ORDER BY month_start;

-- Executive direct vs WL summary: known direct MRR + WL recurring proxy + activity counts.
CREATE OR REPLACE VIEW public.v_exec_direct_vs_wl_summary
WITH (security_invoker = true) AS
WITH active AS (
  SELECT acquisition_type,
         COUNT(*) FILTER (WHERE subscription_state='active')::int AS active_subs,
         COUNT(*) FILTER (WHERE subscription_state='canceled')::int AS canceled_subs,
         COALESCE(SUM(mrr_usd) FILTER (WHERE subscription_state='active'), 0)::numeric AS known_mrr_usd
  FROM public.v_subscription_snapshot
  GROUP BY acquisition_type
),
churn30 AS (
  SELECT acquisition_type,
         COUNT(*)::int AS churned_30d,
         COALESCE(SUM(lost_mrr_usd),0)::numeric AS churned_mrr_30d
  FROM public.v_subscription_churn_events
  WHERE canceled_at >= now() - interval '30 days'
  GROUP BY acquisition_type
),
new30 AS (
  SELECT acquisition_type,
         COUNT(*)::int AS new_30d
  FROM public.v_subscription_snapshot
  WHERE subscription_started_at >= now() - interval '30 days'
  GROUP BY acquisition_type
),
wl_proxy AS (
  SELECT 'wl'::text AS acquisition_type,
         COALESCE(SUM(avg_monthly_recurring_usd), 0)::numeric AS wl_recurring_proxy_usd
  FROM public.v_subscription_wl_recurring
)
SELECT
  a.acquisition_type AS stream,
  a.active_subs,
  a.canceled_subs,
  a.known_mrr_usd,
  CASE WHEN a.acquisition_type='wl' THEN (SELECT wl_recurring_proxy_usd FROM wl_proxy) ELSE NULL END AS wl_recurring_proxy_usd,
  COALESCE(n.new_30d, 0)         AS new_subs_30d,
  COALESCE(c.churned_30d, 0)     AS churned_subs_30d,
  COALESCE(c.churned_mrr_30d, 0) AS churned_mrr_30d,
  CASE WHEN a.acquisition_type='wl'
       THEN 'Direct=custom_plans MRR; WL=90d paid-invoice avg proxy'
       ELSE 'Direct=custom_plans MRR (minimum_monthly|fixed_amount)' END AS basis
FROM active a
LEFT JOIN new30  n ON n.acquisition_type = a.acquisition_type
LEFT JOIN churn30 c ON c.acquisition_type = a.acquisition_type;

-- Plan/tier contribution: share of active known MRR per plan (executive grain).
CREATE OR REPLACE VIEW public.v_exec_plan_contribution
WITH (security_invoker = true) AS
WITH totals AS (
  SELECT NULLIF(SUM(active_known_mrr_usd), 0)::numeric AS total_known_mrr
  FROM public.v_subscription_plan_summary
)
SELECT
  p.plan_name,
  p.acquisition_type AS stream,
  p.active_count,
  p.canceled_count,
  p.active_known_mrr_usd,
  CASE WHEN (SELECT total_known_mrr FROM totals) IS NOT NULL
       THEN ROUND((p.active_known_mrr_usd / (SELECT total_known_mrr FROM totals))::numeric, 4)
       END AS share_of_known_mrr,
  p.avg_active_known_mrr_usd
FROM public.v_subscription_plan_summary p
ORDER BY p.active_known_mrr_usd DESC NULLS LAST;

-- BI mirrors (1:1 passthroughs).
CREATE OR REPLACE VIEW public.v_bi_exec_mrr_spine            WITH (security_invoker=true) AS SELECT * FROM public.v_exec_mrr_spine;
CREATE OR REPLACE VIEW public.v_bi_exec_mrr_bridge           WITH (security_invoker=true) AS SELECT * FROM public.v_exec_mrr_bridge;
CREATE OR REPLACE VIEW public.v_bi_exec_retention_rates      WITH (security_invoker=true) AS SELECT * FROM public.v_exec_retention_rates;
CREATE OR REPLACE VIEW public.v_bi_exec_direct_vs_wl_summary WITH (security_invoker=true) AS SELECT * FROM public.v_exec_direct_vs_wl_summary;
CREATE OR REPLACE VIEW public.v_bi_exec_plan_contribution    WITH (security_invoker=true) AS SELECT * FROM public.v_exec_plan_contribution;