-- Allow agents to update any outbound request they can see
-- (SELECT RLS already scopes visibility to assigned clients)
DROP POLICY IF EXISTS "Agents can update own claimed requests" ON public.outbound_call_requests;

CREATE POLICY "Agents can update own claimed requests"
ON public.outbound_call_requests FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'agent'::app_role)
);
