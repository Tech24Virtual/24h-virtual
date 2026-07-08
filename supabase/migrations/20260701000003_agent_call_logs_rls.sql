-- Update call_logs RLS policy to allow agents to see calls they personally
-- handled (matched by five9_username) in addition to assigned client calls.
-- Previously agents could only see calls for clients in client_agent_assignments,
-- which meant agents provisioned via the onboarding flow couldn't see their own calls.

DROP POLICY IF EXISTS "Agents can view assigned client call logs" ON public.call_logs;

CREATE POLICY "Agents can view assigned client call logs"
ON public.call_logs FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'agent'::app_role)
  AND (
    client_id IN (
      SELECT client_id FROM public.client_agent_assignments
      WHERE agent_id = auth.uid()
    )
    OR agent_name = (
      SELECT five9_username FROM public.agent_onboarding
      WHERE applicant_user_id = auth.uid()
      AND five9_username IS NOT NULL
      LIMIT 1
    )
  )
);
