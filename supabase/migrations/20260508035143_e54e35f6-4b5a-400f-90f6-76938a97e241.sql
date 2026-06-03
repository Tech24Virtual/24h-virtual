
-- ─────────────────────────────────────────────────────────────
-- Phase 4 — Delivery Unification
-- ─────────────────────────────────────────────────────────────

-- 1. Intake status-change trigger: timestamps + event + audit
CREATE OR REPLACE FUNCTION public.trg_intake_emit_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_intake_stamp_status_dates ON public.internal_fulfillment_intakes;
CREATE TRIGGER trg_intake_stamp_status_dates
  BEFORE UPDATE ON public.internal_fulfillment_intakes
  FOR EACH ROW EXECUTE FUNCTION public.trg_intake_emit_status_change();

CREATE OR REPLACE FUNCTION public.trg_intake_emit_status_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_intake_emit_status_after ON public.internal_fulfillment_intakes;
CREATE TRIGGER trg_intake_emit_status_after
  AFTER UPDATE ON public.internal_fulfillment_intakes
  FOR EACH ROW EXECUTE FUNCTION public.trg_intake_emit_status_after();

-- 2. Handoff status-change emit
CREATE OR REPLACE FUNCTION public.trg_handoff_emit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_handoff_emit_status ON public.client_onboarding_handoffs;
CREATE TRIGGER trg_handoff_emit_status
  AFTER INSERT OR UPDATE ON public.client_onboarding_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.trg_handoff_emit_status();

-- 3. Campaign status-change emit (alongside existing trg_campaigns_emit_created)
CREATE OR REPLACE FUNCTION public.trg_campaigns_emit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_campaigns_emit_status ON public.campaigns;
CREATE TRIGGER trg_campaigns_emit_status
  AFTER UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.trg_campaigns_emit_status();

-- 4. Delivery pipeline view (ops legibility)
DROP VIEW IF EXISTS public.v_delivery_pipeline;
CREATE VIEW public.v_delivery_pipeline
WITH (security_invoker = true)
AS
SELECT
  status,
  COUNT(*)::int AS intake_count,
  COUNT(*) FILTER (WHERE priority = 'urgent')::int AS urgent_count,
  COUNT(*) FILTER (WHERE assigned_to IS NULL)::int AS unassigned_count,
  COUNT(*) FILTER (WHERE source = 'wl')::int AS wl_count,
  COUNT(*) FILTER (WHERE source = 'direct')::int AS direct_count,
  MIN(submitted_at) AS oldest_submitted_at
FROM public.internal_fulfillment_intakes
WHERE status <> 'closed'
GROUP BY status;

-- 5. Per-lead delivery 360 view
DROP VIEW IF EXISTS public.v_account_delivery_360;
CREATE VIEW public.v_account_delivery_360
WITH (security_invoker = true)
AS
SELECT
  l.id AS lead_id,
  l.name,
  l.company,
  l.pipeline_stage,
  i.id AS intake_id,
  i.intake_number,
  i.status AS intake_status,
  i.priority AS intake_priority,
  i.activated_at,
  h.id AS handoff_id,
  h.status AS handoff_status,
  h.checklist_template,
  (SELECT COUNT(*)::int FROM public.campaigns c
     WHERE c.client_lead_id = l.id) AS campaigns_count,
  (SELECT COUNT(*)::int FROM public.campaigns c
     WHERE c.client_lead_id = l.id AND c.status = 'live') AS live_campaigns_count,
  (SELECT COUNT(*)::int FROM public.support_tickets st
     WHERE st.lead_id = l.id AND st.status NOT IN ('resolved','closed')) AS open_tickets_count
FROM public.leads l
LEFT JOIN LATERAL (
  SELECT * FROM public.internal_fulfillment_intakes
   WHERE client_lead_id = l.id ORDER BY submitted_at DESC NULLS LAST LIMIT 1
) i ON true
LEFT JOIN public.client_onboarding_handoffs h ON h.client_lead_id = l.id
WHERE EXISTS (
  SELECT 1 FROM public.lead_conversions lc WHERE lc.lead_id = l.id
);

-- 6. Client-safe service status view (scoped to auth.uid via lead.user_id or handoff.client_user_id)
DROP VIEW IF EXISTS public.v_client_delivery_status;
CREATE VIEW public.v_client_delivery_status
WITH (security_invoker = true)
AS
SELECT
  l.id AS lead_id,
  l.name,
  l.company,
  CASE WHEN h.status IS NULL THEN 'not_started'
       WHEN h.status = 'collecting_info' THEN 'collecting_info'
       WHEN h.status IN ('submitted','in_review') THEN 'in_review'
       WHEN h.status = 'activated' THEN 'live'
       ELSE h.status END AS service_state,
  h.status AS onboarding_status,
  i.status AS fulfillment_status,
  i.intake_number,
  i.activated_at,
  (SELECT COUNT(*)::int FROM public.campaigns c
     WHERE c.client_lead_id = l.id AND c.status = 'live') AS live_campaigns_count,
  (SELECT COUNT(*)::int FROM public.campaigns c
     WHERE c.client_lead_id = l.id) AS total_campaigns_count,
  (SELECT COUNT(*)::int FROM public.support_tickets st
     WHERE st.lead_id = l.id AND st.status NOT IN ('resolved','closed')) AS open_tickets_count,
  (SELECT MAX(de.occurred_at) FROM public.dashboard_events de
     WHERE de.target = i.id::text AND de.event_name LIKE 'delivery.%') AS last_delivery_event_at
FROM public.leads l
LEFT JOIN public.client_onboarding_handoffs h ON h.client_lead_id = l.id
LEFT JOIN LATERAL (
  SELECT * FROM public.internal_fulfillment_intakes
   WHERE client_lead_id = l.id ORDER BY submitted_at DESC NULLS LAST LIMIT 1
) i ON true
WHERE l.user_id = auth.uid() OR h.client_user_id = auth.uid();

-- 7. Safe intake status setter (admin/supervisor)
CREATE OR REPLACE FUNCTION public.set_intake_status(
  _intake_id uuid,
  _new_status text,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
