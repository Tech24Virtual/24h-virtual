-- =====================================================================
-- Phase 5 — Post-Acceptance Workflow
-- =====================================================================

-- 1) Extend activity log validation to allow new event types
CREATE OR REPLACE FUNCTION public.validate_wl_proposal_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal_partner uuid;
BEGIN
  IF NEW.event_type NOT IN (
    'share_link_created','share_link_revoked','marked_sent',
    'viewed','accepted','declined','exported_pdf','recipient_updated',
    'client_portal_viewed','client_portal_acknowledged'
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
$$;

-- =====================================================================
-- 2) wl_partner_onboarding_handoffs (created first; tasks references it)
-- =====================================================================

CREATE TABLE public.wl_partner_onboarding_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.wl_partner_proposals(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.wl_partner_leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  client_name_snapshot text,
  client_email_snapshot text,
  company_snapshot text,
  accepted_scope_snapshot text,
  accepted_amount_snapshot numeric,
  currency_snapshot text,
  handoff_notes text,
  onboarding_owner uuid,
  kickoff_due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wl_handoff_unique_proposal UNIQUE (proposal_id)
);

CREATE INDEX idx_wl_handoffs_partner_status
  ON public.wl_partner_onboarding_handoffs (partner_id, status);

ALTER TABLE public.wl_partner_onboarding_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wl_handoffs_partner_select"
  ON public.wl_partner_onboarding_handoffs FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "wl_handoffs_partner_insert"
  ON public.wl_partner_onboarding_handoffs FOR INSERT
  WITH CHECK (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "wl_handoffs_partner_update"
  ON public.wl_partner_onboarding_handoffs FOR UPDATE
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "wl_handoffs_partner_delete"
  ON public.wl_partner_onboarding_handoffs FOR DELETE
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.validate_wl_handoff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal_partner uuid;
  v_lead_partner uuid;
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
$$;

CREATE TRIGGER trg_validate_wl_handoff
  BEFORE INSERT OR UPDATE ON public.wl_partner_onboarding_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.validate_wl_handoff();

CREATE OR REPLACE FUNCTION public.enforce_wl_handoff_immutable_partner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER trg_enforce_wl_handoff_immutable_partner
  BEFORE UPDATE ON public.wl_partner_onboarding_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wl_handoff_immutable_partner();

-- =====================================================================
-- 3) wl_partner_tasks
-- =====================================================================

CREATE TABLE public.wl_partner_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.wl_partner_proposals(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.wl_partner_leads(id) ON DELETE SET NULL,
  handoff_id uuid REFERENCES public.wl_partner_onboarding_handoffs(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  task_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  source_event text NOT NULL,
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wl_tasks_partner_status_due
  ON public.wl_partner_tasks (partner_id, status, due_at);
CREATE INDEX idx_wl_tasks_proposal ON public.wl_partner_tasks (proposal_id);
CREATE INDEX idx_wl_tasks_handoff ON public.wl_partner_tasks (handoff_id);

ALTER TABLE public.wl_partner_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wl_tasks_partner_select"
  ON public.wl_partner_tasks FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "wl_tasks_partner_insert"
  ON public.wl_partner_tasks FOR INSERT
  WITH CHECK (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "wl_tasks_partner_update"
  ON public.wl_partner_tasks FOR UPDATE
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "wl_tasks_partner_delete"
  ON public.wl_partner_tasks FOR DELETE
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.validate_wl_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER trg_validate_wl_task
  BEFORE INSERT OR UPDATE ON public.wl_partner_tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_wl_task();

CREATE OR REPLACE FUNCTION public.enforce_wl_task_immutable_partner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER trg_enforce_wl_task_immutable_partner
  BEFORE UPDATE ON public.wl_partner_tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wl_task_immutable_partner();

-- =====================================================================
-- 4) wl_partner_client_portal_access
-- =====================================================================

CREATE TABLE public.wl_partner_client_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  handoff_id uuid NOT NULL REFERENCES public.wl_partner_onboarding_handoffs(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.wl_partner_proposals(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  recipient_email text,
  expires_at timestamptz,
  revoked_at timestamptz,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count int NOT NULL DEFAULT 0,
  acknowledged_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wl_portal_access_partner ON public.wl_partner_client_portal_access (partner_id);
CREATE INDEX idx_wl_portal_access_handoff
  ON public.wl_partner_client_portal_access (handoff_id, created_at DESC);

ALTER TABLE public.wl_partner_client_portal_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wl_portal_access_partner_select"
  ON public.wl_partner_client_portal_access FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "wl_portal_access_partner_insert"
  ON public.wl_partner_client_portal_access FOR INSERT
  WITH CHECK (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "wl_portal_access_partner_update"
  ON public.wl_partner_client_portal_access FOR UPDATE
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "wl_portal_access_partner_delete"
  ON public.wl_partner_client_portal_access FOR DELETE
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.validate_wl_portal_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER trg_validate_wl_portal_access
  BEFORE INSERT OR UPDATE ON public.wl_partner_client_portal_access
  FOR EACH ROW EXECUTE FUNCTION public.validate_wl_portal_access();

CREATE OR REPLACE FUNCTION public.enforce_wl_portal_access_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER trg_enforce_wl_portal_access_immutable
  BEFORE UPDATE ON public.wl_partner_client_portal_access
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wl_portal_access_immutable();
