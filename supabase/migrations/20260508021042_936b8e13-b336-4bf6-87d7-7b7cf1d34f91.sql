CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.emit_dashboard_event(
  _event_name text, _surface text, _persona text, _target text, _user_id uuid, _properties jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.dashboard_events (event_name, surface, persona, target, user_id, properties)
  VALUES (_event_name, _surface, _persona, _target, _user_id, COALESCE(_properties, '{}'::jsonb));
EXCEPTION WHEN OTHERS THEN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_leads_emit_capture_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_dashboard_event(
    'lead.captured', COALESCE(NEW.source, 'unknown'), 'lead', NEW.id::text, NEW.user_id,
    jsonb_build_object('pipeline_stage', NEW.pipeline_stage, 'service_type', NEW.service_type,
                       'company', NEW.company, 'country', NEW.country)
  );
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_leads_emit_capture ON public.leads;
CREATE TRIGGER trg_leads_emit_capture AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.trg_leads_emit_capture_event();

CREATE OR REPLACE FUNCTION public.trg_leads_emit_stage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;
DROP TRIGGER IF EXISTS trg_leads_emit_stage_change ON public.leads;
CREATE TRIGGER trg_leads_emit_stage_change AFTER UPDATE OF pipeline_stage ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.trg_leads_emit_stage_change();

CREATE OR REPLACE FUNCTION public.trg_lead_conversions_emit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lead_source text;
BEGIN
  SELECT source INTO _lead_source FROM public.leads WHERE id = NEW.lead_id;
  PERFORM public.emit_dashboard_event('lead.converted', 'crm', 'sales',
    NEW.lead_id::text, NEW.converted_by,
    jsonb_build_object('source', _lead_source, 'metadata', NEW.metadata));
  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, metadata)
  VALUES (NEW.converted_by, 'lead.converted', 'leads', NEW.lead_id::text, COALESCE(NEW.metadata, '{}'::jsonb));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_lead_conversions_emit ON public.lead_conversions;
CREATE TRIGGER trg_lead_conversions_emit AFTER INSERT ON public.lead_conversions
FOR EACH ROW EXECUTE FUNCTION public.trg_lead_conversions_emit();

CREATE OR REPLACE FUNCTION public.trg_intake_emit_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_dashboard_event('delivery.intake.created', NEW.source, 'fulfillment',
    NEW.id::text, NEW.submitted_by,
    jsonb_build_object('intake_number', NEW.intake_number, 'lead_id', NEW.client_lead_id,
                       'partner_id', NEW.partner_id, 'status', NEW.status));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_intake_emit_created ON public.internal_fulfillment_intakes;
CREATE TRIGGER trg_intake_emit_created AFTER INSERT ON public.internal_fulfillment_intakes
FOR EACH ROW EXECUTE FUNCTION public.trg_intake_emit_created();

CREATE OR REPLACE FUNCTION public.trg_campaigns_emit_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_dashboard_event('delivery.campaign.created',
    CASE WHEN NEW.tenant_kind::text = 'wl_partner' THEN 'wl' ELSE 'admin' END,
    'fulfillment', NEW.id::text, NEW.created_by,
    jsonb_build_object('tenant_kind', NEW.tenant_kind, 'wl_partner_id', NEW.wl_partner_id,
                       'wl_client_id', NEW.wl_client_id, 'client_lead_id', NEW.client_lead_id,
                       'status', NEW.status));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_campaigns_emit_created ON public.campaigns;
CREATE TRIGGER trg_campaigns_emit_created AFTER INSERT ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.trg_campaigns_emit_created();

CREATE OR REPLACE FUNCTION public.convert_lead_to_delivery(_lead_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _actor uuid := auth.uid();
  _lead public.leads%ROWTYPE;
  _intake_id uuid;
  _intake_num text;
  _conv_id uuid;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT (public.has_role(_actor, 'admin'::app_role)
       OR public.has_role(_actor, 'sales'::app_role)
       OR public.has_role(_actor, 'supervisor'::app_role)) THEN
    RAISE EXCEPTION 'not authorized to convert leads';
  END IF;
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead % not found', _lead_id; END IF;

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
                            'intake_id', _intake_id, 'intake_number', _intake_num);
END; $$;
REVOKE ALL ON FUNCTION public.convert_lead_to_delivery(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_delivery(uuid, text) TO authenticated;

CREATE OR REPLACE VIEW public.v_lifecycle_overview WITH (security_invoker = true) AS
SELECT
  l.id AS lead_id, l.name, l.email, l.company,
  COALESCE(l.source, 'unknown') AS source,
  l.pipeline_stage, l.lead_temperature, l.score,
  l.assigned_sales_rep, l.assigned_onboarding_rep,
  l.country, l.billing_currency, l.service_type,
  l.created_at AS lead_created_at,
  EXISTS(SELECT 1 FROM public.lead_conversions c WHERE c.lead_id = l.id) AS converted,
  (SELECT MAX(c.converted_at) FROM public.lead_conversions c WHERE c.lead_id = l.id) AS converted_at,
  (SELECT i.status FROM public.internal_fulfillment_intakes i
     WHERE i.client_lead_id = l.id ORDER BY i.submitted_at DESC LIMIT 1) AS intake_status,
  (SELECT i.id FROM public.internal_fulfillment_intakes i
     WHERE i.client_lead_id = l.id ORDER BY i.submitted_at DESC LIMIT 1) AS intake_id,
  (SELECT COUNT(*) FROM public.campaigns ca WHERE ca.client_lead_id = l.id) AS campaigns_count,
  (SELECT COUNT(*) FROM public.campaigns ca WHERE ca.client_lead_id = l.id AND ca.status='active') AS active_campaigns,
  (SELECT MAX(cl.created_at) FROM public.call_logs cl WHERE cl.client_id = l.id) AS last_call_at,
  l.last_payment_status, l.payment_failure_count
FROM public.leads l;
REVOKE ALL ON public.v_lifecycle_overview FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_lifecycle_overview TO authenticated;
COMMENT ON VIEW public.v_lifecycle_overview IS 'Phase 1: cross-domain per-lead lifecycle. SECURITY INVOKER.';

CREATE OR REPLACE VIEW public.v_intake_pipeline WITH (security_invoker = true) AS
SELECT
  i.id, i.intake_number, i.source, i.status, i.priority,
  i.partner_id, i.client_lead_id, i.submitted_by, i.submitted_at,
  i.received_at, i.approved_at, i.activated_at, i.closed_at, i.assigned_to,
  EXTRACT(EPOCH FROM (now() - i.submitted_at)) / 3600.0 AS age_hours,
  l.name AS lead_name, l.email AS lead_email,
  p.company_name AS partner_name
FROM public.internal_fulfillment_intakes i
LEFT JOIN public.leads l ON l.id = i.client_lead_id
LEFT JOIN public.white_label_partners p ON p.id = i.partner_id;
REVOKE ALL ON public.v_intake_pipeline FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_intake_pipeline TO authenticated;
COMMENT ON VIEW public.v_intake_pipeline IS 'Phase 1: fulfillment intake pipeline (24H + WL).';
