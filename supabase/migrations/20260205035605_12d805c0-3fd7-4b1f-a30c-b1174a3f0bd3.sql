-- Add promo_code column to track coupon eligibility for leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS promo_code TEXT;

COMMENT ON COLUMN leads.promo_code IS 'Stripe coupon ID the lead is eligible for (e.g., exit intent discount)';