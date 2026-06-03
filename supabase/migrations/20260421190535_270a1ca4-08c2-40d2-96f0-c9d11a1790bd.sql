-- =========================================================
-- 1. Extend internal_fulfillment_intakes for dual-source
-- =========================================================

ALTER TABLE public.internal_fulfillment_intakes
  ALTER COLUMN partner_id DROP NOT NULL,
  ALTER COLUMN source_handoff_id DROP NOT NULL,
  ALTER COLUMN proposal_id DROP NOT NULL;

ALTER TABLE public.internal_fulfillment_intakes
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'wl',
  ADD COLUMN IF NOT EXISTS client_lead_id uuid NULL REFERENCES public.leads(id) ON DELETE SET NULL;

ALTER TABLE public.internal_fulfillment_intakes
  ADD CONSTRAINT internal_fulfillment_intakes_source_check
  CHECK (source IN ('wl', 'direct'));

ALTER TABLE public.internal_fulfillment_intakes
  ADD CONSTRAINT internal_fulfillment_intakes_source_parents_check
  CHECK (
    (source = 'wl' AND partner_id IS NOT NULL AND source_handoff_id IS NOT NULL AND proposal_id IS NOT NULL)
    OR
    (source = 'direct' AND client_lead_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_intakes_source ON public.internal_fulfillment_intakes(source);
CREATE INDEX IF NOT EXISTS idx_intakes_client_lead_id ON public.internal_fulfillment_intakes(client_lead_id);

-- Update validate_intake to enforce source + parent consistency at trigger level
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
$function$;

-- =========================================================
-- 2. Fix supervisor UPDATE policy on intakes (self-ref bug)
-- =========================================================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.internal_fulfillment_intakes'::regclass
      AND polcmd = 'w'  -- UPDATE
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.internal_fulfillment_intakes', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "Admins can update intakes"
  ON public.internal_fulfillment_intakes
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can update intakes (constraints enforced by trigger)"
  ON public.internal_fulfillment_intakes
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- Trigger that enforces supervisor constraints (admins bypass)
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
$function$;

DROP TRIGGER IF EXISTS trg_enforce_supervisor_intake_constraints ON public.internal_fulfillment_intakes;
CREATE TRIGGER trg_enforce_supervisor_intake_constraints
  BEFORE UPDATE ON public.internal_fulfillment_intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_supervisor_intake_constraints();

-- =========================================================
-- 3. New tables: client_onboarding_*
-- =========================================================

-- 3a. Handoffs
CREATE TABLE public.client_onboarding_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  client_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'collecting_info'
    CHECK (status IN ('collecting_info','ready_for_submission','submitted','needs_more_info','approved','activation_in_progress','activated','closed')),
  checklist_template text NOT NULL DEFAULT 'direct_client_default',
  checklist_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NULL,
  current_intake_id uuid NULL REFERENCES public.internal_fulfillment_intakes(id) ON DELETE SET NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_handoffs_lead ON public.client_onboarding_handoffs(client_lead_id);
CREATE INDEX idx_client_handoffs_user ON public.client_onboarding_handoffs(client_user_id);
CREATE INDEX idx_client_handoffs_intake ON public.client_onboarding_handoffs(current_intake_id);
CREATE INDEX idx_client_handoffs_status ON public.client_onboarding_handoffs(status);

CREATE TRIGGER trg_client_handoffs_updated_at
  BEFORE UPDATE ON public.client_onboarding_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.client_onboarding_handoffs ENABLE ROW LEVEL SECURITY;

-- 3b. Items
CREATE TABLE public.client_handoff_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id uuid NOT NULL REFERENCES public.client_onboarding_handoffs(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  label text NOT NULL,
  item_type text NOT NULL DEFAULT 'text'
    CHECK (item_type IN ('text','long_text','number','email','phone','select','boolean','date')),
  is_required boolean NOT NULL DEFAULT true,
  is_client_fillable boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','provided','na')),
  value_json jsonb NULL,
  notes text NULL,
  sort_order int NOT NULL DEFAULT 0,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(handoff_id, item_key)
);

CREATE INDEX idx_client_items_handoff ON public.client_handoff_items(handoff_id, sort_order);
CREATE INDEX idx_client_items_fillable ON public.client_handoff_items(handoff_id) WHERE is_client_fillable = true;

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
$function$;

CREATE TRIGGER trg_validate_client_handoff_item
  BEFORE INSERT OR UPDATE ON public.client_handoff_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_handoff_item();

-- Restrict client edits to whitelisted columns + only when is_client_fillable
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
$function$;

CREATE TRIGGER trg_guard_client_handoff_item_client_edits
  BEFORE UPDATE ON public.client_handoff_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_handoff_item_client_edits();

ALTER TABLE public.client_handoff_items ENABLE ROW LEVEL SECURITY;

-- 3c. Documents
CREATE TABLE public.client_handoff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id uuid NOT NULL REFERENCES public.client_onboarding_handoffs(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'other'
    CHECK (document_type IN ('script','logo','voicemail_audio','policy','id_verification','signed_agreement','other')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NULL,
  mime_type text NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','superseded','removed'))
);

CREATE INDEX idx_client_docs_handoff ON public.client_handoff_documents(handoff_id);

ALTER TABLE public.client_handoff_documents ENABLE ROW LEVEL SECURITY;

-- 3d. Requests
CREATE TABLE public.client_handoff_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id uuid NOT NULL REFERENCES public.client_onboarding_handoffs(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'clarification'
    CHECK (request_type IN ('missing_item','missing_document','clarification','correction')),
  title text NOT NULL,
  message text NOT NULL,
  target_item_key text NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','resolved','cancelled')),
  requested_by uuid NULL,
  resolved_by uuid NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);

CREATE INDEX idx_client_requests_handoff ON public.client_handoff_requests(handoff_id, status);

ALTER TABLE public.client_handoff_requests ENABLE ROW LEVEL SECURITY;

-- 3e. Activity
CREATE TABLE public.client_onboarding_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id uuid NOT NULL REFERENCES public.client_onboarding_handoffs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid NULL,
  actor_label text NULL,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_activity_handoff ON public.client_onboarding_activity(handoff_id, created_at DESC);

ALTER TABLE public.client_onboarding_activity ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 4. RLS POLICIES — client_onboarding_handoffs
-- =========================================================

CREATE POLICY "Admins manage all client handoffs"
  ON public.client_onboarding_handoffs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can view client handoffs"
  ON public.client_onboarding_handoffs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisors can update client handoff status"
  ON public.client_onboarding_handoffs
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Direct clients can view their own handoff"
  ON public.client_onboarding_handoffs
  FOR SELECT
  USING (
    client_user_id = auth.uid()
    OR client_lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
  );

-- =========================================================
-- 5. RLS POLICIES — client_handoff_items
-- =========================================================

CREATE POLICY "Admins manage all client items"
  ON public.client_handoff_items
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can view client items"
  ON public.client_handoff_items
  FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Direct clients can view their items"
  ON public.client_handoff_items
  FOR SELECT
  USING (
    handoff_id IN (
      SELECT id FROM public.client_onboarding_handoffs
      WHERE client_user_id = auth.uid()
         OR client_lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Direct clients can update their fillable items"
  ON public.client_handoff_items
  FOR UPDATE
  USING (
    is_client_fillable = true
    AND handoff_id IN (
      SELECT id FROM public.client_onboarding_handoffs
      WHERE client_user_id = auth.uid()
         OR client_lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    is_client_fillable = true
    AND handoff_id IN (
      SELECT id FROM public.client_onboarding_handoffs
      WHERE client_user_id = auth.uid()
         OR client_lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
    )
  );

-- =========================================================
-- 6. RLS POLICIES — client_handoff_documents
-- =========================================================

CREATE POLICY "Admins manage all client docs"
  ON public.client_handoff_documents
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can view client docs"
  ON public.client_handoff_documents
  FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Direct clients can view their docs"
  ON public.client_handoff_documents
  FOR SELECT
  USING (
    handoff_id IN (
      SELECT id FROM public.client_onboarding_handoffs
      WHERE client_user_id = auth.uid()
         OR client_lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Direct clients can upload their docs"
  ON public.client_handoff_documents
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND handoff_id IN (
      SELECT id FROM public.client_onboarding_handoffs
      WHERE client_user_id = auth.uid()
         OR client_lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
    )
  );

-- =========================================================
-- 7. RLS POLICIES — client_handoff_requests
-- =========================================================

CREATE POLICY "Admins manage all client requests"
  ON public.client_handoff_requests
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can view client requests"
  ON public.client_handoff_requests
  FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisors can insert client requests"
  ON public.client_handoff_requests
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Direct clients can view their requests"
  ON public.client_handoff_requests
  FOR SELECT
  USING (
    handoff_id IN (
      SELECT id FROM public.client_onboarding_handoffs
      WHERE client_user_id = auth.uid()
         OR client_lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
    )
  );

-- =========================================================
-- 8. RLS POLICIES — client_onboarding_activity
-- =========================================================

CREATE POLICY "Admins manage all client activity"
  ON public.client_onboarding_activity
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can view + add client activity"
  ON public.client_onboarding_activity
  FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisors can insert client activity"
  ON public.client_onboarding_activity
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- Direct clients only see allowlisted events
CREATE POLICY "Direct clients can view allowlisted activity"
  ON public.client_onboarding_activity
  FOR SELECT
  USING (
    event_type = ANY (ARRAY[
      'client_onboarding_started',
      'client_portal_viewed',
      'client_portal_acknowledged',
      'handoff_started',
      'handoff_completed',
      'submitted',
      'approved',
      'activated'
    ])
    AND handoff_id IN (
      SELECT id FROM public.client_onboarding_handoffs
      WHERE client_user_id = auth.uid()
         OR client_lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
    )
  );

-- =========================================================
-- 9. RPC: link_client_user_to_handoff
-- =========================================================

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
$function$;

REVOKE ALL ON FUNCTION public.link_client_user_to_handoff() FROM public;
GRANT EXECUTE ON FUNCTION public.link_client_user_to_handoff() TO authenticated;