-- Unified Feedback Intake — Migration A (revised: only 'admin' role exists)

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS source_dashboard text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS created_by_email text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS internal_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.feedback SET description = message WHERE description IS NULL;

DO $$ BEGIN
  ALTER TABLE public.feedback ADD CONSTRAINT feedback_mode_check CHECK (mode = 'direct');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.feedback ADD CONSTRAINT feedback_priority_check CHECK (priority IN ('low','normal','high','urgent'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.feedback ADD CONSTRAINT feedback_status_check CHECK (status IN ('new','triaged','in_progress','resolved','closed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.feedback ADD CONSTRAINT feedback_source_dashboard_check CHECK (source_dashboard IN (
    'admin','supervisor','agent','sales','billing','tech','hr',
    'direct_client','affiliate','wl_partner_product','wl_partner_escalation'
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_source_dashboard ON public.feedback(source_dashboard);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_metadata_partner ON public.feedback((metadata->>'partner_id'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_feedback_updated_at ON public.feedback;
CREATE TRIGGER trg_feedback_updated_at BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Admins can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "feedback_admin_select" ON public.feedback;
DROP POLICY IF EXISTS "feedback_admin_update" ON public.feedback;
DROP POLICY IF EXISTS "feedback_admin_delete" ON public.feedback;
DROP POLICY IF EXISTS "feedback_user_insert" ON public.feedback;
DROP POLICY IF EXISTS "feedback_partner_mirror_select" ON public.feedback;
DROP POLICY IF EXISTS "feedback_user_self_select" ON public.feedback;

CREATE POLICY "feedback_user_insert" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "feedback_admin_select" ON public.feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "feedback_admin_update" ON public.feedback
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "feedback_admin_delete" ON public.feedback
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "feedback_user_self_select" ON public.feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND source_dashboard <> 'wl_partner_escalation');

CREATE POLICY "feedback_partner_mirror_select" ON public.feedback
  FOR SELECT TO authenticated
  USING (
    source_dashboard IN ('wl_partner_product','wl_partner_escalation')
    AND metadata->>'partner_id' IN (
      SELECT id::text FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  );

-- wl_partner_feedback
CREATE TABLE IF NOT EXISTS public.wl_partner_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  origin text NOT NULL,
  submitted_by_type text NOT NULL,
  submitted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by_email text,
  submitted_by_name text,
  type text NOT NULL DEFAULT 'feedback',
  title text,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'new',
  source_dashboard text NOT NULL,
  page text,
  attachment_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wl_pf_origin_check CHECK (origin IN ('end_client','partner_on_behalf')),
  CONSTRAINT wl_pf_submitter_check CHECK (submitted_by_type IN ('wl_end_client','wl_partner')),
  CONSTRAINT wl_pf_source_check CHECK (source_dashboard IN ('wl_end_client','wl_partner')),
  CONSTRAINT wl_pf_priority_check CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT wl_pf_status_check CHECK (status IN ('new','triaged','in_progress','resolved','closed','escalated')),
  CONSTRAINT wl_pf_type_check CHECK (type IN ('bug','help','idea','feedback'))
);

CREATE INDEX IF NOT EXISTS idx_wl_pf_partner_origin_status ON public.wl_partner_feedback(partner_id, origin, status);
CREATE INDEX IF NOT EXISTS idx_wl_pf_partner_created ON public.wl_partner_feedback(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wl_pf_submitter ON public.wl_partner_feedback(submitted_by_user_id);

ALTER TABLE public.wl_partner_feedback ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_wl_pf_updated_at ON public.wl_partner_feedback;
CREATE TRIGGER trg_wl_pf_updated_at BEFORE UPDATE ON public.wl_partner_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "wl_pf_user_insert" ON public.wl_partner_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "wl_pf_self_select" ON public.wl_partner_feedback
  FOR SELECT TO authenticated USING (submitted_by_user_id = auth.uid());

CREATE POLICY "wl_pf_partner_select" ON public.wl_partner_feedback
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "wl_pf_partner_update" ON public.wl_partner_feedback
  FOR UPDATE TO authenticated
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "wl_pf_admin_audit_select" ON public.wl_partner_feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- wl_partner_feedback_escalations
CREATE TABLE IF NOT EXISTS public.wl_partner_feedback_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wl_feedback_id uuid NOT NULL REFERENCES public.wl_partner_feedback(id) ON DELETE CASCADE,
  linked_feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  escalated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_summary text NOT NULL,
  include_end_client_identity boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wl_pfe_status_check CHECK (status IN ('open','acknowledged','resolved'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wl_pfe_wl_feedback ON public.wl_partner_feedback_escalations(wl_feedback_id);
CREATE INDEX IF NOT EXISTS idx_wl_pfe_partner ON public.wl_partner_feedback_escalations(partner_id);

ALTER TABLE public.wl_partner_feedback_escalations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_wl_pfe_updated_at ON public.wl_partner_feedback_escalations;
CREATE TRIGGER trg_wl_pfe_updated_at BEFORE UPDATE ON public.wl_partner_feedback_escalations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "wl_pfe_partner_select" ON public.wl_partner_feedback_escalations
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "wl_pfe_admin_select" ON public.wl_partner_feedback_escalations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "wl_pfe_admin_update" ON public.wl_partner_feedback_escalations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
  VALUES ('feedback-attachments', 'feedback-attachments', false)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('wl-feedback-attachments', 'wl-feedback-attachments', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "feedback_attach_user_upload" ON storage.objects;
CREATE POLICY "feedback_attach_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'feedback-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "feedback_attach_admin_read" ON storage.objects;
CREATE POLICY "feedback_attach_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'feedback-attachments'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid()::text = (storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "wl_feedback_attach_upload" ON storage.objects;
CREATE POLICY "wl_feedback_attach_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wl-feedback-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "wl_feedback_attach_partner_read" ON storage.objects;
CREATE POLICY "wl_feedback_attach_partner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'wl-feedback-attachments'
    AND (
      (storage.foldername(name))[1] IN (SELECT id::text FROM public.white_label_partners WHERE user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
