-- ============================================================================
-- PHASE 6 — FULFILLMENT HANDOFF & INTERNAL INTAKE
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTEND wl_partner_onboarding_handoffs
-- ---------------------------------------------------------------------------
ALTER TABLE public.wl_partner_onboarding_handoffs
  ADD COLUMN IF NOT EXISTS submission_status text NOT NULL DEFAULT 'collecting_info',
  ADD COLUMN IF NOT EXISTS completion_percent int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_resubmitted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS current_intake_id uuid NULL;

-- Extend validate_wl_handoff to allow new submission_status values
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
  IF NEW.submission_status NOT IN (
    'draft','collecting_info','ready_for_submission','submitted_to_fulfillment',
    'needs_more_info','resubmitted','approved_for_activation','activation_in_progress','activated'
  ) THEN
    RAISE EXCEPTION 'Invalid submission_status: %', NEW.submission_status;
  END IF;
  IF NEW.completion_percent < 0 OR NEW.completion_percent > 100 THEN
    RAISE EXCEPTION 'completion_percent must be 0-100';
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
  SELECT partner_id INTO v_proposal_partner
  FROM public.wl_partner_proposals WHERE id = NEW.proposal_id;
  IF v_proposal_partner IS NULL THEN
    RAISE EXCEPTION 'Linked proposal does not exist';
  END IF;
  IF v_proposal_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'Handoff partner_id does not match proposal partner_id';
  END IF;
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

-- ---------------------------------------------------------------------------
-- 2. wl_partner_handoff_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wl_partner_handoff_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  handoff_id uuid NOT NULL REFERENCES public.wl_partner_onboarding_handoffs(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  label text NOT NULL,
  item_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  value_json jsonb NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text NULL,
  sort_order int NOT NULL DEFAULT 0,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handoff_id, item_key)
);
CREATE INDEX IF NOT EXISTS idx_wl_handoff_items_partner ON public.wl_partner_handoff_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_wl_handoff_items_handoff ON public.wl_partner_handoff_items(handoff_id, sort_order);

