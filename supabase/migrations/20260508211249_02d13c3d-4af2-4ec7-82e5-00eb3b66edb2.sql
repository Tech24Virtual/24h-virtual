
CREATE OR REPLACE VIEW public.v_subscription_snapshot
WITH (security_invoker = true) AS
WITH acq AS (
  SELECT DISTINCT ON (i.client_lead_id)
    i.client_lead_id AS lead_id,
    CASE WHEN i.partner_id IS NOT NULL THEN 'wl' ELSE 'direct' END AS acquisition_type,
    i.partner_id
  FROM public.internal_fulfillment_intakes i
  WHERE i.client_lead_id IS NOT NULL
  ORDER BY i.client_lead_id, i.created_at ASC
),
plan AS (
  SELECT DISTINCT ON (cp.lead_id)
    cp.lead_id, cp.plan_name AS custom_plan_name, cp.plan_type AS custom_plan_type,
    cp.minimum_monthly, cp.fixed_amount, cp.minute_rate, cp.is_active AS custom_plan_active
  FROM public.custom_plans cp
  WHERE cp.is_active IS TRUE
  ORDER BY cp.lead_id, cp.updated_at DESC NULLS LAST
)
SELECT
  l.id AS lead_id, l.name, l.company,
  COALESCE(a.acquisition_type, 'direct')::text AS acquisition_type,
  a.partner_id,
  l.service_type,
  COALESCE(p.custom_plan_name, l.custom_plan_name, l.service_type) AS plan_name,
  l.plan_minutes,
  COALESCE(NULLIF(l.billing_period, ''), 'monthly') AS billing_interval,
  l.stripe_customer_id, l.stripe_subscription_id, l.subscription_started_at,
  l.last_payment_status, l.pipeline_stage, l.status,
  CASE
    WHEN l.pipeline_stage IN ('churned','lost')
      OR l.status IN ('canceled','churned','cancelled') THEN 'canceled'
    WHEN l.last_payment_status IN ('failed','past_due') THEN 'past_due'
    WHEN l.stripe_subscription_id IS NOT NULL OR l.subscription_started_at IS NOT NULL THEN 'active'
    WHEN l.pipeline_stage = 'onboarding' THEN 'incomplete'
    ELSE 'unknown'
  END::text AS subscription_state,
  CASE WHEN COALESCE(p.minimum_monthly, p.fixed_amount) IS NOT NULL
       THEN COALESCE(p.minimum_monthly, p.fixed_amount)::numeric ELSE NULL END AS mrr_usd,
  CASE WHEN p.minimum_monthly IS NOT NULL THEN 'custom_plan_minimum_monthly'
       WHEN p.fixed_amount   IS NOT NULL THEN 'custom_plan_fixed_amount'
       ELSE 'unknown' END::text AS mrr_basis,
  l.subscription_started_at AS effective_start_at,
  CASE WHEN l.pipeline_stage IN ('churned','lost') THEN l.updated_at ELSE NULL END AS effective_end_at,
  l.updated_at AS last_state_change_at
FROM public.leads l
LEFT JOIN acq  a ON a.lead_id = l.id
LEFT JOIN plan p ON p.lead_id = l.id
WHERE l.stripe_subscription_id IS NOT NULL
   OR l.subscription_started_at IS NOT NULL
   OR l.pipeline_stage IN ('active','churned','onboarding','ready_for_billing','won');

CREATE OR REPLACE VIEW public.v_subscription_wl_recurring
WITH (security_invoker = true) AS
WITH recent AS (
  SELECT i.partner_id, i.amount, i.billing_period_start
  FROM public.wl_invoices i
  WHERE i.status = 'paid' AND i.billing_period_start >= (now() - interval '120 days')
)
SELECT
  p.id AS partner_id,
  p.company_name AS business_name,
  COUNT(r.*)::int AS paid_invoices_90d,
  COALESCE(AVG(r.amount), 0)::numeric AS avg_monthly_recurring_usd,
  COALESCE(SUM(r.amount), 0)::numeric AS sum_recurring_90d_usd,
  MAX(r.billing_period_start) AS latest_paid_period
FROM public.white_label_partners p
LEFT JOIN recent r ON r.partner_id = p.id
GROUP BY p.id, p.company_name;

CREATE OR REPLACE VIEW public.v_subscription_mrr_summary
WITH (security_invoker = true) AS
SELECT
  s.acquisition_type, s.subscription_state,
  COUNT(*)::int AS subscriptions,
  COUNT(*) FILTER (WHERE s.mrr_usd IS NOT NULL)::int AS subscriptions_with_known_mrr,
  COUNT(*) FILTER (WHERE s.mrr_usd IS NULL)::int     AS subscriptions_unknown_mrr,
  COALESCE(SUM(s.mrr_usd), 0)::numeric AS known_mrr_usd
FROM public.v_subscription_snapshot s
GROUP BY s.acquisition_type, s.subscription_state;

CREATE OR REPLACE VIEW public.v_subscription_plan_summary
WITH (security_invoker = true) AS
SELECT
  COALESCE(s.plan_name, 'unknown') AS plan_name,
  s.acquisition_type,
  COUNT(*)::int AS subscriptions,
  COUNT(*) FILTER (WHERE s.subscription_state='active')::int   AS active_count,
  COUNT(*) FILTER (WHERE s.subscription_state='canceled')::int AS canceled_count,
  COUNT(*) FILTER (WHERE s.subscription_state='past_due')::int AS past_due_count,
  COUNT(*) FILTER (WHERE s.mrr_usd IS NOT NULL)::int AS subscriptions_with_known_mrr,
  COALESCE(SUM(s.mrr_usd) FILTER (WHERE s.subscription_state='active'), 0)::numeric AS active_known_mrr_usd,
  AVG(s.mrr_usd) FILTER (WHERE s.subscription_state='active') AS avg_active_known_mrr_usd
