-- Schedule daily cleanup of cron job history older than 7 days
SELECT cron.schedule(
  'prune-cron-job-history',
  '0 2 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);

-- Run immediately to clear existing backlog (33k rows)
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';
