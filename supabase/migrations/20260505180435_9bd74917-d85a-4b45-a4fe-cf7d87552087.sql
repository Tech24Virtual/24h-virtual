
-- 1. agent_banking: remove HR read access (encrypted banking should be billing/admin only)
DROP POLICY IF EXISTS "HR can read all banking" ON public.agent_banking;

-- 2. call_logs: fix client policy — client_id refers to leads.id, not auth.uid()
DROP POLICY IF EXISTS "Clients can view own call logs" ON public.call_logs;

CREATE POLICY "Clients can view own call logs"
ON public.call_logs
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM public.leads WHERE user_id = auth.uid()
  )
);
