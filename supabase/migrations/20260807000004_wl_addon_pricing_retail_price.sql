ALTER TABLE public.wl_addon_pricing
  ADD COLUMN IF NOT EXISTS retail_price numeric;
