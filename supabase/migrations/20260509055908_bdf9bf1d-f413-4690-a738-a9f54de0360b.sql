
-- Per-request approval cycle analytics
CREATE OR REPLACE VIEW public.v_bi_approval_cycle_time
WITH (security_invoker = true) AS
SELECT
  r.id                                 AS request_id,
  r.deal_id,
  r.policy_id,
  p.name                               AS policy_name,
  r.tier,
  r.required_role,
  r.status::text                       AS status,
  r.reason,
  r.decision_notes,
  r.decided_by,
  prof.full_name                       AS decided_by_name,
  r.requested_at,
  r.decided_at,
  r.sla_hours_snapshot,
  r.estimated_discount_pct_snapshot,
  r.is_non_standard_term_snapshot,
  r.is_exception_snapshot,
  r.proposed_plan_key_snapshot,
  r.proposed_term_months_snapshot,
  d.scope                              AS deal_scope,
  d.deal_type                          AS deal_type,
  d.stage                              AS deal_stage,
  d.approval_state                     AS deal_approval_state,
  CASE
    WHEN r.decided_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (r.decided_at - r.requested_at))/3600.0
    ELSE EXTRACT(EPOCH FROM (now() - r.requested_at))/3600.0
  END                                  AS hours_to_decision,
  CASE WHEN r.decided_at IS NULL THEN true ELSE false END AS is_open,
  CASE
    WHEN r.sla_hours_snapshot IS NULL THEN false
    WHEN r.decided_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (r.decided_at - r.requested_at))/3600.0 > r.sla_hours_snapshot
    ELSE EXTRACT(EPOCH FROM (now() - r.requested_at))/3600.0 > r.sla_hours_snapshot
  END                                  AS is_sla_breached
FROM public.approval_requests r
JOIN public.renewal_expansion_deals d  ON d.id = r.deal_id
LEFT JOIN public.approval_policies p   ON p.id = r.policy_id
LEFT JOIN public.profiles prof         ON prof.id = r.decided_by;

GRANT SELECT ON public.v_bi_approval_cycle_time TO authenticated;

-- Funnel + cycle stats grouped by policy / tier / role / scope / deal type
CREATE OR REPLACE VIEW public.v_bi_approval_funnel
WITH (security_invoker = true) AS
WITH base AS (
  SELECT * FROM public.v_bi_approval_cycle_time
)
SELECT
  policy_id,
  policy_name,
  tier,
  required_role,
  deal_scope,
  deal_type,
  COUNT(*)                                                         AS total_requests,
  COUNT(*) FILTER (WHERE status = 'pending')                       AS pending_count,
  COUNT(*) FILTER (WHERE status = 'approved')                      AS approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected')                      AS rejected_count,
  COUNT(*) FILTER (WHERE status = 'cancelled')                     AS cancelled_count,
  COUNT(*) FILTER (WHERE is_sla_breached)                          AS sla_breached_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE status IN ('approved','rejected')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE status = 'approved')::numeric
        / NULLIF(COUNT(*) FILTER (WHERE status IN ('approved','rejected')), 0)::numeric
      , 4)
    ELSE NULL
  END                                                              AS approval_rate,
  CASE
    WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE is_sla_breached)::numeric / COUNT(*)::numeric, 4)
    ELSE NULL
  END                                                              AS sla_breach_rate,
  ROUND(AVG(hours_to_decision) FILTER (WHERE NOT is_open)::numeric, 2)
                                                                   AS avg_hours_to_decision,
  ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hours_to_decision)
         FILTER (WHERE NOT is_open))::numeric, 2)                  AS median_hours_to_decision,
  ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY hours_to_decision)
         FILTER (WHERE NOT is_open))::numeric, 2)                  AS p90_hours_to_decision,
  MAX(requested_at)                                                AS last_requested_at,
  MAX(decided_at)                                                  AS last_decided_at
FROM base
GROUP BY policy_id, policy_name, tier, required_role, deal_scope, deal_type;

GRANT SELECT ON public.v_bi_approval_funnel TO authenticated;
