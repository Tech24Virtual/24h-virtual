-- Fix: grant table-level permissions on agent_shifts and agent_shift_breaks
-- to the authenticated role.
--
-- RLS policies exist (created in 20260211020527) but without these GRANTs
-- the authenticated role gets a permission-denied error before RLS even runs.
-- This was the root cause of the clock-in failure on the Agent Dashboard.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agent_shift_breaks TO authenticated;