FROM public.v_subscription_snapshot s
GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.v_subscription_direct_vs_wl
WITH (security_invoker = true) AS
SELECT
  'direct'::text AS stream,
  COUNT(*) FILTER (WHERE s.subscription_state='active')::int AS active_subscriptions,
  COUNT(*) FILTER (WHERE s.subscription_state='canceled')::int AS canceled_subscriptions,
  COALESCE(SUM(s.mrr_usd) FILTER (WHERE s.subscription_state='active'), 0)::numeric AS known_mrr_usd,
  NULL::numeric AS recurring_proxy_usd,
  'snapshot_known_mrr'::text AS basis
FROM public.v_subscription_snapshot s
WHERE s.acquisition_type='direct'
UNION ALL
SELECT
  'wl'::text,
  (SELECT COUNT(*) FILTER (WHERE subscription_state='active')::int
     FROM public.v_subscription_snapshot WHERE acquisition_type='wl'),
  (SELECT COUNT(*) FILTER (WHERE subscription_state='canceled')::int
     FROM public.v_subscription_snapshot WHERE acquisition_type='wl'),
  NULL::numeric,
  COALESCE(SUM(w.avg_monthly_recurring_usd), 0)::numeric,
  'wl_invoices_trailing_90d_avg'::text
FROM public.v_subscription_wl_recurring w;

CREATE OR REPLACE VIEW public.v_subscription_churn_events
WITH (security_invoker = true) AS
SELECT
  s.lead_id, s.name, s.company, s.acquisition_type, s.partner_id, s.plan_name,
  s.mrr_usd AS lost_mrr_usd, s.mrr_basis,
  s.effective_start_at,
  s.effective_end_at AS canceled_at,
  GREATEST(0, EXTRACT(DAY FROM (
    COALESCE(s.effective_end_at, now()) - COALESCE(s.effective_start_at, s.last_state_change_at)
  )))::int AS lifetime_days
FROM public.v_subscription_snapshot s
WHERE s.subscription_state = 'canceled';

CREATE OR REPLACE VIEW public.v_subscription_movements
WITH (security_invoker = true) AS
WITH months AS (
  SELECT generate_series(
    date_trunc('month', now() - interval '11 months'),
    date_trunc('month', now()),
    interval '1 month'
  )::date AS month_start
),
new_subs AS (
  SELECT date_trunc('month', subscription_started_at)::date AS month_start,
         COUNT(*)::int AS new_subs,
         COALESCE(SUM(mrr_usd), 0)::numeric AS new_mrr_usd
  FROM public.v_subscription_snapshot
  WHERE subscription_started_at IS NOT NULL
  GROUP BY 1
),
churn AS (
  SELECT date_trunc('month', canceled_at)::date AS month_start,
         COUNT(*)::int AS churned_subs,
         COALESCE(SUM(lost_mrr_usd), 0)::numeric AS churned_mrr_usd
  FROM public.v_subscription_churn_events
  WHERE canceled_at IS NOT NULL
  GROUP BY 1
)
SELECT
  m.month_start,
  COALESCE(n.new_subs, 0) AS new_subs,
  COALESCE(n.new_mrr_usd, 0) AS new_mrr_usd,
  COALESCE(c.churned_subs, 0) AS churned_subs,
  COALESCE(c.churned_mrr_usd, 0) AS churned_mrr_usd,
  0::int     AS expansion_subs,
  0::numeric AS expansion_mrr_usd,
  0::int     AS contraction_subs,
  0::numeric AS contraction_mrr_usd,
  'derived'::text AS basis
FROM months m
LEFT JOIN new_subs n ON n.month_start = m.month_start
LEFT JOIN churn    c ON c.month_start = m.month_start
ORDER BY m.month_start;

CREATE OR REPLACE VIEW public.v_bi_subscription_snapshot     WITH (security_invoker=true) AS SELECT * FROM public.v_subscription_snapshot;
CREATE OR REPLACE VIEW public.v_bi_subscription_mrr_summary  WITH (security_invoker=true) AS SELECT * FROM public.v_subscription_mrr_summary;
CREATE OR REPLACE VIEW public.v_bi_subscription_plan_summary WITH (security_invoker=true) AS SELECT * FROM public.v_subscription_plan_summary;
CREATE OR REPLACE VIEW public.v_bi_subscription_direct_vs_wl WITH (security_invoker=true) AS SELECT * FROM public.v_subscription_direct_vs_wl;
CREATE OR REPLACE VIEW public.v_bi_subscription_churn_events WITH (security_invoker=true) AS SELECT * FROM public.v_subscription_churn_events;
CREATE OR REPLACE VIEW public.v_bi_subscription_movements    WITH (security_invoker=true) AS SELECT * FROM public.v_subscription_movements;
CREATE OR REPLACE VIEW public.v_bi_subscription_wl_recurring WITH (security_invoker=true) AS SELECT * FROM public.v_subscription_wl_recurring;
