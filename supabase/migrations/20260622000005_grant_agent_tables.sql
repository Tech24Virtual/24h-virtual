-- Grant table-level permissions to authenticated role for agent portal tables.
-- Without these, PostgREST returns 403 before RLS policies are even evaluated.
GRANT SELECT, INSERT, UPDATE ON public.agent_onboarding TO authenticated;
GRANT SELECT ON public.agent_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.time_off_requests TO authenticated;
GRANT SELECT, UPDATE ON public.open_shifts TO authenticated;
GRANT SELECT ON public.client_agent_assignments TO authenticated;
