
-- Create wl_invoices table for billing history
CREATE TABLE public.wl_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  stripe_invoice_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wl_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own invoices"
  ON public.wl_invoices FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Partners can insert their own invoices"
  ON public.wl_invoices FOR INSERT
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  );
