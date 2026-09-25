-- Supervisors need to insert notifications for agents (e.g. new client assignment
-- alerts from SupervisorClientAssignments.tsx / SupervisorAgentDetail.tsx).
-- The existing "Admins can insert notifications" policy only covers admins.
CREATE POLICY "Supervisors can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));
