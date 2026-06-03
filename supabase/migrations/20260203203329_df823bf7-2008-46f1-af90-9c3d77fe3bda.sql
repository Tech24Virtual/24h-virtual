-- Add dynamic billing tracking columns to usage_records
ALTER TABLE public.usage_records
ADD COLUMN IF NOT EXISTS original_tier_minutes integer,
ADD COLUMN IF NOT EXISTS original_tier_price numeric,
ADD COLUMN IF NOT EXISTS optimal_tier_minutes integer,
ADD COLUMN IF NOT EXISTS optimal_tier_price numeric,
ADD COLUMN IF NOT EXISTS static_cost numeric,
ADD COLUMN IF NOT EXISTS dynamic_cost numeric,
ADD COLUMN IF NOT EXISTS dynamic_savings numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_type text;

-- Add dynamic billing enabled flag to leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS dynamic_billing_enabled boolean DEFAULT true;