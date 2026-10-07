-- job_applications already exists (name, email, phone, resume_url, cover_letter, status, workflow_stage, ...).
-- Extend it to hold everything the 24hvirtual.com application form collects.
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS company_applying_for text,
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS years_experience text,
  ADD COLUMN IF NOT EXISTS hours_wanted text,
  ADD COLUMN IF NOT EXISTS shift_availability jsonb,
  ADD COLUMN IF NOT EXISTS scheduling_notes text,
  ADD COLUMN IF NOT EXISTS available_start_date date,
  ADD COLUMN IF NOT EXISTS expected_pay text,
  ADD COLUMN IF NOT EXISTS equipment_checklist jsonb,
  ADD COLUMN IF NOT EXISTS contractor_agreement boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS intro_recording_url text,
  ADD COLUMN IF NOT EXISTS speed_test_url text,
  ADD COLUMN IF NOT EXISTS ram_screenshot_url text,
  ADD COLUMN IF NOT EXISTS interview_invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

-- Pipeline: new -> reviewing -> interview -> offered -> hired / rejected
-- (table has 0 rows; remap legacy values anyway)
UPDATE public.job_applications SET status = 'interview' WHERE status = 'interviewing';
UPDATE public.job_applications SET status = 'offered' WHERE status = 'accepted';
ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('new', 'reviewing', 'interview', 'offered', 'hired', 'rejected'));

-- Legacy `name` is NOT NULL; derive it from first/last when the form only supplies those
CREATE OR REPLACE FUNCTION public.job_applications_fill_name()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.name IS NULL OR btrim(NEW.name) = '' THEN
    NEW.name := btrim(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS job_applications_fill_name ON public.job_applications;
CREATE TRIGGER job_applications_fill_name
  BEFORE INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.job_applications_fill_name();

-- Access: HR manages (existing policy only lets HR read), admin already has ALL
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT INSERT ON public.job_applications TO anon;
GRANT SELECT ON public.job_postings TO anon;

DROP POLICY IF EXISTS "HR can manage applications" ON public.job_applications;
CREATE POLICY "HR can manage applications" ON public.job_applications
  FOR ALL USING (public.has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'hr'::app_role));

-- Postings are created as 'open' by HRJobs but the public policy only matched 'active'
DROP POLICY IF EXISTS "Anyone can view open postings" ON public.job_postings;
CREATE POLICY "Anyone can view open postings" ON public.job_postings
  FOR SELECT TO anon, authenticated USING (status = 'open');

-- Public application form (/apply/:jobId): anyone may submit a NEW application to an open posting
DROP POLICY IF EXISTS "Public can submit applications" ON public.job_applications;
CREATE POLICY "Public can submit applications" ON public.job_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND applicant_user_id IS NULL
    AND notes IS NULL
    AND interview_invited_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.job_postings jp
      WHERE jp.id = job_posting_id AND jp.status IN ('open', 'active')
    )
  );

-- Private bucket for resumes / speed-test / RAM screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-applications', 'job-applications', false, 10485760,
  ARRAY['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can upload application files" ON storage.objects;
CREATE POLICY "Public can upload application files" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'job-applications' AND name LIKE 'applications/%');

DROP POLICY IF EXISTS "HR and admin can read application files" ON storage.objects;
CREATE POLICY "HR and admin can read application files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-applications'
    AND (public.has_role(auth.uid(), 'hr'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  );

DROP POLICY IF EXISTS "HR and admin can delete application files" ON storage.objects;
CREATE POLICY "HR and admin can delete application files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-applications'
    AND (public.has_role(auth.uid(), 'hr'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  );
