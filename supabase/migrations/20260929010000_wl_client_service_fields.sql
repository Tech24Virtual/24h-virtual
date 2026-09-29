-- Per-client overage/setup/timezone/hours fields for WL Partner's Add Client dialog.
ALTER TABLE public.white_label_clients
  ADD COLUMN IF NOT EXISTS overage_fee_per_minute numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_fee numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Toronto',
  ADD COLUMN IF NOT EXISTS hours_of_service text DEFAULT '24/7';
