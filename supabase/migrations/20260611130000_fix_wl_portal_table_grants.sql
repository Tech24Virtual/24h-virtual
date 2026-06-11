-- Grant CRUD on WL portal tables that were missing SELECT/INSERT/UPDATE/DELETE
-- for the authenticated role. RLS policies on each table handle row-level isolation.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outbound_call_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outbound_call_attempts  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_call_logs            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_client_reviews       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_client_scripts       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_client_tickets       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_invoices             TO authenticated;
