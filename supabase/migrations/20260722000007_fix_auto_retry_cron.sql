-- auto-retry-failed-payments was using current_setting('app.supabase_url') /
-- current_setting('app.service_role_key'), both of which are unset at the database
-- level (confirmed NULL) — every run since creation sent Authorization: Bearer NULL.
-- Re-create with the hardcoded URL + literal service_role JWT pattern (matches
-- monthly-billing-auto-run and five9-call-report-daily-pull), same schedule and
-- same target function/body as before.
SELECT cron.unschedule('auto-retry-failed-payments');

SELECT cron.schedule(
  'auto-retry-failed-payments',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sdsxdqsomxuimrjpaylv.supabase.co/functions/v1/retry-failed-payment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkc3hkcXNvbXh1aW1yanBheWx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI5MDM4MiwiZXhwIjoyMDk0ODY2MzgyfQ.lwAfB8yWk9WF7Wp-865qMgR530FwhM_UEDxokj7M6YM'
    ),
    body := '{"mode":"batch"}'::jsonb
  );
  $$
);
