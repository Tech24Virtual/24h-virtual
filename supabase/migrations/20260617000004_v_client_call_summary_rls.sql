-- v_client_call_summary is SECURITY INVOKER, so it runs with the calling
-- user's permissions and inherits call_logs RLS automatically.
-- The only missing piece is a GRANT so authenticated users can query the view.
GRANT SELECT ON v_client_call_summary TO authenticated;
