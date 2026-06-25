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

-- notifications: SELECT/UPDATE/DELETE were granted but INSERT was never added.
-- Every client-side supabase.from('notifications').insert(...) call across the entire app
-- was silently 403ing before RLS even fired. This fixes all cross-portal notification delivery.
GRANT INSERT ON public.notifications TO authenticated;

-- crm_tasks: no table-level grants existed at all, and the INSERT policy covered only
-- agents and admins — not supervisors. EscalationsMode "Create follow-up task" always 403'd.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_tasks'
      AND policyname = 'Supervisors can manage tasks'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Supervisors can manage tasks"
        ON public.crm_tasks FOR ALL TO authenticated
        USING (
          has_role(auth.uid(), 'supervisor'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
        WITH CHECK (
          has_role(auth.uid(), 'supervisor'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    $policy$;
  END IF;
END
$$;
