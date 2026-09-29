-- WL Partner's own Bookii booking link, shared with their clients directly
-- (separate from the 24H internal agent_bookii_assignments system).
ALTER TABLE public.white_label_branding
  ADD COLUMN IF NOT EXISTS bookii_booking_url text;
