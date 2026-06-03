-- Phase 20 — WL Economics & Partner Profitability
-- Admin-only governed views. Honesty contract:
--   * Recurring value per partner is the labeled 90-day paid-invoice average proxy
--     from v_subscription_wl_recurring. It is NOT canonical MRR.
--   * Internal acquisition cost = approved/paid sales_commissions on leads whose
--     v_growth_attribution_lead.wl_partner_id matches the partner. Partner-side
--     CAC remains excluded (no canonical source).
--   * Internal servicing cost proxy = latest wl_partner_usage_summary
--     (total_wholesale_cost + total_campaign_fees) for the partner. If no
--     usage row exists, servicing_cost_proxy_usd is NULL.
--   * Partial margin proxy = avg_monthly_recurring_usd - servicing_cost_proxy_usd
--     when both are present. If either is missing, NULL. Acquisition cost is
--     reported separately and NOT amortized into a fake monthly margin.
--   * Health overlays come from the partner's portfolio of white_label_clients
--     joined to v_commercial_lifecycle_signals; no redefinition of bands.
--   * All views SECURITY INVOKER; existing RLS on white_label_partners,
--     wl_partner_usage_summary, sales_commissions, leads applies.

-- 1. Per-partner economics summary
CREATE OR REPLACE VIEW public.v_wl_partner_economics
WITH (security_invoker = true) AS
WITH client_counts AS (
  SELECT partner_id,
         COUNT(*)::int AS total_clients,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_clients
  FROM public.white_label_clients
  GROUP BY partner_id
),
acq_cost AS (
  SELECT a.wl_partner_id AS partner_id,
         SUM(sc.commission_amount) FILTER (WHERE sc.status IN ('approved','paid')) AS known_acq_cost_usd,
         COUNT(sc.id) FILTER (WHERE sc.status IN ('approved','paid')) AS commission_events
  FROM public.v_growth_attribution_lead a
  LEFT JOIN public.sales_commissions sc ON sc.lead_id = a.lead_id
  WHERE a.wl_partner_id IS NOT NULL
  GROUP BY a.wl_partner_id
),
servicing AS (
  SELECT DISTINCT ON (partner_id)
         partner_id,
         (COALESCE(total_wholesale_cost,0) + COALESCE(total_campaign_fees,0))::numeric AS servicing_cost_proxy_usd,
         billing_period_start AS servicing_period_start,
         billing_period_end AS servicing_period_end
  FROM public.wl_partner_usage_summary
  ORDER BY partner_id, billing_period_start DESC
),
health AS (
  SELECT c.partner_id,
         COUNT(*) FILTER (WHERE s.signal = 'expansion')::int AS clients_expansion,
         COUNT(*) FILTER (WHERE s.signal = 'contraction')::int AS clients_contraction,
         COUNT(*) FILTER (WHERE s.signal = 'stable')::int AS clients_stable,
         COUNT(*) FILTER (WHERE s.signal IS NOT NULL)::int AS clients_with_signal
  FROM public.white_label_clients c
  LEFT JOIN public.v_commercial_lifecycle_signals s ON s.client_id = c.id
  GROUP BY c.partner_id
)
SELECT
  p.id AS partner_id,
  p.partner_slug,
  p.company_name,
  p.tier,
  p.status AS partner_status,
  date_trunc('month', p.created_at)::date AS cohort_month,
  p.created_at,
  COALESCE(cc.total_clients, 0) AS total_clients,
  COALESCE(cc.active_clients, 0) AS active_clients,
  -- Recurring proxy (labeled, not canonical MRR)
  r.avg_monthly_recurring_usd AS recurring_value_proxy_usd,
  r.sum_recurring_90d_usd,
  r.paid_invoices_90d,
  r.latest_paid_period,
  -- Internal cost signals
  COALESCE(ac.known_acq_cost_usd, 0)::numeric AS known_acq_cost_usd,
  COALESCE(ac.commission_events, 0) AS commission_events,
  s.servicing_cost_proxy_usd,
  s.servicing_period_start,
  s.servicing_period_end,
  -- Partial margin proxy (per-month)
  CASE
    WHEN r.avg_monthly_recurring_usd IS NOT NULL AND s.servicing_cost_proxy_usd IS NOT NULL
      THEN (r.avg_monthly_recurring_usd - s.servicing_cost_proxy_usd)::numeric
    ELSE NULL
  END AS partial_margin_proxy_usd,
  CASE
    WHEN r.avg_monthly_recurring_usd IS NOT NULL
     AND r.avg_monthly_recurring_usd > 0
     AND s.servicing_cost_proxy_usd IS NOT NULL
      THEN ((r.avg_monthly_recurring_usd - s.servicing_cost_proxy_usd) / r.avg_monthly_recurring_usd)::numeric
    ELSE NULL
  END AS partial_margin_pct,
  -- Health overlays
  COALESCE(h.clients_expansion, 0) AS clients_expansion,
  COALESCE(h.clients_contraction, 0) AS clients_contraction,
  COALESCE(h.clients_stable, 0) AS clients_stable,
  COALESCE(h.clients_with_signal, 0) AS clients_with_signal,
  -- Coverage flag
  CASE
    WHEN r.avg_monthly_recurring_usd IS NULL AND s.servicing_cost_proxy_usd IS NULL THEN 'no_data'
    WHEN r.avg_monthly_recurring_usd IS NULL THEN 'recurring_unknown'
    WHEN s.servicing_cost_proxy_usd IS NULL THEN 'servicing_cost_unknown'
    ELSE 'partial_ok'
  END AS coverage_flag
