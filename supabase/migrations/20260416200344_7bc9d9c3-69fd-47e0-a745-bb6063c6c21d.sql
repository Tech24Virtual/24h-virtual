-- Outline progress: shared QA tracking for /outline feature checklist
CREATE TABLE public.outline_progress (
  feature_id text PRIMARY KEY,
  tested boolean NOT NULL DEFAULT false,
  tested_by uuid,
  tested_at timestamptz,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outline_progress_feature_id ON public.outline_progress(feature_id);

ALTER TABLE public.outline_progress ENABLE ROW LEVEL SECURITY;

-- Helper: any internal staff role
CREATE OR REPLACE FUNCTION public.is_internal_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','supervisor','sales','billing','tech','hr','agent')
  )
$$;

CREATE POLICY "Staff can view outline progress"
ON public.outline_progress FOR SELECT
TO authenticated
USING (public.is_internal_staff(auth.uid()));

CREATE POLICY "Staff can insert outline progress"
ON public.outline_progress FOR INSERT
TO authenticated
WITH CHECK (public.is_internal_staff(auth.uid()));

CREATE POLICY "Staff can update outline progress"
ON public.outline_progress FOR UPDATE
TO authenticated
USING (public.is_internal_staff(auth.uid()))
WITH CHECK (public.is_internal_staff(auth.uid()));

-- updated_at trigger
CREATE TRIGGER update_outline_progress_updated_at
BEFORE UPDATE ON public.outline_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.outline_progress REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outline_progress;