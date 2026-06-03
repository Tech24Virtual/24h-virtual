ALTER TABLE public.disc_locations ADD COLUMN IF NOT EXISTS seeded boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_disc_locations_country_priority ON public.disc_locations(country, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_disc_generated_pages_hash ON public.disc_generated_pages(source_combination_hash);
CREATE UNIQUE INDEX IF NOT EXISTS uq_disc_generated_pages_hash ON public.disc_generated_pages(source_combination_hash);