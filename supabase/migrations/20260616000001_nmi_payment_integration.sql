-- NMI payment integration: add NMI columns to existing payment tables

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS payment_processor text DEFAULT 'stripe'
    CHECK (payment_processor IN ('stripe', 'nmi')),
  ADD COLUMN IF NOT EXISTS nmi_customer_vault_id text,
  ADD COLUMN IF NOT EXISTS nmi_subscription_id text,
  ADD COLUMN IF NOT EXISTS nmi_card_last_four text,
  ADD COLUMN IF NOT EXISTS nmi_card_type text,
  ADD COLUMN IF NOT EXISTS nmi_card_expiry text;

ALTER TABLE public.billing_summaries
  ADD COLUMN IF NOT EXISTS nmi_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_processor text DEFAULT 'stripe';

ALTER TABLE public.payment_failures
  ADD COLUMN IF NOT EXISTS nmi_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_processor text DEFAULT 'stripe';

-- Existing RLS policies on these tables cover all columns via row-level grants.
-- Re-confirm table-level grants so service-role inserts keep working.
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.billing_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_failures TO authenticated;
