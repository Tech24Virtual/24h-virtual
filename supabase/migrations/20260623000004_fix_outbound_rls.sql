-- Fix overpermissive UPDATE policy on outbound_call_requests.
-- The original "Staff can update outbound requests" let any agent update any row.
-- Replace it with two targeted policies:
--   1. Agents can only update rows they personally claimed.
--   2. Supervisors and admins retain unrestricted update access.

DROP POLICY IF EXISTS "Staff can update outbound requests" ON outbound_call_requests;

CREATE POLICY "Agents can update own claimed requests"
  ON outbound_call_requests FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'agent'::app_role)
    AND claimed_by = auth.uid()
  );

CREATE POLICY "Supervisors can update any outbound request"
  ON outbound_call_requests FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'supervisor'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
