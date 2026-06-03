-- Phase 7: Supervisor RLS policies for internal fulfillment tables
-- Constraints: supervisor cannot set status='closed', priority='urgent', or change assigned_to.

-- Validator function (SECURITY DEFINER) to check supervisor-allowed updates on intakes
CREATE OR REPLACE FUNCTION public.supervisor_can_update_intake(
  _old_status text,
  _new_status text,
  _old_priority text,
  _new_priority text,
  _old_assigned uuid,
  _new_assigned uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Supervisors cannot close intakes
  IF _new_status = 'closed' THEN RETURN false; END IF;
  -- Supervisors cannot set urgent priority
  IF _new_priority = 'urgent' AND _old_priority IS DISTINCT FROM 'urgent' THEN RETURN false; END IF;
  -- Supervisors cannot change assignee
  IF _old_assigned IS DISTINCT FROM _new_assigned THEN RETURN false; END IF;
  RETURN true;
END;
$$;

-- internal_fulfillment_intakes
CREATE POLICY "Supervisor can view intakes"
  ON public.internal_fulfillment_intakes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisor can update intakes (constrained)"
  ON public.internal_fulfillment_intakes
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (
    public.has_role(auth.uid(), 'supervisor')
    AND public.supervisor_can_update_intake(
      (SELECT status FROM public.internal_fulfillment_intakes WHERE id = internal_fulfillment_intakes.id),
      status,
      (SELECT priority FROM public.internal_fulfillment_intakes WHERE id = internal_fulfillment_intakes.id),
      priority,
      (SELECT assigned_to FROM public.internal_fulfillment_intakes WHERE id = internal_fulfillment_intakes.id),
      assigned_to
    )
  );

-- internal_fulfillment_notes
CREATE POLICY "Supervisor can view intake notes"
  ON public.internal_fulfillment_notes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisor can insert intake notes"
  ON public.internal_fulfillment_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- internal_fulfillment_activity
CREATE POLICY "Supervisor can view intake activity"
  ON public.internal_fulfillment_activity
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisor can insert intake activity"
  ON public.internal_fulfillment_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- internal_fulfillment_intake_documents
CREATE POLICY "Supervisor can view intake documents"
  ON public.internal_fulfillment_intake_documents
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

-- wl_partner_handoff_requests: supervisor INSERT and UPDATE
CREATE POLICY "Supervisor can insert handoff requests"
  ON public.wl_partner_handoff_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisor can update handoff requests"
  ON public.wl_partner_handoff_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));