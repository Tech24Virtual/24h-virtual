
-- Add retention bonus tracking columns to affiliate_referrals
ALTER TABLE public.affiliate_referrals
  ADD COLUMN IF NOT EXISTS retention_bonus_amount numeric DEFAULT 50,
  ADD COLUMN IF NOT EXISTS last_retention_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_payments_count integer DEFAULT 0;

-- Update default commission_amount to 150 for new referrals
ALTER TABLE public.affiliate_referrals
  ALTER COLUMN commission_amount SET DEFAULT 150;
