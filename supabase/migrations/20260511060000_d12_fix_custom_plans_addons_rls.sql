-- D-12 fix: replace `auth.users` subquery in client_addons / custom_plans RLS
--
-- The original SELECT policies (migration 20260203211331) used:
--   email = (SELECT email FROM auth.users WHERE id = auth.uid())
-- which requires SELECT on auth.users. End-users do not have that grant, so
-- evaluating these policies under RLS raises "permission denied for table users"
-- (PostgreSQL 42501). The error propagates through any view or query that joins
-- the protected tables (e.g. v_subscription_snapshot → v_exec_direct_vs_wl_summary,
-- v_exec_mrr_spine, v_exec_retention_rates, v_revops_period_snapshots), which
-- blocked all RP-3/4/6/7 read paths in the QA Readiness retest.
--
-- Fix: read the caller's email from the JWT (`auth.jwt() ->> 'email'`) which
-- requires no extra grants. Behaviour is unchanged for legitimate callers — the
-- JWT email is the same value authenticated users hold in auth.users.email — but
-- the policy can now evaluate without elevated privileges.
--
-- Scope: SELECT policies only on `client_addons` and `custom_plans`. The
-- "Admins can manage ..." policies (FOR ALL using has_role(...,'admin')) are
-- untouched, and no data is read or modified.

DROP POLICY IF EXISTS "Clients can view own addons" ON public.client_addons;
CREATE POLICY "Clients can view own addons"
  ON public.client_addons
  FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Clients can view own custom plans" ON public.custom_plans;
CREATE POLICY "Clients can view own custom plans"
  ON public.custom_plans
  FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE email = (auth.jwt() ->> 'email')
    )
  );
