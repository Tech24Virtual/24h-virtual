-- Overage pricing for custom plans (Custom Plan Builder) + billing-calc wiring.
--
-- STATUS: Applied directly to staging (sdsxdqsomxuimrjpaylv) via `supabase db
-- query` at implementation time. Kept here for documentation and so future
-- deployments (e.g. prod) pick it up.
--
-- CORRECTION: the original spec's migration targeted `billing_plans`, but the
-- Custom Plan Builder (src/components/admin/CustomPlanBuilder.tsx) creates
-- rows in `custom_plans` via the create-custom-plan edge function — a
-- completely separate table from `billing_plans` (the shared catalog).
-- `billing_plans.overage_rate` already exists (added in
-- 20260718000003_promos_and_convert.sql for the Convert Lead dialog); adding
-- it there again would have been a no-op that didn't touch the table this
-- feature actually writes to. `custom_plans` had zero overage columns.
--
-- Also added overage_grace_minutes/overage_cap_amount to billing_plans (not
-- just custom_plans) so both plan sources are symmetric — the billing-calc
-- wiring in supabase/functions/run-call-billing resolves whichever plan type
-- a client is on and needs the same fields available either way.

ALTER TABLE public.custom_plans
  ADD COLUMN IF NOT EXISTS overage_rate numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overage_grace_minutes int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overage_cap_amount numeric(10,2);

ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS overage_grace_minutes int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overage_cap_amount numeric(10,2);
