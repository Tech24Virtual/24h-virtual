-- Correction #16 Fix 2/4: global banking form support.
-- Adds payment method selection (bank transfer / e-transfer / PayPal / Wise)
-- and the Interac e-Transfer email, used only when country = Canada and
-- payment_method = 'e_transfer'.

ALTER TABLE public.agent_banking
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS e_transfer_email text;
