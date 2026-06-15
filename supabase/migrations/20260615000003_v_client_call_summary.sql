-- Aggregated call summary view per client per month
-- security_invoker = true ensures call_logs RLS is applied to callers of this view
CREATE OR REPLACE VIEW v_client_call_summary
WITH (security_invoker = true)
AS
SELECT
  client_id,
  DATE_TRUNC('month', call_date) AS period,
  COUNT(*) AS total_calls,
  SUM(billable_minutes) AS total_minutes,
  SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) AS missed_calls,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_calls,
  AVG(handle_time_seconds) AS avg_handle_seconds,
  COUNT(DISTINCT agent_name) AS agents_used,
  COUNT(DISTINCT campaign_name) AS campaigns_used
FROM call_logs
WHERE call_date IS NOT NULL
GROUP BY client_id, DATE_TRUNC('month', call_date);

GRANT SELECT ON v_client_call_summary TO authenticated;
