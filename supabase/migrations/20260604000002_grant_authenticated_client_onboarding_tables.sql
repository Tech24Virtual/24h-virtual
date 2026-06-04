-- Fix: grant authenticated role data-access on all System 9 / client-onboarding tables.
--
-- The migration that created these tables (20260421190535) never ran the standard
-- GRANT SELECT/INSERT/UPDATE/DELETE … TO authenticated that every other table in
-- this project has (e.g. leads). Without those GRANTs, PostgreSQL rejects every
-- query from the browser Supabase client before RLS even evaluates, causing all
-- client-facing queries (and admin browser queries) to silently return null.
-- The service_role client (Edge Functions) is unaffected because it bypasses RLS
-- and already has full access.
--
-- RLS policies continue to enforce row-level restrictions — these GRANTs only
-- restore the table-level permission that should have been set at creation time.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_onboarding_handoffs  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_handoff_items         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_onboarding_activity   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_handoff_documents     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_handoff_requests      TO authenticated;
