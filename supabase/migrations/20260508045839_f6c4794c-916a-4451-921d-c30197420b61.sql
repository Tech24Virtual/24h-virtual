
-- Phase 8 — Automation / Optimization Layer

CREATE TABLE IF NOT EXISTS public.automation_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL CHECK (domain IN ('growth','revenue','delivery','voice','wl','system')),
  kind text NOT NULL,
  tier text NOT NULL DEFAULT 'recommend' CHECK (tier IN ('detect','recommend','confirm','auto_safe')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','notice','warn','critical')),
  title text NOT NULL,
  detail text,
  drill_route text,
  dedupe_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','dismissed','resolved')),
  resolved_reason text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autorec_status_severity ON public.automation_recommendations (status, severity, last_detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_autorec_domain ON public.automation_recommendations (domain, status);

ALTER TABLE public.automation_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read recommendations" ON public.automation_recommendations;
CREATE POLICY "Admins read recommendations" ON public.automation_recommendations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.automation_check_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','failed')),
  recs_created int NOT NULL DEFAULT 0,
  recs_resolved int NOT NULL DEFAULT 0,
  error_text text,
  ran_at timestamptz NOT NULL DEFAULT now(),
  triggered_by text NOT NULL DEFAULT 'cron'
);
CREATE INDEX IF NOT EXISTS idx_check_runs_ran_at ON public.automation_check_runs (ran_at DESC);

ALTER TABLE public.automation_check_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read check runs" ON public.automation_check_runs;
CREATE POLICY "Admins read check runs" ON public.automation_check_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_updated_at_autorec()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_autorec_touch ON public.automation_recommendations;
CREATE TRIGGER trg_autorec_touch BEFORE UPDATE ON public.automation_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_autorec();

CREATE OR REPLACE VIEW public.v_open_recommendations AS
SELECT *,
  CASE severity
    WHEN 'critical' THEN 4
    WHEN 'warn' THEN 3
    WHEN 'notice' THEN 2
    ELSE 1
  END AS severity_rank
FROM public.automation_recommendations
WHERE status = 'open';

CREATE OR REPLACE FUNCTION public.generate_automation_recommendations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  run_started_at timestamptz := now();
  recs_seen text[] := ARRAY[]::text[];
  recs_created int := 0;
  recs_resolved int := 0;
  v_growth record;
  v_voice record;
  v_wl record;
  v_delivery_urgent int;
  v_stale_intake int;
  v_overdue_followups int;

  -- helper closures aren't supported; use a single dynamic block per item
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin required';
  END IF;

  -- GROWTH
  SELECT * INTO v_growth FROM public.v_growth_overview LIMIT 1;
  IF v_growth.disc_pages_ready_to_publish IS NOT NULL AND v_growth.disc_pages_ready_to_publish > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key, domain, kind, tier, severity, title, detail, drill_route, payload, status, last_detected_at)
    VALUES
      ('growth.disc.ready_to_publish','growth','disc_ready_to_publish','recommend',
       CASE WHEN v_growth.disc_pages_ready_to_publish > 10 THEN 'warn' ELSE 'notice' END,
       'Discoverability pages ready to publish',
       v_growth.disc_pages_ready_to_publish || ' page(s) marked ready_to_publish are still unpublished.',
       '/admin/discoverability',
       jsonb_build_object('count', v_growth.disc_pages_ready_to_publish),
       'open', now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity = EXCLUDED.severity, title = EXCLUDED.title, detail = EXCLUDED.detail,
      drill_route = EXCLUDED.drill_route, payload = EXCLUDED.payload, last_detected_at = now(),
      status = CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := recs_seen || 'growth.disc.ready_to_publish';
  END IF;

  IF v_growth.disc_pages_needs_rewrite IS NOT NULL AND v_growth.disc_pages_needs_rewrite > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key, domain, kind, tier, severity, title, detail, drill_route, payload, status, last_detected_at)
    VALUES
      ('growth.disc.needs_rewrite','growth','disc_needs_rewrite','recommend',
       CASE WHEN v_growth.disc_pages_needs_rewrite > 5 THEN 'warn' ELSE 'notice' END,
       'Discoverability pages need rewrite',
       v_growth.disc_pages_needs_rewrite || ' page(s) flagged needs_rewrite — schedule editorial pass.',
       '/admin/discoverability',
       jsonb_build_object('count', v_growth.disc_pages_needs_rewrite),
       'open', now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity = EXCLUDED.severity, title = EXCLUDED.title, detail = EXCLUDED.detail,
      drill_route = EXCLUDED.drill_route, payload = EXCLUDED.payload, last_detected_at = now(),
      status = CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := recs_seen || 'growth.disc.needs_rewrite';
  END IF;

  -- VOICE
  SELECT
    COUNT(*) FILTER (WHERE readiness_state = 'configured_offline')      AS offline_n,
    COUNT(*) FILTER (WHERE readiness_state = 'awaiting_script_publish') AS noscript_n,
    COUNT(*) FILTER (WHERE readiness_state = 'awaiting_number')         AS nonumber_n,
    COUNT(*) FILTER (WHERE readiness_state = 'ready_to_activate')       AS ready_n
  INTO v_voice
  FROM public.v_call_flow_receptionist_readiness;

  IF v_voice.offline_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key, domain, kind, tier, severity, title, detail, drill_route, payload, status, last_detected_at)
    VALUES
      ('voice.flows.offline','voice','receptionist_offline','confirm','warn',
       'Receptionists configured but offline',
       v_voice.offline_n || ' call flow(s) configured but not currently routing live calls.',
       '/admin/campaign-os/call-flows',
       jsonb_build_object('count', v_voice.offline_n),
       'open', now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := recs_seen || 'voice.flows.offline';
  END IF;

  IF v_voice.noscript_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key, domain, kind, tier, severity, title, detail, drill_route, payload, status, last_detected_at)
    VALUES
      ('voice.flows.awaiting_script','voice','receptionist_awaiting_script','recommend','notice',
       'Receptionists awaiting script publish',
       v_voice.noscript_n || ' configured flow(s) blocked by an unpublished script.',
       '/admin/campaign-os/call-flows',
       jsonb_build_object('count', v_voice.noscript_n),
       'open', now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := recs_seen || 'voice.flows.awaiting_script';
  END IF;

  IF v_voice.nonumber_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key, domain, kind, tier, severity, title, detail, drill_route, payload, status, last_detected_at)
    VALUES
      ('voice.flows.awaiting_number','voice','receptionist_awaiting_number','recommend','notice',
       'Receptionists awaiting active number',
       v_voice.nonumber_n || ' configured flow(s) blocked by missing/inactive phone number.',
       '/admin/campaign-os/call-flows',
       jsonb_build_object('count', v_voice.nonumber_n),
       'open', now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := recs_seen || 'voice.flows.awaiting_number';
  END IF;

  IF v_voice.ready_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key, domain, kind, tier, severity, title, detail, drill_route, payload, status, last_detected_at)
    VALUES
      ('voice.flows.ready_to_activate','voice','receptionist_ready','confirm','notice',
       'Receptionists ready to activate',
       v_voice.ready_n || ' flow(s) ready — operator confirmation required to enable.',
       '/admin/campaign-os/call-flows',
       jsonb_build_object('count', v_voice.ready_n),
       'open', now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := recs_seen || 'voice.flows.ready_to_activate';
  END IF;

  -- WL
  SELECT
    COUNT(*) FILTER (WHERE readiness_state IN ('pending','configured')) AS stuck_n,
    COUNT(*) FILTER (WHERE readiness_state IN ('domain_pending','domain_ready')) AS domain_n
  INTO v_wl FROM public.v_wl_partner_readiness;

  IF v_wl.stuck_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key, domain, kind, tier, severity, title, detail, drill_route, payload, status, last_detected_at)
    VALUES
      ('wl.partners.stuck_preconfig','wl','partner_stuck_preconfig','recommend','warn',
       'WL partners stuck pre-branding',
       v_wl.stuck_n || ' partner(s) without branding completed.',
       '/admin/partners',
       jsonb_build_object('count', v_wl.stuck_n),
       'open', now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := recs_seen || 'wl.partners.stuck_preconfig';
  END IF;

  IF v_wl.domain_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key, domain, kind, tier, severity, title, detail, drill_route, payload, status, last_detected_at)
    VALUES
      ('wl.partners.domain_pending','wl','partner_domain_pending','recommend','notice',
       'WL partners awaiting domain readiness',
       v_wl.domain_n || ' branded partner(s) not yet domain-ready / live.',
       '/admin/partners',
       jsonb_build_object('count', v_wl.domain_n),
       'open', now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := recs_seen || 'wl.partners.domain_pending';
  END IF;

  -- DELIVERY urgent
  SELECT COALESCE(SUM(urgent_count),0)::int INTO v_delivery_urgent FROM public.v_delivery_pipeline;
  IF v_delivery_urgent > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key, domain, kind, tier, severity, title, detail, drill_route, payload, status, last_detected_at)
    VALUES
      ('delivery.intakes.urgent','delivery','intake_urgent','recommend','warn',
       'Urgent intakes awaiting action',
       v_delivery_urgent || ' intake(s) flagged urgent across the pipeline.',
       '/admin/fulfillment-intake',
       jsonb_build_object('count', v_delivery_urgent),
       'open', now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := recs_seen || 'delivery.intakes.urgent';
  END IF;

  -- DELIVERY stale submitted intakes
  SELECT COUNT(*)::int INTO v_stale_intake
    FROM public.v_intake_pipeline
   WHERE status = 'submitted' AND age_hours > 72;
  IF v_stale_intake > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key, domain, kind, tier, severity, title, detail, drill_route, payload, status, last_detected_at)
    VALUES
      ('delivery.intakes.stale_submitted','delivery','intake_stale','recommend','warn',
       'Submitted intakes stale > 72h',
       v_stale_intake || ' submitted intake(s) untouched for over 72 hours.',
       '/admin/fulfillment-intake',
       jsonb_build_object('count', v_stale_intake),
       'open', now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := recs_seen || 'delivery.intakes.stale_submitted';
  END IF;

  -- REVENUE overdue followups
  SELECT COALESCE(SUM(overdue_followups),0)::int INTO v_overdue_followups FROM public.v_revenue_pipeline;
  IF v_overdue_followups > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key, domain, kind, tier, severity, title, detail, drill_route, payload, status, last_detected_at)
    VALUES
      ('revenue.leads.overdue_followups','revenue','lead_overdue_followups','recommend',
       CASE WHEN v_overdue_followups > 10 THEN 'warn' ELSE 'notice' END,
       'Leads with overdue follow-ups',
       v_overdue_followups || ' lead follow-up(s) past due across the pipeline.',
       '/admin/leads',
       jsonb_build_object('count', v_overdue_followups),
       'open', now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := recs_seen || 'revenue.leads.overdue_followups';
  END IF;

  -- Auto-resolve stale items not regenerated
  WITH resolved AS (
    UPDATE public.automation_recommendations
       SET status='resolved', resolved_at=now(),
           resolved_reason='auto_resolved_no_longer_detected'
     WHERE status='open'
       AND last_detected_at < run_started_at
       AND NOT (dedupe_key = ANY(recs_seen))
     RETURNING 1
  )
  SELECT COUNT(*)::int INTO recs_resolved FROM resolved;

  SELECT COUNT(*)::int INTO recs_created
    FROM public.automation_recommendations
   WHERE first_detected_at >= run_started_at;

  INSERT INTO public.dashboard_events (event_name, surface, persona, properties)
  VALUES ('automation.checks.executed','mission_control','system',
          jsonb_build_object('seen', COALESCE(array_length(recs_seen,1),0),
                             'created', recs_created, 'resolved', recs_resolved));

  RETURN jsonb_build_object('seen', COALESCE(array_length(recs_seen,1),0),
                            'created', recs_created, 'resolved', recs_resolved);
END;
$$;

REVOKE ALL ON FUNCTION public.generate_automation_recommendations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_automation_recommendations() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dismiss_recommendation(p_id uuid, p_reason text DEFAULT NULL)
RETURNS public.automation_recommendations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.automation_recommendations;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'admin required';
  END IF;
  UPDATE public.automation_recommendations
     SET status='dismissed', resolved_at=now(), resolved_by=auth.uid(),
         resolved_reason=COALESCE(p_reason,'dismissed_by_admin')
   WHERE id=p_id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'recommendation not found'; END IF;
  INSERT INTO public.audit_log (actor_id,action,target_table,target_id,metadata)
  VALUES (auth.uid(),'automation.recommendation.dismissed','automation_recommendations',p_id::text,
          jsonb_build_object('reason',p_reason,'dedupe_key',r.dedupe_key,'domain',r.domain));
  INSERT INTO public.dashboard_events (event_name,surface,persona,user_id,properties)
  VALUES ('automation.recommendation.dismissed','mission_control','admin',auth.uid(),
          jsonb_build_object('id',p_id,'dedupe_key',r.dedupe_key,'domain',r.domain));
  RETURN r;
END; $$;
REVOKE ALL ON FUNCTION public.dismiss_recommendation(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dismiss_recommendation(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_recommendation(p_id uuid, p_reason text DEFAULT NULL)
RETURNS public.automation_recommendations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.automation_recommendations;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'admin required';
  END IF;
  UPDATE public.automation_recommendations
     SET status='resolved', resolved_at=now(), resolved_by=auth.uid(),
         resolved_reason=COALESCE(p_reason,'resolved_by_admin')
   WHERE id=p_id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'recommendation not found'; END IF;
  INSERT INTO public.audit_log (actor_id,action,target_table,target_id,metadata)
  VALUES (auth.uid(),'automation.recommendation.resolved','automation_recommendations',p_id::text,
          jsonb_build_object('reason',p_reason,'dedupe_key',r.dedupe_key,'domain',r.domain));
  INSERT INTO public.dashboard_events (event_name,surface,persona,user_id,properties)
  VALUES ('automation.recommendation.resolved','mission_control','admin',auth.uid(),
          jsonb_build_object('id',p_id,'dedupe_key',r.dedupe_key,'domain',r.domain));
  RETURN r;
END; $$;
REVOKE ALL ON FUNCTION public.resolve_recommendation(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_recommendation(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_automation_check_run(
  p_check_name text, p_status text,
  p_recs_created int DEFAULT 0, p_recs_resolved int DEFAULT 0,
  p_error_text text DEFAULT NULL, p_triggered_by text DEFAULT 'manual'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.automation_check_runs (check_name,status,recs_created,recs_resolved,error_text,triggered_by)
  VALUES (p_check_name,p_status,p_recs_created,p_recs_resolved,p_error_text,p_triggered_by)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
REVOKE ALL ON FUNCTION public.record_automation_check_run(text,text,int,int,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_automation_check_run(text,text,int,int,text,text) TO authenticated, service_role;
