ALTER TABLE public.white_label_partners
  ADD COLUMN IF NOT EXISTS commission_rate numeric,
  ADD COLUMN IF NOT EXISTS revenue_share_pct numeric,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.wl_addon_pricing
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly';

ALTER TABLE public.wl_terms_agreements
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
