
-- Phase 13: Attribution / Cohorts / Growth Intelligence

-- Canonical channel normalizer (immutable, deterministic)
CREATE OR REPLACE FUNCTION public.growth_normalize_channel(_source text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _source IS NULL OR btrim(_source) = '' THEN 'unknown'
    WHEN _source ILIKE '%chat_widget%' OR _source ILIKE '%widget%' THEN 'widget'
    WHEN _source ILIKE '%onboarding_wizard%' OR _source ILIKE '%wizard%' THEN 'wizard'
    WHEN _source ILIKE '%exit_intent%' OR _source ILIKE '%popup%' THEN 'exit_intent'
    WHEN _source ILIKE '%demo%' OR _source ILIKE '%consult%' THEN 'demo'
    WHEN _source ILIKE '%referral%' OR _source ILIKE '%affiliate%' THEN 'referral'
    WHEN _source ILIKE '%wl%' OR _source ILIKE '%white_label%' OR _source ILIKE '%partner%' THEN 'partner_wl'
    WHEN _source ILIKE '%paid%' OR _source ILIKE '%ads%' OR _source ILIKE '%google_ads%' OR _source ILIKE '%meta%' THEN 'paid'
    WHEN _source ILIKE '%organic%' OR _source ILIKE '%seo%' OR _source ILIKE '%blog%' THEN 'organic'
    WHEN _source ILIKE '%direct%' THEN 'direct'
    ELSE lower(regexp_replace(_source, '\s+', '_', 'g'))
  END;
$$;

-- Per-lead attribution view (canonical)
CREATE OR REPLACE VIEW public.v_growth_attribution_lead
WITH (security_invoker = true)
AS
SELECT
  l.id                                          AS lead_id,
  l.created_at                                  AS lead_created_at,
  date_trunc('month', l.created_at)::date       AS cohort_month,
  COALESCE(NULLIF(l.source, ''), 'unknown')     AS raw_source,
  public.growth_normalize_channel(l.source)     AS channel,
  CASE
    WHEN i.partner_id IS NOT NULL THEN 'wl'
    ELSE 'direct'
  END                                           AS acquisition_type,
  i.partner_id                                  AS wl_partner_id,
  l.pipeline_stage,
  l.lead_temperature,
  l.country,
  l.billing_currency,
  l.service_type,
  (lc.lead_id IS NOT NULL)                      AS converted,
  lc.converted_at,
  i.id                                          AS intake_id,
  i.activated_at                                AS activated_at,
  CASE
    WHEN lc.converted_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (lc.converted_at - l.created_at))/86400.0
  END                                           AS days_to_convert
FROM public.leads l
LEFT JOIN public.lead_conversions lc
  ON lc.lead_id = l.id
LEFT JOIN public.internal_fulfillment_intakes i
  ON i.client_lead_id = l.id OR i.lead_id = l.id;

COMMENT ON VIEW public.v_growth_attribution_lead IS
  'Phase 13: per-lead canonical attribution. SECURITY INVOKER; relies on leads RLS (admin/supervisor visible). Channel is normalized via growth_normalize_channel. acquisition_type is honest binary (direct vs wl) based on intake.partner_id presence; multi-touch is intentionally NOT modeled.';

-- Channel summary (last 365d)
CREATE OR REPLACE VIEW public.v_growth_channel_summary
WITH (security_invoker = true)
AS
SELECT
  channel,
  COUNT(*)::int                                                  AS leads,
  COUNT(*) FILTER (WHERE converted)::int                         AS conversions,
  COUNT(*) FILTER (WHERE acquisition_type = 'direct')::int       AS direct_leads,
  COUNT(*) FILTER (WHERE acquisition_type = 'wl')::int           AS wl_leads,
  CASE WHEN COUNT(*) > 0
    THEN ROUND(100.0 * COUNT(*) FILTER (WHERE converted)::numeric / COUNT(*), 2)
    ELSE 0
  END                                                            AS conversion_rate_pct,
  ROUND(AVG(days_to_convert) FILTER (WHERE days_to_convert IS NOT NULL)::numeric, 1)
                                                                 AS avg_days_to_convert,
  COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::int          AS activations
