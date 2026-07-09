-- Correction #14 Part 1: heartbeat mechanism so an abandoned browser tab
-- (crash, closed laptop, lost connection) doesn't leave a shift clocked in
-- forever.

ALTER TABLE public.agent_shifts
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;

ALTER TABLE public.agent_shifts
  ADD COLUMN IF NOT EXISTS auto_clocked_out boolean DEFAULT false;

ALTER TABLE public.agent_shifts
  ADD COLUMN IF NOT EXISTS auto_clockout_reason text;

-- Grant access
GRANT UPDATE ON public.agent_shifts TO authenticated;

-- pg_cron: every 5 minutes, auto-clock-out shifts with no heartbeat for 10+ minutes.
-- Also sets status = 'completed' (not just clock_out) — without this the shift
-- would be stuck with clock_out set but status still 'active', which every
-- other page (AgentShifts.tsx, PayPeriodSummary.tsx, invoice submission) treats
-- as an inconsistent state: excluded from pay-period totals and unapprovable,
-- while still rendering an "Active" badge.
SELECT cron.schedule(
  'auto-clockout-idle-shifts',
  '*/5 * * * *',
  $$
  UPDATE public.agent_shifts
  SET
    clock_out = now(),
    status = 'completed',
    auto_clocked_out = true,
    auto_clockout_reason = 'No heartbeat detected for 10 minutes — browser likely closed'
  WHERE clock_out IS NULL
  AND last_heartbeat_at IS NOT NULL
  AND last_heartbeat_at < now() - INTERVAL '10 minutes';
  $$
);
