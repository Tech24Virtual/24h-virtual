-- Per-client integration surcharge: WL clients with integrations bill at
-- base rate + integration_surcharge (e.g. $1.00 + $0.05 = $1.05/min).
-- Applied by the calculate-wl-usage edge function.
ALTER TABLE public.white_label_clients
  ADD COLUMN IF NOT EXISTS has_integrations boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS integration_surcharge numeric(10,4) DEFAULT 0.05;