ALTER TABLE public.wl_partner_handoff_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner can view own handoff items"
  ON public.wl_partner_handoff_items FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Partner can insert own handoff items"
  ON public.wl_partner_handoff_items FOR INSERT TO authenticated
  WITH CHECK (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Partner can update own handoff items"
  ON public.wl_partner_handoff_items FOR UPDATE TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Partner can delete own handoff items"
  ON public.wl_partner_handoff_items FOR DELETE TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.validate_wl_handoff_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_handoff_partner uuid;
BEGIN
  IF NEW.item_key IS NULL OR length(NEW.item_key) = 0 OR length(NEW.item_key) > 80 THEN
    RAISE EXCEPTION 'item_key must be 1-80 characters';
  END IF;
  IF NEW.label IS NULL OR length(NEW.label) = 0 OR length(NEW.label) > 200 THEN
    RAISE EXCEPTION 'label must be 1-200 characters';
  END IF;
  IF NEW.item_type NOT IN ('text','long_text','number','email','phone','select','boolean','date') THEN
    RAISE EXCEPTION 'Invalid item_type: %', NEW.item_type;
  END IF;
  IF NEW.status NOT IN ('pending','provided','na') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 2000 THEN
    RAISE EXCEPTION 'notes too long (max 2000)';
  END IF;
  SELECT partner_id INTO v_handoff_partner
  FROM public.wl_partner_onboarding_handoffs WHERE id = NEW.handoff_id;
  IF v_handoff_partner IS NULL THEN
    RAISE EXCEPTION 'Linked handoff does not exist';
  END IF;
  IF v_handoff_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'item partner_id does not match handoff partner_id';
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

CREATE OR REPLACE FUNCTION public.enforce_wl_handoff_item_immutable()
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
    IF NEW.handoff_id IS DISTINCT FROM OLD.handoff_id THEN
      RAISE EXCEPTION 'handoff_id is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_wl_handoff_item
  BEFORE INSERT OR UPDATE ON public.wl_partner_handoff_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_wl_handoff_item();

CREATE TRIGGER trg_enforce_wl_handoff_item_immutable
  BEFORE UPDATE ON public.wl_partner_handoff_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wl_handoff_item_immutable();

-- ---------------------------------------------------------------------------
-- 3. wl_partner_handoff_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wl_partner_handoff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  handoff_id uuid NOT NULL REFERENCES public.wl_partner_onboarding_handoffs(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NULL,
  mime_type text NULL,
  uploaded_by uuid NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wl_handoff_docs_handoff ON public.wl_partner_handoff_documents(handoff_id, status);
CREATE INDEX IF NOT EXISTS idx_wl_handoff_docs_partner ON public.wl_partner_handoff_documents(partner_id);

ALTER TABLE public.wl_partner_handoff_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner can view own handoff docs"
  ON public.wl_partner_handoff_documents FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Partner can insert own handoff docs"
  ON public.wl_partner_handoff_documents FOR INSERT TO authenticated
  WITH CHECK (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Partner can update own handoff docs"
  ON public.wl_partner_handoff_documents FOR UPDATE TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Partner can delete own handoff docs"
  ON public.wl_partner_handoff_documents FOR DELETE TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.validate_wl_handoff_document()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_handoff_partner uuid;
BEGIN
  IF NEW.document_type NOT IN ('script','logo','voicemail_audio','policy','id_verification','signed_agreement','other') THEN
    RAISE EXCEPTION 'Invalid document_type: %', NEW.document_type;
  END IF;
  IF NEW.status NOT IN ('active','superseded','removed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.file_path IS NULL OR length(NEW.file_path) = 0 OR length(NEW.file_path) > 500 THEN
    RAISE EXCEPTION 'file_path must be 1-500 characters';
  END IF;
  IF NEW.file_name IS NULL OR length(NEW.file_name) = 0 OR length(NEW.file_name) > 200 THEN
    RAISE EXCEPTION 'file_name must be 1-200 characters';
  END IF;
  IF NEW.mime_type IS NOT NULL AND length(NEW.mime_type) > 100 THEN
    RAISE EXCEPTION 'mime_type too long (max 100)';
  END IF;
  IF NEW.file_size IS NOT NULL AND NEW.file_size > 26214400 THEN
    RAISE EXCEPTION 'file_size exceeds 25 MB limit';
  END IF;
  SELECT partner_id INTO v_handoff_partner
  FROM public.wl_partner_onboarding_handoffs WHERE id = NEW.handoff_id;
  IF v_handoff_partner IS NULL THEN
    RAISE EXCEPTION 'Linked handoff does not exist';
  END IF;
  IF v_handoff_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'document partner_id does not match handoff partner_id';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_wl_handoff_document_immutable()
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
    IF NEW.handoff_id IS DISTINCT FROM OLD.handoff_id THEN
      RAISE EXCEPTION 'handoff_id is immutable';
    END IF;
    IF NEW.file_path IS DISTINCT FROM OLD.file_path THEN
      RAISE EXCEPTION 'file_path is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_wl_handoff_document_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub_status text;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN OLD;
  END IF;
  SELECT submission_status INTO v_sub_status
  FROM public.wl_partner_onboarding_handoffs WHERE id = OLD.handoff_id;
  IF v_sub_status IN ('submitted_to_fulfillment','needs_more_info','resubmitted','approved_for_activation','activation_in_progress','activated') THEN
    RAISE EXCEPTION 'Cannot delete documents after submission. Mark as superseded instead.';
  END IF;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER trg_validate_wl_handoff_document
  BEFORE INSERT OR UPDATE ON public.wl_partner_handoff_documents
  FOR EACH ROW EXECUTE FUNCTION public.validate_wl_handoff_document();

CREATE TRIGGER trg_enforce_wl_handoff_document_immutable
  BEFORE UPDATE ON public.wl_partner_handoff_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wl_handoff_document_immutable();

CREATE TRIGGER trg_guard_wl_handoff_document_delete
  BEFORE DELETE ON public.wl_partner_handoff_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_wl_handoff_document_delete();

-- ---------------------------------------------------------------------------
-- 4. internal_fulfillment_intakes (admin-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.internal_fulfillment_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE RESTRICT,
  source_handoff_id uuid NOT NULL REFERENCES public.wl_partner_onboarding_handoffs(id) ON DELETE RESTRICT,
  proposal_id uuid NOT NULL REFERENCES public.wl_partner_proposals(id) ON DELETE RESTRICT,
  lead_id uuid NULL REFERENCES public.wl_partner_leads(id) ON DELETE SET NULL,
  intake_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'new_submission',
  priority text NOT NULL DEFAULT 'normal',
  submitted_by uuid NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz NULL,
  approved_at timestamptz NULL,
  activated_at timestamptz NULL,
  closed_at timestamptz NULL,
  assigned_to uuid NULL,
  snapshot_json jsonb NOT NULL,
  snapshot_version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intake_partner ON public.internal_fulfillment_intakes(partner_id);
CREATE INDEX IF NOT EXISTS idx_intake_status ON public.internal_fulfillment_intakes(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_assigned ON public.internal_fulfillment_intakes(assigned_to);

ALTER TABLE public.internal_fulfillment_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access intakes"
  ON public.internal_fulfillment_intakes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_intake_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_suffix text;
  v_attempts int := 0;
  v_exists boolean;
BEGIN
  IF NEW.intake_number IS NOT NULL AND length(trim(NEW.intake_number)) > 0 THEN
    RETURN NEW;
  END IF;
  LOOP
    v_attempts := v_attempts + 1;
    v_suffix := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    NEW.intake_number := 'INT-' || to_char(now(), 'YYYYMM') || '-' || v_suffix;
    SELECT EXISTS (
      SELECT 1 FROM public.internal_fulfillment_intakes
      WHERE intake_number = NEW.intake_number
    ) INTO v_exists;
    EXIT WHEN NOT v_exists OR v_attempts >= 5;
  END LOOP;
  RETURN NEW;
END;
$function$;

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
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_set_intake_number
  BEFORE INSERT ON public.internal_fulfillment_intakes
  FOR EACH ROW EXECUTE FUNCTION public.set_intake_number();

CREATE TRIGGER trg_validate_intake
  BEFORE INSERT OR UPDATE ON public.internal_fulfillment_intakes
  FOR EACH ROW EXECUTE FUNCTION public.validate_intake();

-- Now wire current_intake_id FK on handoffs
ALTER TABLE public.wl_partner_onboarding_handoffs
  ADD CONSTRAINT wl_handoffs_current_intake_fk
  FOREIGN KEY (current_intake_id) REFERENCES public.internal_fulfillment_intakes(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 5. internal_fulfillment_intake_documents (admin-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.internal_fulfillment_intake_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.internal_fulfillment_intakes(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  source_document_id uuid NULL REFERENCES public.wl_partner_handoff_documents(id) ON DELETE SET NULL,
  document_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NULL,
  mime_type text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intake_docs_intake ON public.internal_fulfillment_intake_documents(intake_id);

ALTER TABLE public.internal_fulfillment_intake_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access intake docs"
  ON public.internal_fulfillment_intake_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 6. internal_fulfillment_notes (admin-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.internal_fulfillment_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.internal_fulfillment_intakes(id) ON DELETE CASCADE,
  author_user_id uuid NULL,
  note_type text NOT NULL DEFAULT 'general',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intake_notes_intake ON public.internal_fulfillment_notes(intake_id, created_at DESC);

ALTER TABLE public.internal_fulfillment_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access intake notes"
  ON public.internal_fulfillment_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_intake_note()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.note_type NOT IN ('general','decision','blocker','qa') THEN
    RAISE EXCEPTION 'Invalid note_type: %', NEW.note_type;
  END IF;
  IF NEW.body IS NULL OR length(trim(NEW.body)) = 0 THEN
    RAISE EXCEPTION 'body is required';
  END IF;
  IF length(NEW.body) > 5000 THEN
    RAISE EXCEPTION 'body too long (max 5000)';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_intake_note
  BEFORE INSERT OR UPDATE ON public.internal_fulfillment_notes
  FOR EACH ROW EXECUTE FUNCTION public.validate_intake_note();

-- ---------------------------------------------------------------------------
-- 7. internal_fulfillment_activity (admin-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.internal_fulfillment_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.internal_fulfillment_intakes(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_type text NOT NULL,
  actor_user_id uuid NULL,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intake_activity_intake ON public.internal_fulfillment_activity(intake_id, created_at DESC);

ALTER TABLE public.internal_fulfillment_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access intake activity"
  ON public.internal_fulfillment_activity FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_intake_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.event_type NOT IN ('submitted','received','assigned','status_changed','note_added','info_requested','partner_updated','resubmitted','approved','activation_started','activated','closed') THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;
  IF NEW.actor_type NOT IN ('internal','partner','system') THEN
    RAISE EXCEPTION 'Invalid actor_type: %', NEW.actor_type;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_intake_activity
  BEFORE INSERT OR UPDATE ON public.internal_fulfillment_activity
  FOR EACH ROW EXECUTE FUNCTION public.validate_intake_activity();

-- ---------------------------------------------------------------------------
-- 8. wl_partner_handoff_requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wl_partner_handoff_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  handoff_id uuid NOT NULL REFERENCES public.wl_partner_onboarding_handoffs(id) ON DELETE CASCADE,
  intake_id uuid NOT NULL REFERENCES public.internal_fulfillment_intakes(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  title text NOT NULL,
  message text NULL,
  target_item_key text NULL,
  status text NOT NULL DEFAULT 'open',
  requested_by uuid NULL,
  resolved_by uuid NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_handoff_req_handoff ON public.wl_partner_handoff_requests(handoff_id, status);
CREATE INDEX IF NOT EXISTS idx_handoff_req_intake ON public.wl_partner_handoff_requests(intake_id);
CREATE INDEX IF NOT EXISTS idx_handoff_req_partner ON public.wl_partner_handoff_requests(partner_id);

ALTER TABLE public.wl_partner_handoff_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner can view own handoff requests"
  ON public.wl_partner_handoff_requests FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin can insert handoff requests"
  ON public.wl_partner_handoff_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partner or admin can update handoff requests"
  ON public.wl_partner_handoff_requests FOR UPDATE TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin can delete handoff requests"
  ON public.wl_partner_handoff_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_wl_handoff_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_handoff_partner uuid;
  v_intake_partner uuid;
BEGIN
  IF NEW.request_type NOT IN ('missing_item','missing_document','clarification','correction') THEN
    RAISE EXCEPTION 'Invalid request_type: %', NEW.request_type;
  END IF;
  IF NEW.status NOT IN ('open','resolved','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.title IS NULL OR length(trim(NEW.title)) = 0 OR length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'title must be 1-200 characters';
  END IF;
  IF NEW.message IS NOT NULL AND length(NEW.message) > 2000 THEN
    RAISE EXCEPTION 'message too long (max 2000)';
  END IF;
  IF NEW.target_item_key IS NOT NULL AND length(NEW.target_item_key) > 80 THEN
    RAISE EXCEPTION 'target_item_key too long (max 80)';
  END IF;
  SELECT partner_id INTO v_handoff_partner
  FROM public.wl_partner_onboarding_handoffs WHERE id = NEW.handoff_id;
  IF v_handoff_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'request partner_id does not match handoff partner_id';
  END IF;
  SELECT partner_id INTO v_intake_partner
  FROM public.internal_fulfillment_intakes WHERE id = NEW.intake_id;
  IF v_intake_partner IS DISTINCT FROM NEW.partner_id THEN
    RAISE EXCEPTION 'request partner_id does not match intake partner_id';
  END IF;
  IF NEW.status = 'resolved' AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_wl_handoff_request_partner_writable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
    OR NEW.handoff_id IS DISTINCT FROM OLD.handoff_id
    OR NEW.intake_id IS DISTINCT FROM OLD.intake_id
    OR NEW.request_type IS DISTINCT FROM OLD.request_type
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.target_item_key IS DISTINCT FROM OLD.target_item_key
    OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
    OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Partner can only update status, resolved_at, and resolved_by';
  END IF;
  IF NEW.status NOT IN ('open','resolved') THEN
    RAISE EXCEPTION 'Partner cannot set status to %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_wl_handoff_request
  BEFORE INSERT OR UPDATE ON public.wl_partner_handoff_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_wl_handoff_request();

CREATE TRIGGER trg_enforce_wl_handoff_request_partner_writable
  BEFORE UPDATE ON public.wl_partner_handoff_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wl_handoff_request_partner_writable();

-- ---------------------------------------------------------------------------
-- 9. submit_fulfillment_intake() — atomic snapshot + insert/update
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_fulfillment_intake(p_handoff_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_handoff record;
  v_partner record;
  v_proposal record;
  v_lead record;
  v_missing int;
  v_items jsonb;
  v_docs jsonb;
  v_snapshot jsonb;
  v_intake_id uuid;
  v_existing_intake record;
  v_new_version int;
  v_event text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_handoff
  FROM public.wl_partner_onboarding_handoffs WHERE id = p_handoff_id;
  IF v_handoff.id IS NULL THEN
    RAISE EXCEPTION 'Handoff not found';
  END IF;

  SELECT * INTO v_partner FROM public.white_label_partners WHERE id = v_handoff.partner_id;
  IF v_partner.user_id IS DISTINCT FROM v_user AND NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'Not authorized for this handoff';
  END IF;

  SELECT count(*) INTO v_missing
  FROM public.wl_partner_handoff_items
  WHERE handoff_id = p_handoff_id AND is_required = true AND status <> 'provided';
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'MISSING_REQUIRED_ITEMS: % required item(s) not provided', v_missing
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_proposal FROM public.wl_partner_proposals WHERE id = v_handoff.proposal_id;
  IF v_handoff.lead_id IS NOT NULL THEN
    SELECT * INTO v_lead FROM public.wl_partner_leads WHERE id = v_handoff.lead_id;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'item_key', item_key,
    'label', label,
    'item_type', item_type,
    'is_required', is_required,
    'value_json', value_json,
    'status', status,
    'notes', notes
  ) ORDER BY sort_order, item_key), '[]'::jsonb) INTO v_items
  FROM public.wl_partner_handoff_items WHERE handoff_id = p_handoff_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'document_type', document_type,
    'file_name', file_name,
    'file_size', file_size,
    'mime_type', mime_type,
    'file_path', file_path
  )), '[]'::jsonb) INTO v_docs
  FROM public.wl_partner_handoff_documents
  WHERE handoff_id = p_handoff_id AND status = 'active';

  v_snapshot := jsonb_build_object(
    'partner', jsonb_build_object('id', v_partner.id, 'display_name', COALESCE(v_partner.company_name, 'Partner')),
    'proposal', jsonb_build_object(
      'id', v_proposal.id,
      'number', v_proposal.proposal_number,
      'title', v_proposal.title,
      'offering_name', v_proposal.offering_name,
      'scope_summary', v_proposal.scope_summary,
      'amount', v_proposal.amount,
      'currency', v_proposal.currency,
      'accepted_at', v_proposal.accepted_at,
      'accepted_by_name', v_proposal.accepted_by_name
    ),
    'client', jsonb_build_object(
      'name', COALESCE(v_handoff.client_name_snapshot, v_lead.name),
      'email', COALESCE(v_handoff.client_email_snapshot, v_lead.email),
      'company', COALESCE(v_handoff.company_snapshot, v_lead.company)
    ),
    'checklist_template', COALESCE(v_proposal.checklist_template, 'standard'),
    'items', v_items,
    'documents', v_docs,
    'submitted_at', now(),
    'source_handoff_status', v_handoff.status
  );

  SELECT * INTO v_existing_intake
  FROM public.internal_fulfillment_intakes WHERE id = v_handoff.current_intake_id;

  IF v_existing_intake.id IS NOT NULL THEN
    v_new_version := v_existing_intake.snapshot_version + 1;
    UPDATE public.internal_fulfillment_intakes
      SET snapshot_json = v_snapshot,
          snapshot_version = v_new_version,
          status = 'under_review',
          updated_at = now()
      WHERE id = v_existing_intake.id;
    v_intake_id := v_existing_intake.id;

    DELETE FROM public.internal_fulfillment_intake_documents WHERE intake_id = v_intake_id;
    INSERT INTO public.internal_fulfillment_intake_documents
      (intake_id, partner_id, source_document_id, document_type, file_path, file_name, file_size, mime_type)
    SELECT v_intake_id, partner_id, id, document_type, file_path, file_name, file_size, mime_type
    FROM public.wl_partner_handoff_documents WHERE handoff_id = p_handoff_id AND status = 'active';

    UPDATE public.wl_partner_onboarding_handoffs
      SET submission_status = 'resubmitted',
          last_resubmitted_at = now(),
          updated_at = now()
      WHERE id = p_handoff_id;

    INSERT INTO public.internal_fulfillment_activity (intake_id, partner_id, event_type, actor_type, actor_user_id, meta_json)
    VALUES (v_intake_id, v_handoff.partner_id, 'resubmitted', 'partner', v_user, jsonb_build_object('snapshot_version', v_new_version));
  ELSE
    INSERT INTO public.internal_fulfillment_intakes
      (partner_id, source_handoff_id, proposal_id, lead_id, status, submitted_by, snapshot_json, snapshot_version)
    VALUES
      (v_handoff.partner_id, p_handoff_id, v_handoff.proposal_id, v_handoff.lead_id,
       'new_submission', v_user, v_snapshot, 1)
    RETURNING id INTO v_intake_id;

    INSERT INTO public.internal_fulfillment_intake_documents
      (intake_id, partner_id, source_document_id, document_type, file_path, file_name, file_size, mime_type)
    SELECT v_intake_id, partner_id, id, document_type, file_path, file_name, file_size, mime_type
    FROM public.wl_partner_handoff_documents WHERE handoff_id = p_handoff_id AND status = 'active';

    UPDATE public.wl_partner_onboarding_handoffs
      SET submission_status = 'submitted_to_fulfillment',
          submitted_at = now(),
          current_intake_id = v_intake_id,
          updated_at = now()
      WHERE id = p_handoff_id;

    INSERT INTO public.internal_fulfillment_activity (intake_id, partner_id, event_type, actor_type, actor_user_id, meta_json)
    VALUES (v_intake_id, v_handoff.partner_id, 'submitted', 'partner', v_user, '{}'::jsonb);
  END IF;

  RETURN v_intake_id;
END;
$function$;

-- Sync helper for admin status changes that affect partner-side
CREATE OR REPLACE FUNCTION public.sync_partner_status_from_intake(p_intake_id uuid, p_new_intake_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_handoff_id uuid;
  v_new_partner_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT source_handoff_id INTO v_handoff_id
  FROM public.internal_fulfillment_intakes WHERE id = p_intake_id;
  IF v_handoff_id IS NULL THEN
    RETURN;
  END IF;
  v_new_partner_status := CASE p_new_intake_status
    WHEN 'needs_partner_update' THEN 'needs_more_info'
    WHEN 'approved' THEN 'approved_for_activation'
    WHEN 'activation_in_progress' THEN 'activation_in_progress'
    WHEN 'activated' THEN 'activated'
    WHEN 'closed' THEN 'activated'
    ELSE NULL
  END;
  IF v_new_partner_status IS NOT NULL THEN
    UPDATE public.wl_partner_onboarding_handoffs
      SET submission_status = v_new_partner_status, updated_at = now()
      WHERE id = v_handoff_id;
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 10. Storage bucket: wl-fulfillment-documents
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('wl-fulfillment-documents', 'wl-fulfillment-documents', false, 26214400)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 26214400;

CREATE POLICY "Partner can read own fulfillment docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'wl-fulfillment-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.white_label_partners WHERE user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Partner can upload own fulfillment docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'wl-fulfillment-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.white_label_partners WHERE user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Partner can update own fulfillment docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'wl-fulfillment-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.white_label_partners WHERE user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Partner can delete own fulfillment docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'wl-fulfillment-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.white_label_partners WHERE user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );