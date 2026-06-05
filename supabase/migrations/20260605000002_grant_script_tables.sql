-- client_scripts, script_change_requests, and script_change_comments were
-- created without explicit DML grants, leaving authenticated with only
-- REFERENCES/TRIGGER/TRUNCATE. PostgREST rejects all SELECT/INSERT/UPDATE/DELETE
-- before RLS even fires, which causes "Failed to load scripts" on the client
-- dashboard and "Failed to load script change requests" on the supervisor
-- review page.
--
-- RLS policies on all three tables already exist and are correct; this
-- migration only adds the missing table-level privileges.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_scripts           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_change_requests   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_change_comments   TO authenticated;
