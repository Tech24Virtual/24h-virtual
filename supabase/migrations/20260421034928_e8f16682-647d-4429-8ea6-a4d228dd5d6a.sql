-- ============================================================
-- Phase 2: wl_partner_proposals
-- Isolated WL partner proposal layer on top of wl_partner_leads
-- ============================================================

CREATE TABLE public.wl_partner_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  lead_id uuid NULL REFERENCES public.wl_partner_leads(id) ON DELETE SET NULL,
  created_by uuid NULL,
  proposal_number text NOT NULL,
  title text NOT NULL,
  offering_name text NULL,
  scope_summary text NULL,
  amount numeric(12,2) NULL,
  currency text NULL,
  notes text NULL,
  status text NOT NULL DEFAULT 'draft',
  valid_until timestamptz NULL,
  sent_at timestamptz NULL,
  viewed_at timestamptz NULL,
  accepted_at timestamptz NULL,
  declined_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wl_partner_proposals_partner ON public.wl_partner_proposals(partner_id);
CREATE INDEX idx_wl_partner_proposals_partner_status ON public.wl_partner_proposals(partner_id, status);
CREATE INDEX idx_wl_partner_proposals_partner_created ON public.wl_partner_proposals(partner_id, created_at DESC);
CREATE INDEX idx_wl_partner_proposals_lead ON public.wl_partner_proposals(lead_id);
CREATE UNIQUE INDEX idx_wl_partner_proposals_partner_number ON public.wl_partner_proposals(partner_id, proposal_number);

-- ============================================================
-- Validation trigger: lengths, status enum, currency, amount
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_wl_partner_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_wl_partner_proposal
BEFORE INSERT OR UPDATE ON public.wl_partner_proposals
FOR EACH ROW EXECUTE FUNCTION public.validate_wl_partner_proposal();

-- ============================================================
-- updated_at trigger (reuses shared update_updated_at_column)
-- ============================================================
CREATE TRIGGER trg_wl_partner_proposals_updated_at
BEFORE UPDATE ON public.wl_partner_proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Immutable partner_id (admin override)
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_wl_partner_proposal_immutable_partner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'partner_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wl_partner_proposal_immutable_partner
BEFORE UPDATE ON public.wl_partner_proposals
FOR EACH ROW EXECUTE FUNCTION public.enforce_wl_partner_proposal_immutable_partner();

-- ============================================================
-- Cross-tenant lead linkage guard
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_wl_partner_proposal_lead_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER trg_wl_partner_proposal_lead_match
BEFORE INSERT OR UPDATE ON public.wl_partner_proposals
FOR EACH ROW EXECUTE FUNCTION public.enforce_wl_partner_proposal_lead_match();

-- ============================================================
-- Auto-generate proposal_number (WL-YYYYMM-XXXXXX base36)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_wl_partner_proposal_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER trg_set_wl_partner_proposal_number
BEFORE INSERT ON public.wl_partner_proposals
FOR EACH ROW EXECUTE FUNCTION public.set_wl_partner_proposal_number();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.wl_partner_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own proposals"
ON public.wl_partner_proposals
FOR SELECT
TO authenticated
USING (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Partners can insert own proposals"
ON public.wl_partner_proposals
FOR INSERT
TO authenticated
WITH CHECK (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Partners can update own proposals"
ON public.wl_partner_proposals
FOR UPDATE
TO authenticated
USING (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Partners can delete own proposals"
ON public.wl_partner_proposals
FOR DELETE
TO authenticated
USING (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
