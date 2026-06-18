ALTER TABLE public.billing_summaries
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending'
CHECK (payment_status IN ('pending', 'paid', 'failed'));

-- Dedup guard: same NMI transaction_id must not create two failure rows.
-- NULLs are allowed to repeat (Postgres UNIQUE treats each NULL as distinct).
ALTER TABLE public.payment_failures
ADD CONSTRAINT payment_failures_nmi_txn_unique
UNIQUE (nmi_transaction_id);
