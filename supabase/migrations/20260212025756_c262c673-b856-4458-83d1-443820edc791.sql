ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS caller_email text,
  ADD COLUMN IF NOT EXISTS caller_number text,
  ADD COLUMN IF NOT EXISTS disposition text,
  ADD COLUMN IF NOT EXISTS dnis text;

COMMENT ON COLUMN public.call_logs.caller_email IS 'Email collected from caller during call';
COMMENT ON COLUMN public.call_logs.caller_number IS 'Phone number caller provides to agent (may differ from ANI)';
COMMENT ON COLUMN public.call_logs.disposition IS 'Call disposition from Five9';
COMMENT ON COLUMN public.call_logs.dnis IS 'Dialed number (the number the caller dialed)';