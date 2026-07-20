-- Payment retry tracking + auto-retry automation for the Admin Billing
-- "Payment Issues" flow.
--
-- STATUS: Applied directly to staging (sdsxdqsomxuimrjpaylv) via `supabase db
-- query` at implementation time. Kept here for documentation and so future
-- deployments (e.g. prod) pick it up.
--
-- CORRECTION: the original spec targeted a table called `nmi_payment_issues`,
-- which does not exist anywhere in this schema (confirmed via
-- information_schema.tables during the Admin Billing audit). The real,
-- actively-written failure table is `payment_failures` — written by both
-- supabase/functions/nmi-charge and supabase/functions/nmi-webhook, and
-- already read by src/components/admin/PaymentFailures.tsx and
-- src/pages/staff/BillingClientLookup.tsx. This migration extends that real
-- table instead of creating a disconnected duplicate.

ALTER TABLE public.payment_failures
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'failed'
    CHECK (status IN ('failed','retrying','needs_attention','resolved','cancelled')),
  ADD COLUMN IF NOT EXISTS amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS retry_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS retry_cancelled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_update_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_update_sent_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id);

-- Backfill status for pre-existing rows so the new state machine agrees with
-- the resolved/open distinction the UI already relies on.
UPDATE public.payment_failures
SET status = 'resolved'
WHERE resolved_at IS NOT NULL AND status = 'failed';

-- Per-attempt timeline. The original payment_failures row is attempt 1; every
-- subsequent retry appends a row here instead of overwriting history.
CREATE TABLE IF NOT EXISTS public.payment_failure_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_failure_id uuid NOT NULL REFERENCES public.payment_failures(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL CHECK (result IN ('failed','succeeded')),
  error_message text,
  nmi_transaction_id text
);

GRANT SELECT, INSERT ON public.payment_failure_attempts TO authenticated;
ALTER TABLE public.payment_failure_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and billing can view payment attempts" ON public.payment_failure_attempts;
CREATE POLICY "Admins and billing can view payment attempts" ON public.payment_failure_attempts
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'billing'::app_role)
  );

DROP POLICY IF EXISTS "Admins and billing can insert payment attempts" ON public.payment_failure_attempts;
CREATE POLICY "Admins and billing can insert payment attempts" ON public.payment_failure_attempts
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'billing'::app_role)
  );

-- Notify the client's linked user after each failed attempt (initial failure
-- or a retry that failed again). Silently no-ops if the lead has no linked
-- auth user yet. Skipped entirely on resolve/cancel transitions.
CREATE OR REPLACE FUNCTION public.trg_notify_payment_failure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid;
BEGIN
  IF NEW.status NOT IN ('failed', 'needs_attention') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.retry_count = OLD.retry_count AND NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO _user_id FROM public.leads WHERE id = NEW.lead_id;
  IF _user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, category, action_url)
  VALUES (
    _user_id,
    'Payment Failed — Action Required',
    'A payment' || COALESCE(' of $' || NEW.amount::text, '') || ' failed' ||
      CASE WHEN NEW.retry_count > 0 THEN ' (attempt ' || (NEW.retry_count + 1) || ' of 3)' ELSE '' END ||
      '. Please update your payment method.',
    'billing',
    '/client-dashboard/billing'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_payment_failure ON public.payment_failures;
CREATE TRIGGER trg_notify_payment_failure
  AFTER INSERT OR UPDATE ON public.payment_failures
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_payment_failure();

-- Auto-retry cron: every 30 minutes, ask the retry-failed-payment edge
-- function to process anything due. NOTE: pg_cron/plpgsql cannot call an
-- external payment gateway directly, so — unlike a plain status-flipping SQL
-- job — this invokes a real edge function (supabase/functions/
-- retry-failed-payment) that performs the actual NMI charge attempt via
-- nmiDirectCharge and updates retry_count/status/next_retry_at based on the
-- real result. Follows the same pg_net + service-role-key pattern as the
-- existing monthly-billing-auto-run job.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- cron.schedule() is idempotent by jobname — re-running this migration
-- updates the existing job in place rather than erroring or duplicating it.
SELECT cron.schedule(
  'auto-retry-failed-payments',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sdsxdqsomxuimrjpaylv.supabase.co/functions/v1/retry-failed-payment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('batch', true)
  );
  $$
);

-- Unrelated pre-existing bug found while building the ClientBillingSheet's
-- "Add Note" action (Fix 1): billing_notes had an RLS policy but was missing
-- the base table GRANT for `authenticated` (only had the default TRUNCATE/
-- REFERENCES/TRIGGER — no SELECT/INSERT/UPDATE/DELETE), so every insert 403'd
-- before RLS was ever evaluated. Same table already used, and equally broken,
-- in src/pages/staff/BillingClientLookup.tsx.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_notes TO authenticated;
