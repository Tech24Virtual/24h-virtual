-- Supervisors create the pending signoff row when assigning a client to an agent
-- (SupervisorClientAssignments.tsx / SupervisorAgentDetail.tsx). The "Agents can
-- view and update own signoffs" ALL policy has no WITH CHECK, so it implicitly
-- requires agent_id = auth.uid() on INSERT too, which blocks the supervisor's insert.
CREATE POLICY "Supervisors and admins can insert signoffs"
  ON public.client_assignment_signoffs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
