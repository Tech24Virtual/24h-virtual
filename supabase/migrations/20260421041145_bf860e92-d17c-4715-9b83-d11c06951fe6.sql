-- Phase 3: White Label Proposal Sharing

-- 1) Add new acceptance/decline columns on wl_partner_proposals
ALTER TABLE public.wl_partner_proposals
  ADD COLUMN IF NOT EXISTS accepted_by_name text,
  ADD COLUMN IF NOT EXISTS acceptance_note text,
  ADD COLUMN IF NOT EXISTS declined_reason text;

-- 2) Update proposal validation trigger to include length caps for new fields
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
  RETURN NEW;
END;
$function$;

-- 3) Create wl_partner_proposal_shares
CREATE TABLE IF NOT EXISTS public.wl_partner_proposal_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.wl_partner_proposals(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_by uuid NULL,
  recipient_name text NULL,
  recipient_email text NULL,
  expires_at timestamptz NULL,
  revoked_at timestamptz NULL,
  last_viewed_at timestamptz NULL,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wl_proposal_shares_partner ON public.wl_partner_proposal_shares (partner_id);
CREATE INDEX IF NOT EXISTS idx_wl_proposal_shares_proposal ON public.wl_partner_proposal_shares (proposal_id, created_at DESC);

-- 4) Enable RLS — only partner-owners (or admin) can manage shares; public access goes via edge function service role
ALTER TABLE public.wl_partner_proposal_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wl_proposal_shares_select_owner"
ON public.wl_partner_proposal_shares
FOR SELECT
TO authenticated
USING (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "wl_proposal_shares_insert_owner"
ON public.wl_partner_proposal_shares
FOR INSERT
TO authenticated
WITH CHECK (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "wl_proposal_shares_update_owner"
ON public.wl_partner_proposal_shares
FOR UPDATE
TO authenticated
USING (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "wl_proposal_shares_delete_owner"
ON public.wl_partner_proposal_shares
FOR DELETE
TO authenticated
USING (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- 5) Validation trigger — caps + email format + cross-tenant guard
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
$function$;

DROP TRIGGER IF EXISTS trg_validate_wl_proposal_share ON public.wl_partner_proposal_shares;
CREATE TRIGGER trg_validate_wl_proposal_share
BEFORE INSERT OR UPDATE ON public.wl_partner_proposal_shares
FOR EACH ROW EXECUTE FUNCTION public.validate_wl_proposal_share();

-- 6) Immutability trigger — block partner_id / proposal_id / token_hash mutations for non-admins
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
$function$;

DROP TRIGGER IF EXISTS trg_enforce_wl_proposal_share_immutable ON public.wl_partner_proposal_shares;
CREATE TRIGGER trg_enforce_wl_proposal_share_immutable
BEFORE UPDATE ON public.wl_partner_proposal_shares
FOR EACH ROW EXECUTE FUNCTION public.enforce_wl_proposal_share_immutable();