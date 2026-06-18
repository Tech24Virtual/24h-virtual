-- Monthly billing auto-run cron job (pg_cron + pg_net).
--
-- STATUS: Already registered and active on staging (sdsxdqsomxuimrjpaylv).
-- This migration is kept for documentation and will re-register the job on
-- any future deployment where it does not yet exist.
--
-- Prerequisites (enable once in Supabase Dashboard → Database → Extensions):
--   pg_cron  — available on all Supabase projects; enable in Dashboard
--   pg_net   — created below via CREATE EXTENSION IF NOT EXISTS
--
-- The service role key is read at runtime via:
--   current_setting('app.service_role_key', true)
-- Set this in Supabase Dashboard → Settings → Database → Configuration:
--   ALTER DATABASE postgres SET app.service_role_key = '<service-role-key>';
--
-- To verify the job after deployment:
--   SELECT * FROM cron.job WHERE jobname = 'monthly-billing-auto-run';

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Register monthly billing auto-run cron job
-- Runs at 6am UTC on the 1st of every month
SELECT cron.schedule(
  'monthly-billing-auto-run',
  '0 6 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://sdsxdqsomxuimrjpaylv.supabase.co/functions/v1/run-call-billing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
