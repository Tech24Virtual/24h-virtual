
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
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin required';
  END IF;

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
       jsonb_build_object('count', v_growth.disc_pages_ready_to_publish),'open',now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := array_append(recs_seen,'growth.disc.ready_to_publish');
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
       jsonb_build_object('count', v_growth.disc_pages_needs_rewrite),'open',now())
    ON CONFLICT (dedupe_key) DO UPDATE SET
      severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := array_append(recs_seen,'growth.disc.needs_rewrite');
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE readiness_state='configured_offline')      AS offline_n,
    COUNT(*) FILTER (WHERE readiness_state='awaiting_script_publish') AS noscript_n,
    COUNT(*) FILTER (WHERE readiness_state='awaiting_number')         AS nonumber_n,
    COUNT(*) FILTER (WHERE readiness_state='ready_to_activate')       AS ready_n
  INTO v_voice FROM public.v_call_flow_receptionist_readiness;

  IF v_voice.offline_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key,domain,kind,tier,severity,title,detail,drill_route,payload,status,last_detected_at)
    VALUES ('voice.flows.offline','voice','receptionist_offline','confirm','warn',
       'Receptionists configured but offline',
       v_voice.offline_n || ' call flow(s) configured but not currently routing live calls.',
       '/admin/campaign-os/call-flows',jsonb_build_object('count',v_voice.offline_n),'open',now())
    ON CONFLICT (dedupe_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := array_append(recs_seen,'voice.flows.offline');
  END IF;
  IF v_voice.noscript_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key,domain,kind,tier,severity,title,detail,drill_route,payload,status,last_detected_at)
    VALUES ('voice.flows.awaiting_script','voice','receptionist_awaiting_script','recommend','notice',
       'Receptionists awaiting script publish',
       v_voice.noscript_n || ' configured flow(s) blocked by an unpublished script.',
       '/admin/campaign-os/call-flows',jsonb_build_object('count',v_voice.noscript_n),'open',now())
    ON CONFLICT (dedupe_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := array_append(recs_seen,'voice.flows.awaiting_script');
  END IF;
  IF v_voice.nonumber_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key,domain,kind,tier,severity,title,detail,drill_route,payload,status,last_detected_at)
    VALUES ('voice.flows.awaiting_number','voice','receptionist_awaiting_number','recommend','notice',
       'Receptionists awaiting active number',
       v_voice.nonumber_n || ' configured flow(s) blocked by missing/inactive phone number.',
       '/admin/campaign-os/call-flows',jsonb_build_object('count',v_voice.nonumber_n),'open',now())
    ON CONFLICT (dedupe_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := array_append(recs_seen,'voice.flows.awaiting_number');
  END IF;
  IF v_voice.ready_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key,domain,kind,tier,severity,title,detail,drill_route,payload,status,last_detected_at)
    VALUES ('voice.flows.ready_to_activate','voice','receptionist_ready','confirm','notice',
       'Receptionists ready to activate',
       v_voice.ready_n || ' flow(s) ready — operator confirmation required to enable.',
       '/admin/campaign-os/call-flows',jsonb_build_object('count',v_voice.ready_n),'open',now())
    ON CONFLICT (dedupe_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := array_append(recs_seen,'voice.flows.ready_to_activate');
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE readiness_state IN ('pending','configured')) AS stuck_n,
    COUNT(*) FILTER (WHERE readiness_state IN ('domain_pending','domain_ready')) AS domain_n
  INTO v_wl FROM public.v_wl_partner_readiness;
  IF v_wl.stuck_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key,domain,kind,tier,severity,title,detail,drill_route,payload,status,last_detected_at)
    VALUES ('wl.partners.stuck_preconfig','wl','partner_stuck_preconfig','recommend','warn',
       'WL partners stuck pre-branding',
       v_wl.stuck_n || ' partner(s) without branding completed.',
       '/admin/partners',jsonb_build_object('count',v_wl.stuck_n),'open',now())
    ON CONFLICT (dedupe_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := array_append(recs_seen,'wl.partners.stuck_preconfig');
  END IF;
  IF v_wl.domain_n > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key,domain,kind,tier,severity,title,detail,drill_route,payload,status,last_detected_at)
    VALUES ('wl.partners.domain_pending','wl','partner_domain_pending','recommend','notice',
       'WL partners awaiting domain readiness',
       v_wl.domain_n || ' branded partner(s) not yet domain-ready / live.',
       '/admin/partners',jsonb_build_object('count',v_wl.domain_n),'open',now())
    ON CONFLICT (dedupe_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := array_append(recs_seen,'wl.partners.domain_pending');
  END IF;

  SELECT COALESCE(SUM(urgent_count),0)::int INTO v_delivery_urgent FROM public.v_delivery_pipeline;
  IF v_delivery_urgent > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key,domain,kind,tier,severity,title,detail,drill_route,payload,status,last_detected_at)
    VALUES ('delivery.intakes.urgent','delivery','intake_urgent','recommend','warn',
       'Urgent intakes awaiting action',
       v_delivery_urgent || ' intake(s) flagged urgent across the pipeline.',
       '/admin/fulfillment-intake',jsonb_build_object('count',v_delivery_urgent),'open',now())
    ON CONFLICT (dedupe_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := array_append(recs_seen,'delivery.intakes.urgent');
  END IF;

  SELECT COUNT(*)::int INTO v_stale_intake
    FROM public.v_intake_pipeline WHERE status='submitted' AND age_hours > 72;
  IF v_stale_intake > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key,domain,kind,tier,severity,title,detail,drill_route,payload,status,last_detected_at)
    VALUES ('delivery.intakes.stale_submitted','delivery','intake_stale','recommend','warn',
       'Submitted intakes stale > 72h',
       v_stale_intake || ' submitted intake(s) untouched for over 72 hours.',
       '/admin/fulfillment-intake',jsonb_build_object('count',v_stale_intake),'open',now())
    ON CONFLICT (dedupe_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := array_append(recs_seen,'delivery.intakes.stale_submitted');
  END IF;

  SELECT COALESCE(SUM(overdue_followups),0)::int INTO v_overdue_followups FROM public.v_revenue_pipeline;
  IF v_overdue_followups > 0 THEN
    INSERT INTO public.automation_recommendations
      (dedupe_key,domain,kind,tier,severity,title,detail,drill_route,payload,status,last_detected_at)
    VALUES ('revenue.leads.overdue_followups','revenue','lead_overdue_followups','recommend',
       CASE WHEN v_overdue_followups > 10 THEN 'warn' ELSE 'notice' END,
       'Leads with overdue follow-ups',
       v_overdue_followups || ' lead follow-up(s) past due across the pipeline.',
       '/admin/leads',jsonb_build_object('count',v_overdue_followups),'open',now())
    ON CONFLICT (dedupe_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,
      drill_route=EXCLUDED.drill_route,payload=EXCLUDED.payload,last_detected_at=now(),
      status=CASE WHEN automation_recommendations.status='dismissed' THEN 'dismissed' ELSE 'open' END;
    recs_seen := array_append(recs_seen,'revenue.leads.overdue_followups');
  END IF;

  WITH resolved AS (
    UPDATE public.automation_recommendations
       SET status='resolved', resolved_at=now(),
           resolved_reason='auto_resolved_no_longer_detected'
     WHERE status='open' AND last_detected_at < run_started_at
       AND NOT (dedupe_key = ANY(recs_seen))
     RETURNING 1
  ) SELECT COUNT(*)::int INTO recs_resolved FROM resolved;

  SELECT COUNT(*)::int INTO recs_created
    FROM public.automation_recommendations WHERE first_detected_at >= run_started_at;

  INSERT INTO public.dashboard_events (event_name,surface,persona,properties)
  VALUES ('automation.checks.executed','mission_control','system',
          jsonb_build_object('seen', COALESCE(array_length(recs_seen,1),0),
                             'created', recs_created, 'resolved', recs_resolved));

  RETURN jsonb_build_object('seen', COALESCE(array_length(recs_seen,1),0),
                            'created', recs_created, 'resolved', recs_resolved);
END;
$$;
