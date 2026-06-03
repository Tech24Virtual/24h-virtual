
-- Phase 16 — Retention / Success Intelligence
-- All views SECURITY INVOKER. Rule-based, explainable, admin-first.

-- ── v_success_account_status ─────────────────────────────────────
-- One row per live (or recently-live) account.
-- Health band derived from canonical delivery, receptionist, ticket,
-- activity, and commercial-lifecycle signals. Reasons are explicit.

CREATE OR REPLACE VIEW public.v_success_account_status
WITH (security_invoker = true)
AS
WITH base AS (
  SELECT
    d.lead_id,
    d.name,
    d.company,
    d.service_state,
    d.activated_at,
    d.open_tickets_count,
    d.live_campaigns_count,
    d.total_campaigns_count,
    d.last_delivery_event_at,
    GREATEST(0, EXTRACT(DAY FROM (now() - d.activated_at)))::int AS days_live,
    GREATEST(0, EXTRACT(DAY FROM (now() - COALESCE(d.last_delivery_event_at, d.activated_at))))::int AS days_since_activity
  FROM public.v_client_delivery_status d
  WHERE d.service_state = 'live'
),
recept AS (
  SELECT
    a.client_lead_id AS lead_id,
    a.flow_count,
    a.live_count,
    a.pending_count,
    a.unconfigured_count,
    a.last_validated_at
  FROM public.v_account_receptionist_status a
  WHERE a.client_lead_id IS NOT NULL
),
lifecycle AS (
  SELECT s.client_id AS lead_id, s.signal, s.plan_name, s.latest_period_end
  FROM public.v_commercial_lifecycle_signals s
),
acq AS (
  SELECT DISTINCT ON (i.client_lead_id)
    i.client_lead_id AS lead_id,
    CASE WHEN i.partner_id IS NOT NULL THEN 'wl' ELSE 'direct' END AS acquisition_type,
    i.partner_id
  FROM public.internal_fulfillment_intakes i
  WHERE i.client_lead_id IS NOT NULL
  ORDER BY i.client_lead_id, i.activated_at DESC NULLS LAST, i.created_at DESC
)
SELECT
  b.lead_id,
  b.name,
  b.company,
  COALESCE(a.acquisition_type, 'direct')::text AS acquisition_type,
  a.partner_id,
  b.activated_at,
  b.days_live,
  b.days_since_activity,
  b.open_tickets_count,
  b.live_campaigns_count,
  b.total_campaigns_count,
  COALESCE(r.flow_count, 0)::int       AS receptionist_flow_count,
  COALESCE(r.live_count, 0)::int       AS receptionist_live_count,
  COALESCE(r.pending_count, 0)::int    AS receptionist_pending_count,
  CASE
    WHEN COALESCE(r.flow_count, 0) = 0                 THEN 'missing'
    WHEN COALESCE(r.live_count, 0) = 0                 THEN 'missing'
    WHEN r.live_count = r.flow_count                   THEN 'healthy'
    ELSE 'partial'
  END AS receptionist_health,
  COALESCE(l.signal, 'insufficient_history')::text AS lifecycle_signal,
  l.plan_name,
  l.latest_period_end,
  -- Rule-based health band
  CASE
    WHEN COALESCE(r.live_count, 0) = 0
      OR l.signal = 'downgrade_risk'
      OR b.open_tickets_count >= 3
      OR (l.signal = 'stalled' AND b.days_since_activity >= 30)
        THEN 'intervention'
    WHEN l.signal = 'stalled'
      OR b.days_since_activity BETWEEN 14 AND 29
      OR (COALESCE(r.flow_count, 0) > 0 AND r.live_count < r.flow_count)
      OR b.open_tickets_count BETWEEN 1 AND 2
        THEN 'watch'
    ELSE 'healthy'
  END AS health_band,
  -- Explicit, human-readable reasons
  ARRAY_REMOVE(ARRAY[
    CASE WHEN COALESCE(r.live_count, 0) = 0                                THEN 'no_live_receptionist'        END,
    CASE WHEN COALESCE(r.flow_count, 0) > 0 AND r.live_count < r.flow_count THEN 'partial_receptionist'        END,
    CASE WHEN l.signal = 'downgrade_risk'                                  THEN 'downgrade_risk_signal'      END,
    CASE WHEN l.signal = 'stalled'                                         THEN 'stalled_usage'              END,
    CASE WHEN b.open_tickets_count >= 3                                    THEN 'high_open_tickets'          END,
    CASE WHEN b.open_tickets_count BETWEEN 1 AND 2                         THEN 'open_tickets'               END,
    CASE WHEN b.days_since_activity >= 30                                  THEN 'dormant_30d'                END,
    CASE WHEN b.days_since_activity BETWEEN 14 AND 29                      THEN 'low_activity_14d'           END,
    CASE WHEN l.signal = 'expansion'                                       THEN 'expansion_signal'           END
  ], NULL) AS reasons
