
ALTER TABLE public.outbound_call_requests 
  ADD COLUMN IF NOT EXISTS callback_type text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS callback_window text,
  ADD COLUMN IF NOT EXISTS routing_mode text NOT NULL DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS intent text NOT NULL DEFAULT 'sales',
  ADD COLUMN IF NOT EXISTS target_queue text,
  ADD COLUMN IF NOT EXISTS source_channel text NOT NULL DEFAULT 'web_widget',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS five9_campaign_id text,
  ADD COLUMN IF NOT EXISTS dial_status text,
  ADD COLUMN IF NOT EXISTS recording_url text;
