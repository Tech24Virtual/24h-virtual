CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id),
  processor text NOT NULL DEFAULT 'nmi',
  transaction_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  status text NOT NULL,
  description text,
  initiated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and billing can view all transactions"
  ON public.payment_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role));

GRANT SELECT, INSERT ON public.payment_transactions TO authenticated;
