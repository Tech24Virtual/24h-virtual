-- 1. Add checklist_state column to handoffs
ALTER TABLE public.wl_partner_onboarding_handoffs
  ADD COLUMN IF NOT EXISTS checklist_state jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Replace handoff validation trigger to also validate checklist_state shape
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

  -- Validate checklist_state structure
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

  -- Cross-tenant: proposal partner must match
  SELECT partner_id INTO v_proposal_partner
  FROM public.wl_partner_proposals WHERE id = NEW.proposal_id;
  IF v_proposal_partner IS NULL THEN
    RAISE EXCEPTION 'Linked proposal does not exist';
  END IF;
  IF v_proposal_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'Handoff partner_id does not match proposal partner_id';
  END IF;

  -- Cross-tenant: lead partner must match if set
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
$function$;

-- 3. Activity event_type CHECK already includes new events (per validate_wl_proposal_activity in db-functions: client_portal_viewed, client_portal_acknowledged are present). Add task_created.
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
$function$;