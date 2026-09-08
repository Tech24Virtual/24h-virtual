-- Fix: clients (direct and white-label) get a 403 when cancelling their own
-- pending outbound call request.
--
-- Root cause: both UPDATE policies below were created with only a USING
-- clause (status = 'pending') and no explicit WITH CHECK. Postgres RLS
-- defaults WITH CHECK to the USING clause when none is given, so the policy
-- required the row to STILL have status = 'pending' *after* the update.
-- Cancelling sets status = 'cancelled', which always failed that implicit
-- check and PostgREST surfaced it as a 403.
--
-- Fix: add an explicit WITH CHECK that permits the pending -> cancelled
-- transition while still enforcing ownership.

ALTER POLICY "Clients can cancel own pending requests"
  ON public.outbound_call_requests
  USING (client_id = auth.uid() AND status = 'pending')
  WITH CHECK (client_id = auth.uid() AND status = 'cancelled');

ALTER POLICY "WL clients can cancel own pending requests"
  ON public.outbound_call_requests
  USING (wl_client_id IS NOT NULL AND wl_client_id = get_wl_client_id(auth.uid()) AND status = 'pending')
  WITH CHECK (wl_client_id IS NOT NULL AND wl_client_id = get_wl_client_id(auth.uid()) AND status = 'cancelled');
