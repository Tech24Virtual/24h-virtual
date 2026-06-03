-- ============================================================
-- FUNCTIONS (174)
-- Schema: public
-- ============================================================


-- Function: public.accept_play_suggestion(p_suggestion_id uuid, p_notes text)
CREATE OR REPLACE FUNCTION public.accept_play_suggestion(p_suggestion_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.play_suggestions%ROWTYPE;
  t public.playbook_templates%ROWTYPE;
  v_play_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT * INTO s FROM public.play_suggestions WHERE id = p_suggestion_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'suggestion not pending'; END IF;
  SELECT * INTO t FROM public.playbook_templates WHERE id = s.template_id;

  IF s.scope = 'partner' THEN
    INSERT INTO public.partner_success_plays
      (partner_id, play_type, status, notes, template_id, due_date, reminder_enabled, created_by)
    VALUES
      (s.target_id, t.play_type, 'not_started', COALESCE(p_notes, s.reason), t.id,
       CURRENT_DATE + (t.default_followup_days || ' days')::interval, true, auth.uid())
    RETURNING id INTO v_play_id;
  ELSE
    INSERT INTO public.direct_success_plays
      (lead_id, play_type, status, notes, template_id, due_date, reminder_enabled, created_by)
    VALUES
      (s.target_id, t.play_type, 'not_started', COALESCE(p_notes, s.reason), t.id,
       CURRENT_DATE + (t.default_followup_days || ' days')::interval, true, auth.uid())
    RETURNING id INTO v_play_id;
  END IF;

  UPDATE public.play_suggestions
  SET status = 'accepted', resulting_play_id = v_play_id,
      decided_by = auth.uid(), decided_at = now()
  WHERE id = p_suggestion_id;

  RETURN v_play_id;
END;
$function$
;


-- Function: public.approval_policy_audit()
CREATE OR REPLACE FUNCTION public.approval_policy_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next int;
  v_action text;
  v_diff jsonb := '{}'::jsonb;
  v_snap jsonb;
  v_user uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_snap := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_snap := to_jsonb(NEW);
    IF (OLD.active IS DISTINCT FROM NEW.active) THEN
      v_action := CASE WHEN NEW.active THEN 'activated' ELSE 'deactivated' END;
    ELSE
      v_action := 'updated';
    END IF;
    -- compact diff: only changed top-level keys
    SELECT jsonb_object_agg(key, jsonb_build_object('from', oldv, 'to', newv))
      INTO v_diff
      FROM (
        SELECT n.key,
               o.value AS oldv,
               n.value AS newv
          FROM jsonb_each(to_jsonb(NEW)) n
          LEFT JOIN jsonb_each(to_jsonb(OLD)) o ON o.key = n.key
         WHERE n.key NOT IN ('updated_at','created_at')
           AND COALESCE(o.value, 'null'::jsonb) IS DISTINCT FROM n.value
      ) d;
    v_diff := COALESCE(v_diff, '{}'::jsonb);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_snap := to_jsonb(OLD);
  END IF;

  SELECT COALESCE(MAX(version_no), 0) + 1
    INTO v_next
    FROM public.approval_policy_versions
   WHERE policy_id = COALESCE(NEW.id, OLD.id);

  INSERT INTO public.approval_policy_versions
    (policy_id, version_no, action, changed_by, diff, snapshot)
  VALUES
    (COALESCE(NEW.id, OLD.id), v_next, v_action, v_user, v_diff, v_snap);

  RETURN COALESCE(NEW, OLD);
END;
$function$
;


-- Function: public.approval_request_notify_created()
CREATE OR REPLACE FUNCTION public.approval_request_notify_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'pending' AND NEW.created_notified_at IS NULL THEN
    PERFORM public.fire_approval_notification(NEW.id, 'approval_required');
    UPDATE approval_requests SET created_notified_at = now() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $function$
;


-- Function: public.approval_request_snapshot_sla()
CREATE OR REPLACE FUNCTION public.approval_request_snapshot_sla()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_sla int;
BEGIN
  IF NEW.sla_hours_snapshot IS NULL AND NEW.policy_id IS NOT NULL THEN
    SELECT sla_hours INTO v_sla FROM approval_policies WHERE id = NEW.policy_id;
    NEW.sla_hours_snapshot := COALESCE(v_sla, 24);
  ELSIF NEW.sla_hours_snapshot IS NULL THEN
    NEW.sla_hours_snapshot := 24;
  END IF;
  RETURN NEW;
END $function$
;


-- Function: public.approval_request_snapshot_trigger_flags()
CREATE OR REPLACE FUNCTION public.approval_request_snapshot_trigger_flags()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.estimated_discount_pct_snapshot IS NULL
     AND NEW.is_non_standard_term_snapshot IS NULL
     AND NEW.is_exception_snapshot IS NULL THEN
    SELECT
      d.estimated_discount_pct,
      d.is_non_standard_term,
      d.is_exception,
      d.proposed_plan_key,
      d.proposed_term_months
    INTO
      NEW.estimated_discount_pct_snapshot,
      NEW.is_non_standard_term_snapshot,
      NEW.is_exception_snapshot,
      NEW.proposed_plan_key_snapshot,
      NEW.proposed_term_months_snapshot
    FROM public.renewal_expansion_deals d
    WHERE d.id = NEW.deal_id;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.approve_communication_action(p_action_id uuid)
CREATE OR REPLACE FUNCTION public.approve_communication_action(p_action_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.communication_actions
    SET status = 'approved', approved_by = auth.uid()
    WHERE id = p_action_id AND status = 'suggested';
  RETURN FOUND;
END; $function$
;


-- Function: public.audit_billing_summaries_changes()
CREATE OR REPLACE FUNCTION public.audit_billing_summaries_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
BEGIN
  v_client_id := COALESCE(NEW.client_id, OLD.client_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('billing.summary.created', 'billing_summaries', NEW.id::text,
      jsonb_build_object('client_id', v_client_id), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('billing.summary.updated', 'billing_summaries', NEW.id::text,
      jsonb_build_object('client_id', v_client_id),
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('billing.summary.deleted', 'billing_summaries', OLD.id::text,
      jsonb_build_object('client_id', v_client_id), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;


-- Function: public.audit_client_addons_changes()
CREATE OR REPLACE FUNCTION public.audit_client_addons_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id uuid;
BEGIN
  v_lead_id := COALESCE(NEW.lead_id, OLD.lead_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('billing.addon.created', 'client_addons', NEW.id::text,
      jsonb_build_object('lead_id', v_lead_id), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('billing.addon.updated', 'client_addons', NEW.id::text,
      jsonb_build_object('lead_id', v_lead_id),
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('billing.addon.deleted', 'client_addons', OLD.id::text,
      jsonb_build_object('lead_id', v_lead_id), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;


-- Function: public.audit_custom_plans_changes()
CREATE OR REPLACE FUNCTION public.audit_custom_plans_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id uuid;
BEGIN
  v_lead_id := COALESCE(NEW.lead_id, OLD.lead_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('billing.custom_plan.created', 'custom_plans', NEW.id::text,
      jsonb_build_object('lead_id', v_lead_id), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('billing.custom_plan.updated', 'custom_plans', NEW.id::text,
      jsonb_build_object('lead_id', v_lead_id),
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('billing.custom_plan.deleted', 'custom_plans', OLD.id::text,
      jsonb_build_object('lead_id', v_lead_id), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;


-- Function: public.audit_lead_deletions()
CREATE OR REPLACE FUNCTION public.audit_lead_deletions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.log_audit_event(
    'lead.deleted',
    'leads',
    OLD.id::text,
    NULL,
    jsonb_build_object(
      'name', OLD.name, 'email', OLD.email, 'company', OLD.company,
      'pipeline_stage', OLD.pipeline_stage, 'snapshot', to_jsonb(OLD)
    )
  );
  RETURN OLD;
END;
$function$
;


-- Function: public.audit_user_roles_changes()
CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'role.granted',
      'user_roles',
      NEW.id::text,
      jsonb_build_object('target_user_id', NEW.user_id),
      jsonb_build_object('role', NEW.role)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'role.revoked',
      'user_roles',
      OLD.id::text,
      jsonb_build_object('target_user_id', OLD.user_id),
      jsonb_build_object('role', OLD.role)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;


-- Function: public.audit_wl_branding_changes()
CREATE OR REPLACE FUNCTION public.audit_wl_branding_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_partner_id uuid;
BEGIN
  v_partner_id := COALESCE(NEW.partner_id, OLD.partner_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('wl_branding.created', 'white_label_branding', NEW.id::text,
      jsonb_build_object('partner_id', v_partner_id), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('wl_branding.updated', 'white_label_branding', NEW.id::text,
      jsonb_build_object('partner_id', v_partner_id),
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('wl_branding.deleted', 'white_label_branding', OLD.id::text,
      jsonb_build_object('partner_id', v_partner_id), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;


-- Function: public.audit_wl_domain_aliases_changes()
CREATE OR REPLACE FUNCTION public.audit_wl_domain_aliases_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_partner_id uuid;
BEGIN
  v_partner_id := COALESCE(NEW.partner_id, OLD.partner_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('wl_domain_alias.created', 'white_label_domain_aliases', NEW.id::text,
      jsonb_build_object('partner_id', v_partner_id), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('wl_domain_alias.updated', 'white_label_domain_aliases', NEW.id::text,
      jsonb_build_object('partner_id', v_partner_id),
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('wl_domain_alias.deleted', 'white_label_domain_aliases', OLD.id::text,
      jsonb_build_object('partner_id', v_partner_id), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;


-- Function: public.campaign_touch_updated_at()
CREATE OR REPLACE FUNCTION public.campaign_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$function$
;


-- Function: public.can_mutate_script_document(p_document_id uuid)
CREATE OR REPLACE FUNCTION public.can_mutate_script_document(p_document_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.campaign_script_documents d
      JOIN public.campaigns c ON c.id = d.campaign_id
      WHERE d.id = p_document_id
    );
$function$
;


-- Function: public.capture_forecast_snapshot(p_label text, p_notes text)
CREATE OR REPLACE FUNCTION public.capture_forecast_snapshot(p_label text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_assumptions jsonb;
  v_probs jsonb;
  v_payload jsonb;
  v_horizon int;
  v_start date;
  v_end date;
  v_hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  SELECT to_jsonb(fa.*) INTO v_assumptions
    FROM public.forecast_assumptions fa WHERE assumption_key = 'default';
  SELECT COALESCE(jsonb_agg(to_jsonb(p.*) ORDER BY p.deal_type, p.stage), '[]'::jsonb) INTO v_probs
    FROM public.forecast_stage_probabilities p;
  SELECT COALESCE(jsonb_agg(to_jsonb(v.*) ORDER BY (v.month_index)), '[]'::jsonb) INTO v_payload
    FROM public.v_forecast_assembled v;

  v_horizon := COALESCE((v_assumptions->>'horizon_months')::int, 12);
  v_start := date_trunc('month', now())::date;
  v_end := (v_start + (v_horizon || ' months')::interval)::date;
  v_hash := md5(v_assumptions::text || v_probs::text);

  INSERT INTO public.forecast_snapshots
    (label, notes, horizon_start, horizon_end, parameters, payload, parameters_hash, created_by, source)
  VALUES
    (p_label, p_notes, v_start, v_end,
     jsonb_build_object('assumptions', v_assumptions, 'probabilities', v_probs),
     v_payload, v_hash, auth.uid(), 'manual')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;


-- Function: public.capture_revops_snapshot(p_period_start date, p_period_end date, p_label text, p_notes text, p_forecast_snapshot_id uuid, p_board_pack_ref text, p_force boolean)
CREATE OR REPLACE FUNCTION public.capture_revops_snapshot(p_period_start date, p_period_end date, p_label text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_forecast_snapshot_id uuid DEFAULT NULL::uuid, p_board_pack_ref text DEFAULT NULL::text, p_force boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_label text;
  v_existing uuid;
  v_spine record;
  v_mov record;
  v_dvw record;
  v_ret record;
  v_extras jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;
  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'period_end must be >= period_start';
  END IF;

  v_label := COALESCE(NULLIF(p_label, ''), to_char(p_period_start, 'YYYY-MM'));

  SELECT id INTO v_existing FROM public.revops_period_snapshots WHERE label = v_label;
  IF v_existing IS NOT NULL THEN
    IF NOT p_force THEN
      RAISE EXCEPTION 'snapshot already exists for label %, pass force=true to recapture', v_label;
    END IF;
    DELETE FROM public.revops_period_snapshots WHERE id = v_existing;
  END IF;

  SELECT * INTO v_spine FROM public.v_exec_mrr_spine
   WHERE month_start = date_trunc('month', p_period_start)::date;
  SELECT * INTO v_mov FROM public.v_subscription_movements
   WHERE month_start = date_trunc('month', p_period_start)::date;

  -- D-11 fix retained: v_exec_direct_vs_wl_summary is as-of-now, not month-keyed.
  SELECT
    COALESCE(SUM(CASE WHEN stream = 'direct' THEN known_mrr_usd END), 0)          AS direct_mrr,
    COALESCE(SUM(CASE WHEN stream = 'wl'     THEN wl_recurring_proxy_usd END), 0) AS wl_mrr_proxy
   INTO v_dvw
   FROM public.v_exec_direct_vs_wl_summary;

  SELECT * INTO v_ret FROM public.v_exec_retention_rates
   WHERE month_start = date_trunc('month', p_period_start)::date;

  v_extras := jsonb_build_object(
    'sources', jsonb_build_array(
      'v_exec_mrr_spine','v_subscription_movements','v_exec_direct_vs_wl_summary',
      'v_exec_retention_rates','v_open_deals_pipeline','v_renewal_workflows_pipeline',
      'v_capacity_gaps','v_gtm_target_variance'
    ),
    'captured_period', jsonb_build_object(
      'start', p_period_start,
      'end', p_period_end,
      'notes', 'direct_vs_wl_summary captured as-of capture time (not month-keyed)'
    )
  );

  INSERT INTO public.revops_period_snapshots
    (period_start_date, period_end_date, label, captured_by,
     linked_forecast_snapshot_id, linked_board_pack_ref, notes, extras)
  VALUES
    (p_period_start, p_period_end, v_label, auth.uid(),
     p_forecast_snapshot_id, p_board_pack_ref, p_notes, v_extras)
  RETURNING id INTO v_id;

  INSERT INTO public.revops_snapshot_metrics
    (snapshot_id, starting_mrr_usd, ending_mrr_usd, net_new_mrr_usd,
     new_mrr_usd, churned_mrr_usd, expansion_mrr_usd, contraction_mrr_usd,
     new_subs, churned_subs, ending_active_subs,
     nrr_pct, grr_pct, direct_mrr_usd, wl_recurring_proxy_usd)
  VALUES
    (v_id, v_spine.starting_mrr_usd, v_spine.ending_mrr_usd, v_spine.net_new_mrr_usd,
     v_mov.new_mrr_usd, v_mov.churned_mrr_usd, v_mov.expansion_mrr_usd, v_mov.contraction_mrr_usd,
     v_mov.new_subs, v_mov.churned_subs, v_spine.ending_active_subs,
     v_ret.net_revenue_retention,    -- D-13 fix: was v_ret.nrr_pct
     v_ret.gross_revenue_retention,  -- D-13 fix: was v_ret.grr_pct
     v_dvw.direct_mrr, v_dvw.wl_mrr_proxy);

  INSERT INTO public.revops_snapshot_pipeline (snapshot_id, bucket, deal_type, stage, count, weighted_count)
  SELECT v_id, 'open_deals', d.deal_type::text, d.stage::text, COUNT(*)::int, NULL
  FROM public.v_open_deals_pipeline d
  GROUP BY d.deal_type, d.stage;

  INSERT INTO public.revops_snapshot_pipeline (snapshot_id, bucket, deal_type, stage, count, weighted_count)
  SELECT v_id, 'renewal_workflows', NULL, COALESCE(stage::text, 'unknown'), COUNT(*)::int, NULL
  FROM public.v_renewal_workflows_pipeline
  GROUP BY stage;

  INSERT INTO public.revops_snapshot_capacity
    (snapshot_id, scope, function, demand, current_supply, gap_now, over_under_pct,
     gtm_target_new_mrr, gtm_forecast_new_mrr, gtm_variance_pct)
  SELECT
    v_id, g.scope, g.function, g.demand, g.current_supply, g.gap_now, g.over_under_pct,
    NULL, NULL, NULL
  FROM public.v_capacity_gaps g
  WHERE g.period = date_trunc('month', p_period_start)::date;

  INSERT INTO public.revops_snapshot_capacity
    (snapshot_id, scope, function, demand, current_supply, gap_now, over_under_pct,
     gtm_target_new_mrr, gtm_forecast_new_mrr, gtm_variance_pct)
  SELECT
    v_id, v.scope, 'gtm_new_mrr', NULL, NULL, NULL, NULL,
    v.target_new_business_mrr, v.forecast_new_business_mrr,
    v.new_business_variance_pct  -- D-13 fix: was v.variance_pct
  FROM public.v_gtm_target_variance v
  WHERE v.period = date_trunc('month', p_period_start)::date;

  RETURN v_id;
END;
$function$
;


-- Function: public.chat_deployment_validate_direct_client()
CREATE OR REPLACE FUNCTION public.chat_deployment_validate_direct_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stage text;
BEGIN
  IF NEW.ownership_mode = 'direct' AND NEW.direct_client_id IS NOT NULL THEN
    SELECT pipeline_stage INTO v_stage FROM public.leads WHERE id = NEW.direct_client_id;
    IF v_stage IS NULL THEN
      RAISE EXCEPTION 'direct_client_id % does not exist in leads', NEW.direct_client_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.chat_message_after_insert()
CREATE OR REPLACE FUNCTION public.chat_message_after_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.sender_type = 'visitor' THEN
    UPDATE public.chat_conversations
    SET last_message_at = NEW.created_at,
        unread_agent_count = unread_agent_count + 1
    WHERE id = NEW.conversation_id;
  ELSIF NEW.sender_type IN ('agent', 'ai') THEN
    UPDATE public.chat_conversations
    SET last_message_at = NEW.created_at,
        unread_visitor_count = unread_visitor_count + 1
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE public.chat_conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.chat_notify_on_queued()
CREATE OR REPLACE FUNCTION public.chat_notify_on_queued()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agent RECORD;
  v_title text := 'New chat in queue';
  v_message text := 'A visitor needs an agent';
  v_action_url text := '/staff/agent/workspace';
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'queued')
     OR (TG_OP = 'INSERT' AND NEW.status = 'queued') THEN

    -- Direct: notify only agents assigned to this client
    IF NEW.ownership_mode = 'direct' AND NEW.direct_client_id IS NOT NULL THEN
      FOR v_agent IN
        SELECT DISTINCT agent_id FROM public.client_agent_assignments
        WHERE client_id = NEW.direct_client_id
      LOOP
        INSERT INTO public.notifications (user_id, title, message, category, action_url)
        VALUES (v_agent.agent_id, v_title, v_message, 'chat', v_action_url);
      END LOOP;
    END IF;

    -- WL: notify supervisors and admins
    IF NEW.ownership_mode = 'wl' THEN
      FOR v_agent IN
        SELECT DISTINCT user_id FROM public.user_roles
        WHERE role IN ('supervisor'::app_role, 'admin'::app_role)
      LOOP
        INSERT INTO public.notifications (user_id, title, message, category, action_url)
        VALUES (v_agent.user_id, 'New WL chat in queue', v_message, 'chat', v_action_url);
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.check_go_live_regression(p_campaign_id uuid)
CREATE OR REPLACE FUNCTION public.check_go_live_regression(p_campaign_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now           record;
  v_prev          record;
  v_camp          record;
  v_recipient     record;
  v_lost_items    text[] := ARRAY[]::text[];
  v_message       text;
  v_action_url    text;
BEGIN
  -- Skip if campaign was deleted in the same statement.
  SELECT id, display_name, status
    INTO v_camp
    FROM public.campaigns
   WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Current readiness from the view.
  SELECT
    script_published, faqs_ok, policies_ok, training_ok, all_ok
    INTO v_now
    FROM public.campaign_go_live_checks
   WHERE campaign_id = p_campaign_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Previous snapshot (may not exist on first evaluation).
  SELECT all_ok, script_published, faqs_ok, policies_ok, training_ok
    INTO v_prev
    FROM public.campaign_go_live_status_snapshots
   WHERE campaign_id = p_campaign_id;

  -- Build list of items that *were* green but *are now* red.
  IF v_prev IS NOT NULL THEN
    IF v_prev.script_published AND NOT v_now.script_published THEN
      v_lost_items := array_append(v_lost_items, 'Script published');
    END IF;
    IF v_prev.faqs_ok AND NOT v_now.faqs_ok THEN
      v_lost_items := array_append(v_lost_items, 'Approved FAQ');
    END IF;
    IF v_prev.policies_ok AND NOT v_now.policies_ok THEN
      v_lost_items := array_append(v_lost_items, 'Approved policy');
    END IF;
    IF v_prev.training_ok AND NOT v_now.training_ok THEN
      v_lost_items := array_append(v_lost_items, 'Training signoffs');
    END IF;
  END IF;

  -- Persist the new snapshot regardless.
  INSERT INTO public.campaign_go_live_status_snapshots
    (campaign_id, all_ok, faqs_ok, policies_ok, training_ok, script_published, last_evaluated_at)
  VALUES
    (p_campaign_id, v_now.all_ok, v_now.faqs_ok, v_now.policies_ok,
     v_now.training_ok, v_now.script_published, now())
  ON CONFLICT (campaign_id) DO UPDATE
    SET all_ok = EXCLUDED.all_ok,
        faqs_ok = EXCLUDED.faqs_ok,
        policies_ok = EXCLUDED.policies_ok,
        training_ok = EXCLUDED.training_ok,
        script_published = EXCLUDED.script_published,
        last_evaluated_at = now();

  -- Nothing flipped red, nothing to do.
  IF array_length(v_lost_items, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Compose notification.
  v_action_url := '/admin/campaign-os/campaigns/' || p_campaign_id::text || '?tab=go-live';
  v_message := 'Campaign "' || COALESCE(v_camp.display_name, 'Untitled') ||
               '" is no longer ready to go live. Failing: ' ||
               array_to_string(v_lost_items, ', ') || '.';

  -- Fan out to every admin + supervisor.
  FOR v_recipient IN
    SELECT DISTINCT user_id
      FROM public.user_roles
     WHERE role IN ('admin'::app_role, 'supervisor'::app_role)
  LOOP
    INSERT INTO public.notifications
      (user_id, title, message, type, category, action_url)
    VALUES
      (v_recipient.user_id,
       'Go-live check regression',
       v_message,
       'warning',
       'campaign_go_live',
       v_action_url);
  END LOOP;
END;
$function$
;


-- Function: public.classify_event_domain(_name text)
CREATE OR REPLACE FUNCTION public.classify_event_domain(_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _name LIKE 'voice.%' THEN 'voice'
    WHEN _name LIKE 'wl.%' THEN 'wl'
    WHEN _name LIKE 'delivery.%' OR _name LIKE 'intake.%' OR _name LIKE 'fulfillment.%' THEN 'delivery'
    WHEN _name LIKE 'lead.%' OR _name LIKE 'revenue.%' OR _name LIKE 'proposal.%' OR _name LIKE 'meeting.%' THEN 'revenue'
    WHEN _name LIKE 'disc.%' OR _name LIKE 'blog.%' OR _name LIKE 'keyword.%' OR _name LIKE 'growth.%' THEN 'growth'
    WHEN _name LIKE 'automation.%' THEN 'automation'
    ELSE 'system'
  END;
$function$
;


-- Function: public.clear_legacy_script_cutover(p_campaign_id uuid)
CREATE OR REPLACE FUNCTION public.clear_legacy_script_cutover(p_campaign_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_count int := 0;
  v_wl_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  UPDATE public.client_scripts
     SET migrated_to_campaign_id = NULL,
         migrated_at = NULL
   WHERE migrated_to_campaign_id = p_campaign_id;
  GET DIAGNOSTICS v_client_count = ROW_COUNT;

  UPDATE public.wl_client_scripts
     SET migrated_to_campaign_id = NULL,
         migrated_at = NULL
   WHERE migrated_to_campaign_id = p_campaign_id;
  GET DIAGNOSTICS v_wl_count = ROW_COUNT;

  UPDATE public.campaigns
     SET legacy_script_cutover_at = NULL
   WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'cleared', true,
    'client_scripts_cleared', v_client_count,
    'wl_client_scripts_cleared', v_wl_count
  );
END;
$function$
;


-- Function: public.clone_template_into_department(p_template_id uuid, p_target_department_id uuid, p_new_campaign_name text)
CREATE OR REPLACE FUNCTION public.clone_template_into_department(p_template_id uuid, p_target_department_id uuid, p_new_campaign_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_template public.campaign_templates%ROWTYPE;
  v_dept public.client_departments%ROWTYPE;
  v_camp_id uuid;
  v_module_id uuid;
  v_lesson_id uuid;
  m jsonb;
  l jsonb;
  q jsonb;
  s jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_template FROM public.campaign_templates WHERE id = p_template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template not found'; END IF;

  SELECT * INTO v_dept FROM public.client_departments WHERE id = p_target_department_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Department not found'; END IF;

  -- Same-tenant guard
  IF v_dept.tenant_kind <> v_template.tenant_kind THEN
    RAISE EXCEPTION 'Cross-tenant cloning is not permitted in this phase';
  END IF;

  INSERT INTO public.campaigns (tenant_kind, wl_partner_id, client_lead_id, wl_client_id, client_department_id, display_name, status)
  VALUES (v_dept.tenant_kind, v_dept.wl_partner_id, v_dept.client_lead_id, v_dept.wl_client_id, v_dept.id, p_new_campaign_name, 'draft')
  RETURNING id INTO v_camp_id;

  -- Scenarios
  FOR s IN SELECT * FROM jsonb_array_elements(COALESCE(v_template.snapshot->'scenarios', '[]'::jsonb)) LOOP
    INSERT INTO public.campaign_scenarios (campaign_id, tenant_kind, wl_partner_id, client_lead_id, wl_client_id,
      title, trigger_md, expected_outcome_md, disposition, routing, tags, sort_order, status)
    VALUES (v_camp_id, v_dept.tenant_kind, v_dept.wl_partner_id, v_dept.client_lead_id, v_dept.wl_client_id,
      s->>'title', s->>'trigger_md', s->>'expected_outcome_md', s->>'disposition', s->>'routing',
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(s->'tags','[]'::jsonb))),
      COALESCE((s->>'sort_order')::int, 100), 'draft');
  END LOOP;

  -- Training modules + lessons + questions
  FOR m IN SELECT * FROM jsonb_array_elements(COALESCE(v_template.snapshot->'training_modules', '[]'::jsonb)) LOOP
    INSERT INTO public.campaign_training_modules (campaign_id, tenant_kind, wl_partner_id, client_lead_id, wl_client_id,
      title, summary, body_md, required, sort_order, status, retraining_interval_days, created_by)
    VALUES (v_camp_id, v_dept.tenant_kind, v_dept.wl_partner_id, v_dept.client_lead_id, v_dept.wl_client_id,
      m->>'title', m->>'summary', COALESCE(m->>'body_md',''),
      COALESCE((m->>'required')::boolean, true), COALESCE((m->>'sort_order')::int, 100),
      'draft', NULLIF(m->>'retraining_interval_days','')::int, auth.uid())
    RETURNING id INTO v_module_id;
    FOR l IN SELECT * FROM jsonb_array_elements(COALESCE(m->'lessons','[]'::jsonb)) LOOP
      INSERT INTO public.campaign_training_lessons (module_id, kind, title, body_md, sort_order, passing_score, required, created_by)
      VALUES (v_module_id, l->>'kind', l->>'title', COALESCE(l->>'body_md',''),
        COALESCE((l->>'sort_order')::int, 0), COALESCE((l->>'passing_score')::int, 80),
        COALESCE((l->>'required')::boolean, true), auth.uid())
      RETURNING id INTO v_lesson_id;
      FOR q IN SELECT * FROM jsonb_array_elements(COALESCE(l->'questions','[]'::jsonb)) LOOP
        INSERT INTO public.campaign_training_quiz_questions (lesson_id, question, choices, correct_index, explanation, sort_order)
        VALUES (v_lesson_id, q->>'question', COALESCE(q->'choices','[]'::jsonb),
          COALESCE((q->>'correct_index')::int, 0), q->>'explanation', COALESCE((q->>'sort_order')::int, 0));
      END LOOP;
    END LOOP;
  END LOOP;

  -- Script document (draft, with cloned tree)
  IF v_template.snapshot ? 'script_tree' AND v_template.snapshot->'script_tree' IS NOT NULL THEN
    INSERT INTO public.campaign_script_documents (campaign_id, tenant_kind, title, status, tree, created_by, updated_by)
    VALUES (v_camp_id, v_dept.tenant_kind, p_new_campaign_name || ' — Script', 'draft',
      v_template.snapshot->'script_tree', auth.uid(), auth.uid());
  END IF;

  RETURN v_camp_id;
END;
$function$
;


-- Function: public.convert_lead_to_delivery(_lead_id uuid, _notes text)
CREATE OR REPLACE FUNCTION public.convert_lead_to_delivery(_lead_id uuid, _notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _lead public.leads%ROWTYPE;
  _intake_id uuid;
  _intake_num text;
  _conv_id uuid;
  _existing uuid;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT (public.has_role(_actor, 'admin'::app_role)
       OR public.has_role(_actor, 'sales'::app_role)
       OR public.has_role(_actor, 'supervisor'::app_role)) THEN
    RAISE EXCEPTION 'not authorized to convert leads';
  END IF;

  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead % not found', _lead_id; END IF;

  IF _lead.pipeline_stage IN ('lost','churned') THEN
    RAISE EXCEPTION 'cannot convert lead in stage %', _lead.pipeline_stage;
  END IF;

  -- Idempotency: if a prior conversion exists, return it
  SELECT id INTO _existing FROM public.lead_conversions
   WHERE lead_id = _lead_id ORDER BY converted_at DESC LIMIT 1;
  IF _existing IS NOT NULL THEN
    SELECT id, intake_number INTO _intake_id, _intake_num
      FROM public.internal_fulfillment_intakes
     WHERE client_lead_id = _lead_id ORDER BY submitted_at DESC LIMIT 1;
    RETURN jsonb_build_object('lead_id', _lead_id, 'conversion_id', _existing,
                              'intake_id', _intake_id, 'intake_number', _intake_num,
                              'idempotent', true);
  END IF;

  UPDATE public.leads SET pipeline_stage = 'ready_for_billing', updated_at = now() WHERE id = _lead_id;

  INSERT INTO public.lead_conversions (lead_id, converted_by, metadata)
  VALUES (_lead_id, _actor, jsonb_build_object('notes', _notes, 'previous_stage', _lead.pipeline_stage))
  RETURNING id INTO _conv_id;

  _intake_num := 'INT-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(_lead_id::text, '-', ''), 1, 8);
  INSERT INTO public.internal_fulfillment_intakes (
    source, client_lead_id, intake_number, status, priority,
    submitted_by, submitted_at, snapshot_json, snapshot_version
  ) VALUES (
    'direct', _lead_id, _intake_num, 'new_submission', 'normal',
    _actor, now(),
    jsonb_build_object('lead', to_jsonb(_lead), 'notes', _notes, 'captured_at', now()), 1
  ) RETURNING id INTO _intake_id;

  RETURN jsonb_build_object('lead_id', _lead_id, 'conversion_id', _conv_id,
                            'intake_id', _intake_id, 'intake_number', _intake_num,
                            'idempotent', false);
END; $function$
;


-- Function: public.create_renewal_expansion_deal(p_scope deal_scope, p_target_id uuid, p_deal_type deal_type, p_related_renewal_workflow_id uuid, p_related_partner_play_id uuid, p_related_direct_play_id uuid, p_proposed_plan_key text, p_proposed_offer_id uuid, p_proposed_term_months integer, p_proposed_price_summary text, p_expected_close_date date, p_notes text)
CREATE OR REPLACE FUNCTION public.create_renewal_expansion_deal(p_scope deal_scope, p_target_id uuid, p_deal_type deal_type, p_related_renewal_workflow_id uuid DEFAULT NULL::uuid, p_related_partner_play_id uuid DEFAULT NULL::uuid, p_related_direct_play_id uuid DEFAULT NULL::uuid, p_proposed_plan_key text DEFAULT NULL::text, p_proposed_offer_id uuid DEFAULT NULL::uuid, p_proposed_term_months integer DEFAULT NULL::integer, p_proposed_price_summary text DEFAULT NULL::text, p_expected_close_date date DEFAULT NULL::date, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id UUID; v_current_plan TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- best-effort current plan lookup for direct accounts
  IF p_scope = 'direct' THEN
    BEGIN
      SELECT plan_key INTO v_current_plan
      FROM public.v_subscription_snapshot
      WHERE lead_id = p_target_id
      LIMIT 1;
    EXCEPTION WHEN others THEN v_current_plan := NULL;
    END;
  END IF;

  INSERT INTO public.renewal_expansion_deals (
    scope, target_id, deal_type, related_renewal_workflow_id,
    related_partner_play_id, related_direct_play_id,
    current_plan_key, proposed_plan_key, proposed_offer_id,
    proposed_term_months, proposed_price_summary,
    expected_close_date, notes, created_by, owner_user_id
  ) VALUES (
    p_scope, p_target_id, p_deal_type, p_related_renewal_workflow_id,
    p_related_partner_play_id, p_related_direct_play_id,
    v_current_plan, p_proposed_plan_key, p_proposed_offer_id,
    p_proposed_term_months, p_proposed_price_summary,
    p_expected_close_date, p_notes, auth.uid(), auth.uid()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $function$
;


-- Function: public.cron_generate_executive_snapshot()
CREATE OR REPLACE FUNCTION public.cron_generate_executive_snapshot()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_payload jsonb;
  v_kpi jsonb;
  v_revenue jsonb;
  v_delivery jsonb;
  v_voice jsonb;
  v_wl jsonb;
  v_automation jsonb;
  v_row_count integer := 0;
BEGIN
  SELECT to_jsonb(s.*) INTO v_kpi FROM public.v_intelligence_executive_summary s LIMIT 1;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_revenue FROM public.v_revenue_pipeline r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_delivery FROM public.v_delivery_pipeline r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_voice FROM public.v_call_flow_receptionist_readiness r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_wl FROM public.v_wl_partner_readiness r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_automation FROM public.v_open_recommendations r;

  v_payload := jsonb_build_object(
    'kpi', coalesce(v_kpi, '{}'::jsonb),
    'revenue_pipeline', v_revenue,
    'delivery_pipeline', v_delivery,
    'voice_readiness', v_voice,
    'wl_partner_readiness', v_wl,
    'open_recommendations', v_automation
  );
  v_row_count :=
    coalesce(jsonb_array_length(v_revenue),0) +
    coalesce(jsonb_array_length(v_delivery),0) +
    coalesce(jsonb_array_length(v_voice),0) +
    coalesce(jsonb_array_length(v_wl),0) +
    coalesce(jsonb_array_length(v_automation),0);

  INSERT INTO public.data_export_snapshots
    (snapshot_type, scope, partner_id, payload, row_count, generated_by, notes)
  VALUES
    ('executive_snapshot_daily', 'admin', NULL, v_payload, v_row_count, NULL, 'pg_cron')
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, metadata)
  VALUES (NULL, 'intelligence.export.executive_snapshot.cron', 'data_export_snapshots', v_id::text,
          jsonb_build_object('row_count', v_row_count, 'source', 'pg_cron'));

  RETURN v_id;
END;
$function$
;


-- Function: public.cutover_legacy_scripts(p_campaign_id uuid, p_client_script_ids uuid[], p_wl_client_script_ids uuid[])
CREATE OR REPLACE FUNCTION public.cutover_legacy_scripts(p_campaign_id uuid, p_client_script_ids uuid[] DEFAULT ARRAY[]::uuid[], p_wl_client_script_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_client_count int := 0;
  v_wl_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.campaigns WHERE id = p_campaign_id) THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF array_length(p_client_script_ids, 1) IS NOT NULL THEN
    UPDATE public.client_scripts
       SET migrated_to_campaign_id = p_campaign_id,
           migrated_at = v_now
     WHERE id = ANY(p_client_script_ids);
    GET DIAGNOSTICS v_client_count = ROW_COUNT;
  END IF;

  IF array_length(p_wl_client_script_ids, 1) IS NOT NULL THEN
    UPDATE public.wl_client_scripts
       SET migrated_to_campaign_id = p_campaign_id,
           migrated_at = v_now
     WHERE id = ANY(p_wl_client_script_ids);
    GET DIAGNOSTICS v_wl_count = ROW_COUNT;
  END IF;

  UPDATE public.campaigns
     SET legacy_script_cutover_at = v_now
   WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'cutover_at', v_now,
    'client_scripts_migrated', v_client_count,
    'wl_client_scripts_migrated', v_wl_count
  );
END;
$function$
;


-- Function: public.decide_approval_request(p_request_id uuid, p_decision text, p_notes text)
CREATE OR REPLACE FUNCTION public.decide_approval_request(p_request_id uuid, p_decision text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req approval_requests%ROWTYPE;
  v_user uuid := auth.uid();
  v_notes text := NULLIF(btrim(coalesce(p_notes, '')), '');
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF NOT public.has_role(v_user, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required to decide approval requests';
  END IF;
  IF p_decision NOT IN ('approved','rejected','cancelled') THEN
    RAISE EXCEPTION 'invalid decision %', p_decision;
  END IF;
  IF p_decision IN ('rejected','cancelled') AND v_notes IS NULL THEN
    RAISE EXCEPTION 'A reason is required when rejecting or cancelling an approval request';
  END IF;

  SELECT * INTO v_req FROM approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approval request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'approval request already decided (%).', v_req.status;
  END IF;

  UPDATE approval_requests
     SET status = p_decision,
         decision_notes = v_notes,
         decided_by = v_user,
         decided_at = now(),
         updated_at = now()
   WHERE id = p_request_id;

  -- Recompute the deal's approval_state based on remaining requests
  PERFORM public.evaluate_deal_approvals(v_req.deal_id);

  RETURN jsonb_build_object(
    'request_id', p_request_id,
    'decision', p_decision,
    'decided_at', now(),
    'notes', v_notes
  );
END;
$function$
;


-- Function: public.dismiss_communication_action(p_action_id uuid)
CREATE OR REPLACE FUNCTION public.dismiss_communication_action(p_action_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.communication_actions SET status = 'dismissed' WHERE id = p_action_id;
  RETURN FOUND;
END; $function$
;


-- Function: public.dismiss_play_suggestion(p_suggestion_id uuid)
CREATE OR REPLACE FUNCTION public.dismiss_play_suggestion(p_suggestion_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.play_suggestions
  SET status = 'dismissed', decided_by = auth.uid(), decided_at = now()
  WHERE id = p_suggestion_id AND status = 'pending';
  RETURN FOUND;
END;
$function$
;


-- Function: public.dismiss_recommendation(p_id uuid, p_reason text)
CREATE OR REPLACE FUNCTION public.dismiss_recommendation(p_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS automation_recommendations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$
;


-- Function: public.dispatch_approval_sla_breaches()
CREATE OR REPLACE FUNCTION public.dispatch_approval_sla_breaches()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record; v_count int := 0;
BEGIN
  FOR r IN
    SELECT id FROM approval_requests
    WHERE status = 'pending'
      AND sla_notified_at IS NULL
      AND requested_at <= now() - make_interval(hours => COALESCE(sla_hours_snapshot, 24))
    ORDER BY requested_at ASC
    LIMIT 200
  LOOP
    PERFORM public.fire_approval_notification(r.id, 'approval_sla_breach');
    UPDATE approval_requests SET sla_notified_at = now() WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('breaches_notified', v_count, 'ran_at', now());
END $function$
;


-- Function: public.disposition_bucket(_disposition text)
CREATE OR REPLACE FUNCTION public.disposition_bucket(_disposition text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _disposition IS NULL OR LENGTH(TRIM(_disposition)) = 0 THEN 'other'
    WHEN LOWER(_disposition) ~ '(resolved|completed|success|sale|booked|scheduled|answered|handled)' THEN 'resolved'
    WHEN LOWER(_disposition) ~ '(escalat|transfer|supervisor|callback requested)' THEN 'escalated'
    WHEN LOWER(_disposition) ~ '(missed|no answer|no-answer|abandon|voicemail|hang|busy|not reached)' THEN 'no_contact'
    ELSE 'other'
  END;
$function$
;


-- Function: public.emit_dashboard_event(_event_name text, _surface text, _persona text, _target text, _user_id uuid, _properties jsonb)
CREATE OR REPLACE FUNCTION public.emit_dashboard_event(_event_name text, _surface text, _persona text, _target text, _user_id uuid, _properties jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.dashboard_events (event_name, surface, persona, target, user_id, properties)
  VALUES (_event_name, _surface, _persona, _target, _user_id, COALESCE(_properties, '{}'::jsonb));
EXCEPTION WHEN OTHERS THEN NULL;
END; $function$
;


-- Function: public.enforce_campaign_identity_immutable()
CREATE OR REPLACE FUNCTION public.enforce_campaign_identity_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_kind IS DISTINCT FROM OLD.tenant_kind
     OR NEW.wl_partner_id IS DISTINCT FROM OLD.wl_partner_id
     OR NEW.client_lead_id IS DISTINCT FROM OLD.client_lead_id
     OR NEW.wl_client_id IS DISTINCT FROM OLD.wl_client_id THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'campaign identity columns are immutable for non-admin updates';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_campaign_knowledge_identity()
CREATE OR REPLACE FUNCTION public.enforce_campaign_knowledge_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.scope = 'global' THEN
    -- Global: identity columns must all be NULL
    IF NEW.client_lead_id IS NOT NULL OR NEW.wl_client_id IS NOT NULL OR NEW.wl_partner_id IS NOT NULL THEN
      RAISE EXCEPTION 'global-scope rows must not carry identity columns';
    END IF;
    -- tenant_kind still set (NOT NULL) but ignored; allow either value
    RETURN NEW;
  END IF;
  -- Non-global: delegate to standard identity validator
  PERFORM public.enforce_campaign_tenant_identity_call(NEW);
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_campaign_tenant_identity()
CREATE OR REPLACE FUNCTION public.enforce_campaign_tenant_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_lead_count int := 0; v_client_count int := 0;
BEGIN
  IF NEW.client_lead_id IS NOT NULL THEN v_lead_count := 1; END IF;
  IF NEW.wl_client_id IS NOT NULL THEN v_client_count := 1; END IF;

  IF (v_lead_count + v_client_count) <> 1 THEN
    RAISE EXCEPTION 'campaign identity error: exactly one of client_lead_id or wl_client_id must be set';
  END IF;

  IF NEW.tenant_kind = 'wl_partner' THEN
    IF NEW.wl_partner_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=wl_partner requires wl_partner_id'; END IF;
    IF NEW.wl_client_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=wl_partner requires wl_client_id'; END IF;
  ELSIF NEW.tenant_kind = 'direct_24h' THEN
    IF NEW.wl_partner_id IS NOT NULL THEN RAISE EXCEPTION 'tenant_kind=direct_24h cannot carry wl_partner_id'; END IF;
    IF NEW.client_lead_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=direct_24h requires client_lead_id'; END IF;
  ELSE
    RAISE EXCEPTION 'invalid tenant_kind %', NEW.tenant_kind;
  END IF;

  IF NEW.tenant_kind = 'wl_partner' AND NEW.wl_partner_id IS NOT NULL AND NEW.wl_client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.white_label_clients WHERE id = NEW.wl_client_id AND partner_id = NEW.wl_partner_id) THEN
      RAISE EXCEPTION 'wl_client_id % does not belong to wl_partner_id %', NEW.wl_client_id, NEW.wl_partner_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_campaign_tenant_identity_call(new record)
CREATE OR REPLACE FUNCTION public.enforce_campaign_tenant_identity_call(new record)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_lead int := 0; v_client int := 0;
BEGIN
  IF NEW.client_lead_id IS NOT NULL THEN v_lead := 1; END IF;
  IF NEW.wl_client_id IS NOT NULL THEN v_client := 1; END IF;
  IF (v_lead + v_client) <> 1 THEN
    RAISE EXCEPTION 'campaign identity error: exactly one of client_lead_id or wl_client_id must be set';
  END IF;
  IF NEW.tenant_kind = 'wl_partner' THEN
    IF NEW.wl_partner_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=wl_partner requires wl_partner_id'; END IF;
    IF NEW.wl_client_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=wl_partner requires wl_client_id'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.white_label_clients WHERE id = NEW.wl_client_id AND partner_id = NEW.wl_partner_id) THEN
      RAISE EXCEPTION 'wl_client does not belong to wl_partner';
    END IF;
  ELSIF NEW.tenant_kind = 'direct_24h' THEN
    IF NEW.wl_partner_id IS NOT NULL THEN RAISE EXCEPTION 'tenant_kind=direct_24h cannot carry wl_partner_id'; END IF;
    IF NEW.client_lead_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=direct_24h requires client_lead_id'; END IF;
  ELSE
    RAISE EXCEPTION 'invalid tenant_kind';
  END IF;
END;
$function$
;


-- Function: public.enforce_client_locations_identity_immutable()
CREATE OR REPLACE FUNCTION public.enforce_client_locations_identity_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_kind IS DISTINCT FROM OLD.tenant_kind
     OR NEW.wl_partner_id IS DISTINCT FROM OLD.wl_partner_id
     OR NEW.client_lead_id IS DISTINCT FROM OLD.client_lead_id
     OR NEW.wl_client_id IS DISTINCT FROM OLD.wl_client_id THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'client_locations identity columns are immutable for non-admin updates';
    END IF;
  END IF;
  RETURN NEW;
END $function$
;


-- Function: public.enforce_go_live_checks()
CREATE OR REPLACE FUNCTION public.enforce_go_live_checks()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_check RECORD;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  IF NEW.status <> 'active' OR OLD.status = 'active' THEN
    RETURN NEW;
  END IF;
  IF NEW.go_live_override_at IS NOT NULL
     AND (OLD.go_live_override_at IS NULL OR NEW.go_live_override_at > OLD.go_live_override_at) THEN
    RETURN NEW;
  END IF;

  SELECT script_published, faqs_ok, policies_ok, training_ok, all_ok
  INTO v_check
  FROM public.campaign_go_live_checks
  WHERE campaign_id = NEW.id;

  IF NOT FOUND OR v_check IS NULL OR NOT COALESCE(v_check.all_ok, false) THEN
    IF v_check IS NULL OR NOT COALESCE(v_check.script_published, false) THEN v_missing := array_append(v_missing, 'published script'); END IF;
    IF v_check IS NULL OR NOT COALESCE(v_check.faqs_ok, false)         THEN v_missing := array_append(v_missing, 'approved FAQ'); END IF;
    IF v_check IS NULL OR NOT COALESCE(v_check.policies_ok, false)     THEN v_missing := array_append(v_missing, 'approved policy'); END IF;
    IF v_check IS NULL OR NOT COALESCE(v_check.training_ok, false)     THEN v_missing := array_append(v_missing, 'training signoffs'); END IF;
    RAISE EXCEPTION 'Campaign is not ready to go live. Missing: %. Use Force activate to override.', array_to_string(v_missing, ', ')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_supervisor_intake_constraints()
CREATE OR REPLACE FUNCTION public.enforce_supervisor_intake_constraints()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'supervisor') THEN
    IF NOT public.supervisor_can_update_intake(
      OLD.status, NEW.status,
      OLD.priority, NEW.priority,
      OLD.assigned_to, NEW.assigned_to
    ) THEN
      RAISE EXCEPTION 'Supervisors cannot close intakes, set urgent priority, or change assignee';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_wl_handoff_document_immutable()
CREATE OR REPLACE FUNCTION public.enforce_wl_handoff_document_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
      RAISE EXCEPTION 'partner_id is immutable';
    END IF;
    IF NEW.handoff_id IS DISTINCT FROM OLD.handoff_id THEN
      RAISE EXCEPTION 'handoff_id is immutable';
    END IF;
    IF NEW.file_path IS DISTINCT FROM OLD.file_path THEN
      RAISE EXCEPTION 'file_path is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_wl_handoff_immutable_partner()
CREATE OR REPLACE FUNCTION public.enforce_wl_handoff_immutable_partner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
      RAISE EXCEPTION 'partner_id is immutable';
    END IF;
    IF NEW.proposal_id IS DISTINCT FROM OLD.proposal_id THEN
      RAISE EXCEPTION 'proposal_id is immutable';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by is immutable';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'created_at is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_wl_handoff_item_immutable()
CREATE OR REPLACE FUNCTION public.enforce_wl_handoff_item_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
      RAISE EXCEPTION 'partner_id is immutable';
    END IF;
    IF NEW.handoff_id IS DISTINCT FROM OLD.handoff_id THEN
      RAISE EXCEPTION 'handoff_id is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_wl_handoff_request_partner_writable()
CREATE OR REPLACE FUNCTION public.enforce_wl_handoff_request_partner_writable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
    OR NEW.handoff_id IS DISTINCT FROM OLD.handoff_id
    OR NEW.intake_id IS DISTINCT FROM OLD.intake_id
    OR NEW.request_type IS DISTINCT FROM OLD.request_type
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.target_item_key IS DISTINCT FROM OLD.target_item_key
    OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
    OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Partner can only update status, resolved_at, and resolved_by';
  END IF;
  IF NEW.status NOT IN ('open','resolved') THEN
    RAISE EXCEPTION 'Partner cannot set status to %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_wl_partner_lead_immutable_partner()
CREATE OR REPLACE FUNCTION public.enforce_wl_partner_lead_immutable_partner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'partner_id is immutable';
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_wl_partner_proposal_immutable_partner()
CREATE OR REPLACE FUNCTION public.enforce_wl_partner_proposal_immutable_partner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'partner_id is immutable';
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_wl_partner_proposal_lead_match()
CREATE OR REPLACE FUNCTION public.enforce_wl_partner_proposal_lead_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_partner uuid;
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    SELECT partner_id INTO v_lead_partner
    FROM public.wl_partner_leads
    WHERE id = NEW.lead_id;

    IF v_lead_partner IS NULL THEN
      RAISE EXCEPTION 'Linked lead does not exist';
    END IF;

    IF v_lead_partner IS DISTINCT FROM NEW.partner_id THEN
      RAISE EXCEPTION 'Linked lead belongs to a different partner';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_wl_portal_access_immutable()
CREATE OR REPLACE FUNCTION public.enforce_wl_portal_access_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
      RAISE EXCEPTION 'partner_id is immutable';
    END IF;
    IF NEW.proposal_id IS DISTINCT FROM OLD.proposal_id THEN
      RAISE EXCEPTION 'proposal_id is immutable';
    END IF;
    IF NEW.handoff_id IS DISTINCT FROM OLD.handoff_id THEN
      RAISE EXCEPTION 'handoff_id is immutable';
    END IF;
    IF NEW.token_hash IS DISTINCT FROM OLD.token_hash THEN
      RAISE EXCEPTION 'token_hash is immutable';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by is immutable';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'created_at is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_wl_proposal_activity_immutable()
CREATE OR REPLACE FUNCTION public.enforce_wl_proposal_activity_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Activity log entries are immutable';
  END IF;
  IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;
  RETURN OLD;
END;
$function$
;


-- Function: public.enforce_wl_proposal_share_immutable()
CREATE OR REPLACE FUNCTION public.enforce_wl_proposal_share_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
      RAISE EXCEPTION 'partner_id is immutable';
    END IF;
    IF NEW.proposal_id IS DISTINCT FROM OLD.proposal_id THEN
      RAISE EXCEPTION 'proposal_id is immutable';
    END IF;
    IF NEW.token_hash IS DISTINCT FROM OLD.token_hash THEN
      RAISE EXCEPTION 'token_hash is immutable';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by is immutable';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'created_at is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.enforce_wl_task_immutable_partner()
CREATE OR REPLACE FUNCTION public.enforce_wl_task_immutable_partner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
      RAISE EXCEPTION 'partner_id is immutable';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by is immutable';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'created_at is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.ensure_wl_partner_owner_member()
CREATE OR REPLACE FUNCTION public.ensure_wl_partner_owner_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.wl_partner_members (partner_id, user_id, role, status, activated_at)
    VALUES (NEW.id, NEW.user_id, 'owner', 'active', now())
    ON CONFLICT (partner_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.evaluate_deal_approvals(p_deal_id uuid)
CREATE OR REPLACE FUNCTION public.evaluate_deal_approvals(p_deal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deal renewal_expansion_deals%ROWTYPE;
  v_policy approval_policies%ROWTYPE;
  v_created int := 0;
  v_matched int := 0;
  v_pending int;
  v_rejected int;
  v_approved int;
  v_state approval_state;
  v_unknown_discount boolean;
  v_reason text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT * INTO v_deal FROM renewal_expansion_deals WHERE id = p_deal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal % not found', p_deal_id; END IF;

  v_unknown_discount := (v_deal.estimated_discount_pct IS NULL);

  -- Iterate active policies that match scope + deal_type
  FOR v_policy IN
    SELECT * FROM approval_policies
    WHERE active = true
      AND (scope = 'both' OR scope = v_deal.scope)
      AND (deal_type = 'any' OR deal_type = v_deal.deal_type)
    ORDER BY tier ASC
  LOOP
    v_reason := NULL;

    IF v_policy.min_discount_pct IS NOT NULL
       AND v_deal.estimated_discount_pct IS NOT NULL
       AND v_deal.estimated_discount_pct >= v_policy.min_discount_pct THEN
      v_reason := format('Discount %.2f%% ≥ threshold %.2f%%',
                         v_deal.estimated_discount_pct, v_policy.min_discount_pct);
    ELSIF v_policy.triggers_on_non_standard_term AND v_deal.is_non_standard_term THEN
      v_reason := 'Non-standard term';
    ELSIF v_policy.triggers_on_exception AND v_deal.is_exception THEN
      v_reason := 'Exception flag set';
    ELSIF v_policy.triggers_on_unknown_discount AND v_unknown_discount THEN
      v_reason := 'Discount could not be estimated — manual review required';
    END IF;

    IF v_reason IS NOT NULL THEN
      v_matched := v_matched + 1;
      -- Insert pending if not already pending
      INSERT INTO approval_requests (deal_id, policy_id, required_role, tier, reason)
      VALUES (v_deal.id, v_policy.id, v_policy.required_approver_role, v_policy.tier, v_reason)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_created := v_created + 1; END IF;
    END IF;
  END LOOP;

  -- Recompute approval_state
  SELECT
    count(*) FILTER (WHERE status='pending'),
    count(*) FILTER (WHERE status='rejected'),
    count(*) FILTER (WHERE status='approved')
    INTO v_pending, v_rejected, v_approved
  FROM approval_requests WHERE deal_id = v_deal.id AND status <> 'cancelled';

  IF v_rejected > 0 THEN v_state := 'rejected';
  ELSIF v_pending > 0 THEN v_state := 'pending';
  ELSIF v_approved > 0 THEN v_state := 'approved';
  ELSE v_state := 'not_required';
  END IF;

  UPDATE renewal_expansion_deals
     SET approval_state = v_state,
         approval_evaluated_at = now()
   WHERE id = v_deal.id;

  RETURN jsonb_build_object(
    'deal_id', v_deal.id,
    'matched_policies', v_matched,
    'created_requests', v_created,
    'approval_state', v_state,
    'pending', v_pending,
    'rejected', v_rejected,
    'approved', v_approved
  );
END $function$
;


-- Function: public.fanout_ticket_dept_notifications(_queue text, _exclude_ids uuid[], _title text, _message text, _action_url text)
CREATE OR REPLACE FUNCTION public.fanout_ticket_dept_notifications(_queue text, _exclude_ids uuid[], _title text, _message text, _action_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user RECORD;
BEGIN
  IF _queue IS NULL THEN
    RETURN;
  END IF;

  FOR v_user IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text = _queue
      AND ur.user_id != ALL(COALESCE(_exclude_ids, ARRAY[]::uuid[]))
  LOOP
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (v_user.user_id, _title, _message, 'ticket', _action_url);
  END LOOP;
END;
$function$
;


-- Function: public.fire_approval_notification(p_request_id uuid, p_event text)
CREATE OR REPLACE FUNCTION public.fire_approval_notification(p_request_id uuid, p_event text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v jsonb;
  v_hours_pending numeric;
BEGIN
  SELECT jsonb_build_object(
    'type', p_event,
    'request_id', ar.id,
    'deal_id', ar.deal_id,
    'required_role', ar.required_role,
    'tier', ar.tier,
    'reason', ar.reason,
    'policy_name', p.name,
    'scope', d.scope,
    'deal_type', d.deal_type,
    'stage', d.stage,
    'estimated_discount_pct', d.estimated_discount_pct,
    'is_non_standard_term', d.is_non_standard_term,
    'is_exception', d.is_exception,
    'sla_hours', ar.sla_hours_snapshot,
    'hours_pending', EXTRACT(epoch FROM (now() - ar.requested_at))/3600
  ) INTO v
  FROM approval_requests ar
  JOIN renewal_expansion_deals d ON d.id = ar.deal_id
  LEFT JOIN approval_policies p ON p.id = ar.policy_id
  WHERE ar.id = p_request_id;

  IF v IS NULL THEN RETURN; END IF;

  PERFORM net.http_post(
    url := 'https://grbwstopaqvmybmmtiiv.supabase.co/functions/v1/notify-approval-event',
    body := v,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYndzdG9wYXF2bXlibW10aWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjkxMjQsImV4cCI6MjA4NTY0NTEyNH0.d6XVSev5y9nFiGDOD8ts0ZkuEPJQPFW9WbbUttBwESI'
    )::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fire_approval_notification(%, %) failed: %', p_request_id, p_event, SQLERRM;
END $function$
;


-- Function: public.flag_signoffs_needs_refresh()
CREATE OR REPLACE FUNCTION public.flag_signoffs_needs_refresh()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign uuid;
  v_kind text;
  v_count int := 0;
BEGIN
  IF TG_TABLE_NAME = 'campaign_script_documents' THEN
    IF NEW.status <> 'published' OR (OLD.status IS NOT DISTINCT FROM NEW.status) THEN RETURN NEW; END IF;
    v_campaign := NEW.campaign_id;
    v_kind := 'script_published';
  ELSIF TG_TABLE_NAME = 'campaign_faq_entries' THEN
    IF NEW.status <> 'approved' OR (OLD.status IS NOT DISTINCT FROM NEW.status) THEN RETURN NEW; END IF;
    v_kind := 'faq_approved';
    -- find campaigns whose go_live_checks would be affected (department or tenant scope)
    UPDATE public.campaign_training_signoffs s
       SET needs_refresh = true,
           refresh_reason = 'FAQ approved: ' || COALESCE(NEW.question,'')
     WHERE s.campaign_id IN (
       SELECT c.id FROM public.campaigns c
       WHERE (NEW.scope = 'global')
          OR (NEW.scope = 'department' AND c.client_department_id = NEW.client_department_id)
          OR (NEW.scope = 'tenant' AND c.tenant_kind = NEW.tenant_kind)
     )
       AND COALESCE(s.needs_refresh, false) = false;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    INSERT INTO public.campaign_training_retraining_events
      (campaign_id, trigger_kind, trigger_entity_id, affected_signoffs, note)
    SELECT DISTINCT s.campaign_id, v_kind, NEW.id, v_count, 'FAQ approved'
      FROM public.campaign_training_signoffs s
     WHERE s.needs_refresh = true AND s.refresh_reason LIKE 'FAQ approved%'
     LIMIT 1;
    RETURN NEW;
  ELSIF TG_TABLE_NAME = 'campaign_policy_blocks' THEN
    IF NEW.status <> 'approved' OR (OLD.status IS NOT DISTINCT FROM NEW.status) THEN RETURN NEW; END IF;
    v_kind := 'policy_approved';
    UPDATE public.campaign_training_signoffs s
       SET needs_refresh = true,
           refresh_reason = 'Policy approved: ' || COALESCE(NEW.title,'')
     WHERE s.campaign_id IN (
       SELECT c.id FROM public.campaigns c
       WHERE (NEW.scope = 'global')
          OR (NEW.scope = 'department' AND c.client_department_id = NEW.client_department_id)
          OR (NEW.scope = 'tenant' AND c.tenant_kind = NEW.tenant_kind)
     )
       AND COALESCE(s.needs_refresh, false) = false;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    INSERT INTO public.campaign_training_retraining_events
      (campaign_id, trigger_kind, trigger_entity_id, affected_signoffs, note)
    SELECT DISTINCT s.campaign_id, v_kind, NEW.id, v_count, 'Policy approved'
      FROM public.campaign_training_signoffs s
     WHERE s.needs_refresh = true AND s.refresh_reason LIKE 'Policy approved%'
     LIMIT 1;
    RETURN NEW;
  END IF;

  -- script_published path
  UPDATE public.campaign_training_signoffs
     SET needs_refresh = true,
         refresh_reason = 'Script document republished'
   WHERE campaign_id = v_campaign
     AND COALESCE(needs_refresh, false) = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    INSERT INTO public.campaign_training_retraining_events
      (campaign_id, trigger_kind, trigger_entity_id, affected_signoffs, note)
    VALUES (v_campaign, v_kind, NEW.id, v_count, 'Script republished');
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.force_activate_campaign(p_campaign_id uuid, p_reason text)
CREATE OR REPLACE FUNCTION public.force_activate_campaign(p_campaign_id uuid, p_reason text)
 RETURNS campaigns
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign public.campaigns%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required to force activate a campaign';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason of at least 3 characters is required';
  END IF;

  UPDATE public.campaigns
     SET status = 'active',
         go_live_override_at = now(),
         go_live_override_by = auth.uid(),
         go_live_override_reason = p_reason,
         updated_at = now()
   WHERE id = p_campaign_id
   RETURNING * INTO v_campaign;

  IF v_campaign.id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  -- Best-effort audit log entry (audit_log table exists in this project)
  BEGIN
    INSERT INTO public.audit_log(action, actor_id, target_table, target_id, metadata)
    VALUES (
      'campaign.force_activate',
      auth.uid(),
      'campaigns',
      v_campaign.id::text,
      jsonb_build_object('reason', p_reason)
    );
  EXCEPTION WHEN OTHERS THEN
    -- never block activation on audit failure
    NULL;
  END;

  RETURN v_campaign;
END;
$function$
;


-- Function: public.generate_automation_recommendations()
CREATE OR REPLACE FUNCTION public.generate_automation_recommendations()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;


-- Function: public.generate_communication_actions()
CREATE OR REPLACE FUNCTION public.generate_communication_actions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted integer := 0;
  v_suppressed integer := 0;
  v_auto_sent integer := 0;
  r record;
  v_recent_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Walk eligible plays (partner + direct) and propose actions per matching template
  FOR r IN
    SELECT 'partner'::text AS scope, p.id AS play_id, p.partner_id AS target_id, p.play_type, p.template_id
    FROM public.partner_success_plays p
    WHERE p.status IN ('not_started','active')
    UNION ALL
    SELECT 'direct'::text, d.id, d.lead_id, d.play_type, d.template_id
    FROM public.direct_success_plays d
    WHERE d.status IN ('not_started','active')
  LOOP
    FOR v_recent_count IN
      SELECT 1
      FROM public.communication_templates t
      WHERE t.active
        AND t.scope = r.scope
        AND t.play_type = r.play_type
    LOOP
      -- continue per template
    END LOOP;

    INSERT INTO public.communication_actions(scope, target_id, template_id, play_id, channel, status, suppression_reason)
    SELECT r.scope, r.target_id, t.id, r.play_id, t.channel,
           CASE
             WHEN EXISTS (
               SELECT 1 FROM public.communication_actions a2
               WHERE a2.scope = r.scope
                 AND a2.target_id = r.target_id
                 AND a2.template_id = t.id
                 AND a2.status = 'sent'
                 AND a2.sent_at > now() - make_interval(hours => t.suppression_hours)
             ) THEN 'suppressed'
             WHEN t.auto_send AND NOT t.requires_approval THEN 'queued'
             ELSE 'suggested'
           END,
           CASE
             WHEN EXISTS (
               SELECT 1 FROM public.communication_actions a3
               WHERE a3.scope = r.scope
                 AND a3.target_id = r.target_id
                 AND a3.template_id = t.id
                 AND a3.status = 'sent'
                 AND a3.sent_at > now() - make_interval(hours => t.suppression_hours)
             ) THEN 'recent_send_within_suppression_window'
             ELSE NULL
           END
    FROM public.communication_templates t
    WHERE t.active
      AND t.scope = r.scope
      AND t.play_type = r.play_type
      AND NOT EXISTS (
        SELECT 1 FROM public.communication_actions a
        WHERE a.scope = r.scope
          AND a.target_id = r.target_id
          AND a.template_id = t.id
          AND a.status IN ('suggested','approved','queued')
      );

    GET DIAGNOSTICS v_recent_count = ROW_COUNT;
    v_inserted := v_inserted + v_recent_count;
  END LOOP;

  -- Renewal sequencing: ensure renewal_workflows row exists for direct accounts with subscriptions
  INSERT INTO public.renewal_workflows(scope, target_id, subscription_id, renewal_date, stage)
  SELECT 'direct', s.lead_id, s.subscription_id, s.current_period_end::date, 'approaching'
  FROM public.v_subscription_snapshot s
  WHERE s.lead_id IS NOT NULL
    AND s.current_period_end IS NOT NULL
    AND s.current_period_end::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '120 days'
    AND s.status IN ('active','trialing','past_due')
  ON CONFLICT (scope, target_id, renewal_date) DO NOTHING;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'suppressed', v_suppressed,
    'auto_sent', v_auto_sent
  );
END;
$function$
;


-- Function: public.generate_executive_snapshot()
CREATE OR REPLACE FUNCTION public.generate_executive_snapshot()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payload jsonb;
  v_id uuid;
  v_actor uuid := auth.uid();
  v_kpi jsonb;
  v_revenue jsonb;
  v_delivery jsonb;
  v_voice jsonb;
  v_wl jsonb;
  v_automation jsonb;
  v_row_count integer := 0;
BEGIN
  IF NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  SELECT to_jsonb(s.*) INTO v_kpi FROM public.v_intelligence_executive_summary s LIMIT 1;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_revenue FROM public.v_revenue_pipeline r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_delivery FROM public.v_delivery_pipeline r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_voice FROM public.v_call_flow_receptionist_readiness r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_wl FROM public.v_wl_partner_readiness r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_automation FROM public.v_open_recommendations r;

  v_payload := jsonb_build_object(
    'kpi', coalesce(v_kpi, '{}'::jsonb),
    'revenue_pipeline', v_revenue,
    'delivery_pipeline', v_delivery,
    'voice_readiness', v_voice,
    'wl_partner_readiness', v_wl,
    'open_recommendations', v_automation
  );

  v_row_count :=
    coalesce(jsonb_array_length(v_revenue),0) +
    coalesce(jsonb_array_length(v_delivery),0) +
    coalesce(jsonb_array_length(v_voice),0) +
    coalesce(jsonb_array_length(v_wl),0) +
    coalesce(jsonb_array_length(v_automation),0);

  INSERT INTO public.data_export_snapshots
    (snapshot_type, scope, partner_id, payload, row_count, generated_by)
  VALUES
    ('executive_snapshot', 'admin', NULL, v_payload, v_row_count, v_actor)
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, metadata)
  VALUES (v_actor, 'intelligence.export.executive_snapshot', 'data_export_snapshots', v_id::text,
          jsonb_build_object('row_count', v_row_count));

  INSERT INTO public.dashboard_events (event_name, surface, persona, target, user_id, properties)
  VALUES ('intelligence.export.executive_snapshot', 'admin/intelligence', 'admin',
          v_id::text, v_actor, jsonb_build_object('row_count', v_row_count));

  RETURN v_id;
END;
$function$
;


-- Function: public.generate_playbook_suggestions()
CREATE OR REPLACE FUNCTION public.generate_playbook_suggestions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted_pending int := 0;
  v_auto_created int := 0;
  rec record;
  v_template public.playbook_templates%ROWTYPE;
  v_play_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Partner opportunities
  FOR rec IN SELECT * FROM public.v_partner_success_opportunities LOOP
    SELECT * INTO v_template
    FROM public.playbook_templates
    WHERE scope = 'partner'
      AND play_type = rec.opportunity_type
      AND active
    ORDER BY auto_create DESC, updated_at DESC
    LIMIT 1;
    IF v_template.id IS NULL THEN CONTINUE; END IF;

    IF v_template.auto_create THEN
      -- skip if any open play of this template already exists
      IF EXISTS (
        SELECT 1 FROM public.partner_success_plays
        WHERE partner_id = rec.partner_id
          AND template_id = v_template.id
          AND status IN ('not_started','active')
      ) THEN CONTINUE; END IF;
      INSERT INTO public.partner_success_plays
        (partner_id, play_type, status, notes, template_id, due_date, reminder_enabled, created_by)
      VALUES
        (rec.partner_id, v_template.play_type, 'not_started', rec.reason, v_template.id,
         CURRENT_DATE + (v_template.default_followup_days || ' days')::interval,
         true, auth.uid())
      RETURNING id INTO v_play_id;
      INSERT INTO public.play_suggestions
        (scope, target_id, template_id, opportunity_type, reason, status,
         resulting_play_id, decided_by, decided_at)
      VALUES
        ('partner', rec.partner_id, v_template.id, rec.opportunity_type, rec.reason,
         'auto_created', v_play_id, auth.uid(), now());
      v_auto_created := v_auto_created + 1;
    ELSE
      INSERT INTO public.play_suggestions
        (scope, target_id, template_id, opportunity_type, reason)
      VALUES
        ('partner', rec.partner_id, v_template.id, rec.opportunity_type, rec.reason)
      ON CONFLICT (scope, target_id, template_id) WHERE status = 'pending' DO NOTHING;
      IF FOUND THEN v_inserted_pending := v_inserted_pending + 1; END IF;
    END IF;
  END LOOP;

  -- Direct opportunities
  FOR rec IN SELECT * FROM public.v_direct_success_opportunities LOOP
    SELECT * INTO v_template
    FROM public.playbook_templates
    WHERE scope = 'direct'
      AND play_type = rec.opportunity_type
      AND active
    ORDER BY auto_create DESC, updated_at DESC
    LIMIT 1;
    IF v_template.id IS NULL THEN CONTINUE; END IF;

    IF v_template.auto_create THEN
      IF EXISTS (
        SELECT 1 FROM public.direct_success_plays
        WHERE lead_id = rec.lead_id
          AND template_id = v_template.id
          AND status IN ('not_started','active')
      ) THEN CONTINUE; END IF;
      INSERT INTO public.direct_success_plays
        (lead_id, play_type, status, notes, template_id, due_date, reminder_enabled, created_by)
      VALUES
        (rec.lead_id, v_template.play_type, 'not_started', rec.reason, v_template.id,
         CURRENT_DATE + (v_template.default_followup_days || ' days')::interval,
         true, auth.uid())
      RETURNING id INTO v_play_id;
      INSERT INTO public.play_suggestions
        (scope, target_id, template_id, opportunity_type, reason, status,
         resulting_play_id, decided_by, decided_at)
      VALUES
        ('direct', rec.lead_id, v_template.id, rec.opportunity_type, rec.reason,
         'auto_created', v_play_id, auth.uid(), now());
      v_auto_created := v_auto_created + 1;
    ELSE
      INSERT INTO public.play_suggestions
        (scope, target_id, template_id, opportunity_type, reason)
      VALUES
        ('direct', rec.lead_id, v_template.id, rec.opportunity_type, rec.reason)
      ON CONFLICT (scope, target_id, template_id) WHERE status = 'pending' DO NOTHING;
      IF FOUND THEN v_inserted_pending := v_inserted_pending + 1; END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'pending_inserted', v_inserted_pending,
    'auto_created', v_auto_created,
    'generated_at', now()
  );
END;
$function$
;


-- Function: public.generate_wl_partner_snapshot(p_partner_id uuid)
CREATE OR REPLACE FUNCTION public.generate_wl_partner_snapshot(p_partner_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_actor uuid := auth.uid();
  v_is_admin boolean := has_role(v_actor, 'admin'::app_role);
  v_owns boolean;
  v_payload jsonb;
  v_readiness jsonb;
  v_clients jsonb;
  v_row_count integer := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.white_label_partners
    WHERE id = p_partner_id AND user_id = v_actor
  ) INTO v_owns;

  IF NOT (v_is_admin OR v_owns) THEN
    RAISE EXCEPTION 'forbidden: must be admin or owning partner';
  END IF;

  SELECT to_jsonb(r.*) INTO v_readiness
    FROM public.v_wl_partner_readiness r WHERE r.partner_id = p_partner_id LIMIT 1;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_clients
    FROM public.v_wl_client_directory_for_partner r WHERE r.partner_id = p_partner_id;

  v_payload := jsonb_build_object(
    'partner_id', p_partner_id,
    'readiness', coalesce(v_readiness, '{}'::jsonb),
    'clients', v_clients
  );
  v_row_count := coalesce(jsonb_array_length(v_clients),0);

  INSERT INTO public.data_export_snapshots
    (snapshot_type, scope, partner_id, payload, row_count, generated_by)
  VALUES
    ('wl_partner_snapshot', 'partner', p_partner_id, v_payload, v_row_count, v_actor)
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, metadata)
  VALUES (v_actor, 'intelligence.export.wl_partner_snapshot', 'data_export_snapshots', v_id::text,
          jsonb_build_object('partner_id', p_partner_id, 'row_count', v_row_count));

  INSERT INTO public.dashboard_events (event_name, surface, persona, target, user_id, properties)
  VALUES ('intelligence.export.wl_partner_snapshot',
          CASE WHEN v_is_admin THEN 'admin/intelligence' ELSE 'wl-dashboard' END,
          CASE WHEN v_is_admin THEN 'admin' ELSE 'wl_partner' END,
          v_id::text, v_actor,
          jsonb_build_object('partner_id', p_partner_id, 'row_count', v_row_count));

  RETURN v_id;
END;
$function$
;


-- Function: public.get_campaign_go_live_activity(p_campaign_id uuid)
CREATE OR REPLACE FUNCTION public.get_campaign_go_live_activity(p_campaign_id uuid)
 RETURNS TABLE(check_key text, check_label text, last_updated_at timestamp with time zone, actor_id uuid, actor_name text, detail text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_camp record;
BEGIN
  SELECT id, client_department_id, tenant_kind, wl_partner_id, client_lead_id, wl_client_id
    INTO v_camp
    FROM public.campaigns
   WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Script: latest published version row for this campaign.
  RETURN QUERY
  SELECT
    'script'::text,
    'Script published'::text,
    pv.published_at,
    pv.published_by,
    COALESCE(p.full_name, 'Unknown'),
    ('Version ' || pv.version::text)::text
  FROM public.campaign_publish_versions pv
  LEFT JOIN public.profiles p ON p.id = pv.published_by
  WHERE pv.campaign_id = p_campaign_id
  ORDER BY pv.published_at DESC NULLS LAST
  LIMIT 1;

  -- FAQ: latest approved FAQ in scope (department / global / tenant).
  RETURN QUERY
  SELECT
    'faq'::text,
    'FAQ approved'::text,
    f.published_at,
    f.published_by,
    COALESCE(p.full_name, 'Unknown'),
    f.question
  FROM public.campaign_faq_entries f
  LEFT JOIN public.profiles p ON p.id = f.published_by
  WHERE f.status = 'approved'
    AND (
      f.client_department_id = v_camp.client_department_id
      OR f.scope = 'global'
      OR (
        f.scope = 'tenant'
        AND f.tenant_kind = v_camp.tenant_kind
        AND COALESCE(f.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE(v_camp.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND COALESCE(f.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE(v_camp.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND COALESCE(f.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE(v_camp.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
    )
  ORDER BY f.published_at DESC NULLS LAST
  LIMIT 1;

  -- Policy: latest approved policy in scope.
  RETURN QUERY
  SELECT
    'policy'::text,
    'Policy approved'::text,
    pol.published_at,
    pol.published_by,
    COALESCE(p.full_name, 'Unknown'),
    pol.title
  FROM public.campaign_policy_blocks pol
  LEFT JOIN public.profiles p ON p.id = pol.published_by
  WHERE pol.status = 'approved'
    AND (
      pol.client_department_id = v_camp.client_department_id
      OR pol.scope = 'global'
      OR (
        pol.scope = 'tenant'
        AND pol.tenant_kind = v_camp.tenant_kind
        AND COALESCE(pol.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE(v_camp.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND COALESCE(pol.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE(v_camp.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND COALESCE(pol.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE(v_camp.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
    )
  ORDER BY pol.published_at DESC NULLS LAST
  LIMIT 1;

  -- Training: latest signoff for this campaign.
  RETURN QUERY
  SELECT
    'training'::text,
    'Training signed off'::text,
    so.signed_off_at,
    so.signed_off_by,
    COALESCE(p.full_name, 'Unknown'),
    m.title
  FROM public.campaign_training_signoffs so
  LEFT JOIN public.profiles p ON p.id = so.signed_off_by
  LEFT JOIN public.campaign_training_modules m ON m.id = so.module_id
  WHERE so.campaign_id = p_campaign_id
  ORDER BY so.signed_off_at DESC NULLS LAST
  LIMIT 1;
END;
$function$
;


-- Function: public.get_campaign_go_live_status(p_campaign_id uuid)
CREATE OR REPLACE FUNCTION public.get_campaign_go_live_status(p_campaign_id uuid)
 RETURNS TABLE(campaign_id uuid, client_department_id uuid, script_published boolean, faqs_approved_count integer, policies_approved_count integer, required_modules integer, required_signoffs integer, faqs_ok boolean, policies_ok boolean, training_ok boolean, all_ok boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    c.campaign_id,
    c.client_department_id,
    c.script_published,
    c.faqs_approved_count::int,
    c.policies_approved_count::int,
    c.required_modules::int,
    c.required_signoffs::int,
    c.faqs_ok,
    c.policies_ok,
    c.training_ok,
    c.all_ok
  FROM public.campaign_go_live_checks c
  WHERE c.campaign_id = p_campaign_id;
$function$
;


-- Function: public.get_partner_id_by_slug(_slug text)
CREATE OR REPLACE FUNCTION public.get_partner_id_by_slug(_slug text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.white_label_partners WHERE partner_slug = _slug LIMIT 1
$function$
;


-- Function: public.get_wl_client_enabled_modules(_client_id uuid)
CREATE OR REPLACE FUNCTION public.get_wl_client_enabled_modules(_client_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(enabled_modules, '[]'::jsonb)
  FROM public.white_label_clients
  WHERE id = _client_id
$function$
;


-- Function: public.get_wl_client_id(_user_id uuid)
CREATE OR REPLACE FUNCTION public.get_wl_client_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.white_label_clients WHERE user_id = _user_id LIMIT 1
$function$
;


-- Function: public.growth_normalize_channel(_source text)
CREATE OR REPLACE FUNCTION public.growth_normalize_channel(_source text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
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
$function$
;


-- Function: public.guard_client_handoff_item_client_edits()
CREATE OR REPLACE FUNCTION public.guard_client_handoff_item_client_edits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins/supervisors bypass
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor') THEN
    RETURN NEW;
  END IF;
  -- For everyone else (the client): only allow editing fillable items
  IF NOT OLD.is_client_fillable THEN
    RAISE EXCEPTION 'This item cannot be edited by the client';
  END IF;
  -- And only allow value_json/status/notes to change
  IF NEW.item_key IS DISTINCT FROM OLD.item_key
     OR NEW.label IS DISTINCT FROM OLD.label
     OR NEW.item_type IS DISTINCT FROM OLD.item_type
     OR NEW.is_required IS DISTINCT FROM OLD.is_required
     OR NEW.is_client_fillable IS DISTINCT FROM OLD.is_client_fillable
     OR NEW.sort_order IS DISTINCT FROM OLD.sort_order
     OR NEW.handoff_id IS DISTINCT FROM OLD.handoff_id THEN
    RAISE EXCEPTION 'Clients can only update value_json, status, and notes';
  END IF;
  IF NEW.status NOT IN ('pending','provided') THEN
    RAISE EXCEPTION 'Clients cannot set status to %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.guard_wl_handoff_document_delete()
CREATE OR REPLACE FUNCTION public.guard_wl_handoff_document_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub_status text;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN OLD;
  END IF;
  SELECT submission_status INTO v_sub_status
  FROM public.wl_partner_onboarding_handoffs WHERE id = OLD.handoff_id;
  IF v_sub_status IN ('submitted_to_fulfillment','needs_more_info','resubmitted','approved_for_activation','activation_in_progress','activated') THEN
    RAISE EXCEPTION 'Cannot delete documents after submission. Mark as superseded instead.';
  END IF;
  RETURN OLD;
END;
$function$
;


-- Function: public.handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default 'client' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$function$
;


-- Function: public.has_role(_user_id uuid, _role app_role)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$
;


-- Function: public.inherit_dept_from_campaign()
CREATE OR REPLACE FUNCTION public.inherit_dept_from_campaign()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  parent_dept uuid;
BEGIN
  SELECT client_department_id INTO parent_dept
  FROM public.campaigns
  WHERE id = NEW.campaign_id;

  IF parent_dept IS NULL THEN
    RAISE EXCEPTION 'campaign % not found or has no department', NEW.campaign_id;
  END IF;

  NEW.client_department_id := parent_dept;
  RETURN NEW;
END;
$function$
;


-- Function: public.is_internal_staff(_user_id uuid)
CREATE OR REPLACE FUNCTION public.is_internal_staff(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','supervisor','sales','billing','tech','hr','agent')
  )
$function$
;


-- Function: public.is_supervisor_scope_enforced()
CREATE OR REPLACE FUNCTION public.is_supervisor_scope_enforced()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT (value)::text::boolean
       FROM public.admin_settings
       WHERE key = 'supervisor_scope_enforced'
       LIMIT 1),
    false
  );
$function$
;


-- Function: public.is_tenant_member(_user uuid, _tenant_kind text, _wl_partner_id uuid, _client_lead_id uuid, _wl_client_id uuid)
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user uuid, _tenant_kind text, _wl_partner_id uuid, _client_lead_id uuid, _wl_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _user IS NULL THEN RETURN false; END IF;

  -- Admin: unconditional
  IF public.has_role(_user, 'admin'::app_role) THEN RETURN true; END IF;

  -- Supervisor: gated by assignments table when the flag is on,
  -- else admin-equivalent (legacy behavior).
  IF public.has_role(_user, 'supervisor'::app_role) THEN
    IF public.is_supervisor_scope_enforced() THEN
      RETURN public.supervisor_can_access_tenant(
        _user, _tenant_kind, _wl_partner_id, _client_lead_id, _wl_client_id
      );
    ELSE
      RETURN true;
    END IF;
  END IF;

  -- WL partner ownership
  IF _tenant_kind = 'wl_partner' AND _wl_partner_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.white_label_partners wp
               WHERE wp.id = _wl_partner_id AND wp.user_id = _user) THEN
      RETURN true;
    END IF;
  END IF;

  -- WL end-client ownership
  IF _wl_client_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.white_label_clients wc
               WHERE wc.id = _wl_client_id AND wc.user_id = _user) THEN
      RETURN true;
    END IF;
  END IF;

  -- Direct client (lead) ownership
  IF _tenant_kind = 'direct_24h' AND _client_lead_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.leads l
               WHERE l.id = _client_lead_id AND l.user_id = _user) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$function$
;


-- Function: public.link_client_user_to_handoff()
CREATE OR REPLACE FUNCTION public.link_client_user_to_handoff()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_handoff_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  UPDATE public.client_onboarding_handoffs h
    SET client_user_id = auth.uid(),
        updated_at = now()
    FROM public.leads l
    WHERE h.client_lead_id = l.id
      AND l.user_id = auth.uid()
      AND h.client_user_id IS NULL
    RETURNING h.id INTO v_handoff_id;
  IF v_handoff_id IS NULL THEN
    SELECT h.id INTO v_handoff_id
    FROM public.client_onboarding_handoffs h
    JOIN public.leads l ON l.id = h.client_lead_id
    WHERE l.user_id = auth.uid()
       OR h.client_user_id = auth.uid()
    ORDER BY h.created_at DESC
    LIMIT 1;
  END IF;
  RETURN v_handoff_id;
END;
$function$
;


-- Function: public.link_comm_action_to_deal(p_action_id uuid, p_deal_id uuid)
CREATE OR REPLACE FUNCTION public.link_comm_action_to_deal(p_action_id uuid, p_deal_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  UPDATE public.communication_actions SET deal_id = p_deal_id WHERE id = p_action_id;
  RETURN FOUND;
END $function$
;


-- Function: public.list_feedback_admin_handlers()
CREATE OR REPLACE FUNCTION public.list_feedback_admin_handlers()
 RETURNS TABLE(user_id uuid, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ur.user_id, COALESCE(p.full_name, '')::text AS full_name
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin'::public.app_role
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  ORDER BY COALESCE(p.full_name, '');
$function$
;


-- Function: public.log_audit_event(_action text, _target_table text, _target_id text, _tenant_context jsonb, _metadata jsonb)
CREATE OR REPLACE FUNCTION public.log_audit_event(_action text, _target_table text DEFAULT NULL::text, _target_id text DEFAULT NULL::text, _tenant_context jsonb DEFAULT NULL::jsonb, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_actor_email text;
BEGIN
  -- Best-effort lookup of the actor's email (don't fail the trigger if missing)
  BEGIN
    SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_email := NULL;
  END;

  INSERT INTO public.audit_log (
    actor_id, actor_email, action, target_table, target_id,
    tenant_context, metadata
  ) VALUES (
    auth.uid(), v_actor_email, _action, _target_table, _target_id,
    _tenant_context, COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'log_audit_event failed: %', SQLERRM;
  RETURN NULL;
END;
$function$
;


-- Function: public.mark_communication_sent(p_action_id uuid)
CREATE OR REPLACE FUNCTION public.mark_communication_sent(p_action_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.communication_actions
    SET status = 'sent', sent_at = now()
    WHERE id = p_action_id AND status IN ('approved','queued');
  RETURN FOUND;
END; $function$
;


-- Function: public.notify_admin_new_application()
CREATE OR REPLACE FUNCTION public.notify_admin_new_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt text;
BEGIN
  SELECT decrypted_secret INTO v_jwt
  FROM vault.decrypted_secrets
  WHERE name = 'admin_notification_anon_jwt'
  LIMIT 1;

  IF v_jwt IS NULL THEN
    RAISE WARNING 'notify_admin_new_application: admin_notification_anon_jwt not found in vault';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://grbwstopaqvmybmmtiiv.supabase.co/functions/v1/send-admin-notification'::text,
    body := jsonb_build_object(
      'type', 'new_application',
      'record', jsonb_build_object(
        'id', NEW.id,
        'name', NEW.name,
        'email', NEW.email,
        'phone', NEW.phone,
        'cover_letter', NEW.cover_letter,
        'job_posting_id', NEW.job_posting_id,
        'status', NEW.status
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_jwt
    )::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admin_new_application failed: %', SQLERRM;
  RETURN NEW;
END;
$function$
;


-- Function: public.notify_admin_new_lead()
CREATE OR REPLACE FUNCTION public.notify_admin_new_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt text;
BEGIN
  SELECT decrypted_secret INTO v_jwt
  FROM vault.decrypted_secrets
  WHERE name = 'admin_notification_anon_jwt'
  LIMIT 1;

  IF v_jwt IS NULL THEN
    RAISE WARNING 'notify_admin_new_lead: admin_notification_anon_jwt not found in vault';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://grbwstopaqvmybmmtiiv.supabase.co/functions/v1/send-admin-notification'::text,
    body := jsonb_build_object(
      'type', 'new_lead',
      'record', jsonb_build_object(
        'id', NEW.id,
        'name', NEW.name,
        'email', NEW.email,
        'phone', NEW.phone,
        'company', NEW.company,
        'service_type', NEW.service_type,
        'source', NEW.source,
        'notes', NEW.notes,
        'plan_minutes', NEW.plan_minutes,
        'score', NEW.score
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_jwt
    )::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admin_new_lead failed: %', SQLERRM;
  RETURN NEW;
END;
$function$
;


-- Function: public.notify_agent_shift_edited()
CREATE OR REPLACE FUNCTION public.notify_agent_shift_edited()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only fire when edited_at changed and edited_by is not the agent themselves
  IF NEW.edited_at IS DISTINCT FROM OLD.edited_at
     AND NEW.edited_by IS NOT NULL
     AND NEW.edited_by IS DISTINCT FROM NEW.agent_id
  THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      NEW.agent_id,
      'Your shift was edited',
      COALESCE('Reason: ' || NEW.edit_reason, 'A supervisor edited your shift times.'),
      'shift',
      '/staff/agent/shifts'
    );
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.notify_idempotent(p_user_id uuid, p_title text, p_message text, p_type text, p_category text, p_action_url text, p_metadata jsonb)
CREATE OR REPLACE FUNCTION public.notify_idempotent(p_user_id uuid, p_title text, p_message text, p_type text, p_category text, p_action_url text, p_metadata jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_meta jsonb;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;
  v_meta := COALESCE(p_metadata, '{}'::jsonb);

  INSERT INTO public.notifications
    (user_id, title, message, type, category, action_url, metadata)
  VALUES
    (p_user_id, p_title, p_message, p_type, p_category, p_action_url, v_meta)
  ON CONFLICT (user_id, ((metadata->>'event_key'))) WHERE metadata ? 'event_key'
  DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;


-- Function: public.notify_on_new_wl_client()
CREATE OR REPLACE FUNCTION public.notify_on_new_wl_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff RECORD;
  v_partner_name text;
BEGIN
  -- Get partner name
  SELECT company_name INTO v_partner_name
  FROM public.white_label_partners
  WHERE id = NEW.partner_id;

  -- Notify billing team about unverified client
  FOR v_staff IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'billing'::app_role
  LOOP
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      v_staff.user_id,
      'New WL Client Needs Verification',
      NEW.client_name || ' added by ' || COALESCE(v_partner_name, 'Unknown partner') || '. Billing verification required.',
      'billing',
      '/staff/billing/wl-partners'
    );
  END LOOP;

  RETURN NEW;
END;
$function$
;


-- Function: public.notify_on_outbound_request()
CREATE OR REPLACE FUNCTION public.notify_on_outbound_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff RECORD;
  v_title TEXT;
  v_message TEXT;
BEGIN
  IF NEW.urgency = 'urgent' THEN
    v_title := 'Urgent Outbound Call Request';
  ELSE
    v_title := 'New Outbound Call Request';
  END IF;

  v_message := 'Call ' || NEW.contact_name || ' at ' || NEW.contact_phone;
  IF NEW.reason IS NOT NULL AND length(NEW.reason) > 0 THEN
    v_message := v_message || ' — ' || left(NEW.reason, 100);
  END IF;

  FOR v_staff IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role IN ('agent'::app_role, 'supervisor'::app_role)
  LOOP
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      v_staff.user_id,
      v_title,
      v_message,
      'outbound_call',
      '/staff/agent/outbound-calls'
    );
  END LOOP;

  RETURN NEW;
END;
$function$
;


-- Function: public.notify_on_pipeline_stage_change()
CREATE OR REPLACE FUNCTION public.notify_on_pipeline_stage_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff RECORD;
  v_lead_name text;
BEGIN
  -- Only fire when pipeline_stage actually changes
  IF OLD.pipeline_stage IS NOT DISTINCT FROM NEW.pipeline_stage THEN
    RETURN NEW;
  END IF;

  v_lead_name := COALESCE(NEW.name, 'Unknown');

  -- Lead moves to 'ready_for_billing'
  IF NEW.pipeline_stage = 'ready_for_billing' THEN
    -- Notify billing team
    FOR v_staff IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'billing'::app_role
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        v_staff.user_id,
        'Client Ready for Billing',
        v_lead_name || ' is ready for billing setup.',
        'billing',
        '/staff/billing/client-lookup'
      );
    END LOOP;

    -- Auto-create sales commission if assigned_sales_rep exists
    IF NEW.assigned_sales_rep IS NOT NULL THEN
      INSERT INTO public.sales_commissions (sales_rep_id, lead_id, base_amount, commission_rate, commission_amount, status)
      VALUES (
        NEW.assigned_sales_rep,
        NEW.id,
        COALESCE(NEW.plan_minutes, 0) * COALESCE(NEW.custom_minute_rate, 1.39),
        0.10,
        COALESCE(NEW.plan_minutes, 0) * COALESCE(NEW.custom_minute_rate, 1.39) * 0.10,
        'pending'
      );
    END IF;
  END IF;

  -- Lead moves to 'active'
  IF NEW.pipeline_stage = 'active' THEN
    -- Notify supervisors
    FOR v_staff IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'supervisor'::app_role
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        v_staff.user_id,
        'New Active Client',
        v_lead_name || ' is now active and may need agent assignments.',
        'client',
        '/admin/leads/' || NEW.id
      );
    END LOOP;

    -- Notify assigned agents if any
    FOR v_staff IN
      SELECT DISTINCT agent_id FROM public.client_agent_assignments WHERE client_id = NEW.id
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        v_staff.agent_id,
        'New Client Assigned',
        'You have been assigned to ' || v_lead_name || '.',
        'client',
        '/staff/agent/clients'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: public.notify_on_task_event()
CREATE OR REPLACE FUNCTION public.notify_on_task_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    -- Notify assignee on new task (if different from creator)
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM NEW.created_by THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        NEW.assigned_to,
        'New task assigned to you',
        left(NEW.title, 120),
        'task',
        '/tasks/' || NEW.id
      );
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify assignee (if not the one who changed it)
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM v_actor_id THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        NEW.assigned_to,
        'Task status: ' || NEW.status,
        left(NEW.title, 120),
        'task',
        '/tasks/' || NEW.id
      );
    END IF;

    -- Notify creator (if different from assignee and from actor)
    IF NEW.created_by IS NOT NULL
       AND NEW.created_by IS DISTINCT FROM v_actor_id
       AND NEW.created_by IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        NEW.created_by,
        'Task status: ' || NEW.status,
        left(NEW.title, 120),
        'task',
        '/tasks/' || NEW.id
      );
    END IF;
  END IF;

  -- Notify on assignment change
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM v_actor_id THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        NEW.assigned_to,
        'Task assigned to you',
        left(NEW.title, 120),
        'task',
        '/tasks/' || NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: public.notify_on_ticket_assignment()
CREATE OR REPLACE FUNCTION public.notify_on_ticket_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
     AND NEW.assigned_to IS NOT NULL
     AND NEW.assigned_to IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      NEW.assigned_to,
      'Ticket #' || NEW.ticket_number || ' assigned to you',
      left(NEW.title, 120),
      'ticket',
      '/tickets/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.notify_on_ticket_reply()
CREATE OR REPLACE FUNCTION public.notify_on_ticket_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket RECORD;
  v_reply_author_id uuid;
  v_notified_ids uuid[] := '{}';
  v_fanout_exclude_ids uuid[] := '{}';
  v_is_cross_dept boolean;
  v_queue text;
  v_title text;
  v_message text;
  v_action_url text;
BEGIN
  IF NEW.is_internal = true THEN
    RETURN NEW;
  END IF;

  v_reply_author_id := NEW.author_id;
  v_notified_ids := v_notified_ids || v_reply_author_id;

  SELECT id, submitted_by, assigned_to, ticket_number, title, source, originating_source, work_queue
  INTO v_ticket
  FROM public.support_tickets
  WHERE id = NEW.ticket_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_queue := COALESCE(v_ticket.work_queue, v_ticket.source);
  v_is_cross_dept := (v_ticket.originating_source IS DISTINCT FROM v_queue);

  v_title := 'New reply on ticket #' || v_ticket.ticket_number;
  v_message := COALESCE(NEW.author_name, 'Someone') || ' replied: ' || left(NEW.message, 100);
  v_action_url := '/tickets/' || v_ticket.id;

  -- Notify submitted_by
  IF v_ticket.submitted_by IS NOT NULL
     AND v_ticket.submitted_by IS DISTINCT FROM v_reply_author_id THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (v_ticket.submitted_by, v_title, v_message, 'ticket', v_action_url);
    v_notified_ids := v_notified_ids || v_ticket.submitted_by;
  END IF;

  -- Notify assigned_to
  IF v_ticket.assigned_to IS NOT NULL
     AND v_ticket.assigned_to IS DISTINCT FROM v_reply_author_id
     AND v_ticket.assigned_to IS DISTINCT FROM v_ticket.submitted_by THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (v_ticket.assigned_to, v_title, v_message, 'ticket', v_action_url);
    v_notified_ids := v_notified_ids || v_ticket.assigned_to;
  END IF;

  IF v_is_cross_dept THEN
    v_fanout_exclude_ids := '{}';
    IF v_ticket.submitted_by IS NOT NULL
       AND v_ticket.submitted_by IS DISTINCT FROM v_reply_author_id THEN
      v_fanout_exclude_ids := v_fanout_exclude_ids || v_ticket.submitted_by;
    END IF;
    IF v_ticket.assigned_to IS NOT NULL
       AND v_ticket.assigned_to IS DISTINCT FROM v_reply_author_id THEN
      v_fanout_exclude_ids := v_fanout_exclude_ids || v_ticket.assigned_to;
    END IF;
  ELSE
    v_fanout_exclude_ids := v_notified_ids;
  END IF;

  PERFORM public.fanout_ticket_dept_notifications(
    v_queue, v_fanout_exclude_ids, v_title, v_message, v_action_url
  );

  RETURN NEW;
END;
$function$
;


-- Function: public.notify_on_wl_client_verification_change()
CREATE OR REPLACE FUNCTION public.notify_on_wl_client_verification_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_partner_user_id uuid;
  v_client_name text;
  v_status_text text;
BEGIN
  -- Only fire when billing_verified changes
  IF OLD.billing_verified IS NOT DISTINCT FROM NEW.billing_verified THEN
    RETURN NEW;
  END IF;

  -- Get the client name
  SELECT client_name INTO v_client_name
  FROM public.white_label_clients
  WHERE id = NEW.wl_client_id;

  -- Get the partner's user_id
  SELECT user_id INTO v_partner_user_id
  FROM public.white_label_partners
  WHERE id = NEW.partner_id;

  IF NEW.billing_verified THEN
    v_status_text := 'verified';
  ELSE
    v_status_text := 'unverified';
  END IF;

  -- Notify the WL partner
  IF v_partner_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      v_partner_user_id,
      'Client Verification Updated',
      COALESCE(v_client_name, 'A client') || ' has been ' || v_status_text || '.',
      'billing',
      '/white-label-dashboard/clients'
    );
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: public.notify_on_wl_portal_ticket()
CREATE OR REPLACE FUNCTION public.notify_on_wl_portal_ticket()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff RECORD;
BEGIN
  -- Only for new tickets from white_label_portal
  IF NEW.source != 'white_label_portal' THEN
    RETURN NEW;
  END IF;

  -- Ensure work_queue is set
  IF NEW.work_queue IS NULL THEN
    NEW.work_queue := 'supervisor';
  END IF;

  FOR v_staff IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('billing'::app_role, 'supervisor'::app_role)
  LOOP
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      v_staff.user_id,
      'WL Partner Ticket #' || NEW.ticket_number,
      left(NEW.title, 120),
      'ticket',
      '/admin/tickets/' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$function$
;


-- Function: public.notify_open_shift_posted()
CREATE OR REPLACE FUNCTION public.notify_open_shift_posted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agent RECORD;
  v_message text;
BEGIN
  v_message := 'Shift on ' || NEW.shift_date || ' (' || NEW.start_time || ' - ' || NEW.end_time || ') needs coverage.';

  IF array_length(NEW.required_skills, 1) > 0 THEN
    FOR v_agent IN
      SELECT DISTINCT ask.agent_id
      FROM public.agent_skills ask
      WHERE ask.skill_name = ANY(NEW.required_skills)
        AND ask.agent_id != NEW.original_agent_id
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (v_agent.agent_id, 'Open Shift Available', v_message, 'schedule', '/staff/agent/schedule');
    END LOOP;
  ELSE
    FOR v_agent IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'agent'::app_role AND ur.user_id != NEW.original_agent_id
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (v_agent.user_id, 'Open Shift Available', v_message, 'schedule', '/staff/agent/schedule');
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: public.notify_shift_claimed()
CREATE OR REPLACE FUNCTION public.notify_shift_claimed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_claimer_name text;
BEGIN
  IF OLD.claimed_by IS NULL AND NEW.claimed_by IS NOT NULL THEN
    SELECT full_name INTO v_claimer_name FROM public.profiles WHERE id = NEW.claimed_by;
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      NEW.posted_by,
      'Shift Claimed',
      COALESCE(v_claimer_name, 'An agent') || ' claimed the shift on ' || NEW.shift_date,
      'schedule',
      '/staff/supervisor/schedule'
    );
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.notify_time_off_request()
CREATE OR REPLACE FUNCTION public.notify_time_off_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff RECORD;
  v_category text;
  v_title text;
  v_message text;
  v_agent_name text;
BEGIN
  SELECT full_name INTO v_agent_name FROM public.profiles WHERE id = NEW.agent_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.request_type = 'sick' THEN
      v_category := 'urgent';
      v_title := '🔴 Sick Day Reported';
    ELSE
      v_category := 'schedule';
      v_title := 'Time Off Request';
    END IF;
    v_message := COALESCE(v_agent_name, 'An agent') || ' — ' || NEW.start_date || ' to ' || NEW.end_date;

    FOR v_staff IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('supervisor'::app_role, 'admin'::app_role)
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (v_staff.user_id, v_title, v_message, v_category, '/staff/supervisor/schedule');
    END LOOP;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      v_title := 'Time Off Approved';
      v_message := NEW.start_date || ' to ' || NEW.end_date || ' has been approved.';
    ELSIF NEW.status = 'denied' THEN
      v_title := 'Time Off Denied';
      v_message := NEW.start_date || ' to ' || NEW.end_date || ' was denied.' || COALESCE(' Reason: ' || NEW.review_notes, '');
    ELSE
      RETURN NEW;
    END IF;
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (NEW.agent_id, v_title, v_message, 'schedule', '/staff/agent/schedule');
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: public.publish_disc_page(_page_id uuid, _action text, _notes text)
CREATE OR REPLACE FUNCTION public.publish_disc_page(_page_id uuid, _action text, _notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_old_publish text;
  v_old_readiness text;
  v_new_publish text;
  v_new_readiness text;
  v_indexation text;
  v_sitemap boolean;
  v_slug text;
BEGIN
  IF v_user IS NULL OR NOT has_role(v_user, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT publish_status, readiness_state, indexation_status, include_in_sitemap, slug
  INTO v_old_publish, v_old_readiness, v_indexation, v_sitemap, v_slug
  FROM public.disc_generated_pages WHERE id = _page_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'page not found'; END IF;

  IF _action = 'approve' THEN
    v_new_readiness := 'approved'; v_new_publish := v_old_publish;
  ELSIF _action = 'request_rewrite' THEN
    v_new_readiness := 'needs_rewrite'; v_new_publish := v_old_publish;
  ELSIF _action = 'publish' THEN
    IF v_old_readiness <> 'approved' THEN RAISE EXCEPTION 'page must be approved before publish'; END IF;
    v_new_publish := 'published'; v_new_readiness := v_old_readiness;
    v_indexation := 'index'; v_sitemap := true;
  ELSIF _action = 'unpublish' THEN
    v_new_publish := 'draft'; v_new_readiness := v_old_readiness; v_sitemap := false;
  ELSE
    RAISE EXCEPTION 'unknown action: %', _action;
  END IF;

  UPDATE public.disc_generated_pages
  SET publish_status = v_new_publish,
      readiness_state = v_new_readiness,
      indexation_status = v_indexation,
      include_in_sitemap = v_sitemap,
      published_at = CASE WHEN _action='publish' THEN now() ELSE published_at END,
      updated_at = now()
  WHERE id = _page_id;

  INSERT INTO public.disc_publish_log (generated_page_id, actor_user_id, action_type, old_status, new_status, notes)
  VALUES (_page_id, v_user, _action, v_old_publish, v_new_publish, _notes);

  IF _action IN ('publish','unpublish') THEN
    INSERT INTO public.dashboard_events (event_type, surface, actor_user_id, payload)
    VALUES (
      CASE WHEN _action='publish' THEN 'growth.disc.page.published' ELSE 'growth.disc.page.unpublished' END,
      'admin.discoverability',
      v_user,
      jsonb_build_object('page_id', _page_id, 'slug', v_slug)
    );
  END IF;

  RETURN jsonb_build_object('id', _page_id, 'publish_status', v_new_publish, 'readiness_state', v_new_readiness);
END;
$function$
;


-- Function: public.publish_script_document(p_document_id uuid, p_notes text)
CREATE OR REPLACE FUNCTION public.publish_script_document(p_document_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS campaign_script_document_versions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_doc public.campaign_script_documents%ROWTYPE;
  v_next_version int;
  v_version public.campaign_script_document_versions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT can_mutate_script_document(p_document_id) THEN
    RAISE EXCEPTION 'Forbidden: cannot publish this script document';
  END IF;

  SELECT * INTO v_doc FROM public.campaign_script_documents WHERE id = p_document_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Script document not found'; END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
    FROM public.campaign_script_document_versions
   WHERE document_id = p_document_id;

  INSERT INTO public.campaign_script_document_versions
    (document_id, version_number, tree, notes, published_by, published_at)
  VALUES
    (p_document_id, v_next_version, v_doc.tree, p_notes, auth.uid(), now())
  RETURNING * INTO v_version;

  UPDATE public.campaign_script_documents
     SET current_version_id = v_version.id,
         status = 'published',
         updated_by = auth.uid(),
         updated_at = now()
   WHERE id = p_document_id;

  RETURN v_version;
END;
$function$
;


-- Function: public.reconcile_renewal_expansion_deals()
CREATE OR REPLACE FUNCTION public.reconcile_renewal_expansion_deals()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_implemented INT := 0; v_stalled INT := 0; v_rec RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Implementation match: direct deals where subscription truth now shows proposed plan
  FOR v_rec IN
    SELECT d.id
      FROM public.renewal_expansion_deals d
      JOIN public.v_subscription_snapshot s ON s.lead_id = d.target_id
     WHERE d.scope = 'direct'
       AND d.status = 'open'
       AND d.proposed_plan_key IS NOT NULL
       AND d.stage IN ('verbally_approved','proposal_sent','negotiation','closed_won')
       AND s.plan_key = d.proposed_plan_key
  LOOP
    UPDATE public.renewal_expansion_deals
       SET stage = 'implemented', status = 'won',
           implemented_at = now(), stage_changed_at = now(),
           outcome_reason = COALESCE(outcome_reason,'reconciled_from_subscription_truth')
     WHERE id = v_rec.id;
    v_implemented := v_implemented + 1;
  END LOOP;

  -- Stalled: verbally_approved >14 days and still open
  UPDATE public.renewal_expansion_deals
     SET status = 'stalled'
   WHERE stage = 'verbally_approved'
     AND status = 'open'
     AND stage_changed_at < (now() - INTERVAL '14 days');
  GET DIAGNOSTICS v_stalled = ROW_COUNT;

  RETURN jsonb_build_object('implemented', v_implemented, 'stalled', v_stalled);
END $function$
;


-- Function: public.record_automation_check_run(p_check_name text, p_status text, p_recs_created integer, p_recs_resolved integer, p_error_text text, p_triggered_by text)
CREATE OR REPLACE FUNCTION public.record_automation_check_run(p_check_name text, p_status text, p_recs_created integer DEFAULT 0, p_recs_resolved integer DEFAULT 0, p_error_text text DEFAULT NULL::text, p_triggered_by text DEFAULT 'manual'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.automation_check_runs (check_name,status,recs_created,recs_resolved,error_text,triggered_by)
  VALUES (p_check_name,p_status,p_recs_created,p_recs_resolved,p_error_text,p_triggered_by)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $function$
;


-- Function: public.resolve_effective_faqs(p_tenant_kind campaign_tenant_kind, p_wl_partner_id uuid, p_wl_client_id uuid, p_client_lead_id uuid, p_department_id uuid, p_location_id uuid)
CREATE OR REPLACE FUNCTION public.resolve_effective_faqs(p_tenant_kind campaign_tenant_kind, p_wl_partner_id uuid, p_wl_client_id uuid, p_client_lead_id uuid, p_department_id uuid, p_location_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, tenant_kind campaign_tenant_kind, wl_partner_id uuid, client_lead_id uuid, wl_client_id uuid, scope text, client_department_id uuid, client_location_id uuid, question text, answer_md text, tags text[], status text, version integer, effective_from timestamp with time zone, effective_to timestamp with time zone, published_at timestamp with time zone, published_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, precedence_rank integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH candidates AS (
    SELECT * FROM public.v_candidate_faqs c
    WHERE
      (c.effective_from IS NULL OR c.effective_from <= now())
      AND (c.effective_to IS NULL OR c.effective_to > now())
      AND (
        c.scope = 'global'
        OR (c.scope = 'tenant' AND c.tenant_kind = p_tenant_kind AND (
          (p_tenant_kind = 'direct_24h' AND c.wl_partner_id IS NULL)
          OR (p_tenant_kind = 'wl_partner' AND c.wl_partner_id = p_wl_partner_id)
        ))
        OR (c.scope = 'client' AND (
          (p_tenant_kind = 'direct_24h' AND c.client_lead_id = p_client_lead_id)
          OR (p_tenant_kind = 'wl_partner' AND c.wl_client_id = p_wl_client_id)
        ))
        OR (c.scope = 'location' AND c.client_location_id = p_location_id)
        OR (c.scope IN ('department','call_flow') AND c.client_department_id = p_department_id)
      )
  ),
  ranked AS (
    SELECT c.*, ROW_NUMBER() OVER (
      PARTITION BY c.question
      ORDER BY c.precedence_rank DESC, c.version DESC, c.updated_at DESC
    ) AS rn FROM candidates c
  )
  SELECT id, tenant_kind, wl_partner_id, client_lead_id, wl_client_id, scope,
         client_department_id, client_location_id,
         question, answer_md, tags, status, version,
         effective_from, effective_to, published_at, published_by,
         created_at, updated_at, created_by, precedence_rank
  FROM ranked WHERE rn = 1;
$function$
;


-- Function: public.resolve_effective_policies(p_tenant_kind campaign_tenant_kind, p_wl_partner_id uuid, p_wl_client_id uuid, p_client_lead_id uuid, p_department_id uuid, p_location_id uuid)
CREATE OR REPLACE FUNCTION public.resolve_effective_policies(p_tenant_kind campaign_tenant_kind, p_wl_partner_id uuid, p_wl_client_id uuid, p_client_lead_id uuid, p_department_id uuid, p_location_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, tenant_kind campaign_tenant_kind, wl_partner_id uuid, client_lead_id uuid, wl_client_id uuid, scope text, client_department_id uuid, client_location_id uuid, policy_kind text, title text, body_md text, tags text[], status text, version integer, effective_from timestamp with time zone, effective_to timestamp with time zone, published_at timestamp with time zone, published_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, precedence_rank integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH candidates AS (
    SELECT * FROM public.v_candidate_policies c
    WHERE
      (c.effective_from IS NULL OR c.effective_from <= now())
      AND (c.effective_to IS NULL OR c.effective_to > now())
      AND (
        c.scope = 'global'
        OR (c.scope = 'tenant' AND c.tenant_kind = p_tenant_kind AND (
          (p_tenant_kind = 'direct_24h' AND c.wl_partner_id IS NULL)
          OR (p_tenant_kind = 'wl_partner' AND c.wl_partner_id = p_wl_partner_id)
        ))
        OR (c.scope = 'client' AND (
          (p_tenant_kind = 'direct_24h' AND c.client_lead_id = p_client_lead_id)
          OR (p_tenant_kind = 'wl_partner' AND c.wl_client_id = p_wl_client_id)
        ))
        OR (c.scope = 'location' AND c.client_location_id = p_location_id)
        OR (c.scope IN ('department','call_flow') AND c.client_department_id = p_department_id)
      )
  ),
  ranked AS (
    SELECT c.*, ROW_NUMBER() OVER (
      PARTITION BY c.policy_kind, c.title
      ORDER BY c.precedence_rank DESC, c.version DESC, c.updated_at DESC
    ) AS rn FROM candidates c
  )
  SELECT id, tenant_kind, wl_partner_id, client_lead_id, wl_client_id, scope,
         client_department_id, client_location_id,
         policy_kind, title, body_md, tags, status, version,
         effective_from, effective_to, published_at, published_by,
         created_at, updated_at, created_by, precedence_rank
  FROM ranked WHERE rn = 1;
$function$
;


-- Function: public.resolve_fields_for_audience(_client_department_id uuid, _audience text)
CREATE OR REPLACE FUNCTION public.resolve_fields_for_audience(_client_department_id uuid, _audience text)
 RETURNS TABLE(field_id uuid, field_group_id uuid, field_key text, display_label text, field_type text, is_required boolean, placeholder text, help_text text, validation_json jsonb, sort_order integer, scope text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_internal_audience boolean := _audience IN ('agent','supervisor');
  v_dept record;
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  IF _audience NOT IN ('agent','supervisor','client','wl_partner','wl_end_client') THEN
    RAISE EXCEPTION 'invalid audience %', _audience;
  END IF;

  -- Resolve department's tenant identity for membership check
  SELECT * INTO v_dept FROM public.client_departments WHERE id = _client_department_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Caller must be a member of that tenant
  IF NOT public.is_tenant_member(v_user, v_dept.tenant_kind::text, v_dept.wl_partner_id, v_dept.client_lead_id, v_dept.wl_client_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    f.id AS field_id,
    f.field_group_id,
    f.field_key,
    COALESCE(dl.label_override, f.display_label) AS display_label,
    f.field_type,
    f.is_required,
    f.placeholder,
    f.help_text,
    f.validation_json,
    f.sort_order,
    f.scope
  FROM public.campaign_fields f
  LEFT JOIN public.campaign_field_display_labels dl ON dl.field_id = f.id AND dl.audience = _audience
  LEFT JOIN public.campaign_field_visibility_rules vr ON vr.field_id = f.id AND vr.audience = _audience
  WHERE f.status = 'active'
    AND (v_internal_audience OR f.is_internal_only = false)
    AND COALESCE(vr.visible, true) = true
    AND (
      f.scope = 'global'
      OR (f.scope = 'tenant' AND (
            (v_dept.tenant_kind = 'direct_24h' AND f.client_lead_id = v_dept.client_lead_id)
            OR (v_dept.tenant_kind = 'wl_partner' AND f.wl_partner_id = v_dept.wl_partner_id)
          ))
      OR (f.scope = 'client' AND (
            (v_dept.tenant_kind = 'direct_24h' AND f.client_lead_id = v_dept.client_lead_id)
            OR (v_dept.tenant_kind = 'wl_partner' AND f.wl_client_id = v_dept.wl_client_id)
          ))
      OR (f.scope = 'department' AND f.client_department_id = _client_department_id)
    )
  ORDER BY f.sort_order, f.display_label;
END;
$function$
;


-- Function: public.resolve_recommendation(p_id uuid, p_reason text)
CREATE OR REPLACE FUNCTION public.resolve_recommendation(p_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS automation_recommendations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$
;


-- Function: public.rollback_script_document(p_document_id uuid, p_version_id uuid)
CREATE OR REPLACE FUNCTION public.rollback_script_document(p_document_id uuid, p_version_id uuid)
 RETURNS campaign_script_documents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_doc public.campaign_script_documents%ROWTYPE;
  v_version_doc uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT can_mutate_script_document(p_document_id) THEN
    RAISE EXCEPTION 'Forbidden: cannot rollback this script document';
  END IF;

  SELECT document_id INTO v_version_doc
    FROM public.campaign_script_document_versions
   WHERE id = p_version_id;

  IF v_version_doc IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF v_version_doc <> p_document_id THEN
    RAISE EXCEPTION 'Version does not belong to this document';
  END IF;

  UPDATE public.campaign_script_documents
     SET current_version_id = p_version_id,
         status = 'published',
         updated_by = auth.uid(),
         updated_at = now()
   WHERE id = p_document_id
   RETURNING * INTO v_doc;

  RETURN v_doc;
END;
$function$
;


-- Function: public.run_go_live_self_test()
CREATE OR REPLACE FUNCTION public.run_go_live_self_test()
 RETURNS TABLE(probe text, passed boolean, detail text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT 'campaigns_table'::text, (SELECT to_regclass('public.campaigns') IS NOT NULL), 'campaigns table present'::text;
  RETURN QUERY SELECT 'campaign_scenarios_table'::text, (SELECT to_regclass('public.campaign_scenarios') IS NOT NULL), 'scenarios table present'::text;
  RETURN QUERY SELECT 'campaign_faqs_table'::text, (SELECT to_regclass('public.campaign_faq_entries') IS NOT NULL), 'faq table present'::text;
  RETURN QUERY SELECT 'campaign_policies_table'::text, (SELECT to_regclass('public.campaign_policy_blocks') IS NOT NULL), 'policies table present'::text;
  RETURN QUERY SELECT 'five9_variable_mappings_table'::text, (SELECT to_regclass('public.five9_variable_mappings') IS NOT NULL), 'five9 mappings present'::text;
  RETURN QUERY SELECT 'publish_versions_table'::text, (SELECT to_regclass('public.campaign_publish_versions') IS NOT NULL), 'publish versions present'::text;
  RETURN QUERY SELECT 'audit_log_table'::text, (SELECT to_regclass('public.campaign_audit_log') IS NOT NULL), 'audit log present'::text;
  RETURN QUERY SELECT 'is_tenant_member_fn'::text, (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_tenant_member')), 'tenant-member helper present'::text;
  RETURN QUERY SELECT 'supervisor_assignments_table'::text, (SELECT to_regclass('public.supervisor_tenant_assignments') IS NOT NULL), 'supervisor assignments present'::text;
  RETURN QUERY SELECT 'training_table'::text, (SELECT to_regclass('public.campaign_training_materials') IS NOT NULL OR to_regclass('public.training_modules') IS NOT NULL), 'training storage present'::text;
  RETURN QUERY SELECT 'go_live_checks_view'::text, (SELECT to_regclass('public.campaign_go_live_checks') IS NOT NULL), 'go-live checks view present'::text;
  RETURN QUERY SELECT 'campaign_rollup_30d_view'::text, (SELECT to_regclass('public.v_campaign_rollup_30d') IS NOT NULL), 'reporting view present'::text;
  RETURN QUERY SELECT 'five9_drift_snapshots_table'::text, (SELECT to_regclass('public.five9_drift_snapshots') IS NOT NULL), 'drift table present with RLS'::text;
END;
$function$
;


-- Function: public.save_campaign_as_template(p_campaign_id uuid, p_name text, p_description text)
CREATE OR REPLACE FUNCTION public.save_campaign_as_template(p_campaign_id uuid, p_name text, p_description text DEFAULT NULL::text)
 RETURNS campaign_templates
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_camp public.campaigns%ROWTYPE;
  v_snapshot jsonb;
  v_template public.campaign_templates%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_camp FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  v_snapshot := jsonb_build_object(
    'campaign', jsonb_build_object('display_name', v_camp.display_name, 'tenant_kind', v_camp.tenant_kind),
    'scenarios', COALESCE((SELECT jsonb_agg(to_jsonb(s) - 'id' - 'campaign_id' - 'created_at' - 'updated_at')
                            FROM public.campaign_scenarios s WHERE s.campaign_id = p_campaign_id), '[]'::jsonb),
    'script_tree', (SELECT d.tree FROM public.campaign_script_documents d WHERE d.campaign_id = p_campaign_id ORDER BY d.created_at DESC LIMIT 1),
    'training_modules', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'title', m.title, 'summary', m.summary, 'body_md', m.body_md,
        'required', m.required, 'sort_order', m.sort_order, 'status', m.status,
        'retraining_interval_days', m.retraining_interval_days,
        'lessons', COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'kind', l.kind, 'title', l.title, 'body_md', l.body_md,
            'sort_order', l.sort_order, 'passing_score', l.passing_score, 'required', l.required,
            'questions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'question', q.question, 'choices', q.choices,
                'correct_index', q.correct_index, 'explanation', q.explanation, 'sort_order', q.sort_order
              )) FROM public.campaign_training_quiz_questions q WHERE q.lesson_id = l.id), '[]'::jsonb)
          )) FROM public.campaign_training_lessons l WHERE l.module_id = m.id), '[]'::jsonb)
      )) FROM public.campaign_training_modules m WHERE m.campaign_id = p_campaign_id), '[]'::jsonb)
  );

  INSERT INTO public.campaign_templates
    (tenant_kind, wl_partner_id, client_lead_id, wl_client_id, source_campaign_id, name, description, snapshot, created_by)
  VALUES
    (v_camp.tenant_kind, v_camp.wl_partner_id, v_camp.client_lead_id, v_camp.wl_client_id,
     p_campaign_id, p_name, p_description, v_snapshot, auth.uid())
  RETURNING * INTO v_template;

  RETURN v_template;
END;
$function$
;


-- Function: public.seed_department_defaults()
CREATE OR REPLACE FUNCTION public.seed_department_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_default record;
  v_group_id uuid;
  v_field jsonb;
  v_faq jsonb;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.campaign_field_groups
    WHERE client_department_id = NEW.id AND scope = 'department'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_default
  FROM public.campaign_department_type_defaults
  WHERE department_type = NEW.department_type;

  IF NOT FOUND THEN RETURN NEW; END IF;

  IF v_default.default_field_group_json ? 'name' THEN
    INSERT INTO public.campaign_field_groups (
      tenant_kind, wl_partner_id, wl_client_id, client_lead_id, client_department_id,
      scope, name, description, sort_order, created_by
    ) VALUES (
      NEW.tenant_kind, NEW.wl_partner_id, NEW.wl_client_id, NEW.client_lead_id, NEW.id,
      'department',
      v_default.default_field_group_json->>'name',
      v_default.default_field_group_json->>'description',
      0, NEW.created_by
    ) RETURNING id INTO v_group_id;

    FOR v_field IN SELECT * FROM jsonb_array_elements(COALESCE(v_default.default_field_group_json->'fields', '[]'::jsonb))
    LOOP
      INSERT INTO public.campaign_fields (
        tenant_kind, wl_partner_id, wl_client_id, client_lead_id, client_department_id,
        scope, field_group_id, field_key, display_label, field_type,
        is_required, sort_order, status, created_by
      ) VALUES (
        NEW.tenant_kind, NEW.wl_partner_id, NEW.wl_client_id, NEW.client_lead_id, NEW.id,
        'department', v_group_id,
        v_field->>'field_key',
        v_field->>'display_label',
        v_field->>'field_type',
        COALESCE((v_field->>'is_required')::boolean, false),
        COALESCE((v_field->>'sort_order')::integer, 0),
        'active',
        NEW.created_by
      );
    END LOOP;
  END IF;

  FOR v_faq IN SELECT * FROM jsonb_array_elements(COALESCE(v_default.default_faqs_json, '[]'::jsonb))
  LOOP
    INSERT INTO public.campaign_faq_entries (
      tenant_kind, wl_partner_id, wl_client_id, client_lead_id, client_department_id,
      scope, question, answer_md, status, created_by
    ) VALUES (
      NEW.tenant_kind, NEW.wl_partner_id, NEW.wl_client_id, NEW.client_lead_id, NEW.id,
      'department',
      v_faq->>'question', v_faq->>'answer_md',
      'draft', NEW.created_by
    );
  END LOOP;

  RETURN NEW;
END;
$function$
;


-- Function: public.seed_qa_state()
CREATE OR REPLACE FUNCTION public.seed_qa_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_caller uuid := auth.uid();
  v_enabled boolean;
  v_label text := 'QA-SEED 2026-05-10';
  v_forecast_id uuid;
  v_snapshot_id uuid;
  v_partner_id uuid;
  v_below_id uuid;
  v_above_id uuid;
  v_impl_id uuid;
  v_offer_eligible_id uuid;
  v_offer_ineligible_id uuid;
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  v_snapshot_label text := v_label || ' period ' || v_period_start::text;
  v_forecast_label text := v_label || ' forecast';
  v_below_note text := v_label || ' below-threshold';
  v_above_note text := v_label || ' above-threshold';
  v_impl_note  text := v_label || ' implemented';
  v_status jsonb := '{}'::jsonb;
  v_existed boolean;
begin
  if v_caller is null or not public.has_role(v_caller, 'admin'::public.app_role) then
    raise exception 'seed_qa_state: admin role required' using errcode = '42501';
  end if;

  select qa_seed_enabled into v_enabled from public.qa_environment_flags where id = true;
  if coalesce(v_enabled, false) = false then
    raise exception 'seed_qa_state: disabled. Toggle qa_environment_flags.qa_seed_enabled to true on staging before running.'
      using errcode = 'P0001';
  end if;

  select id into v_partner_id from public.white_label_partners
   where status = 'active' order by created_at limit 1;
  if v_partner_id is null then
    select id into v_partner_id from public.white_label_partners order by created_at limit 1;
  end if;

  -- below-threshold deal
  select id into v_below_id from public.renewal_expansion_deals where notes = v_below_note limit 1;
  if v_below_id is null then
    insert into public.renewal_expansion_deals
      (scope, target_id, deal_type, stage, status,
       proposed_term_months, estimated_discount_pct, is_non_standard_term, is_exception,
       approval_state, notes, created_by)
    values
      ('partner'::deal_scope, coalesce(v_partner_id, gen_random_uuid()),
       'expansion'::deal_type, 'proposal_sent'::deal_stage, 'open'::deal_status,
       12, 5.0, false, false,
       'not_required'::approval_state, v_below_note, v_caller)
    returning id into v_below_id;
    v_status := v_status || jsonb_build_object('deal_below_threshold', 'inserted');
  else
    v_status := v_status || jsonb_build_object('deal_below_threshold', 'already_present');
  end if;

  -- above-threshold deal
  select id into v_above_id from public.renewal_expansion_deals where notes = v_above_note limit 1;
  if v_above_id is null then
    insert into public.renewal_expansion_deals
      (scope, target_id, deal_type, stage, status,
       proposed_term_months, estimated_discount_pct, is_non_standard_term, is_exception,
       approval_state, notes, created_by)
    values
      ('partner'::deal_scope, coalesce(v_partner_id, gen_random_uuid()),
       'renewal'::deal_type, 'negotiation'::deal_stage, 'open'::deal_status,
       24, 35.0, true, true,
       'pending'::approval_state, v_above_note, v_caller)
    returning id into v_above_id;
    v_status := v_status || jsonb_build_object('deal_above_threshold', 'inserted');
  else
    v_status := v_status || jsonb_build_object('deal_above_threshold', 'already_present');
  end if;

  -- implemented deal
  select id into v_impl_id from public.renewal_expansion_deals where notes = v_impl_note limit 1;
  if v_impl_id is null then
    insert into public.renewal_expansion_deals
      (scope, target_id, deal_type, stage, status,
       proposed_term_months, implemented_at,
       approval_state, notes, created_by)
    values
      ('partner'::deal_scope, coalesce(v_partner_id, gen_random_uuid()),
       'renewal'::deal_type, 'implemented'::deal_stage, 'won'::deal_status,
       12, now(),
       'not_required'::approval_state, v_impl_note, v_caller)
    returning id into v_impl_id;
    v_status := v_status || jsonb_build_object('deal_implemented', 'inserted');
  else
    v_status := v_status || jsonb_build_object('deal_implemented', 'already_present');
  end if;

  -- forecast snapshot
  select id into v_forecast_id from public.forecast_snapshots where label = v_forecast_label limit 1;
  if v_forecast_id is null then
    insert into public.forecast_snapshots
      (label, notes, horizon_start, horizon_end, parameters, payload, parameters_hash,
       created_by, source)
    values
      (v_forecast_label, v_label, v_period_start, v_period_end + interval '5 months',
       jsonb_build_object('seed', true, 'label', v_label),
       jsonb_build_object('seed', true, 'mrr_baseline', 50000, 'expansions', 5000, 'churn_risk', 2500),
       md5(v_label || now()::text),
       v_caller, 'qa_seed')
    returning id into v_forecast_id;
    v_status := v_status || jsonb_build_object('forecast_snapshot', 'inserted');
  else
    v_status := v_status || jsonb_build_object('forecast_snapshot', 'already_present');
  end if;

  -- revops period snapshot (idempotent on label)
  select id into v_snapshot_id from public.revops_period_snapshots where label = v_snapshot_label limit 1;
  if v_snapshot_id is null then
    insert into public.revops_period_snapshots
      (period_start_date, period_end_date, label, captured_by,
       linked_forecast_snapshot_id, notes, extras)
    values
      (v_period_start, v_period_end, v_snapshot_label,
       v_caller, v_forecast_id, v_label,
       jsonb_build_object('seed', true,
         'direct_clients', jsonb_build_array(
           jsonb_build_object('label','Healthy direct client (seed)','status','healthy'),
           jsonb_build_object('label','At-risk renewal-window client (seed)','status','at_risk')),
         'wl_partners', jsonb_build_array(
           jsonb_build_object('label','Healthy WL portfolio (seed)','status','healthy'),
           jsonb_build_object('label','At-risk WL portfolio (seed)','status','at_risk'))))
    on conflict (label) do update set notes = excluded.notes
    returning id into v_snapshot_id;
    v_status := v_status || jsonb_build_object('revops_period_snapshot', 'inserted');
  else
    v_status := v_status || jsonb_build_object('revops_period_snapshot', 'already_present');
  end if;

  -- eligible offer
  select (id is not null) into v_existed from public.offers where key = 'qa_seed_signup_eligible';
  insert into public.offers
    (key, label, surface, audience, plan_key,
     is_baseline, active, eligibility, metadata, created_by)
  values
    ('qa_seed_signup_eligible', v_label || ' eligible signup offer',
     'signup', 'all', 'qa_seed_plan_starter',
     true, true, '{}'::jsonb,
     jsonb_build_object('qa_seed', v_label, 'intent', 'eligible'),
     v_caller)
  on conflict (key) do update set
    label = excluded.label, surface = excluded.surface, audience = excluded.audience,
    plan_key = excluded.plan_key, is_baseline = excluded.is_baseline,
    active = excluded.active, eligibility = excluded.eligibility,
    metadata = excluded.metadata, updated_at = now()
  returning id into v_offer_eligible_id;
  v_status := v_status || jsonb_build_object('offer_eligible', case when coalesce(v_existed,false) then 'already_present' else 'inserted' end);

  -- ineligible offer
  select (id is not null) into v_existed from public.offers where key = 'qa_seed_signup_ineligible';
  insert into public.offers
    (key, label, surface, audience, plan_key,
     is_baseline, active, eligibility, metadata, created_by)
  values
    ('qa_seed_signup_ineligible', v_label || ' ineligible signup offer',
     'signup', 'wl_end_client', 'qa_seed_plan_starter',
     false, true,
     jsonb_build_object('min_tenure_days', 36500),
     jsonb_build_object('qa_seed', v_label, 'intent', 'ineligible'),
     v_caller)
  on conflict (key) do update set
    label = excluded.label, surface = excluded.surface, audience = excluded.audience,
    plan_key = excluded.plan_key, is_baseline = excluded.is_baseline,
    active = excluded.active, eligibility = excluded.eligibility,
    metadata = excluded.metadata, updated_at = now()
  returning id into v_offer_ineligible_id;
  v_status := v_status || jsonb_build_object('offer_ineligible', case when coalesce(v_existed,false) then 'already_present' else 'inserted' end);

  return jsonb_build_object(
    'ok', true,
    'label', v_label,
    'status', v_status,
    'deal_below_threshold_id', v_below_id,
    'deal_above_threshold_id', v_above_id,
    'deal_implemented_id', v_impl_id,
    'forecast_snapshot_id', v_forecast_id,
    'revops_period_snapshot_id', v_snapshot_id,
    'offer_eligible_id', v_offer_eligible_id,
    'offer_ineligible_id', v_offer_ineligible_id,
    'partner_used', v_partner_id
  );
end;
$function$
;


-- Function: public.seed_resend_kb_articles(p_partner_id uuid)
CREATE OR REPLACE FUNCTION public.seed_resend_kb_articles(p_partner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.wl_knowledge_base (partner_id, title, content, category, tags, content_type, audience, sort_order)
  VALUES
  (p_partner_id, 'Resend Email Integration Overview', '', 'integrations', ARRAY['resend'], 'feature', 'client', 1)
  ON CONFLICT DO NOTHING;
  -- Function body unchanged, just setting search_path
END;
$function$
;


-- Function: public.set_intake_number()
CREATE OR REPLACE FUNCTION public.set_intake_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_suffix text;
  v_attempts int := 0;
  v_exists boolean;
BEGIN
  IF NEW.intake_number IS NOT NULL AND length(trim(NEW.intake_number)) > 0 THEN
    RETURN NEW;
  END IF;
  LOOP
    v_attempts := v_attempts + 1;
    v_suffix := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    NEW.intake_number := 'INT-' || to_char(now(), 'YYYYMM') || '-' || v_suffix;
    SELECT EXISTS (
      SELECT 1 FROM public.internal_fulfillment_intakes
      WHERE intake_number = NEW.intake_number
    ) INTO v_exists;
    EXIT WHEN NOT v_exists OR v_attempts >= 5;
  END LOOP;
  RETURN NEW;
END;
$function$
;


-- Function: public.set_intake_status(_intake_id uuid, _new_status text, _note text)
CREATE OR REPLACE FUNCTION public.set_intake_status(_intake_id uuid, _new_status text, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _row public.internal_fulfillment_intakes%ROWTYPE;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT (public.has_role(_actor, 'admin'::app_role) OR public.has_role(_actor, 'supervisor'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _new_status NOT IN ('new_submission','received','under_review','needs_partner_update','approved','activation_in_progress','activated','closed') THEN
    RAISE EXCEPTION 'invalid status %', _new_status;
  END IF;

  SELECT * INTO _row FROM public.internal_fulfillment_intakes WHERE id = _intake_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'intake not found'; END IF;

  UPDATE public.internal_fulfillment_intakes SET status = _new_status, updated_at = now() WHERE id = _intake_id;

  IF _note IS NOT NULL AND length(trim(_note)) > 0 THEN
    INSERT INTO public.internal_fulfillment_notes(intake_id, author_id, body, is_internal)
    VALUES (_intake_id, _actor, _note, true);
  END IF;

  RETURN jsonb_build_object('intake_id', _intake_id, 'from', _row.status, 'to', _new_status);
END;
$function$
;


-- Function: public.set_receptionist_enabled(_config_id uuid, _enabled boolean, _reason text)
CREATE OR REPLACE FUNCTION public.set_receptionist_enabled(_config_id uuid, _enabled boolean, _reason text DEFAULT NULL::text)
 RETURNS call_flow_receptionist_configs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE row public.call_flow_receptionist_configs;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.call_flow_receptionist_configs
     SET enabled = _enabled,
         last_validated_at = CASE WHEN _enabled THEN now() ELSE last_validated_at END
   WHERE id = _config_id
   RETURNING * INTO row;

  IF row.id IS NULL THEN RAISE EXCEPTION 'config not found'; END IF;

  PERFORM public.log_audit_event(
    CASE WHEN _enabled THEN 'voice.receptionist.go_live' ELSE 'voice.receptionist.taken_offline' END,
    'call_flow_receptionist_configs', row.id::text,
    jsonb_build_object('client_department_id', row.client_department_id),
    jsonb_build_object('reason', _reason)
  );
  RETURN row;
END $function$
;


-- Function: public.set_signoff_expiry()
CREATE OR REPLACE FUNCTION public.set_signoff_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_days int;
BEGIN
  SELECT retraining_interval_days INTO v_days
    FROM public.campaign_training_modules
   WHERE id = NEW.module_id;
  IF v_days IS NOT NULL AND v_days > 0 THEN
    NEW.expires_at := COALESCE(NEW.signed_off_at, now()) + (v_days || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.set_wl_client_default_modules()
CREATE OR REPLACE FUNCTION public.set_wl_client_default_modules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_defaults jsonb;
BEGIN
  IF NEW.enabled_modules IS NULL THEN
    SELECT default_enabled_modules INTO v_defaults
    FROM public.white_label_partners
    WHERE id = NEW.partner_id;

    NEW.enabled_modules := COALESCE(
      v_defaults,
      '["dashboard","calls","scripts","schedule","billing","support","settings","outbound-requests"]'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.set_wl_partner_proposal_number()
CREATE OR REPLACE FUNCTION public.set_wl_partner_proposal_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_suffix text;
  v_attempts int := 0;
  v_exists boolean;
BEGIN
  IF NEW.proposal_number IS NOT NULL AND length(trim(NEW.proposal_number)) > 0 THEN
    RETURN NEW;
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    -- 6-char uppercase base36-ish suffix from random bytes
    v_suffix := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    NEW.proposal_number := 'WL-' || to_char(now(), 'YYYYMM') || '-' || v_suffix;

    SELECT EXISTS (
      SELECT 1 FROM public.wl_partner_proposals
      WHERE partner_id = NEW.partner_id
        AND proposal_number = NEW.proposal_number
    ) INTO v_exists;

    EXIT WHEN NOT v_exists OR v_attempts >= 5;
  END LOOP;

  RETURN NEW;
END;
$function$
;


-- Function: public.submit_fulfillment_intake(p_handoff_id uuid)
CREATE OR REPLACE FUNCTION public.submit_fulfillment_intake(p_handoff_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_handoff record;
  v_partner record;
  v_proposal record;
  v_lead record;
  v_missing int;
  v_items jsonb;
  v_docs jsonb;
  v_snapshot jsonb;
  v_intake_id uuid;
  v_existing_intake record;
  v_new_version int;
  v_event text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_handoff
  FROM public.wl_partner_onboarding_handoffs WHERE id = p_handoff_id;
  IF v_handoff.id IS NULL THEN
    RAISE EXCEPTION 'Handoff not found';
  END IF;

  SELECT * INTO v_partner FROM public.white_label_partners WHERE id = v_handoff.partner_id;
  IF v_partner.user_id IS DISTINCT FROM v_user AND NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'Not authorized for this handoff';
  END IF;

  SELECT count(*) INTO v_missing
  FROM public.wl_partner_handoff_items
  WHERE handoff_id = p_handoff_id AND is_required = true AND status <> 'provided';
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'MISSING_REQUIRED_ITEMS: % required item(s) not provided', v_missing
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_proposal FROM public.wl_partner_proposals WHERE id = v_handoff.proposal_id;
  IF v_handoff.lead_id IS NOT NULL THEN
    SELECT * INTO v_lead FROM public.wl_partner_leads WHERE id = v_handoff.lead_id;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'item_key', item_key,
    'label', label,
    'item_type', item_type,
    'is_required', is_required,
    'value_json', value_json,
    'status', status,
    'notes', notes
  ) ORDER BY sort_order, item_key), '[]'::jsonb) INTO v_items
  FROM public.wl_partner_handoff_items WHERE handoff_id = p_handoff_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'document_type', document_type,
    'file_name', file_name,
    'file_size', file_size,
    'mime_type', mime_type,
    'file_path', file_path
  )), '[]'::jsonb) INTO v_docs
  FROM public.wl_partner_handoff_documents
  WHERE handoff_id = p_handoff_id AND status = 'active';

  v_snapshot := jsonb_build_object(
    'partner', jsonb_build_object('id', v_partner.id, 'display_name', COALESCE(v_partner.company_name, 'Partner')),
    'proposal', jsonb_build_object(
      'id', v_proposal.id,
      'number', v_proposal.proposal_number,
      'title', v_proposal.title,
      'offering_name', v_proposal.offering_name,
      'scope_summary', v_proposal.scope_summary,
      'amount', v_proposal.amount,
      'currency', v_proposal.currency,
      'accepted_at', v_proposal.accepted_at,
      'accepted_by_name', v_proposal.accepted_by_name
    ),
    'client', jsonb_build_object(
      'name', COALESCE(v_handoff.client_name_snapshot, v_lead.name),
      'email', COALESCE(v_handoff.client_email_snapshot, v_lead.email),
      'company', COALESCE(v_handoff.company_snapshot, v_lead.company)
    ),
    'checklist_template', COALESCE(v_proposal.checklist_template, 'standard'),
    'items', v_items,
    'documents', v_docs,
    'submitted_at', now(),
    'source_handoff_status', v_handoff.status
  );

  SELECT * INTO v_existing_intake
  FROM public.internal_fulfillment_intakes WHERE id = v_handoff.current_intake_id;

  IF v_existing_intake.id IS NOT NULL THEN
    v_new_version := v_existing_intake.snapshot_version + 1;
    UPDATE public.internal_fulfillment_intakes
      SET snapshot_json = v_snapshot,
          snapshot_version = v_new_version,
          status = 'under_review',
          updated_at = now()
      WHERE id = v_existing_intake.id;
    v_intake_id := v_existing_intake.id;

    DELETE FROM public.internal_fulfillment_intake_documents WHERE intake_id = v_intake_id;
    INSERT INTO public.internal_fulfillment_intake_documents
      (intake_id, partner_id, source_document_id, document_type, file_path, file_name, file_size, mime_type)
    SELECT v_intake_id, partner_id, id, document_type, file_path, file_name, file_size, mime_type
    FROM public.wl_partner_handoff_documents WHERE handoff_id = p_handoff_id AND status = 'active';

    UPDATE public.wl_partner_onboarding_handoffs
      SET submission_status = 'resubmitted',
          last_resubmitted_at = now(),
          updated_at = now()
      WHERE id = p_handoff_id;

    INSERT INTO public.internal_fulfillment_activity (intake_id, partner_id, event_type, actor_type, actor_user_id, meta_json)
    VALUES (v_intake_id, v_handoff.partner_id, 'resubmitted', 'partner', v_user, jsonb_build_object('snapshot_version', v_new_version));
  ELSE
    INSERT INTO public.internal_fulfillment_intakes
      (partner_id, source_handoff_id, proposal_id, lead_id, status, submitted_by, snapshot_json, snapshot_version)
    VALUES
      (v_handoff.partner_id, p_handoff_id, v_handoff.proposal_id, v_handoff.lead_id,
       'new_submission', v_user, v_snapshot, 1)
    RETURNING id INTO v_intake_id;

    INSERT INTO public.internal_fulfillment_intake_documents
      (intake_id, partner_id, source_document_id, document_type, file_path, file_name, file_size, mime_type)
    SELECT v_intake_id, partner_id, id, document_type, file_path, file_name, file_size, mime_type
    FROM public.wl_partner_handoff_documents WHERE handoff_id = p_handoff_id AND status = 'active';

    UPDATE public.wl_partner_onboarding_handoffs
      SET submission_status = 'submitted_to_fulfillment',
          submitted_at = now(),
          current_intake_id = v_intake_id,
          updated_at = now()
      WHERE id = p_handoff_id;

    INSERT INTO public.internal_fulfillment_activity (intake_id, partner_id, event_type, actor_type, actor_user_id, meta_json)
    VALUES (v_intake_id, v_handoff.partner_id, 'submitted', 'partner', v_user, '{}'::jsonb);
  END IF;

  RETURN v_intake_id;
END;
$function$
;


-- Function: public.supervisor_can_access_tenant(_user uuid, _tenant_kind text, _wl_partner_id uuid, _client_lead_id uuid, _wl_client_id uuid)
CREATE OR REPLACE FUNCTION public.supervisor_can_access_tenant(_user uuid, _tenant_kind text, _wl_partner_id uuid, _client_lead_id uuid, _wl_client_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.supervisor_tenant_assignments a
    WHERE a.supervisor_user_id = _user
      AND (
        -- direct client match
        (_tenant_kind = 'direct_24h'
         AND _client_lead_id IS NOT NULL
         AND a.client_lead_id = _client_lead_id)
        OR
        -- WL end-client direct match (most specific WL grant)
        (_tenant_kind = 'wl_partner'
         AND _wl_client_id IS NOT NULL
         AND a.wl_client_id = _wl_client_id)
        OR
        -- WL partner-wide match (covers all clients under the partner)
        (_tenant_kind = 'wl_partner'
         AND _wl_partner_id IS NOT NULL
         AND a.wl_partner_id = _wl_partner_id
         AND a.wl_client_id IS NULL)
      )
  );
$function$
;


-- Function: public.supervisor_can_update_intake(_old_status text, _new_status text, _old_priority text, _new_priority text, _old_assigned uuid, _new_assigned uuid)
CREATE OR REPLACE FUNCTION public.supervisor_can_update_intake(_old_status text, _new_status text, _old_priority text, _new_priority text, _old_assigned uuid, _new_assigned uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Supervisors cannot close intakes
  IF _new_status = 'closed' THEN RETURN false; END IF;
  -- Supervisors cannot set urgent priority
  IF _new_priority = 'urgent' AND _old_priority IS DISTINCT FROM 'urgent' THEN RETURN false; END IF;
  -- Supervisors cannot change assignee
  IF _old_assigned IS DISTINCT FROM _new_assigned THEN RETURN false; END IF;
  RETURN true;
END;
$function$
;


-- Function: public.sync_partner_status_from_intake(p_intake_id uuid, p_new_intake_status text)
CREATE OR REPLACE FUNCTION public.sync_partner_status_from_intake(p_intake_id uuid, p_new_intake_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_handoff_id uuid;
  v_new_partner_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT source_handoff_id INTO v_handoff_id
  FROM public.internal_fulfillment_intakes WHERE id = p_intake_id;
  IF v_handoff_id IS NULL THEN
    RETURN;
  END IF;
  v_new_partner_status := CASE p_new_intake_status
    WHEN 'needs_partner_update' THEN 'needs_more_info'
    WHEN 'approved' THEN 'approved_for_activation'
    WHEN 'activation_in_progress' THEN 'activation_in_progress'
    WHEN 'activated' THEN 'activated'
    WHEN 'closed' THEN 'activated'
    ELSE NULL
  END;
  IF v_new_partner_status IS NOT NULL THEN
    UPDATE public.wl_partner_onboarding_handoffs
      SET submission_status = v_new_partner_status, updated_at = now()
      WHERE id = v_handoff_id;
  END IF;
END;
$function$
;


-- Function: public.tg_wizard_sessions_set_updated_at()
CREATE OR REPLACE FUNCTION public.tg_wizard_sessions_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$function$
;


-- Function: public.touch_updated_at_autorec()
CREATE OR REPLACE FUNCTION public.touch_updated_at_autorec()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;


-- Function: public.transition_deal_stage(p_deal_id uuid, p_new_stage deal_stage, p_outcome_reason text)
CREATE OR REPLACE FUNCTION public.transition_deal_stage(p_deal_id uuid, p_new_stage deal_stage, p_outcome_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deal renewal_expansion_deals%ROWTYPE;
  v_new_status deal_status;
  v_implemented_at timestamptz;
  v_gated_stages text[] := ARRAY['proposal_sent','verbally_approved','closed_won','implemented'];
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  SELECT * INTO v_deal FROM renewal_expansion_deals WHERE id = p_deal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal % not found', p_deal_id; END IF;

  -- Approval gate
  IF p_new_stage::text = ANY(v_gated_stages)
     AND v_deal.approval_state NOT IN ('approved','not_required') THEN
    RAISE EXCEPTION 'Deal % cannot move to % — approval_state is % (admin approval required)',
      p_deal_id, p_new_stage, v_deal.approval_state;
  END IF;

  v_new_status := CASE p_new_stage
    WHEN 'closed_won' THEN 'won'::deal_status
    WHEN 'implemented' THEN 'won'::deal_status
    WHEN 'closed_lost' THEN 'lost'::deal_status
    WHEN 'deferred' THEN 'deferred'::deal_status
    ELSE 'open'::deal_status
  END;

  v_implemented_at := CASE WHEN p_new_stage = 'implemented' THEN now() ELSE v_deal.implemented_at END;

  UPDATE renewal_expansion_deals
     SET stage = p_new_stage,
         status = v_new_status,
         outcome_reason = COALESCE(p_outcome_reason, outcome_reason),
         implemented_at = v_implemented_at,
         stage_changed_at = now()
   WHERE id = p_deal_id;

  RETURN true;
END $function$
;


-- Function: public.trg_affiliate_referrals_link()
CREATE OR REPLACE FUNCTION public.trg_affiliate_referrals_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.lead_id IS NOT NULL AND OLD.lead_id IS NULL THEN
    IF NEW.converted_at IS NULL THEN NEW.converted_at := now(); END IF;
    PERFORM public.emit_dashboard_event('revenue.referral.linked',
      'affiliate', 'sales', NEW.id::text, NULL,
      jsonb_build_object('affiliate_id', NEW.affiliate_id, 'lead_id', NEW.lead_id));
  END IF;
  RETURN NEW;
END; $function$
;


-- Function: public.trg_blog_posts_emit_published()
CREATE OR REPLACE FUNCTION public.trg_blog_posts_emit_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'published' AND COALESCE(OLD.status,'') <> 'published' THEN
    INSERT INTO public.dashboard_events (event_type, surface, actor_user_id, payload)
    VALUES ('growth.content.published', 'admin.blog', auth.uid(),
            jsonb_build_object('post_id', NEW.id, 'slug', NEW.slug, 'title', NEW.title));
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
    INSERT INTO public.dashboard_events (event_type, surface, actor_user_id, payload)
    VALUES ('growth.content.published', 'admin.blog', auth.uid(),
            jsonb_build_object('post_id', NEW.id, 'slug', NEW.slug, 'title', NEW.title));
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.trg_campaigns_emit_created()
CREATE OR REPLACE FUNCTION public.trg_campaigns_emit_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.emit_dashboard_event('delivery.campaign.created',
    CASE WHEN NEW.tenant_kind::text = 'wl_partner' THEN 'wl' ELSE 'admin' END,
    'fulfillment', NEW.id::text, NEW.created_by,
    jsonb_build_object('tenant_kind', NEW.tenant_kind, 'wl_partner_id', NEW.wl_partner_id,
                       'wl_client_id', NEW.wl_client_id, 'client_lead_id', NEW.client_lead_id,
                       'status', NEW.status));
  RETURN NEW;
END; $function$
;


-- Function: public.trg_campaigns_emit_status()
CREATE OR REPLACE FUNCTION public.trg_campaigns_emit_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.emit_dashboard_event(
      'delivery.campaign.status_changed',
      CASE WHEN NEW.tenant_kind::text = 'wl_partner' THEN 'wl' ELSE 'admin' END,
      'fulfillment', NEW.id::text, auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status,
                         'tenant_kind', NEW.tenant_kind,
                         'wl_partner_id', NEW.wl_partner_id,
                         'wl_client_id', NEW.wl_client_id,
                         'client_lead_id', NEW.client_lead_id));
    INSERT INTO public.audit_log(actor_id, action, target_table, target_id, metadata)
    VALUES (auth.uid(), 'campaign.status.changed', 'campaigns', NEW.id::text,
            jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.trg_campaigns_go_live_check()
CREATE OR REPLACE FUNCTION public.trg_campaigns_go_live_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.check_go_live_regression(COALESCE(NEW.id, OLD.id));
  RETURN COALESCE(NEW, OLD);
END;
$function$
;


-- Function: public.trg_faq_go_live_check()
CREATE OR REPLACE FUNCTION public.trg_faq_go_live_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row record := COALESCE(NEW, OLD);
  v_campaign_id uuid;
BEGIN
  IF v_row.scope = 'department' AND v_row.client_department_id IS NOT NULL THEN
    SELECT id INTO v_campaign_id
      FROM public.campaigns
     WHERE client_department_id = v_row.client_department_id;
    IF v_campaign_id IS NOT NULL THEN
      PERFORM public.check_go_live_regression(v_campaign_id);
    END IF;
  ELSE
    -- Global/tenant scope: re-check all campaigns in the same tenant.
    FOR v_campaign_id IN
      SELECT id FROM public.campaigns
       WHERE tenant_kind = v_row.tenant_kind
         AND COALESCE(wl_partner_id::text, '') = COALESCE(v_row.wl_partner_id::text, '')
         AND COALESCE(client_lead_id::text, '') = COALESCE(v_row.client_lead_id::text, '')
         AND COALESCE(wl_client_id::text, '')   = COALESCE(v_row.wl_client_id::text, '')
    LOOP
      PERFORM public.check_go_live_regression(v_campaign_id);
    END LOOP;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;


-- Function: public.trg_handoff_emit_status()
CREATE OR REPLACE FUNCTION public.trg_handoff_emit_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_dashboard_event(
      'delivery.handoff.created', 'admin', 'fulfillment',
      NEW.id::text, NEW.created_by,
      jsonb_build_object('lead_id', NEW.client_lead_id, 'status', NEW.status,
                         'template', NEW.checklist_template));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.emit_dashboard_event(
      'delivery.handoff.status_changed', 'admin', 'fulfillment',
      NEW.id::text, auth.uid(),
      jsonb_build_object('lead_id', NEW.client_lead_id, 'from', OLD.status, 'to', NEW.status));
    INSERT INTO public.audit_log(actor_id, action, target_table, target_id, metadata)
    VALUES (auth.uid(), 'handoff.status.changed', 'client_onboarding_handoffs', NEW.id::text,
            jsonb_build_object('from', OLD.status, 'to', NEW.status, 'lead_id', NEW.client_lead_id));
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.trg_intake_emit_created()
CREATE OR REPLACE FUNCTION public.trg_intake_emit_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.emit_dashboard_event('delivery.intake.created', NEW.source, 'fulfillment',
    NEW.id::text, NEW.submitted_by,
    jsonb_build_object('intake_number', NEW.intake_number, 'lead_id', NEW.client_lead_id,
                       'partner_id', NEW.partner_id, 'status', NEW.status));
  RETURN NEW;
END; $function$
;


-- Function: public.trg_intake_emit_status_after()
CREATE OR REPLACE FUNCTION public.trg_intake_emit_status_after()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.emit_dashboard_event(
      'delivery.intake.status_changed', NEW.source, 'fulfillment',
      NEW.id::text, auth.uid(),
      jsonb_build_object('intake_number', NEW.intake_number, 'from', OLD.status, 'to', NEW.status,
                         'lead_id', NEW.client_lead_id, 'partner_id', NEW.partner_id));
    INSERT INTO public.audit_log(actor_id, action, target_table, target_id, metadata)
    VALUES (auth.uid(), 'intake.status.changed', 'internal_fulfillment_intakes', NEW.id::text,
            jsonb_build_object('from', OLD.status, 'to', NEW.status, 'intake_number', NEW.intake_number));
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.trg_intake_emit_status_change()
CREATE OR REPLACE FUNCTION public.trg_intake_emit_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- auto-stamp lifecycle timestamps
    IF NEW.status = 'received' AND NEW.received_at IS NULL THEN NEW.received_at := now(); END IF;
    IF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN NEW.approved_at := now(); END IF;
    IF NEW.status IN ('activation_in_progress','activated') AND NEW.activated_at IS NULL THEN
      IF NEW.status = 'activated' THEN NEW.activated_at := now(); END IF;
    END IF;
    IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.trg_lead_conversions_emit()
CREATE OR REPLACE FUNCTION public.trg_lead_conversions_emit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _lead_source text;
BEGIN
  SELECT source INTO _lead_source FROM public.leads WHERE id = NEW.lead_id;
  PERFORM public.emit_dashboard_event('lead.converted', 'crm', 'sales',
    NEW.lead_id::text, NEW.converted_by,
    jsonb_build_object('source', _lead_source, 'metadata', NEW.metadata));
  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, metadata)
  VALUES (NEW.converted_by, 'lead.converted', 'leads', NEW.lead_id::text, COALESCE(NEW.metadata, '{}'::jsonb));
  RETURN NEW;
END; $function$
;


-- Function: public.trg_leads_emit_capture_event()
CREATE OR REPLACE FUNCTION public.trg_leads_emit_capture_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.emit_dashboard_event(
    'lead.captured', COALESCE(NEW.source, 'unknown'), 'lead', NEW.id::text, NEW.user_id,
    jsonb_build_object('pipeline_stage', NEW.pipeline_stage, 'service_type', NEW.service_type,
                       'company', NEW.company, 'country', NEW.country)
  );
  RETURN NEW;
END; $function$
;


-- Function: public.trg_leads_emit_stage_change()
CREATE OR REPLACE FUNCTION public.trg_leads_emit_stage_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    PERFORM public.emit_dashboard_event('lead.stage.changed', COALESCE(NEW.source,'crm'), 'sales',
      NEW.id::text, auth.uid(),
      jsonb_build_object('from', OLD.pipeline_stage, 'to', NEW.pipeline_stage));
    INSERT INTO public.audit_log (actor_id, action, target_table, target_id, metadata)
    VALUES (auth.uid(), 'lead.stage.changed', 'leads', NEW.id::text,
            jsonb_build_object('from', OLD.pipeline_stage, 'to', NEW.pipeline_stage));
  END IF;
  RETURN NEW;
END; $function$
;


-- Function: public.trg_leads_stamp_stage_dates()
CREATE OR REPLACE FUNCTION public.trg_leads_stamp_stage_dates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    IF NEW.pipeline_stage = 'qualified' AND NEW.qualified_at IS NULL THEN
      NEW.qualified_at := now();
    ELSIF NEW.pipeline_stage = 'won' AND NEW.won_at IS NULL THEN
      NEW.won_at := now();
    ELSIF NEW.pipeline_stage = 'lost' AND NEW.lost_at IS NULL THEN
      NEW.lost_at := now();
    END IF;
  END IF;
  RETURN NEW;
END; $function$
;


-- Function: public.trg_meetings_emit()
CREATE OR REPLACE FUNCTION public.trg_meetings_emit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_dashboard_event('revenue.meeting.scheduled',
      COALESCE(NEW.event_type,'meeting'), 'sales', NEW.id::text, auth.uid(),
      jsonb_build_object('lead_id', NEW.lead_id, 'scheduled_at', NEW.scheduled_at, 'status', NEW.status));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.emit_dashboard_event('revenue.meeting.' || NEW.status,
      COALESCE(NEW.event_type,'meeting'), 'sales', NEW.id::text, auth.uid(),
      jsonb_build_object('lead_id', NEW.lead_id, 'from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END; $function$
;


-- Function: public.trg_recep_cfg_emit()
CREATE OR REPLACE FUNCTION public.trg_recep_cfg_emit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE evt text;
BEGIN
  IF TG_OP = 'INSERT' THEN evt := 'voice.receptionist.configured';
  ELSIF TG_OP = 'UPDATE' AND OLD.enabled IS DISTINCT FROM NEW.enabled THEN
    evt := CASE WHEN NEW.enabled THEN 'voice.receptionist.enabled' ELSE 'voice.receptionist.disabled' END;
  ELSE evt := 'voice.receptionist.updated';
  END IF;

  PERFORM public.emit_dashboard_event(
    evt, 'admin', 'admin', 'call_flow', NULL,
    jsonb_build_object(
      'client_department_id', NEW.client_department_id,
      'mode', NEW.mode,
      'enabled', NEW.enabled
    )
  );
  PERFORM public.log_audit_event(
    evt, 'call_flow_receptionist_configs', NEW.id::text,
    jsonb_build_object('tenant_kind', NEW.tenant_kind, 'wl_partner_id', NEW.wl_partner_id, 'client_lead_id', NEW.client_lead_id, 'wl_client_id', NEW.wl_client_id),
    jsonb_build_object('mode', NEW.mode, 'after_hours', NEW.after_hours, 'escalation', NEW.escalation, 'enabled', NEW.enabled)
  );
  RETURN NEW;
END $function$
;


-- Function: public.trg_recep_cfg_mirror_tenant()
CREATE OR REPLACE FUNCTION public.trg_recep_cfg_mirror_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE d public.client_departments;
BEGIN
  SELECT * INTO d FROM public.client_departments WHERE id = NEW.client_department_id;
  IF d.id IS NULL THEN RAISE EXCEPTION 'unknown call flow %', NEW.client_department_id; END IF;
  NEW.tenant_kind := d.tenant_kind;
  NEW.wl_partner_id := d.wl_partner_id;
  NEW.client_lead_id := d.client_lead_id;
  NEW.wl_client_id := d.wl_client_id;
  NEW.updated_at := now();
  RETURN NEW;
END $function$
;


-- Function: public.trg_sales_proposals_emit()
CREATE OR REPLACE FUNCTION public.trg_sales_proposals_emit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _event text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _event := 'revenue.proposal.created';
    PERFORM public.emit_dashboard_event(_event, 'sales', 'sales',
      NEW.id::text, NEW.created_by,
      jsonb_build_object('lead_id', NEW.lead_id, 'status', NEW.status, 'monthly_price', NEW.monthly_price));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _event := 'revenue.proposal.' || NEW.status;
    IF NEW.status IN ('accepted','declined','expired') AND NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
    PERFORM public.emit_dashboard_event(_event, 'sales', 'sales',
      NEW.id::text, auth.uid(),
      jsonb_build_object('lead_id', NEW.lead_id, 'from', OLD.status, 'to', NEW.status));
    INSERT INTO public.audit_log(actor_id, action, target_table, target_id, metadata)
    VALUES (auth.uid(), 'proposal.status.changed', 'sales_proposals', NEW.id::text,
            jsonb_build_object('from', OLD.status, 'to', NEW.status, 'lead_id', NEW.lead_id));
  END IF;
  RETURN NEW;
END; $function$
;


-- Function: public.trg_script_doc_go_live_check()
CREATE OR REPLACE FUNCTION public.trg_script_doc_go_live_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row record := COALESCE(NEW, OLD);
BEGIN
  IF v_row.campaign_id IS NOT NULL THEN
    PERFORM public.check_go_live_regression(v_row.campaign_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;


-- Function: public.trg_training_go_live_check()
CREATE OR REPLACE FUNCTION public.trg_training_go_live_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row record := COALESCE(NEW, OLD);
BEGIN
  IF v_row.campaign_id IS NOT NULL THEN
    PERFORM public.check_go_live_regression(v_row.campaign_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;


-- Function: public.trg_wl_clients_emit_lifecycle_fn()
CREATE OR REPLACE FUNCTION public.trg_wl_clients_emit_lifecycle_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'wl.client.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event := CASE NEW.status
      WHEN 'active' THEN 'wl.client.activated'
      WHEN 'suspended' THEN 'wl.client.suspended'
      WHEN 'churned' THEN 'wl.client.churned'
      ELSE 'wl.client.status_changed'
    END;
  ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id AND NEW.user_id IS NOT NULL THEN
    v_event := 'wl.client.portal_provisioned';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.emit_dashboard_event(
    v_event, 'white_label', 'wl_client', NEW.id::text, NEW.user_id,
    jsonb_build_object('partner_id', NEW.partner_id, 'plan', NEW.plan, 'status', NEW.status, 'slug', NEW.client_portal_slug)
  );

  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, tenant_context, metadata)
  VALUES (auth.uid(), v_event, 'white_label_clients', NEW.id::text,
          jsonb_build_object('partner_id', NEW.partner_id),
          jsonb_build_object('status', NEW.status, 'slug', NEW.client_portal_slug));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $function$
;


-- Function: public.trg_wl_partners_emit_lifecycle_fn()
CREATE OR REPLACE FUNCTION public.trg_wl_partners_emit_lifecycle_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'wl.partner.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event := CASE NEW.status
      WHEN 'active' THEN 'wl.partner.activated'
      WHEN 'suspended' THEN 'wl.partner.suspended'
      ELSE 'wl.partner.status_changed'
    END;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.emit_dashboard_event(
    v_event, 'white_label', 'wl_partner', NEW.id::text, NEW.user_id,
    jsonb_build_object('partner_slug', NEW.partner_slug, 'status', NEW.status, 'tier', NEW.tier)
  );

  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), v_event, 'white_label_partners', NEW.id::text,
          jsonb_build_object('partner_slug', NEW.partner_slug, 'status', NEW.status));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $function$
;


-- Function: public.trigger_seed_resend_kb()
CREATE OR REPLACE FUNCTION public.trigger_seed_resend_kb()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.seed_resend_kb_articles(NEW.id);
  RETURN NEW;
END;
$function$
;


-- Function: public.update_ticket_activity_on_reply()
CREATE OR REPLACE FUNCTION public.update_ticket_activity_on_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.support_tickets
  SET last_activity_at = now(),
      last_activity_by = NEW.author_id
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$function$
;


-- Function: public.update_ticket_activity_on_status_change()
CREATE OR REPLACE FUNCTION public.update_ticket_activity_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_changer_id uuid;
  v_notified_ids uuid[] := '{}';
  v_fanout_exclude_ids uuid[] := '{}';
  v_is_cross_dept boolean;
  v_queue text;
  v_title text;
  v_message text;
  v_action_url text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_changer_id := auth.uid();
    NEW.last_activity_at = now();
    NEW.last_activity_by = v_changer_id;
    v_notified_ids := v_notified_ids || v_changer_id;

    v_queue := COALESCE(NEW.work_queue, NEW.source);
    v_is_cross_dept := (NEW.originating_source IS DISTINCT FROM v_queue);

    v_title := 'Ticket #' || NEW.ticket_number || ' status changed';
    v_message := 'Status changed from ' || OLD.status || ' to ' || NEW.status || ': ' || left(NEW.title, 80);
    v_action_url := '/tickets/' || NEW.id;

    -- Notify submitted_by
    IF NEW.submitted_by IS NOT NULL
       AND NEW.submitted_by IS DISTINCT FROM v_changer_id THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (NEW.submitted_by, v_title, v_message, 'ticket', v_action_url);
      v_notified_ids := v_notified_ids || NEW.submitted_by;
    END IF;

    -- Notify assigned_to
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM v_changer_id
       AND NEW.assigned_to IS DISTINCT FROM NEW.submitted_by THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (NEW.assigned_to, v_title, v_message, 'ticket', v_action_url);
      v_notified_ids := v_notified_ids || NEW.assigned_to;
    END IF;

    -- Build fan-out exclusion list
    IF v_is_cross_dept THEN
      v_fanout_exclude_ids := '{}';
      IF NEW.submitted_by IS NOT NULL
         AND NEW.submitted_by IS DISTINCT FROM v_changer_id THEN
        v_fanout_exclude_ids := v_fanout_exclude_ids || NEW.submitted_by;
      END IF;
      IF NEW.assigned_to IS NOT NULL
         AND NEW.assigned_to IS DISTINCT FROM v_changer_id THEN
        v_fanout_exclude_ids := v_fanout_exclude_ids || NEW.assigned_to;
      END IF;
    ELSE
      v_fanout_exclude_ids := v_notified_ids;
    END IF;

    PERFORM public.fanout_ticket_dept_notifications(
      v_queue, v_fanout_exclude_ids, v_title, v_message, v_action_url
    );
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: public.update_updated_at_column()
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END $function$
;


-- Function: public.upsert_renewal_workflow(p_scope text, p_target_id uuid, p_renewal_date date, p_stage text, p_notes text)
CREATE OR REPLACE FUNCTION public.upsert_renewal_workflow(p_scope text, p_target_id uuid, p_renewal_date date, p_stage text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  INSERT INTO public.renewal_workflows(scope, target_id, renewal_date, stage, outcome_notes, last_touch_at)
    VALUES (p_scope, p_target_id, p_renewal_date, p_stage, p_notes, now())
  ON CONFLICT (scope, target_id, renewal_date) DO UPDATE
    SET stage = EXCLUDED.stage,
        outcome_notes = COALESCE(EXCLUDED.outcome_notes, public.renewal_workflows.outcome_notes),
        last_touch_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$
;


-- Function: public.validate_client_handoff_item()
CREATE OR REPLACE FUNCTION public.validate_client_handoff_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.label IS NULL OR length(NEW.label) = 0 OR length(NEW.label) > 200 THEN
    RAISE EXCEPTION 'label must be 1-200 characters';
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 2000 THEN
    RAISE EXCEPTION 'notes too long (max 2000)';
  END IF;
  IF NEW.status = 'provided' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  IF NEW.status <> 'provided' THEN
    NEW.completed_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_intake()
CREATE OR REPLACE FUNCTION public.validate_intake()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('new_submission','received','under_review','needs_partner_update','approved','activation_in_progress','activated','closed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.priority NOT IN ('low','normal','high','urgent') THEN
    RAISE EXCEPTION 'Invalid priority: %', NEW.priority;
  END IF;
  IF jsonb_typeof(NEW.snapshot_json) <> 'object' THEN
    RAISE EXCEPTION 'snapshot_json must be a JSON object';
  END IF;
  IF NEW.source NOT IN ('wl','direct') THEN
    RAISE EXCEPTION 'Invalid source: %', NEW.source;
  END IF;
  IF NEW.source = 'wl' AND (NEW.partner_id IS NULL OR NEW.source_handoff_id IS NULL OR NEW.proposal_id IS NULL) THEN
    RAISE EXCEPTION 'WL intakes require partner_id, source_handoff_id, proposal_id';
  END IF;
  IF NEW.source = 'direct' AND NEW.client_lead_id IS NULL THEN
    RAISE EXCEPTION 'Direct intakes require client_lead_id';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_intake_activity()
CREATE OR REPLACE FUNCTION public.validate_intake_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.event_type NOT IN ('submitted','received','assigned','status_changed','note_added','info_requested','partner_updated','resubmitted','approved','activation_started','activated','closed') THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;
  IF NEW.actor_type NOT IN ('internal','partner','system') THEN
    RAISE EXCEPTION 'Invalid actor_type: %', NEW.actor_type;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_intake_note()
CREATE OR REPLACE FUNCTION public.validate_intake_note()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.note_type NOT IN ('general','decision','blocker','qa') THEN
    RAISE EXCEPTION 'Invalid note_type: %', NEW.note_type;
  END IF;
  IF NEW.body IS NULL OR length(trim(NEW.body)) = 0 THEN
    RAISE EXCEPTION 'body is required';
  END IF;
  IF length(NEW.body) > 5000 THEN
    RAISE EXCEPTION 'body too long (max 5000)';
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_lead_submission()
CREATE OR REPLACE FUNCTION public.validate_lead_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate email format (required field)
  IF NEW.email IS NULL OR NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Limit email length
  IF length(NEW.email) > 254 THEN
    RAISE EXCEPTION 'Email too long (max 254 characters)';
  END IF;
  
  -- Validate name (required field)
  IF NEW.name IS NULL OR length(trim(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  
  -- Limit name length
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Name too long (max 200 characters)';
  END IF;
  
  -- Limit phone length if provided
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 30 THEN
    RAISE EXCEPTION 'Phone number too long (max 30 characters)';
  END IF;
  
  -- Limit company name length if provided
  IF NEW.company IS NOT NULL AND length(NEW.company) > 200 THEN
    RAISE EXCEPTION 'Company name too long (max 200 characters)';
  END IF;
  
  -- Limit notes length if provided
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 5000 THEN
    RAISE EXCEPTION 'Notes too long (max 5000 characters)';
  END IF;
  
  -- Limit source length if provided
  IF NEW.source IS NOT NULL AND length(NEW.source) > 100 THEN
    RAISE EXCEPTION 'Source too long (max 100 characters)';
  END IF;
  
  -- Validate phone format if provided (basic validation)
  IF NEW.phone IS NOT NULL AND NEW.phone !~ '^[0-9+\-\s\(\)\.]+$' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_wl_campaign_recipient()
CREATE OR REPLACE FUNCTION public.validate_wl_campaign_recipient()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('queued','sent','opened','replied','converted','failed','suppressed') THEN
    RAISE EXCEPTION 'invalid recipient status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_wl_handoff()
CREATE OR REPLACE FUNCTION public.validate_wl_handoff()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal_partner uuid;
  v_lead_partner uuid;
  v_item jsonb;
  v_key text;
  v_completed jsonb;
BEGIN
  IF NEW.status NOT IN ('pending','ready','in_progress','completed','blocked') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.submission_status NOT IN (
    'draft','collecting_info','ready_for_submission','submitted_to_fulfillment',
    'needs_more_info','resubmitted','approved_for_activation','activation_in_progress','activated'
  ) THEN
    RAISE EXCEPTION 'Invalid submission_status: %', NEW.submission_status;
  END IF;
  IF NEW.completion_percent < 0 OR NEW.completion_percent > 100 THEN
    RAISE EXCEPTION 'completion_percent must be 0-100';
  END IF;
  IF NEW.client_name_snapshot IS NOT NULL AND length(NEW.client_name_snapshot) > 200 THEN
    RAISE EXCEPTION 'client_name_snapshot too long (max 200)';
  END IF;
  IF NEW.client_email_snapshot IS NOT NULL THEN
    IF length(NEW.client_email_snapshot) > 254 THEN
      RAISE EXCEPTION 'client_email_snapshot too long (max 254)';
    END IF;
    IF NEW.client_email_snapshot !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid client_email_snapshot format';
    END IF;
  END IF;
  IF NEW.company_snapshot IS NOT NULL AND length(NEW.company_snapshot) > 200 THEN
    RAISE EXCEPTION 'company_snapshot too long (max 200)';
  END IF;
  IF NEW.accepted_scope_snapshot IS NOT NULL AND length(NEW.accepted_scope_snapshot) > 5000 THEN
    RAISE EXCEPTION 'accepted_scope_snapshot too long (max 5000)';
  END IF;
  IF NEW.currency_snapshot IS NOT NULL AND length(NEW.currency_snapshot) > 8 THEN
    RAISE EXCEPTION 'currency_snapshot too long (max 8)';
  END IF;
  IF NEW.handoff_notes IS NOT NULL AND length(NEW.handoff_notes) > 5000 THEN
    RAISE EXCEPTION 'handoff_notes too long (max 5000)';
  END IF;
  IF NEW.accepted_amount_snapshot IS NOT NULL AND NEW.accepted_amount_snapshot < 0 THEN
    RAISE EXCEPTION 'accepted_amount_snapshot must be non-negative';
  END IF;
  IF NEW.checklist_state IS NULL THEN
    NEW.checklist_state := '[]'::jsonb;
  END IF;
  IF jsonb_typeof(NEW.checklist_state) <> 'array' THEN
    RAISE EXCEPTION 'checklist_state must be a JSON array';
  END IF;
  IF jsonb_array_length(NEW.checklist_state) > 50 THEN
    RAISE EXCEPTION 'checklist_state may contain at most 50 items';
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.checklist_state)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'checklist_state items must be objects';
    END IF;
    v_key := v_item->>'key';
    IF v_key IS NULL OR length(v_key) = 0 OR length(v_key) > 80 THEN
      RAISE EXCEPTION 'checklist item key must be 1-80 characters';
    END IF;
    v_completed := v_item->'completed';
    IF v_completed IS NULL OR jsonb_typeof(v_completed) <> 'boolean' THEN
      RAISE EXCEPTION 'checklist item completed must be boolean';
    END IF;
  END LOOP;
  SELECT partner_id INTO v_proposal_partner
  FROM public.wl_partner_proposals WHERE id = NEW.proposal_id;
  IF v_proposal_partner IS NULL THEN
    RAISE EXCEPTION 'Linked proposal does not exist';
  END IF;
  IF v_proposal_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'Handoff partner_id does not match proposal partner_id';
  END IF;
  IF NEW.lead_id IS NOT NULL THEN
    SELECT partner_id INTO v_lead_partner
    FROM public.wl_partner_leads WHERE id = NEW.lead_id;
    IF v_lead_partner IS NULL THEN
      RAISE EXCEPTION 'Linked lead does not exist';
    END IF;
    IF v_lead_partner IS DISTINCT FROM NEW.partner_id THEN
      RAISE EXCEPTION 'Handoff partner_id does not match lead partner_id';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_wl_handoff_document()
CREATE OR REPLACE FUNCTION public.validate_wl_handoff_document()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_handoff_partner uuid;
BEGIN
  IF NEW.document_type NOT IN ('script','logo','voicemail_audio','policy','id_verification','signed_agreement','other') THEN
    RAISE EXCEPTION 'Invalid document_type: %', NEW.document_type;
  END IF;
  IF NEW.status NOT IN ('active','superseded','removed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.file_path IS NULL OR length(NEW.file_path) = 0 OR length(NEW.file_path) > 500 THEN
    RAISE EXCEPTION 'file_path must be 1-500 characters';
  END IF;
  IF NEW.file_name IS NULL OR length(NEW.file_name) = 0 OR length(NEW.file_name) > 200 THEN
    RAISE EXCEPTION 'file_name must be 1-200 characters';
  END IF;
  IF NEW.mime_type IS NOT NULL AND length(NEW.mime_type) > 100 THEN
    RAISE EXCEPTION 'mime_type too long (max 100)';
  END IF;
  IF NEW.file_size IS NOT NULL AND NEW.file_size > 26214400 THEN
    RAISE EXCEPTION 'file_size exceeds 25 MB limit';
  END IF;
  SELECT partner_id INTO v_handoff_partner
  FROM public.wl_partner_onboarding_handoffs WHERE id = NEW.handoff_id;
  IF v_handoff_partner IS NULL THEN
    RAISE EXCEPTION 'Linked handoff does not exist';
  END IF;
  IF v_handoff_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'document partner_id does not match handoff partner_id';
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_wl_handoff_item()
CREATE OR REPLACE FUNCTION public.validate_wl_handoff_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_handoff_partner uuid;
BEGIN
  IF NEW.item_key IS NULL OR length(NEW.item_key) = 0 OR length(NEW.item_key) > 80 THEN
    RAISE EXCEPTION 'item_key must be 1-80 characters';
  END IF;
  IF NEW.label IS NULL OR length(NEW.label) = 0 OR length(NEW.label) > 200 THEN
    RAISE EXCEPTION 'label must be 1-200 characters';
  END IF;
  IF NEW.item_type NOT IN ('text','long_text','number','email','phone','select','boolean','date') THEN
    RAISE EXCEPTION 'Invalid item_type: %', NEW.item_type;
  END IF;
  IF NEW.status NOT IN ('pending','provided','na') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 2000 THEN
    RAISE EXCEPTION 'notes too long (max 2000)';
  END IF;
  SELECT partner_id INTO v_handoff_partner
  FROM public.wl_partner_onboarding_handoffs WHERE id = NEW.handoff_id;
  IF v_handoff_partner IS NULL THEN
    RAISE EXCEPTION 'Linked handoff does not exist';
  END IF;
  IF v_handoff_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'item partner_id does not match handoff partner_id';
  END IF;
  IF NEW.status = 'provided' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  IF NEW.status <> 'provided' THEN
    NEW.completed_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_wl_handoff_request()
CREATE OR REPLACE FUNCTION public.validate_wl_handoff_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_handoff_partner uuid;
  v_intake_partner uuid;
BEGIN
  IF NEW.request_type NOT IN ('missing_item','missing_document','clarification','correction') THEN
    RAISE EXCEPTION 'Invalid request_type: %', NEW.request_type;
  END IF;
  IF NEW.status NOT IN ('open','resolved','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.title IS NULL OR length(trim(NEW.title)) = 0 OR length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'title must be 1-200 characters';
  END IF;
  IF NEW.message IS NOT NULL AND length(NEW.message) > 2000 THEN
    RAISE EXCEPTION 'message too long (max 2000)';
  END IF;
  IF NEW.target_item_key IS NOT NULL AND length(NEW.target_item_key) > 80 THEN
    RAISE EXCEPTION 'target_item_key too long (max 80)';
  END IF;
  SELECT partner_id INTO v_handoff_partner
  FROM public.wl_partner_onboarding_handoffs WHERE id = NEW.handoff_id;
  IF v_handoff_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'request partner_id does not match handoff partner_id';
  END IF;
  SELECT partner_id INTO v_intake_partner
  FROM public.internal_fulfillment_intakes WHERE id = NEW.intake_id;
  IF v_intake_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'request partner_id does not match intake partner_id';
  END IF;
  IF NEW.status = 'resolved' AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_wl_partner_lead()
CREATE OR REPLACE FUNCTION public.validate_wl_partner_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS NULL OR NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  IF length(NEW.email) > 254 THEN
    RAISE EXCEPTION 'Email too long (max 254 characters)';
  END IF;
  IF NEW.name IS NULL OR length(trim(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Name too long (max 200 characters)';
  END IF;
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 30 THEN
    RAISE EXCEPTION 'Phone number too long (max 30 characters)';
  END IF;
  IF NEW.phone IS NOT NULL AND NEW.phone !~ '^[0-9+\-\s\(\)\.]+$' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  IF NEW.company IS NOT NULL AND length(NEW.company) > 200 THEN
    RAISE EXCEPTION 'Company name too long (max 200 characters)';
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 5000 THEN
    RAISE EXCEPTION 'Notes too long (max 5000 characters)';
  END IF;
  IF NEW.source IS NOT NULL AND length(NEW.source) > 100 THEN
    RAISE EXCEPTION 'Source too long (max 100 characters)';
  END IF;
  IF NEW.service_interest IS NOT NULL AND length(NEW.service_interest) > 200 THEN
    RAISE EXCEPTION 'Service interest too long (max 200 characters)';
  END IF;
  IF NEW.currency IS NOT NULL AND length(NEW.currency) > 8 THEN
    RAISE EXCEPTION 'Currency code too long';
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_wl_partner_proposal()
CREATE OR REPLACE FUNCTION public.validate_wl_partner_proposal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.title IS NULL OR length(trim(NEW.title)) = 0 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'Title too long (max 200 characters)';
  END IF;
  IF NEW.offering_name IS NOT NULL AND length(NEW.offering_name) > 200 THEN
    RAISE EXCEPTION 'Offering name too long (max 200 characters)';
  END IF;
  IF NEW.scope_summary IS NOT NULL AND length(NEW.scope_summary) > 5000 THEN
    RAISE EXCEPTION 'Scope summary too long (max 5000 characters)';
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 5000 THEN
    RAISE EXCEPTION 'Notes too long (max 5000 characters)';
  END IF;
  IF NEW.currency IS NOT NULL AND length(NEW.currency) > 8 THEN
    RAISE EXCEPTION 'Currency code too long (max 8 characters)';
  END IF;
  IF NEW.amount IS NOT NULL AND NEW.amount < 0 THEN
    RAISE EXCEPTION 'Amount must be non-negative';
  END IF;
  IF NEW.status NOT IN ('draft','sent','viewed','accepted','declined','expired') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.accepted_by_name IS NOT NULL AND length(NEW.accepted_by_name) > 200 THEN
    RAISE EXCEPTION 'Accepted by name too long (max 200 characters)';
  END IF;
  IF NEW.acceptance_note IS NOT NULL AND length(NEW.acceptance_note) > 2000 THEN
    RAISE EXCEPTION 'Acceptance note too long (max 2000 characters)';
  END IF;
  IF NEW.declined_reason IS NOT NULL AND length(NEW.declined_reason) > 2000 THEN
    RAISE EXCEPTION 'Declined reason too long (max 2000 characters)';
  END IF;
  IF NEW.last_recipient_name IS NOT NULL AND length(NEW.last_recipient_name) > 200 THEN
    RAISE EXCEPTION 'Recipient name too long (max 200 characters)';
  END IF;
  IF NEW.last_recipient_email IS NOT NULL THEN
    IF length(NEW.last_recipient_email) > 254 THEN
      RAISE EXCEPTION 'Recipient email too long (max 254 characters)';
    END IF;
    IF NEW.last_recipient_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid recipient email format';
    END IF;
  END IF;
  IF NEW.checklist_template IS NULL OR length(trim(NEW.checklist_template)) = 0 THEN
    NEW.checklist_template := 'standard';
  END IF;
  IF length(NEW.checklist_template) > 40 THEN
    RAISE EXCEPTION 'checklist_template too long (max 40 characters)';
  END IF;
  IF NEW.checklist_template NOT IN ('standard','inbound_only','outbound_campaign','hybrid','custom') THEN
    RAISE EXCEPTION 'Invalid checklist_template: %', NEW.checklist_template;
  END IF;
  RETURN NEW;
END;
$function$
;


-- Function: public.validate_wl_portal_access()
CREATE OR REPLACE FUNCTION public.validate_wl_portal_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal_partner uuid;
  v_handoff_partner uuid;
  v_handoff_proposal uuid;
BEGIN
  IF NEW.token_hash IS NULL OR length(NEW.token_hash) < 32 OR length(NEW.token_hash) > 128 THEN
    RAISE EXCEPTION 'Invalid token_hash';
  END IF;
  IF NEW.recipient_email IS NOT NULL THEN
    IF length(NEW.recipient_email) > 254 THEN
      RAISE EXCEPTION 'recipient_email too long (max 254)';
    END IF;
    IF NEW.recipient_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid recipient_email format';
    END IF;
  END IF;

  SELECT partner_id INTO v_proposal_partner
  FROM public.wl_partner_proposals WHERE id = NEW.proposal_id;
  IF v_proposal_partner IS NULL THEN
    RAISE EXCEPTION 'Linked proposal does not exist';
  END IF;
  IF v_proposal_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'portal_access partner_id does not match proposal partner_id';
  END IF;

  SELECT partner_id, proposal_id INTO v_handoff_partner, v_handoff_proposal
  FROM public.wl_partner_onboarding_handoffs WHERE id = NEW.handoff_id;
  IF v_handoff_partner IS NULL THEN
    RAISE EXCEPTION 'Linked handoff does not exist';
  END IF;
  IF v_handoff_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'portal_access partner_id does not match handoff partner_id';
  END IF;
  IF v_handoff_proposal IS DISTINCT FROM NEW.proposal_id THEN
    RAISE EXCEPTION 'portal_access proposal_id does not match handoff proposal_id';
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: public.validate_wl_proposal_activity()
CREATE OR REPLACE FUNCTION public.validate_wl_proposal_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal_partner uuid;
BEGIN
  IF NEW.event_type NOT IN (
    'share_link_created','share_link_revoked','marked_sent',
    'viewed','accepted','declined','exported_pdf','recipient_updated',
    'client_portal_viewed','client_portal_acknowledged','task_created'
  ) THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;

  IF NEW.actor_label IS NOT NULL AND length(NEW.actor_label) > 200 THEN
    RAISE EXCEPTION 'actor_label too long (max 200 characters)';
  END IF;

  SELECT partner_id INTO v_proposal_partner
  FROM public.wl_partner_proposals
  WHERE id = NEW.proposal_id;

  IF v_proposal_partner IS NULL THEN
    RAISE EXCEPTION 'Linked proposal does not exist';
  END IF;

  IF v_proposal_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'Activity partner_id does not match proposal partner_id';
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: public.validate_wl_proposal_share()
CREATE OR REPLACE FUNCTION public.validate_wl_proposal_share()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal_partner uuid;
BEGIN
  -- Token presence + length sanity (SHA-256 hex = 64 chars)
  IF NEW.token_hash IS NULL OR length(NEW.token_hash) < 32 OR length(NEW.token_hash) > 128 THEN
    RAISE EXCEPTION 'Invalid token_hash';
  END IF;

  IF NEW.recipient_name IS NOT NULL AND length(NEW.recipient_name) > 200 THEN
    RAISE EXCEPTION 'Recipient name too long (max 200 characters)';
  END IF;

  IF NEW.recipient_email IS NOT NULL THEN
    IF length(NEW.recipient_email) > 254 THEN
      RAISE EXCEPTION 'Recipient email too long (max 254 characters)';
    END IF;
    IF NEW.recipient_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid recipient email format';
    END IF;
  END IF;

  -- Cross-tenant guard: share.partner_id must match proposal.partner_id
  SELECT partner_id INTO v_proposal_partner
  FROM public.wl_partner_proposals
  WHERE id = NEW.proposal_id;

  IF v_proposal_partner IS NULL THEN
    RAISE EXCEPTION 'Linked proposal does not exist';
  END IF;

  IF v_proposal_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'Share partner_id does not match proposal partner_id';
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: public.validate_wl_review_rating()
CREATE OR REPLACE FUNCTION public.validate_wl_review_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $function$
;


-- Function: public.validate_wl_task()
CREATE OR REPLACE FUNCTION public.validate_wl_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal_partner uuid;
  v_lead_partner uuid;
  v_handoff_partner uuid;
BEGIN
  IF NEW.title IS NULL OR length(trim(NEW.title)) = 0 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'Title too long (max 200)';
  END IF;
  IF NEW.description IS NOT NULL AND length(NEW.description) > 5000 THEN
    RAISE EXCEPTION 'Description too long (max 5000)';
  END IF;
  IF NEW.task_type NOT IN ('follow_up','onboarding','reminder','approval','review','custom') THEN
    RAISE EXCEPTION 'Invalid task_type: %', NEW.task_type;
  END IF;
  IF NEW.status NOT IN ('open','in_progress','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.priority NOT IN ('low','medium','high') THEN
    RAISE EXCEPTION 'Invalid priority: %', NEW.priority;
  END IF;
  IF NEW.source_event NOT IN (
    'proposal_accepted','proposal_viewed','proposal_declined',
    'proposal_past_due','handoff_created','manual'
  ) THEN
    RAISE EXCEPTION 'Invalid source_event: %', NEW.source_event;
  END IF;

  IF NEW.proposal_id IS NOT NULL THEN
    SELECT partner_id INTO v_proposal_partner FROM public.wl_partner_proposals WHERE id = NEW.proposal_id;
    IF v_proposal_partner IS DISTINCT FROM NEW.partner_id THEN
      RAISE EXCEPTION 'Task partner_id does not match proposal partner_id';
    END IF;
  END IF;
  IF NEW.lead_id IS NOT NULL THEN
    SELECT partner_id INTO v_lead_partner FROM public.wl_partner_leads WHERE id = NEW.lead_id;
    IF v_lead_partner IS DISTINCT FROM NEW.partner_id THEN
      RAISE EXCEPTION 'Task partner_id does not match lead partner_id';
    END IF;
  END IF;
  IF NEW.handoff_id IS NOT NULL THEN
    SELECT partner_id INTO v_handoff_partner FROM public.wl_partner_onboarding_handoffs WHERE id = NEW.handoff_id;
    IF v_handoff_partner IS DISTINCT FROM NEW.partner_id THEN
      RAISE EXCEPTION 'Task partner_id does not match handoff partner_id';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;


-- Function: public.wl_can_assign_in_partner(_partner_id uuid, _user_id uuid)
CREATE OR REPLACE FUNCTION public.wl_can_assign_in_partner(_partner_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.wl_partner_members m
    WHERE m.partner_id = _partner_id
      AND m.user_id    = _user_id
      AND m.status     = 'active'
      AND m.role IN ('owner','manager')
  );
$function$
;


-- Function: public.wl_can_manage_partner_team(_partner_id uuid, _user_id uuid)
CREATE OR REPLACE FUNCTION public.wl_can_manage_partner_team(_partner_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.wl_partner_members m
    WHERE m.partner_id = _partner_id
      AND m.user_id    = _user_id
      AND m.status     = 'active'
      AND m.role IN ('owner','manager')
  );
$function$
;


-- Function: public.wl_is_partner_member(_partner_id uuid, _user_id uuid)
CREATE OR REPLACE FUNCTION public.wl_is_partner_member(_partner_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.wl_partner_members m
    WHERE m.partner_id = _partner_id
      AND m.user_id    = _user_id
      AND m.status     = 'active'
  );
$function$
;


-- Function: public.wl_is_partner_owner(_partner_id uuid, _user_id uuid)
CREATE OR REPLACE FUNCTION public.wl_is_partner_owner(_partner_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.wl_partner_members m
    WHERE m.partner_id = _partner_id
      AND m.user_id    = _user_id
      AND m.status     = 'active'
      AND m.role       = 'owner'
  );
$function$
;


-- Function: public.wl_partner_member_role(_partner_id uuid, _user_id uuid)
CREATE OR REPLACE FUNCTION public.wl_partner_member_role(_partner_id uuid, _user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.role
  FROM public.wl_partner_members m
  WHERE m.partner_id = _partner_id
    AND m.user_id    = _user_id
    AND m.status     = 'active'
  LIMIT 1;
$function$

;



-- ============================================================
-- TRIGGERS (220)
-- Schema: public
-- ============================================================


-- Table: public.addon_products
CREATE TRIGGER update_addon_products_updated_at BEFORE UPDATE ON addon_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.affiliate_referrals
CREATE TRIGGER affiliate_referrals_link BEFORE UPDATE ON affiliate_referrals FOR EACH ROW EXECUTE FUNCTION trg_affiliate_referrals_link();

-- Table: public.agent_banking
CREATE TRIGGER update_agent_banking_updated_at BEFORE UPDATE ON agent_banking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.agent_onboarding
CREATE TRIGGER update_agent_onboarding_updated_at BEFORE UPDATE ON agent_onboarding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.agent_shifts
CREATE TRIGGER trg_notify_agent_shift_edited AFTER UPDATE ON agent_shifts FOR EACH ROW EXECUTE FUNCTION notify_agent_shift_edited();

-- Table: public.approval_policies
CREATE TRIGGER approval_policies_audit_del AFTER DELETE ON approval_policies FOR EACH ROW EXECUTE FUNCTION approval_policy_audit();
CREATE TRIGGER approval_policies_audit_ins AFTER INSERT ON approval_policies FOR EACH ROW EXECUTE FUNCTION approval_policy_audit();
CREATE TRIGGER approval_policies_audit_upd AFTER UPDATE ON approval_policies FOR EACH ROW EXECUTE FUNCTION approval_policy_audit();
CREATE TRIGGER trg_approval_policies_updated_at BEFORE UPDATE ON approval_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.approval_requests
CREATE TRIGGER approval_request_snapshot_flags BEFORE INSERT ON approval_requests FOR EACH ROW EXECUTE FUNCTION approval_request_snapshot_trigger_flags();
CREATE TRIGGER trg_approval_request_notify_created AFTER INSERT ON approval_requests FOR EACH ROW EXECUTE FUNCTION approval_request_notify_created();
CREATE TRIGGER trg_approval_request_snapshot_sla BEFORE INSERT ON approval_requests FOR EACH ROW EXECUTE FUNCTION approval_request_snapshot_sla();
CREATE TRIGGER trg_approval_requests_updated_at BEFORE UPDATE ON approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.autoblog_queue
CREATE TRIGGER update_autoblog_queue_updated_at BEFORE UPDATE ON autoblog_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.automation_recommendations
CREATE TRIGGER trg_autorec_touch BEFORE UPDATE ON automation_recommendations FOR EACH ROW EXECUTE FUNCTION touch_updated_at_autorec();

-- Table: public.billing_summaries
CREATE TRIGGER trg_audit_billing_summaries AFTER INSERT OR DELETE OR UPDATE ON billing_summaries FOR EACH ROW EXECUTE FUNCTION audit_billing_summaries_changes();

-- Table: public.blog_posts
CREATE TRIGGER trg_blog_posts_emit_published AFTER INSERT OR UPDATE OF status ON blog_posts FOR EACH ROW EXECUTE FUNCTION trg_blog_posts_emit_published();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.call_flow_receptionist_configs
CREATE TRIGGER trg_recep_cfg_emit AFTER INSERT OR UPDATE ON call_flow_receptionist_configs FOR EACH ROW EXECUTE FUNCTION trg_recep_cfg_emit();
CREATE TRIGGER trg_recep_cfg_mirror_tenant BEFORE INSERT OR UPDATE ON call_flow_receptionist_configs FOR EACH ROW EXECUTE FUNCTION trg_recep_cfg_mirror_tenant();

-- Table: public.campaign_department_type_defaults
CREATE TRIGGER trg_defaults_touch BEFORE UPDATE ON campaign_department_type_defaults FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.campaign_faq_entries
CREATE TRIGGER faq_go_live_regression AFTER INSERT OR DELETE OR UPDATE ON campaign_faq_entries FOR EACH ROW EXECUTE FUNCTION trg_faq_go_live_check();
CREATE TRIGGER trg_campaign_faq_entries_identity BEFORE INSERT OR UPDATE ON campaign_faq_entries FOR EACH ROW EXECUTE FUNCTION enforce_campaign_knowledge_identity();
CREATE TRIGGER trg_campaign_faq_entries_immutable BEFORE UPDATE ON campaign_faq_entries FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_campaign_faq_entries_touch BEFORE UPDATE ON campaign_faq_entries FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();
CREATE TRIGGER trg_flag_signoffs_faq AFTER UPDATE OF status ON campaign_faq_entries FOR EACH ROW EXECUTE FUNCTION flag_signoffs_needs_refresh();

-- Table: public.campaign_field_groups
CREATE TRIGGER trg_campaign_field_groups_identity BEFORE INSERT OR UPDATE ON campaign_field_groups FOR EACH ROW EXECUTE FUNCTION enforce_campaign_knowledge_identity();
CREATE TRIGGER trg_campaign_field_groups_immutable BEFORE UPDATE ON campaign_field_groups FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_campaign_field_groups_touch BEFORE UPDATE ON campaign_field_groups FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();

-- Table: public.campaign_fields
CREATE TRIGGER trg_campaign_fields_identity BEFORE INSERT OR UPDATE ON campaign_fields FOR EACH ROW EXECUTE FUNCTION enforce_campaign_knowledge_identity();
CREATE TRIGGER trg_campaign_fields_immutable BEFORE UPDATE ON campaign_fields FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_campaign_fields_touch BEFORE UPDATE ON campaign_fields FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();

-- Table: public.campaign_policy_blocks
CREATE TRIGGER policy_go_live_regression AFTER INSERT OR DELETE OR UPDATE ON campaign_policy_blocks FOR EACH ROW EXECUTE FUNCTION trg_faq_go_live_check();
CREATE TRIGGER trg_campaign_policy_blocks_identity BEFORE INSERT OR UPDATE ON campaign_policy_blocks FOR EACH ROW EXECUTE FUNCTION enforce_campaign_knowledge_identity();
CREATE TRIGGER trg_campaign_policy_blocks_immutable BEFORE UPDATE ON campaign_policy_blocks FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_campaign_policy_blocks_touch BEFORE UPDATE ON campaign_policy_blocks FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();
CREATE TRIGGER trg_flag_signoffs_policy AFTER UPDATE OF status ON campaign_policy_blocks FOR EACH ROW EXECUTE FUNCTION flag_signoffs_needs_refresh();

-- Table: public.campaign_publish_versions
CREATE TRIGGER trg_cpv_enforce_identity BEFORE INSERT OR UPDATE ON campaign_publish_versions FOR EACH ROW EXECUTE FUNCTION enforce_campaign_tenant_identity();
CREATE TRIGGER trg_cpv_immutable_identity BEFORE UPDATE ON campaign_publish_versions FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_cpv_touch_updated_at BEFORE UPDATE ON campaign_publish_versions FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();

-- Table: public.campaign_scenarios
CREATE TRIGGER trg_scenarios_enforce_identity BEFORE INSERT OR UPDATE ON campaign_scenarios FOR EACH ROW EXECUTE FUNCTION enforce_campaign_tenant_identity();
CREATE TRIGGER trg_scenarios_immutable_identity BEFORE UPDATE ON campaign_scenarios FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_scenarios_inherit_dept BEFORE INSERT OR UPDATE ON campaign_scenarios FOR EACH ROW EXECUTE FUNCTION inherit_dept_from_campaign();
CREATE TRIGGER trg_scenarios_touch_updated_at BEFORE UPDATE ON campaign_scenarios FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();

-- Table: public.campaign_script_documents
CREATE TRIGGER script_doc_go_live_regression AFTER INSERT OR DELETE OR UPDATE OF status ON campaign_script_documents FOR EACH ROW EXECUTE FUNCTION trg_script_doc_go_live_check();
CREATE TRIGGER trg_csd_updated_at BEFORE UPDATE ON campaign_script_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_flag_signoffs_script AFTER UPDATE OF status ON campaign_script_documents FOR EACH ROW EXECUTE FUNCTION flag_signoffs_needs_refresh();

-- Table: public.campaign_templates
CREATE TRIGGER trg_campaign_templates_updated_at BEFORE UPDATE ON campaign_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.campaign_training_lessons
CREATE TRIGGER trg_ctl_updated_at BEFORE UPDATE ON campaign_training_lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.campaign_training_modules
CREATE TRIGGER training_module_go_live_regression AFTER INSERT OR DELETE OR UPDATE ON campaign_training_modules FOR EACH ROW EXECUTE FUNCTION trg_training_go_live_check();
CREATE TRIGGER trg_ctm_updated_at BEFORE UPDATE ON campaign_training_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.campaign_training_signoffs
CREATE TRIGGER training_signoff_go_live_regression AFTER INSERT OR DELETE OR UPDATE ON campaign_training_signoffs FOR EACH ROW EXECUTE FUNCTION trg_training_go_live_check();
CREATE TRIGGER trg_set_signoff_expiry BEFORE INSERT ON campaign_training_signoffs FOR EACH ROW EXECUTE FUNCTION set_signoff_expiry();

-- Table: public.campaigns
CREATE TRIGGER campaigns_go_live_regression AFTER INSERT OR UPDATE OF published_version_id ON campaigns FOR EACH ROW EXECUTE FUNCTION trg_campaigns_go_live_check();
CREATE TRIGGER trg_campaigns_emit_created AFTER INSERT ON campaigns FOR EACH ROW EXECUTE FUNCTION trg_campaigns_emit_created();
CREATE TRIGGER trg_campaigns_emit_status AFTER UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION trg_campaigns_emit_status();
CREATE TRIGGER trg_campaigns_enforce_identity BEFORE INSERT OR UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION enforce_campaign_tenant_identity();
CREATE TRIGGER trg_campaigns_immutable_identity BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_campaigns_touch_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();
CREATE TRIGGER trg_enforce_go_live_checks BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION enforce_go_live_checks();

-- Table: public.capacity_assumptions
CREATE TRIGGER trg_capacity_assumptions_updated BEFORE UPDATE ON capacity_assumptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.capacity_supply
CREATE TRIGGER trg_capacity_supply_updated BEFORE UPDATE ON capacity_supply FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.chat_ai_configs
CREATE TRIGGER chat_ai_configs_updated_at BEFORE UPDATE ON chat_ai_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.chat_brand_configs
CREATE TRIGGER chat_brand_configs_updated_at BEFORE UPDATE ON chat_brand_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.chat_canned_responses
CREATE TRIGGER chat_canned_responses_updated_at BEFORE UPDATE ON chat_canned_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.chat_conversations
CREATE TRIGGER chat_conversations_notify_queued AFTER INSERT OR UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION chat_notify_on_queued();
CREATE TRIGGER chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.chat_deployments
CREATE TRIGGER chat_deployments_updated_at BEFORE UPDATE ON chat_deployments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER chat_deployments_validate_client BEFORE INSERT OR UPDATE ON chat_deployments FOR EACH ROW EXECUTE FUNCTION chat_deployment_validate_direct_client();

-- Table: public.chat_messages
CREATE TRIGGER chat_messages_after_insert AFTER INSERT ON chat_messages FOR EACH ROW EXECUTE FUNCTION chat_message_after_insert();

-- Table: public.client_addons
CREATE TRIGGER trg_audit_client_addons AFTER INSERT OR DELETE OR UPDATE ON client_addons FOR EACH ROW EXECUTE FUNCTION audit_client_addons_changes();
CREATE TRIGGER update_client_addons_updated_at BEFORE UPDATE ON client_addons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.client_contacts
CREATE TRIGGER trg_client_contacts_identity BEFORE INSERT OR UPDATE ON client_contacts FOR EACH ROW EXECUTE FUNCTION enforce_campaign_tenant_identity();
CREATE TRIGGER trg_client_contacts_immutable BEFORE UPDATE ON client_contacts FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_client_contacts_touch BEFORE UPDATE ON client_contacts FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();

-- Table: public.client_departments
CREATE TRIGGER trg_client_departments_identity BEFORE INSERT OR UPDATE ON client_departments FOR EACH ROW EXECUTE FUNCTION enforce_campaign_tenant_identity();
CREATE TRIGGER trg_client_departments_immutable BEFORE UPDATE ON client_departments FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_client_departments_seed_defaults AFTER INSERT ON client_departments FOR EACH ROW EXECUTE FUNCTION seed_department_defaults();
CREATE TRIGGER trg_client_departments_touch BEFORE UPDATE ON client_departments FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();

-- Table: public.client_handoff_items
CREATE TRIGGER trg_guard_client_handoff_item_client_edits BEFORE UPDATE ON client_handoff_items FOR EACH ROW EXECUTE FUNCTION guard_client_handoff_item_client_edits();
CREATE TRIGGER trg_validate_client_handoff_item BEFORE INSERT OR UPDATE ON client_handoff_items FOR EACH ROW EXECUTE FUNCTION validate_client_handoff_item();

-- Table: public.client_locations
CREATE TRIGGER trg_client_locations_immutable BEFORE UPDATE ON client_locations FOR EACH ROW EXECUTE FUNCTION enforce_client_locations_identity_immutable();
CREATE TRIGGER trg_client_locations_touch BEFORE UPDATE ON client_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.client_onboarding_handoffs
CREATE TRIGGER trg_client_handoffs_updated_at BEFORE UPDATE ON client_onboarding_handoffs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_handoff_emit_status AFTER INSERT OR UPDATE ON client_onboarding_handoffs FOR EACH ROW EXECUTE FUNCTION trg_handoff_emit_status();

-- Table: public.client_scripts
CREATE TRIGGER update_client_scripts_updated_at BEFORE UPDATE ON client_scripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.communication_actions
CREATE TRIGGER trg_communication_actions_updated BEFORE UPDATE ON communication_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.communication_templates
CREATE TRIGGER trg_communication_templates_updated BEFORE UPDATE ON communication_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.crm_tasks
CREATE TRIGGER on_task_event_notif AFTER INSERT OR UPDATE ON crm_tasks FOR EACH ROW EXECUTE FUNCTION notify_on_task_event();

-- Table: public.custom_plans
CREATE TRIGGER trg_audit_custom_plans AFTER INSERT OR DELETE OR UPDATE ON custom_plans FOR EACH ROW EXECUTE FUNCTION audit_custom_plans_changes();
CREATE TRIGGER update_custom_plans_updated_at BEFORE UPDATE ON custom_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.department_numbers
CREATE TRIGGER trg_department_numbers_identity BEFORE INSERT OR UPDATE ON department_numbers FOR EACH ROW EXECUTE FUNCTION enforce_campaign_tenant_identity();
CREATE TRIGGER trg_department_numbers_immutable BEFORE UPDATE ON department_numbers FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_department_numbers_touch BEFORE UPDATE ON department_numbers FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();

-- Table: public.direct_success_plays
CREATE TRIGGER trg_dsp_updated_at BEFORE UPDATE ON direct_success_plays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.disc_audiences
CREATE TRIGGER tr_disc_audiences_updated BEFORE UPDATE ON disc_audiences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.disc_faq_sets
CREATE TRIGGER tr_disc_faq_sets_updated BEFORE UPDATE ON disc_faq_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.disc_faqs
CREATE TRIGGER tr_disc_faqs_updated BEFORE UPDATE ON disc_faqs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.disc_generated_pages
CREATE TRIGGER tr_disc_pages_updated BEFORE UPDATE ON disc_generated_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.disc_internal_link_items
CREATE TRIGGER tr_disc_link_items_updated BEFORE UPDATE ON disc_internal_link_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.disc_internal_link_sets
CREATE TRIGGER tr_disc_link_sets_updated BEFORE UPDATE ON disc_internal_link_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.disc_keywords
CREATE TRIGGER tr_disc_keywords_updated BEFORE UPDATE ON disc_keywords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.disc_locations
CREATE TRIGGER tr_disc_locations_updated BEFORE UPDATE ON disc_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.disc_templates
CREATE TRIGGER tr_disc_templates_updated BEFORE UPDATE ON disc_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.feature_launch_flags
CREATE TRIGGER update_feature_launch_flags_updated_at BEFORE UPDATE ON feature_launch_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.feedback
CREATE TRIGGER trg_feedback_updated_at BEFORE UPDATE ON feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.five9_variable_groups
CREATE TRIGGER trg_five9_variable_groups_identity BEFORE INSERT OR UPDATE ON five9_variable_groups FOR EACH ROW EXECUTE FUNCTION enforce_campaign_tenant_identity();
CREATE TRIGGER trg_five9_variable_groups_immutable BEFORE UPDATE ON five9_variable_groups FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_five9_variable_groups_touch BEFORE UPDATE ON five9_variable_groups FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();

-- Table: public.five9_variable_mappings
CREATE TRIGGER trg_five9_variable_mappings_identity BEFORE INSERT OR UPDATE ON five9_variable_mappings FOR EACH ROW EXECUTE FUNCTION enforce_campaign_tenant_identity();
CREATE TRIGGER trg_five9_variable_mappings_immutable BEFORE UPDATE ON five9_variable_mappings FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_five9_variable_mappings_touch BEFORE UPDATE ON five9_variable_mappings FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();

-- Table: public.forecast_assumptions
CREATE TRIGGER trg_forecast_assumptions_updated BEFORE UPDATE ON forecast_assumptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.forecast_stage_probabilities
CREATE TRIGGER trg_forecast_stage_probabilities_updated BEFORE UPDATE ON forecast_stage_probabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.gtm_targets
CREATE TRIGGER trg_gtm_targets_updated BEFORE UPDATE ON gtm_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.internal_fulfillment_activity
CREATE TRIGGER trg_validate_intake_activity BEFORE INSERT OR UPDATE ON internal_fulfillment_activity FOR EACH ROW EXECUTE FUNCTION validate_intake_activity();

-- Table: public.internal_fulfillment_intakes
CREATE TRIGGER trg_enforce_supervisor_intake_constraints BEFORE UPDATE ON internal_fulfillment_intakes FOR EACH ROW EXECUTE FUNCTION enforce_supervisor_intake_constraints();
CREATE TRIGGER trg_intake_emit_created AFTER INSERT ON internal_fulfillment_intakes FOR EACH ROW EXECUTE FUNCTION trg_intake_emit_created();
CREATE TRIGGER trg_intake_emit_status_after AFTER UPDATE ON internal_fulfillment_intakes FOR EACH ROW EXECUTE FUNCTION trg_intake_emit_status_after();
CREATE TRIGGER trg_intake_stamp_status_dates BEFORE UPDATE ON internal_fulfillment_intakes FOR EACH ROW EXECUTE FUNCTION trg_intake_emit_status_change();
CREATE TRIGGER trg_set_intake_number BEFORE INSERT ON internal_fulfillment_intakes FOR EACH ROW EXECUTE FUNCTION set_intake_number();
CREATE TRIGGER trg_validate_intake BEFORE INSERT OR UPDATE ON internal_fulfillment_intakes FOR EACH ROW EXECUTE FUNCTION validate_intake();

-- Table: public.internal_fulfillment_notes
CREATE TRIGGER trg_validate_intake_note BEFORE INSERT OR UPDATE ON internal_fulfillment_notes FOR EACH ROW EXECUTE FUNCTION validate_intake_note();

-- Table: public.job_applications
CREATE TRIGGER on_new_application_notify_admin AFTER INSERT ON job_applications FOR EACH ROW EXECUTE FUNCTION notify_admin_new_application();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.keyword_tracker
CREATE TRIGGER update_keyword_tracker_updated_at BEFORE UPDATE ON keyword_tracker FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.lead_conversions
CREATE TRIGGER trg_lead_conversions_emit AFTER INSERT ON lead_conversions FOR EACH ROW EXECUTE FUNCTION trg_lead_conversions_emit();

-- Table: public.leads
CREATE TRIGGER leads_stamp_stage_dates BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION trg_leads_stamp_stage_dates();
CREATE TRIGGER on_new_lead_notify_admin AFTER INSERT ON leads FOR EACH ROW EXECUTE FUNCTION notify_admin_new_lead();
CREATE TRIGGER trg_audit_lead_deletions BEFORE DELETE ON leads FOR EACH ROW EXECUTE FUNCTION audit_lead_deletions();
CREATE TRIGGER trg_leads_emit_capture AFTER INSERT ON leads FOR EACH ROW EXECUTE FUNCTION trg_leads_emit_capture_event();
CREATE TRIGGER trg_leads_emit_stage_change AFTER UPDATE OF pipeline_stage ON leads FOR EACH ROW EXECUTE FUNCTION trg_leads_emit_stage_change();
CREATE TRIGGER trg_notify_pipeline_stage_change AFTER UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION notify_on_pipeline_stage_change();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER validate_lead_before_insert BEFORE INSERT ON leads FOR EACH ROW EXECUTE FUNCTION validate_lead_submission();

-- Table: public.meetings
CREATE TRIGGER meetings_emit_ins AFTER INSERT ON meetings FOR EACH ROW EXECUTE FUNCTION trg_meetings_emit();
CREATE TRIGGER meetings_emit_upd AFTER UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION trg_meetings_emit();

-- Table: public.offers
CREATE TRIGGER trg_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.open_shifts
CREATE TRIGGER trg_notify_open_shift_posted AFTER INSERT ON open_shifts FOR EACH ROW EXECUTE FUNCTION notify_open_shift_posted();
CREATE TRIGGER trg_notify_shift_claimed AFTER UPDATE ON open_shifts FOR EACH ROW EXECUTE FUNCTION notify_shift_claimed();

-- Table: public.outbound_call_requests
CREATE TRIGGER trigger_notify_on_outbound_request AFTER INSERT ON outbound_call_requests FOR EACH ROW EXECUTE FUNCTION notify_on_outbound_request();

-- Table: public.outline_progress
CREATE TRIGGER update_outline_progress_updated_at BEFORE UPDATE ON outline_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.partner_success_plays
CREATE TRIGGER trg_psp_updated_at BEFORE UPDATE ON partner_success_plays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.people
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.platform_knowledge
CREATE TRIGGER update_platform_knowledge_updated_at BEFORE UPDATE ON platform_knowledge FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.playbook_templates
CREATE TRIGGER trg_playbook_templates_updated BEFORE UPDATE ON playbook_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.pricing_experiments
CREATE TRIGGER trg_pricing_experiments_updated BEFORE UPDATE ON pricing_experiments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.qa_release_gates
CREATE TRIGGER trg_qa_release_gates_updated_at BEFORE UPDATE ON qa_release_gates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.renewal_expansion_deals
CREATE TRIGGER trg_red_updated BEFORE UPDATE ON renewal_expansion_deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.renewal_workflows
CREATE TRIGGER trg_renewal_workflows_updated BEFORE UPDATE ON renewal_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.sales_proposals
CREATE TRIGGER sales_proposals_emit_ins AFTER INSERT ON sales_proposals FOR EACH ROW EXECUTE FUNCTION trg_sales_proposals_emit();
CREATE TRIGGER sales_proposals_emit_upd BEFORE UPDATE ON sales_proposals FOR EACH ROW EXECUTE FUNCTION trg_sales_proposals_emit();

-- Table: public.saved_scenarios
CREATE TRIGGER trg_saved_scenarios_updated BEFORE UPDATE ON saved_scenarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.script_change_requests
CREATE TRIGGER update_script_change_requests_updated_at BEFORE UPDATE ON script_change_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.support_tickets
CREATE TRIGGER on_ticket_assignment_notif AFTER UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION notify_on_ticket_assignment();
CREATE TRIGGER on_ticket_status_update_activity BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_ticket_activity_on_status_change();
CREATE TRIGGER trg_notify_wl_portal_ticket AFTER INSERT ON support_tickets FOR EACH ROW EXECUTE FUNCTION notify_on_wl_portal_ticket();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.tenant_brand_profiles
CREATE TRIGGER trg_tenant_brand_profiles_identity BEFORE INSERT OR UPDATE ON tenant_brand_profiles FOR EACH ROW EXECUTE FUNCTION enforce_campaign_tenant_identity();
CREATE TRIGGER trg_tenant_brand_profiles_immutable BEFORE UPDATE ON tenant_brand_profiles FOR EACH ROW EXECUTE FUNCTION enforce_campaign_identity_immutable();
CREATE TRIGGER trg_tenant_brand_profiles_touch BEFORE UPDATE ON tenant_brand_profiles FOR EACH ROW EXECUTE FUNCTION campaign_touch_updated_at();

-- Table: public.ticket_replies
CREATE TRIGGER on_ticket_reply_notif AFTER INSERT ON ticket_replies FOR EACH ROW EXECUTE FUNCTION notify_on_ticket_reply();
CREATE TRIGGER on_ticket_reply_update_activity AFTER INSERT ON ticket_replies FOR EACH ROW EXECUTE FUNCTION update_ticket_activity_on_reply();

-- Table: public.time_off_requests
CREATE TRIGGER trg_notify_time_off_request AFTER INSERT OR UPDATE ON time_off_requests FOR EACH ROW EXECUTE FUNCTION notify_time_off_request();

-- Table: public.usage_records
CREATE TRIGGER update_usage_records_updated_at BEFORE UPDATE ON usage_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.user_roles
CREATE TRIGGER trg_audit_user_roles AFTER INSERT OR DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION audit_user_roles_changes();

-- Table: public.white_label_branding
CREATE TRIGGER trg_audit_wl_branding AFTER INSERT OR DELETE OR UPDATE ON white_label_branding FOR EACH ROW EXECUTE FUNCTION audit_wl_branding_changes();
CREATE TRIGGER update_white_label_branding_updated_at BEFORE UPDATE ON white_label_branding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.white_label_clients
CREATE TRIGGER trg_notify_new_wl_client AFTER INSERT ON white_label_clients FOR EACH ROW EXECUTE FUNCTION notify_on_new_wl_client();
CREATE TRIGGER trg_set_wl_client_default_modules BEFORE INSERT ON white_label_clients FOR EACH ROW EXECUTE FUNCTION set_wl_client_default_modules();
CREATE TRIGGER trg_wl_clients_emit_lifecycle AFTER INSERT OR UPDATE OF status, user_id ON white_label_clients FOR EACH ROW EXECUTE FUNCTION trg_wl_clients_emit_lifecycle_fn();
CREATE TRIGGER update_white_label_clients_updated_at BEFORE UPDATE ON white_label_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.white_label_domain_aliases
CREATE TRIGGER trg_audit_wl_domain_aliases AFTER INSERT OR DELETE OR UPDATE ON white_label_domain_aliases FOR EACH ROW EXECUTE FUNCTION audit_wl_domain_aliases_changes();

-- Table: public.white_label_partners
CREATE TRIGGER seed_resend_kb_on_partner_insert AFTER INSERT ON white_label_partners FOR EACH ROW EXECUTE FUNCTION trigger_seed_resend_kb();
CREATE TRIGGER trg_wl_partner_owner_member AFTER INSERT OR UPDATE OF user_id ON white_label_partners FOR EACH ROW EXECUTE FUNCTION ensure_wl_partner_owner_member();
CREATE TRIGGER trg_wl_partners_emit_lifecycle AFTER INSERT OR UPDATE OF status ON white_label_partners FOR EACH ROW EXECUTE FUNCTION trg_wl_partners_emit_lifecycle_fn();
CREATE TRIGGER update_white_label_partners_updated_at BEFORE UPDATE ON white_label_partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wizard_sessions
CREATE TRIGGER wizard_sessions_set_updated_at BEFORE UPDATE ON wizard_sessions FOR EACH ROW EXECUTE FUNCTION tg_wizard_sessions_set_updated_at();

-- Table: public.wl_blog_queue
CREATE TRIGGER update_wl_blog_queue_updated_at BEFORE UPDATE ON wl_blog_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_campaign_recipients
CREATE TRIGGER trg_validate_wl_campaign_recipient BEFORE INSERT OR UPDATE ON wl_campaign_recipients FOR EACH ROW EXECUTE FUNCTION validate_wl_campaign_recipient();

-- Table: public.wl_client_reviews
CREATE TRIGGER trg_wl_client_reviews_validate BEFORE INSERT OR UPDATE ON wl_client_reviews FOR EACH ROW EXECUTE FUNCTION validate_wl_review_rating();

-- Table: public.wl_client_scripts
CREATE TRIGGER update_wl_client_scripts_updated_at BEFORE UPDATE ON wl_client_scripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_client_service_config
CREATE TRIGGER trg_notify_wl_verification_change AFTER UPDATE ON wl_client_service_config FOR EACH ROW EXECUTE FUNCTION notify_on_wl_client_verification_change();
CREATE TRIGGER update_wl_client_service_config_updated_at BEFORE UPDATE ON wl_client_service_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_client_tickets
CREATE TRIGGER update_wl_client_tickets_updated_at BEFORE UPDATE ON wl_client_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_keyword_tracker
CREATE TRIGGER update_wl_keyword_tracker_updated_at BEFORE UPDATE ON wl_keyword_tracker FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_knowledge_base
CREATE TRIGGER update_wl_knowledge_base_updated_at BEFORE UPDATE ON wl_knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_partner_client_portal_access
CREATE TRIGGER trg_enforce_wl_portal_access_immutable BEFORE UPDATE ON wl_partner_client_portal_access FOR EACH ROW EXECUTE FUNCTION enforce_wl_portal_access_immutable();
CREATE TRIGGER trg_validate_wl_portal_access BEFORE INSERT OR UPDATE ON wl_partner_client_portal_access FOR EACH ROW EXECUTE FUNCTION validate_wl_portal_access();

-- Table: public.wl_partner_feedback
CREATE TRIGGER trg_wl_pf_updated_at BEFORE UPDATE ON wl_partner_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_partner_feedback_escalations
CREATE TRIGGER trg_wl_pfe_updated_at BEFORE UPDATE ON wl_partner_feedback_escalations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_partner_handoff_documents
CREATE TRIGGER trg_enforce_wl_handoff_document_immutable BEFORE UPDATE ON wl_partner_handoff_documents FOR EACH ROW EXECUTE FUNCTION enforce_wl_handoff_document_immutable();
CREATE TRIGGER trg_guard_wl_handoff_document_delete BEFORE DELETE ON wl_partner_handoff_documents FOR EACH ROW EXECUTE FUNCTION guard_wl_handoff_document_delete();
CREATE TRIGGER trg_validate_wl_handoff_document BEFORE INSERT OR UPDATE ON wl_partner_handoff_documents FOR EACH ROW EXECUTE FUNCTION validate_wl_handoff_document();

-- Table: public.wl_partner_handoff_items
CREATE TRIGGER trg_enforce_wl_handoff_item_immutable BEFORE UPDATE ON wl_partner_handoff_items FOR EACH ROW EXECUTE FUNCTION enforce_wl_handoff_item_immutable();
CREATE TRIGGER trg_validate_wl_handoff_item BEFORE INSERT OR UPDATE ON wl_partner_handoff_items FOR EACH ROW EXECUTE FUNCTION validate_wl_handoff_item();

-- Table: public.wl_partner_handoff_requests
CREATE TRIGGER trg_enforce_wl_handoff_request_partner_writable BEFORE UPDATE ON wl_partner_handoff_requests FOR EACH ROW EXECUTE FUNCTION enforce_wl_handoff_request_partner_writable();
CREATE TRIGGER trg_validate_wl_handoff_request BEFORE INSERT OR UPDATE ON wl_partner_handoff_requests FOR EACH ROW EXECUTE FUNCTION validate_wl_handoff_request();

-- Table: public.wl_partner_leads
CREATE TRIGGER wl_partner_leads_immutable_partner BEFORE UPDATE ON wl_partner_leads FOR EACH ROW EXECUTE FUNCTION enforce_wl_partner_lead_immutable_partner();
CREATE TRIGGER wl_partner_leads_set_updated_at BEFORE UPDATE ON wl_partner_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER wl_partner_leads_validate BEFORE INSERT OR UPDATE ON wl_partner_leads FOR EACH ROW EXECUTE FUNCTION validate_wl_partner_lead();

-- Table: public.wl_partner_members
CREATE TRIGGER wl_partner_members_set_updated_at BEFORE UPDATE ON wl_partner_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_partner_onboarding_handoffs
CREATE TRIGGER trg_enforce_wl_handoff_immutable_partner BEFORE UPDATE ON wl_partner_onboarding_handoffs FOR EACH ROW EXECUTE FUNCTION enforce_wl_handoff_immutable_partner();
CREATE TRIGGER trg_validate_wl_handoff BEFORE INSERT OR UPDATE ON wl_partner_onboarding_handoffs FOR EACH ROW EXECUTE FUNCTION validate_wl_handoff();

-- Table: public.wl_partner_proposal_activity
CREATE TRIGGER trg_enforce_wl_proposal_activity_immutable BEFORE DELETE OR UPDATE ON wl_partner_proposal_activity FOR EACH ROW EXECUTE FUNCTION enforce_wl_proposal_activity_immutable();
CREATE TRIGGER trg_validate_wl_proposal_activity BEFORE INSERT OR UPDATE ON wl_partner_proposal_activity FOR EACH ROW EXECUTE FUNCTION validate_wl_proposal_activity();

-- Table: public.wl_partner_proposal_shares
CREATE TRIGGER trg_enforce_wl_proposal_share_immutable BEFORE UPDATE ON wl_partner_proposal_shares FOR EACH ROW EXECUTE FUNCTION enforce_wl_proposal_share_immutable();
CREATE TRIGGER trg_validate_wl_proposal_share BEFORE INSERT OR UPDATE ON wl_partner_proposal_shares FOR EACH ROW EXECUTE FUNCTION validate_wl_proposal_share();

-- Table: public.wl_partner_proposals
CREATE TRIGGER trg_set_wl_partner_proposal_number BEFORE INSERT ON wl_partner_proposals FOR EACH ROW EXECUTE FUNCTION set_wl_partner_proposal_number();
CREATE TRIGGER trg_validate_wl_partner_proposal BEFORE INSERT OR UPDATE ON wl_partner_proposals FOR EACH ROW EXECUTE FUNCTION validate_wl_partner_proposal();
CREATE TRIGGER trg_wl_partner_proposal_immutable_partner BEFORE UPDATE ON wl_partner_proposals FOR EACH ROW EXECUTE FUNCTION enforce_wl_partner_proposal_immutable_partner();
CREATE TRIGGER trg_wl_partner_proposal_lead_match BEFORE INSERT OR UPDATE ON wl_partner_proposals FOR EACH ROW EXECUTE FUNCTION enforce_wl_partner_proposal_lead_match();
CREATE TRIGGER trg_wl_partner_proposals_updated_at BEFORE UPDATE ON wl_partner_proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_partner_tasks
CREATE TRIGGER trg_enforce_wl_task_immutable_partner BEFORE UPDATE ON wl_partner_tasks FOR EACH ROW EXECUTE FUNCTION enforce_wl_task_immutable_partner();
CREATE TRIGGER trg_validate_wl_task BEFORE INSERT OR UPDATE ON wl_partner_tasks FOR EACH ROW EXECUTE FUNCTION validate_wl_task();

-- Table: public.wl_partner_usage_summary
CREATE TRIGGER update_wl_partner_usage_summary_updated_at BEFORE UPDATE ON wl_partner_usage_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_usage_records
CREATE TRIGGER update_wl_usage_records_updated_at BEFORE UPDATE ON wl_usage_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_wholesale_pricing
CREATE TRIGGER update_wl_wholesale_pricing_updated_at BEFORE UPDATE ON wl_wholesale_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: public.wl_wordpress_connections
CREATE TRIGGER update_wl_wordpress_connections_updated_at BEFORE UPDATE ON wl_wordpress_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;
