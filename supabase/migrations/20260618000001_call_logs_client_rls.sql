-- call_logs.client_id is a FK to leads.id (not auth.uid()).
-- The old policy "Clients can view own call logs" used auth.uid() = client_id which is wrong.
-- Replace it with a subquery that resolves the caller's lead record first.

DROP POLICY IF EXISTS "Clients can view own call logs" ON public.call_logs;

CREATE POLICY "client_select_own_call_logs"
  ON public.call_logs
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.leads WHERE user_id = auth.uid()
    )
  );
