
-- Phase 4: Activity log + recipient context

-- 1. Add denormalized recipient columns to wl_partner_proposals
ALTER TABLE public.wl_partner_proposals
  ADD COLUMN IF NOT EXISTS last_recipient_name text,
  ADD COLUMN IF NOT EXISTS last_recipient_email text;

-- 2. Replace validation trigger function to add length/format checks for recipient fields
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
  RETURN NEW;
END;
$function$;

-- 3. Activity log table
CREATE TABLE IF NOT EXISTS public.wl_partner_proposal_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.wl_partner_proposals(id) ON DELETE CASCADE,
  share_id uuid NULL REFERENCES public.wl_partner_proposal_shares(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  actor_user_id uuid NULL,
  actor_label text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wl_proposal_activity_proposal
  ON public.wl_partner_proposal_activity (proposal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wl_proposal_activity_partner
  ON public.wl_partner_proposal_activity (partner_id, created_at DESC);

-- 4. RLS
ALTER TABLE public.wl_partner_proposal_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner owners and admins can view their proposal activity"
  ON public.wl_partner_proposal_activity
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Partner owners and admins can insert proposal activity"
  ON public.wl_partner_proposal_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- No UPDATE/DELETE policies — immutable for everyone except admin (admin uses service role / direct DB)

-- 5. Validation trigger: enum + length + cross-tenant guard
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
    'viewed','accepted','declined','exported_pdf','recipient_updated'
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

CREATE TRIGGER trg_validate_wl_proposal_activity
  BEFORE INSERT OR UPDATE ON public.wl_partner_proposal_activity
  FOR EACH ROW EXECUTE FUNCTION public.validate_wl_proposal_activity();

-- 6. Immutability trigger: block UPDATE/DELETE for non-admin
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
$function$;

CREATE TRIGGER trg_enforce_wl_proposal_activity_immutable
  BEFORE UPDATE OR DELETE ON public.wl_partner_proposal_activity
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wl_proposal_activity_immutable();
