-- Supervisors need to read all leads for the Client Assignments page.
-- Without this policy, the page falls back to querying profiles (wrong table)
-- and every client name shows as "Unknown".
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leads'
      AND policyname = 'Supervisors can view all leads'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Supervisors can view all leads"
        ON public.leads FOR SELECT TO authenticated
        USING (has_role(auth.uid(), 'supervisor'::app_role))
    $policy$;
  END IF;
END
$$;

-- Schedule page: supervisors need to post new open shifts and read agent skills.
-- Without INSERT on open_shifts, the "Post Open Shift" dialog silently fails.
-- Without SELECT on agent_skills, skill autocomplete and skill-match filtering are broken.
GRANT INSERT ON public.open_shifts TO authenticated;
GRANT SELECT ON public.agent_skills TO authenticated;

-- Performance page: supervisors need to create, edit, and delete reviews.
-- Without INSERT/UPDATE, both "Save Draft" and "Publish" silently fail.
GRANT INSERT, UPDATE, DELETE ON public.agent_performance_reviews TO authenticated;

-- Campaign OS script documents were created without explicit DML grants.
-- Clients and agents reading Campaign OS scripts would hit PostgREST 403s before RLS fires.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_script_documents TO authenticated;
