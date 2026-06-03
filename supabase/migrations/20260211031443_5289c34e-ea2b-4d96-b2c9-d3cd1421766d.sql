
-- Sprint 4A: Add shift edit/approve columns and breaks_paid admin setting

-- Add new columns to agent_shifts
ALTER TABLE public.agent_shifts
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN edited_at timestamptz,
  ADD COLUMN edit_reason text,
  ADD COLUMN original_clock_in timestamptz,
  ADD COLUMN original_clock_out timestamptz;

-- Insert breaks_paid admin setting (default false = unpaid breaks)
INSERT INTO public.admin_settings (key, value)
VALUES ('breaks_paid', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
