ALTER TABLE public.agent_shifts
  ADD COLUMN IF NOT EXISTS agent_status text DEFAULT 'available'
  CHECK (agent_status IN ('available', 'on_break_bathroom', 'on_break_lunch', 'not_ready'));
