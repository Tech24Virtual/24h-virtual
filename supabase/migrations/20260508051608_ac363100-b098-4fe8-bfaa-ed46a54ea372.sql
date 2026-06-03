
-- Phase 9 — Reporting / Intelligence Layer
-- Read-only aggregation views over canonical sources. No new writable surfaces.

-- ── Domain classifier (mirrors src/lib/governance/missionControl.ts) ──
CREATE OR REPLACE FUNCTION public.classify_event_domain(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _name LIKE 'voice.%' THEN 'voice'
    WHEN _name LIKE 'wl.%' THEN 'wl'
    WHEN _name LIKE 'delivery.%' OR _name LIKE 'intake.%' OR _name LIKE 'fulfillment.%' THEN 'delivery'
    WHEN _name LIKE 'lead.%' OR _name LIKE 'revenue.%' OR _name LIKE 'proposal.%' OR _name LIKE 'meeting.%' THEN 'revenue'
    WHEN _name LIKE 'disc.%' OR _name LIKE 'blog.%' OR _name LIKE 'keyword.%' OR _name LIKE 'growth.%' THEN 'growth'
    WHEN _name LIKE 'automation.%' THEN 'automation'
    ELSE 'system'
  END;
$$;

-- ── Daily event trend (last 30 days, per domain) ────────────────
CREATE OR REPLACE VIEW public.v_intelligence_event_trend_30d AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  public.classify_event_domain(event_name) AS domain,
  COUNT(*)::bigint AS event_count
FROM public.dashboard_events
WHERE occurred_at >= (now() - interval '30 days')
GROUP BY 1, 2
ORDER BY 1, 2;

-- ── Executive summary (single row roll-up) ──────────────────────
CREATE OR REPLACE VIEW public.v_intelligence_executive_summary AS
SELECT
  -- Revenue
  (SELECT COUNT(*) FROM public.leads
     WHERE status NOT IN ('converted','lost','disqualified'))::bigint        AS active_leads,
  (SELECT COUNT(*) FROM public.leads
     WHERE won_at >= (now() - interval '30 days'))::bigint                   AS leads_won_30d,
  (SELECT COUNT(*) FROM public.leads
     WHERE created_at >= (now() - interval '30 days'))::bigint               AS leads_new_30d,

  -- Delivery
  (SELECT COUNT(*) FROM public.internal_fulfillment_intakes
     WHERE status NOT IN ('activated','closed'))::bigint                     AS intakes_open,
  (SELECT COUNT(*) FROM public.internal_fulfillment_intakes
     WHERE activated_at >= (now() - interval '30 days'))::bigint             AS intakes_activated_30d,

  -- Voice
  (SELECT COUNT(*) FROM public.v_call_flow_receptionist_readiness
     WHERE readiness_state = 'live')::bigint                                 AS receptionists_live,
  (SELECT COUNT(*) FROM public.v_call_flow_receptionist_readiness
     WHERE readiness_state IN ('awaiting_script_publish','awaiting_number')) AS receptionists_blocked,

  -- White Label
  (SELECT COUNT(*) FROM public.v_wl_partner_readiness
     WHERE readiness_state = 'live')::bigint                                 AS wl_partners_live,
  (SELECT COUNT(*) FROM public.v_wl_partner_readiness)::bigint               AS wl_partners_total,

  -- Growth
  (SELECT COUNT(*) FROM public.blog_posts
     WHERE status = 'published'
       AND published_at >= (now() - interval '30 days'))::bigint             AS blog_published_30d,

  -- Automation
  (SELECT COUNT(*) FROM public.automation_recommendations
     WHERE status = 'open')::bigint                                          AS recs_open,
  (SELECT COUNT(*) FROM public.automation_recommendations
     WHERE status = 'open' AND severity IN ('warn','critical'))::bigint      AS recs_warn_or_critical,
  (SELECT COUNT(*) FROM public.automation_recommendations
     WHERE resolved_at >= (now() - interval '30 days'))::bigint              AS recs_resolved_30d,

  now() AS computed_at;

GRANT SELECT ON public.v_intelligence_event_trend_30d TO authenticated;
GRANT SELECT ON public.v_intelligence_executive_summary TO authenticated;
