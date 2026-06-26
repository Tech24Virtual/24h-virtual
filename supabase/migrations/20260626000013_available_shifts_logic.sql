-- Enhanced available shifts system — split shift support and coverage tracking.
-- Note: original_agent_id and posted_by already exist on open_shifts; do NOT re-add.

ALTER TABLE public.open_shifts
  ADD COLUMN IF NOT EXISTS parent_shift_id uuid REFERENCES public.open_shifts(id),
  ADD COLUMN IF NOT EXISTS block_start timestamptz,
  ADD COLUMN IF NOT EXISTS block_end timestamptz,
  ADD COLUMN IF NOT EXISTS client_coverage_threshold numeric DEFAULT 0.8,
  ADD COLUMN IF NOT EXISTS total_blocks integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS claimed_blocks integer DEFAULT 0;

-- Backfill total_blocks = 1 on existing rows so the UI check (total_blocks > 1) works
UPDATE public.open_shifts SET total_blocks = 1 WHERE total_blocks IS NULL;

-- Coverage threshold setting (admin can override in dashboard)
INSERT INTO public.shift_break_settings (setting_key, setting_value)
VALUES ('shift_coverage_threshold', '0.8')
ON CONFLICT (setting_key) DO NOTHING;

-- Agents need SELECT on client_agent_assignments to check their own coverage
-- (may already be granted; IF NOT EXISTS guard is not available for GRANT, so we run it regardless)
GRANT SELECT ON public.client_agent_assignments TO authenticated;
