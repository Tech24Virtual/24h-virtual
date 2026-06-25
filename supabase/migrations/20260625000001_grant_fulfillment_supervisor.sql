-- Grants: allow authenticated role to attempt queries (RLS filters rows).
-- All internal_fulfillment_* tables were created admin-only with no table-level
-- GRANT, so every browser query 403'd before RLS even evaluated.

GRANT SELECT, INSERT, UPDATE ON public.internal_fulfillment_intakes       TO authenticated;
GRANT SELECT                  ON public.internal_fulfillment_intake_documents TO authenticated;
GRANT SELECT, INSERT          ON public.internal_fulfillment_notes         TO authenticated;
GRANT SELECT, INSERT          ON public.internal_fulfillment_activity       TO authenticated;
GRANT SELECT, INSERT          ON public.wl_partner_handoff_requests         TO authenticated;

-- RLS policies — supervisors need read + limited write on every table above.
-- Existing admin-only policies remain; these add supervisor access alongside them.

CREATE POLICY "Supervisors can view fulfillment intakes"
  ON public.internal_fulfillment_intakes FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Supervisors can update fulfillment intakes"
  ON public.internal_fulfillment_intakes FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Supervisors can view intake documents"
  ON public.internal_fulfillment_intake_documents FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Supervisors can view and add notes"
  ON public.internal_fulfillment_notes FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Supervisors can view and add activity"
  ON public.internal_fulfillment_activity FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Supervisors can request more info"
  ON public.wl_partner_handoff_requests FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Supervisors can view handoff requests"
  ON public.wl_partner_handoff_requests FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );
