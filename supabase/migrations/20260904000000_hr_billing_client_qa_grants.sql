GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_postings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offboarding TO authenticated;
GRANT SELECT ON public.agent_banking TO authenticated;

-- profiles had no UPDATE policy allowing HR to edit other employees' rows (only
-- "own profile" self-update existed), so HR Directory field edits silently
-- no-op'd under RLS while the client still showed a success toast.
CREATE POLICY "HR can update profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'hr'::app_role));