FROM public.white_label_partners p
LEFT JOIN client_counts cc ON cc.partner_id = p.id
LEFT JOIN public.v_subscription_wl_recurring r ON r.partner_id = p.id
LEFT JOIN acq_cost ac ON ac.partner_id = p.id
LEFT JOIN servicing s ON s.partner_id = p.id
LEFT JOIN health h ON h.partner_id = p.id;

COMMENT ON VIEW public.v_wl_partner_economics IS
'Phase 20: per-partner WL economics. Recurring is a 90d paid-invoice avg proxy (not canonical MRR). Servicing cost from latest wl_partner_usage_summary. Acquisition cost from approved/paid sales_commissions. Partner-side CAC excluded.';

-- 2. Partner cohort economics
CREATE OR REPLACE VIEW public.v_wl_partner_cohort_economics
WITH (security_invoker = true) AS
SELECT
  cohort_month,
  COUNT(*)::int AS partners_in_cohort,
  COUNT(*) FILTER (WHERE partner_status = 'active')::int AS active_partners,
  SUM(total_clients)::int AS total_clients,
  SUM(active_clients)::int AS active_clients,
  AVG(active_clients)::numeric AS avg_active_clients_per_partner,
  AVG(recurring_value_proxy_usd) FILTER (WHERE recurring_value_proxy_usd IS NOT NULL) AS avg_recurring_value_proxy_usd,
  SUM(recurring_value_proxy_usd) FILTER (WHERE recurring_value_proxy_usd IS NOT NULL) AS sum_recurring_value_proxy_usd,
  SUM(known_acq_cost_usd)::numeric AS sum_known_acq_cost_usd,
  AVG(servicing_cost_proxy_usd) FILTER (WHERE servicing_cost_proxy_usd IS NOT NULL) AS avg_servicing_cost_proxy_usd,
  AVG(partial_margin_pct) FILTER (WHERE partial_margin_pct IS NOT NULL) AS avg_partial_margin_pct,
  COUNT(*) FILTER (WHERE coverage_flag = 'partial_ok')::int AS partners_with_full_coverage
FROM public.v_wl_partner_economics
GROUP BY cohort_month
ORDER BY cohort_month DESC;

COMMENT ON VIEW public.v_wl_partner_cohort_economics IS
'Phase 20: partner cohort economics by partner onboard month.';

