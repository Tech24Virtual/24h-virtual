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
