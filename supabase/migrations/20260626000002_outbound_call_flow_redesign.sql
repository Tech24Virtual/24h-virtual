-- Outbound call flow redesign
-- Adds scheduled callback support and digital signature tracking on attempts

ALTER TABLE public.outbound_call_requests
  ADD COLUMN IF NOT EXISTS scheduled_callback_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_handler_id uuid REFERENCES auth.users(id);

ALTER TABLE public.outbound_call_attempts
  ADD COLUMN IF NOT EXISTS handler_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS handler_name text,
  ADD COLUMN IF NOT EXISTS handler_role text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS update_notes text;

-- Index for the scheduled tab query
CREATE INDEX IF NOT EXISTS idx_outbound_requests_scheduled_callback
  ON public.outbound_call_requests (scheduled_callback_at)
  WHERE scheduled_callback_at IS NOT NULL;
