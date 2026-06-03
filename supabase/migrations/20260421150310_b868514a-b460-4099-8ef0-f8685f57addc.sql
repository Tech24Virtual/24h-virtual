-- Add checklist_template column with safe default
ALTER TABLE public.wl_partner_proposals
  ADD COLUMN IF NOT EXISTS checklist_template text NOT NULL DEFAULT 'standard';

-- Extend validation trigger to enforce allowed templates
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
$function$;