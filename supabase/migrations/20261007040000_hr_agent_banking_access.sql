-- HR can view and update agent banking details
CREATE POLICY "HR can view agent banking"
  ON public.agent_banking FOR SELECT
  USING (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "HR can update agent banking"
  ON public.agent_banking FOR UPDATE
  USING (has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role));
