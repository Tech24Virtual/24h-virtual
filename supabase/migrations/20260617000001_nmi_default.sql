-- NMI: set as default processor for new leads + client RLS on billing_summaries

ALTER TABLE public.leads ALTER COLUMN payment_processor SET DEFAULT 'nmi';

-- Clients can read their own billing summaries
CREATE POLICY "Client can read own billing_summaries"
  ON public.billing_summaries
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.leads WHERE user_id = auth.uid()
    )
  );
