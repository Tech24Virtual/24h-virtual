-- Allow tech staff to read all client departments for Five9 drift checks
CREATE POLICY "client_departments_tech_select"
  ON public.client_departments
  FOR SELECT
  USING (has_role(auth.uid(), 'tech'::app_role));