-- 3. Partner profitability ranking
CREATE OR REPLACE VIEW public.v_wl_partner_profitability_ranking
WITH (security_invoker = true) AS
SELECT
  partner_id,
  partner_slug,
  company_name,
  tier,
  partner_status,
  active_clients,
  recurring_value_proxy_usd,
  servicing_cost_proxy_usd,
  partial_margin_proxy_usd,
  partial_margin_pct,
  known_acq_cost_usd,
  coverage_flag,
  -- Rank only partners with comparable inputs
  RANK() OVER (
    ORDER BY partial_margin_proxy_usd DESC NULLS LAST
  ) AS margin_rank,
  RANK() OVER (
    ORDER BY recurring_value_proxy_usd DESC NULLS LAST
  ) AS revenue_rank
FROM public.v_wl_partner_economics
ORDER BY partial_margin_proxy_usd DESC NULLS LAST;

COMMENT ON VIEW public.v_wl_partner_profitability_ranking IS
'Phase 20: partner profitability ranking. Partners with NULL margin proxy rank last; do not interpret as zero.';

-- 4. WL recurring vs internal cost summary (single-row totals)
CREATE OR REPLACE VIEW public.v_wl_recurring_vs_internal_cost
WITH (security_invoker = true) AS
SELECT
  COUNT(*)::int AS partners_total,
  COUNT(*) FILTER (WHERE partner_status = 'active')::int AS partners_active,
  SUM(active_clients)::int AS active_clients_total,
  SUM(recurring_value_proxy_usd) FILTER (WHERE recurring_value_proxy_usd IS NOT NULL) AS sum_recurring_value_proxy_usd,
  SUM(servicing_cost_proxy_usd) FILTER (WHERE servicing_cost_proxy_usd IS NOT NULL) AS sum_servicing_cost_proxy_usd,
  SUM(known_acq_cost_usd)::numeric AS sum_known_acq_cost_usd,
  CASE
    WHEN SUM(recurring_value_proxy_usd) FILTER (WHERE recurring_value_proxy_usd IS NOT NULL) IS NOT NULL
     AND SUM(servicing_cost_proxy_usd) FILTER (WHERE servicing_cost_proxy_usd IS NOT NULL) IS NOT NULL
      THEN (SUM(recurring_value_proxy_usd) FILTER (WHERE recurring_value_proxy_usd IS NOT NULL)
          - SUM(servicing_cost_proxy_usd) FILTER (WHERE servicing_cost_proxy_usd IS NOT NULL))::numeric
    ELSE NULL
  END AS sum_partial_margin_proxy_usd,
  COUNT(*) FILTER (WHERE coverage_flag = 'partial_ok')::int AS partners_with_full_coverage,
  COUNT(*) FILTER (WHERE coverage_flag = 'recurring_unknown')::int AS partners_recurring_unknown,
  COUNT(*) FILTER (WHERE coverage_flag = 'servicing_cost_unknown')::int AS partners_servicing_cost_unknown,
  COUNT(*) FILTER (WHERE coverage_flag = 'no_data')::int AS partners_no_data
FROM public.v_wl_partner_economics;

COMMENT ON VIEW public.v_wl_recurring_vs_internal_cost IS
'Phase 20: aggregate WL recurring proxy vs known internal cost signals.';

-- 5. BI mirrors
CREATE OR REPLACE VIEW public.v_bi_wl_partner_economics
WITH (security_invoker = true) AS SELECT * FROM public.v_wl_partner_economics;

CREATE OR REPLACE VIEW public.v_bi_wl_partner_cohort_economics
WITH (security_invoker = true) AS SELECT * FROM public.v_wl_partner_cohort_economics;

CREATE OR REPLACE VIEW public.v_bi_wl_partner_profitability_ranking
WITH (security_invoker = true) AS SELECT * FROM public.v_wl_partner_profitability_ranking;

CREATE OR REPLACE VIEW public.v_bi_wl_recurring_vs_internal_cost
WITH (security_invoker = true) AS SELECT * FROM public.v_wl_recurring_vs_internal_cost;