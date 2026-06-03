
-- Add partner branding fields for content generation
ALTER TABLE public.white_label_partners
  ADD COLUMN IF NOT EXISTS services_offered text,
  ADD COLUMN IF NOT EXISTS target_location text,
  ADD COLUMN IF NOT EXISTS brand_voice_notes text;
