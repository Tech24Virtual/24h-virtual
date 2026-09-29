-- Hourly pull for WL client Five9 call data, mirroring the existing
-- five9-call-report-hourly-pull job's auth pattern (a service_role bearer
-- token passed directly in the cron command). Offset to :30 past the hour
-- so it doesn't compete with the direct-client pull at :00.
--
-- NOTE: SERVICE_ROLE_KEY_HERE below is a placeholder, not a real secret —
-- do not commit the actual service role key into this file. Apply this
-- migration with the real key substituted in at apply time (e.g. via a
-- one-off psql/CLI command), the same way the existing five9 job's live
-- command in cron.job holds the real value without it ever living in a
-- git-tracked file.
SELECT cron.schedule(
  'wl-five9-call-report-hourly-pull',
  '30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sdsxdqsomxuimrjpaylv.supabase.co/functions/v1/pull-wl-five9-calls',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SERVICE_ROLE_KEY_HERE'
    ),
    body := jsonb_build_object('days_back', 1)
  );
  $$
);