FROM public.v_growth_attribution_lead
WHERE lead_created_at >= now() - interval '365 days'
GROUP BY channel
ORDER BY leads DESC;

COMMENT ON VIEW public.v_growth_channel_summary IS
  'Phase 13: channel performance, last 365 days. Honest first-touch only; no fabricated multi-touch attribution.';

-- Lead-month cohort view (last 12 months)
CREATE OR REPLACE VIEW public.v_growth_cohort_lead_month
WITH (security_invoker = true)
AS
SELECT
  cohort_month,
  COUNT(*)::int                                                 AS leads,
  COUNT(*) FILTER (WHERE converted)::int                        AS conversions,
  COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::int         AS activations,
  COUNT(*) FILTER (WHERE acquisition_type = 'direct')::int      AS direct_leads,
  COUNT(*) FILTER (WHERE acquisition_type = 'wl')::int          AS wl_leads,
  CASE WHEN COUNT(*) > 0
    THEN ROUND(100.0 * COUNT(*) FILTER (WHERE converted)::numeric / COUNT(*), 2)
    ELSE 0
  END                                                           AS conversion_rate_pct,
  CASE WHEN COUNT(*) > 0
    THEN ROUND(100.0 * COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::numeric / COUNT(*), 2)
    ELSE 0
  END                                                           AS activation_rate_pct
FROM public.v_growth_attribution_lead
WHERE cohort_month >= date_trunc('month', now() - interval '12 months')::date
GROUP BY cohort_month
ORDER BY cohort_month DESC;

COMMENT ON VIEW public.v_growth_cohort_lead_month IS
  'Phase 13: lead-creation-month cohorts (trailing 12 months). Activation = intake activated_at present.';

-- Direct vs WL comparison
CREATE OR REPLACE VIEW public.v_growth_direct_vs_wl
WITH (security_invoker = true)
AS
SELECT
  acquisition_type,
  COUNT(*)::int                                                  AS leads,
  COUNT(*) FILTER (WHERE converted)::int                         AS conversions,
  COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::int          AS activations,
  CASE WHEN COUNT(*) > 0
    THEN ROUND(100.0 * COUNT(*) FILTER (WHERE converted)::numeric / COUNT(*), 2)
    ELSE 0
  END                                                            AS conversion_rate_pct,
  CASE WHEN COUNT(*) > 0
    THEN ROUND(100.0 * COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::numeric / COUNT(*), 2)
    ELSE 0
  END                                                            AS activation_rate_pct,
  ROUND(AVG(days_to_convert) FILTER (WHERE days_to_convert IS NOT NULL)::numeric, 1)
                                                                 AS avg_days_to_convert
FROM public.v_growth_attribution_lead
WHERE lead_created_at >= now() - interval '365 days'
GROUP BY acquisition_type
ORDER BY leads DESC;

COMMENT ON VIEW public.v_growth_direct_vs_wl IS
  'Phase 13: direct vs white-label acquisition comparison, last 365 days.';

-- BI mirrors for Phase 11 export infrastructure
CREATE OR REPLACE VIEW public.v_bi_growth_channel_summary
WITH (security_invoker = true)
AS SELECT * FROM public.v_growth_channel_summary;

CREATE OR REPLACE VIEW public.v_bi_growth_cohort_summary
WITH (security_invoker = true)
AS SELECT * FROM public.v_growth_cohort_lead_month;

CREATE OR REPLACE VIEW public.v_bi_growth_direct_vs_wl
WITH (security_invoker = true)
AS SELECT * FROM public.v_growth_direct_vs_wl;

COMMENT ON VIEW public.v_bi_growth_channel_summary IS 'Phase 13 BI mirror — admin/RLS-scoped channel performance.';
COMMENT ON VIEW public.v_bi_growth_cohort_summary  IS 'Phase 13 BI mirror — admin/RLS-scoped lead-month cohorts.';
COMMENT ON VIEW public.v_bi_growth_direct_vs_wl    IS 'Phase 13 BI mirror — admin/RLS-scoped direct vs WL summary.';
