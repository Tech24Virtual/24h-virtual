
-- 1. Normalize any pre-existing pipeline_stage values that fall outside the canonical set
UPDATE public.leads
SET pipeline_stage = 'new'
WHERE pipeline_stage IS NULL
   OR pipeline_stage NOT IN ('new','contacted','qualified','proposal','sales','onboarding','ready_for_billing','active','won','lost','churned');

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_pipeline_stage_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_pipeline_stage_check
  CHECK (pipeline_stage IN ('new','contacted','qualified','proposal','sales','onboarding','ready_for_billing','active','won','lost','churned'));

-- 2. Stage-transition timestamps
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS won_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_reason text;

ALTER TABLE public.sales_proposals
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- 3. Stamp transitions automatically on stage change (trigger fn)
CREATE OR REPLACE FUNCTION public.trg_leads_stamp_stage_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END; $$;

DROP TRIGGER IF EXISTS leads_stamp_stage_dates ON public.leads;
CREATE TRIGGER leads_stamp_stage_dates
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_leads_stamp_stage_dates();

-- 4. Sales proposal lifecycle events
CREATE OR REPLACE FUNCTION public.trg_sales_proposals_emit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END; $$;

DROP TRIGGER IF EXISTS sales_proposals_emit_ins ON public.sales_proposals;
CREATE TRIGGER sales_proposals_emit_ins
  AFTER INSERT ON public.sales_proposals
  FOR EACH ROW EXECUTE FUNCTION public.trg_sales_proposals_emit();

DROP TRIGGER IF EXISTS sales_proposals_emit_upd ON public.sales_proposals;
CREATE TRIGGER sales_proposals_emit_upd
  BEFORE UPDATE ON public.sales_proposals
  FOR EACH ROW EXECUTE FUNCTION public.trg_sales_proposals_emit();

-- 5. Meetings lifecycle events
CREATE OR REPLACE FUNCTION public.trg_meetings_emit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END; $$;

DROP TRIGGER IF EXISTS meetings_emit_ins ON public.meetings;
CREATE TRIGGER meetings_emit_ins
  AFTER INSERT ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.trg_meetings_emit();

DROP TRIGGER IF EXISTS meetings_emit_upd ON public.meetings;
CREATE TRIGGER meetings_emit_upd
  AFTER UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.trg_meetings_emit();

-- 6. Affiliate referral linkage event + auto converted_at
CREATE OR REPLACE FUNCTION public.trg_affiliate_referrals_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.lead_id IS NOT NULL AND OLD.lead_id IS NULL THEN
    IF NEW.converted_at IS NULL THEN NEW.converted_at := now(); END IF;
    PERFORM public.emit_dashboard_event('revenue.referral.linked',
      'affiliate', 'sales', NEW.id::text, NULL,
      jsonb_build_object('affiliate_id', NEW.affiliate_id, 'lead_id', NEW.lead_id));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS affiliate_referrals_link ON public.affiliate_referrals;
CREATE TRIGGER affiliate_referrals_link
  BEFORE UPDATE ON public.affiliate_referrals
  FOR EACH ROW EXECUTE FUNCTION public.trg_affiliate_referrals_link();

-- 7. Harden convert_lead_to_delivery: idempotent + reject terminal states
CREATE OR REPLACE FUNCTION public.convert_lead_to_delivery(_lead_id uuid, _notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END; $$;

-- 8. Reporting views
CREATE OR REPLACE VIEW public.v_revenue_pipeline
WITH (security_invoker = true) AS
SELECT
  pipeline_stage,
  count(*)::int AS lead_count,
  COALESCE(sum((plan_minutes * 2)::numeric), 0) AS estimated_value_usd,
  count(*) FILTER (WHERE assigned_sales_rep IS NULL)::int AS unassigned_count,
  count(*) FILTER (WHERE next_follow_up < now())::int AS overdue_followups
FROM public.leads
GROUP BY pipeline_stage;

CREATE OR REPLACE VIEW public.v_revenue_lead_360
WITH (security_invoker = true) AS
SELECT
  l.id AS lead_id, l.name, l.email, l.company, l.source, l.pipeline_stage,
  l.lead_temperature, l.assigned_sales_rep, l.qualified_at, l.won_at, l.lost_at,
  (SELECT count(*) FROM public.meetings m WHERE m.lead_id = l.id)::int AS meetings_count,
  (SELECT max(scheduled_at) FROM public.meetings m WHERE m.lead_id = l.id) AS latest_meeting_at,
  (SELECT count(*) FROM public.sales_proposals p WHERE p.lead_id = l.id)::int AS proposals_count,
  (SELECT max(sent_at) FROM public.sales_proposals p WHERE p.lead_id = l.id) AS latest_proposal_sent_at,
  EXISTS (SELECT 1 FROM public.affiliate_referrals ar WHERE ar.lead_id = l.id) AS has_affiliate_referral,
  EXISTS (SELECT 1 FROM public.lead_conversions c WHERE c.lead_id = l.id) AS converted
FROM public.leads l;
