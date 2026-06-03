-- Phase 14 — Commercial Ops / Packaging / Pricing Intelligence
-- All views are SECURITY INVOKER and rely on existing RLS on base tables
-- (billing_summaries: admin/billing only; wl_invoices: partner-scoped + admin via ambient policies;
-- internal_fulfillment_intakes: admin/staff scoped). No new tables, no new RPCs.
--
-- Truth-first: where canonical data is thin (no canonical contract MRR), we expose
-- explicitly-labeled proxies (overage_revenue, billing_period_amount) rather than
-- fabricate ARR/LTV.

-- =========================================================================
-- A. PLAN / PACKAGE PERFORMANCE
-- Source: billing_summaries (per-period materialized facts).
-- plan_name is the canonical package label as captured at billing time.
-- Unknown plan_name surfaces as 'unknown' (honest), not coalesced to a guess.
-- =========================================================================
CREATE OR REPLACE VIEW public.v_commercial_plan_performance
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(TRIM(bs.plan_name), ''), 'unknown')        AS plan_name,
  COUNT(*)::int                                              AS billing_periods,
  COUNT(DISTINCT bs.client_id)::int                          AS distinct_clients,
  SUM(bs.total_minutes)::bigint                              AS total_minutes,
  SUM(bs.included_minutes)::bigint                           AS included_minutes,
  SUM(bs.overage_minutes)::bigint                            AS overage_minutes,
  ROUND(SUM(bs.overage_amount)::numeric, 2)                  AS overage_revenue_proxy,
  -- % of periods where the client exceeded their included minutes
  ROUND(
    (COUNT(*) FILTER (WHERE bs.overage_minutes > 0))::numeric
      / NULLIF(COUNT(*), 0)::numeric * 100,
    1
  )                                                          AS pct_periods_with_overage,
  -- avg overage as % of included minutes (capacity strain signal)
  ROUND(
    AVG(
      CASE WHEN bs.included_minutes > 0
           THEN (bs.overage_minutes::numeric / bs.included_minutes::numeric) * 100
           ELSE NULL END
    ),
    1
  )                                                          AS avg_overage_pct_of_included,
  MAX(bs.period_end)                                         AS latest_period_end
FROM public.billing_summaries bs
GROUP BY 1;

COMMENT ON VIEW public.v_commercial_plan_performance IS
  'Phase 14: per-package performance from billing_summaries. overage_revenue_proxy is overage_amount only (not full MRR). Unknown plan_name preserved.';

-- =========================================================================
-- B. DIRECT vs WL COMMERCIAL COMPARISON
-- Activation speed + intake volume (commercial onboarding throughput).
-- Activation speed is in days; null when not yet activated.
-- =========================================================================
CREATE OR REPLACE VIEW public.v_commercial_direct_vs_wl
WITH (security_invoker = true) AS
SELECT
  i.source                                                   AS acquisition_type,
  COUNT(*)::int                                              AS intakes,
  COUNT(*) FILTER (WHERE i.activated_at IS NOT NULL)::int    AS activations,
  ROUND(
    (COUNT(*) FILTER (WHERE i.activated_at IS NOT NULL))::numeric
      / NULLIF(COUNT(*), 0)::numeric * 100,
    1
  )                                                          AS activation_rate_pct,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (i.activated_at - i.submitted_at)) / 86400.0
    )::numeric,
    1
  )                                                          AS avg_days_to_activate,
  COUNT(DISTINCT i.partner_id) FILTER (WHERE i.source = 'wl')::int AS distinct_wl_partners
FROM public.internal_fulfillment_intakes i
GROUP BY 1;

COMMENT ON VIEW public.v_commercial_direct_vs_wl IS
  'Phase 14: direct vs WL commercial throughput. Honest measure of intake-to-activation conversion and speed.';

-- =========================================================================
-- C. REVENUE MIX (PROXY)
-- Combines two non-identical data sources, clearly labeled.
-- Direct uses billing_summaries.overage_amount as a proxy (no canonical
-- subscription-cycle revenue stored locally).
-- WL uses wl_invoices.amount where paid.
-- =========================================================================
CREATE OR REPLACE VIEW public.v_commercial_revenue_mix
WITH (security_invoker = true) AS
WITH direct_proxy AS (
  SELECT
    'direct'::text AS stream,
    'overage_revenue_proxy'::text AS metric_label,
    ROUND(COALESCE(SUM(overage_amount), 0)::numeric, 2) AS amount,
    COUNT(*)::int AS records,
    MAX(period_end) AS latest_at
  FROM public.billing_summaries
  WHERE period_end >= (now() - interval '365 days')
),
wl_paid AS (
  SELECT
    'wl'::text AS stream,
    'wl_invoice_paid'::text AS metric_label,
    ROUND(COALESCE(SUM(amount), 0)::numeric, 2) AS amount,
    COUNT(*)::int AS records,
    MAX(billing_period_end::timestamptz) AS latest_at
  FROM public.wl_invoices
  WHERE status = 'paid'
    AND billing_period_end >= (CURRENT_DATE - 365)
)
SELECT * FROM direct_proxy
UNION ALL
SELECT * FROM wl_paid;

