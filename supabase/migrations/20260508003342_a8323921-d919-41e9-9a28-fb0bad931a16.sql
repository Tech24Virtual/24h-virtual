
-- 1. wizard_sessions: replace USING(true) UPDATE policy with a scoped predicate
DROP POLICY IF EXISTS "Update by session token bearer" ON public.wizard_sessions;

CREATE POLICY "Anon can update unclaimed wizard sessions"
ON public.wizard_sessions
FOR UPDATE
TO anon, authenticated
USING (
  session_token IS NOT NULL
  AND is_complete = false
  AND user_id IS NULL
  AND created_at > (now() - interval '7 days')
)
WITH CHECK (
  session_token IS NOT NULL
  AND user_id IS NULL
  AND is_complete IN (true, false)
);

-- 2. wl-branding-assets: drop public read and make bucket private
DROP POLICY IF EXISTS "Branding assets public direct read" ON storage.objects;
UPDATE storage.buckets SET public = false WHERE id = 'wl-branding-assets';

-- 3. qa_phase2_results: remove public read/write, restrict to admin
DROP POLICY IF EXISTS "qa read" ON public.qa_phase2_results;
DROP POLICY IF EXISTS "qa write" ON public.qa_phase2_results;

CREATE POLICY "Admins can read qa results"
ON public.qa_phase2_results
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert qa results"
ON public.qa_phase2_results
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