FROM base b
LEFT JOIN recept r    ON r.lead_id = b.lead_id
LEFT JOIN lifecycle l ON l.lead_id = b.lead_id
LEFT JOIN acq a       ON a.lead_id = b.lead_id;

-- ── v_success_health_summary ────────────────────────────────────
CREATE OR REPLACE VIEW public.v_success_health_summary
WITH (security_invoker = true)
AS
SELECT
  health_band,
  COUNT(*)::int AS accounts,
  COUNT(*) FILTER (WHERE acquisition_type = 'direct')::int AS direct_accounts,
  COUNT(*) FILTER (WHERE acquisition_type = 'wl')::int     AS wl_accounts
FROM public.v_success_account_status
GROUP BY health_band;

-- ── v_success_risk_buckets ──────────────────────────────────────
CREATE OR REPLACE VIEW public.v_success_risk_buckets
WITH (security_invoker = true)
AS
SELECT
  reason,
  COUNT(*)::int AS accounts
FROM public.v_success_account_status, UNNEST(reasons) AS reason
WHERE reason <> 'expansion_signal'
GROUP BY reason
ORDER BY COUNT(*) DESC;

-- ── v_success_expansion_candidates ──────────────────────────────
CREATE OR REPLACE VIEW public.v_success_expansion_candidates
WITH (security_invoker = true)
AS
SELECT
  s.lead_id,
  s.name,
  s.company,
  s.acquisition_type,
  s.partner_id,
  s.plan_name,
  s.days_live,
  s.receptionist_health,
  s.open_tickets_count,
  s.lifecycle_signal,
  s.latest_period_end
FROM public.v_success_account_status s
WHERE s.lifecycle_signal = 'expansion'
   OR (s.health_band = 'healthy' AND s.days_live >= 60 AND s.receptionist_health = 'healthy');

-- ── v_success_direct_vs_wl ──────────────────────────────────────
CREATE OR REPLACE VIEW public.v_success_direct_vs_wl
WITH (security_invoker = true)
AS
SELECT
  acquisition_type,
  COUNT(*)::int                                                  AS accounts,
  COUNT(*) FILTER (WHERE health_band = 'healthy')::int           AS healthy,
  COUNT(*) FILTER (WHERE health_band = 'watch')::int             AS watch,
  COUNT(*) FILTER (WHERE health_band = 'intervention')::int      AS intervention,
  COUNT(*) FILTER (WHERE lifecycle_signal = 'expansion')::int    AS expansion_ready,
  COUNT(*) FILTER (WHERE 'no_live_receptionist' = ANY(reasons))::int AS no_live_receptionist,
  ROUND(AVG(days_live)::numeric, 1)                              AS avg_days_live,
  ROUND(AVG(days_since_activity)::numeric, 1)                    AS avg_days_since_activity
FROM public.v_success_account_status
GROUP BY acquisition_type;

-- ── BI mirrors (stable for Phase 11 export catalog) ─────────────
CREATE OR REPLACE VIEW public.v_bi_success_account_status        WITH (security_invoker = true) AS SELECT * FROM public.v_success_account_status;
CREATE OR REPLACE VIEW public.v_bi_success_health_summary        WITH (security_invoker = true) AS SELECT * FROM public.v_success_health_summary;
CREATE OR REPLACE VIEW public.v_bi_success_risk_buckets          WITH (security_invoker = true) AS SELECT * FROM public.v_success_risk_buckets;
CREATE OR REPLACE VIEW public.v_bi_success_expansion_candidates  WITH (security_invoker = true) AS SELECT * FROM public.v_success_expansion_candidates;
CREATE OR REPLACE VIEW public.v_bi_success_direct_vs_wl          WITH (security_invoker = true) AS SELECT * FROM public.v_success_direct_vs_wl;

COMMENT ON VIEW public.v_success_account_status IS
  'Phase 16. Per live-account success snapshot. Rule-based health_band + explicit reasons. SECURITY INVOKER; admin/billing RLS from underlying sources.';
COMMENT ON VIEW public.v_success_health_summary IS
  'Phase 16. Counts per health band (healthy/watch/intervention) split by acquisition type.';
COMMENT ON VIEW public.v_success_risk_buckets IS
  'Phase 16. Counts per explicit risk reason. Excludes expansion_signal.';
COMMENT ON VIEW public.v_success_expansion_candidates IS
  'Phase 16. Accounts flagged expansion-ready by commercial lifecycle signal or sustained healthy live operation.';
COMMENT ON VIEW public.v_success_direct_vs_wl IS
  'Phase 16. Direct vs WL portfolio post-go-live health comparison.';