COMMENT ON VIEW public.v_commercial_revenue_mix IS
  'Phase 14 PROXY: direct stream is overage-only (no canonical contract MRR); WL stream is paid invoices. Not a financial statement.';

-- =========================================================================
-- D. EXPANSION / DOWNGRADE / CHURN-RISK SIGNALS (per client, latest 2 periods)
-- Bounded, explainable rules — not predictive finance.
--   expansion: latest overage_pct > prior + 25 percentage points
--   downgrade_risk: latest minutes < prior * 0.75 AND prior > 0
--   stalled: no billing period in last 60 days
-- A client may carry multiple flags. Clients with <2 periods => insufficient_history.
-- =========================================================================
CREATE OR REPLACE VIEW public.v_commercial_lifecycle_signals
WITH (security_invoker = true) AS
WITH ranked AS (
  SELECT
    bs.client_id,
    bs.period_end,
    bs.total_minutes,
    bs.included_minutes,
    bs.overage_minutes,
    bs.plan_name,
    ROW_NUMBER() OVER (PARTITION BY bs.client_id ORDER BY bs.period_end DESC) AS rn,
    COUNT(*) OVER (PARTITION BY bs.client_id) AS period_count
  FROM public.billing_summaries bs
),
latest AS (SELECT * FROM ranked WHERE rn = 1),
prior  AS (SELECT * FROM ranked WHERE rn = 2)
SELECT
  l.client_id,
  COALESCE(NULLIF(TRIM(l.plan_name), ''), 'unknown')        AS plan_name,
  l.period_end                                              AS latest_period_end,
  l.total_minutes                                           AS latest_minutes,
  p.total_minutes                                           AS prior_minutes,
  CASE
    WHEN l.period_count < 2 THEN 'insufficient_history'
    WHEN l.included_minutes > 0 AND p.included_minutes > 0
         AND ((l.overage_minutes::numeric / l.included_minutes::numeric)
              - (p.overage_minutes::numeric / NULLIF(p.included_minutes,0)::numeric)) >= 0.25
      THEN 'expansion'
    WHEN p.total_minutes > 0 AND l.total_minutes < (p.total_minutes * 0.75)
      THEN 'downgrade_risk'
    WHEN l.period_end < (now() - interval '60 days')
      THEN 'stalled'
    ELSE 'steady'
  END                                                       AS signal,
  l.period_count                                            AS observed_periods
FROM latest l
LEFT JOIN prior p USING (client_id);

COMMENT ON VIEW public.v_commercial_lifecycle_signals IS
  'Phase 14: bounded heuristic signals per client (expansion/downgrade_risk/stalled/steady/insufficient_history). Proxies — not churn predictions.';

-- Aggregated signal counts for the panel header
CREATE OR REPLACE VIEW public.v_commercial_lifecycle_summary
WITH (security_invoker = true) AS
SELECT signal, COUNT(*)::int AS clients
FROM public.v_commercial_lifecycle_signals
GROUP BY signal;

COMMENT ON VIEW public.v_commercial_lifecycle_summary IS
  'Phase 14: client counts per lifecycle signal bucket.';

-- =========================================================================
-- F. BI MIRRORS (Phase 11 export layer)
-- Stable schemas, security_invoker=true, admin-only via base RLS.
-- =========================================================================
CREATE OR REPLACE VIEW public.v_bi_commercial_plan_performance
WITH (security_invoker = true) AS
SELECT * FROM public.v_commercial_plan_performance;

CREATE OR REPLACE VIEW public.v_bi_commercial_direct_vs_wl
WITH (security_invoker = true) AS
SELECT * FROM public.v_commercial_direct_vs_wl;

CREATE OR REPLACE VIEW public.v_bi_commercial_revenue_mix
WITH (security_invoker = true) AS
SELECT * FROM public.v_commercial_revenue_mix;

CREATE OR REPLACE VIEW public.v_bi_commercial_lifecycle_signals
WITH (security_invoker = true) AS
SELECT * FROM public.v_commercial_lifecycle_signals;

COMMENT ON VIEW public.v_bi_commercial_plan_performance IS 'Phase 14 BI mirror — stable schema for export.';
COMMENT ON VIEW public.v_bi_commercial_direct_vs_wl    IS 'Phase 14 BI mirror — stable schema for export.';
COMMENT ON VIEW public.v_bi_commercial_revenue_mix      IS 'Phase 14 BI mirror — stable schema for export. Proxy fields labeled.';
COMMENT ON VIEW public.v_bi_commercial_lifecycle_signals IS 'Phase 14 BI mirror — stable schema for export.';