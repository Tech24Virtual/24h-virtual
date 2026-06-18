-- Add raw_details JSONB to missions for storing triggered_by and other metadata.
-- Make initiated_by nullable so scheduler runs (with no user context) can insert rows.
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS raw_details jsonb;
ALTER TABLE public.missions ALTER COLUMN initiated_by DROP NOT NULL;
