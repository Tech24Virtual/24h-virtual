-- Billing staff can change a client's plan from the Subscriptions page
-- (src/components/admin/ActiveSubscriptionsList.tsx), which writes
-- current_plan_id/plan_override/plan_override_by/plan_override_at on
-- public.leads. No RLS UPDATE policy previously granted the 'billing'
-- role write access — only 'sales' (and 'admin' via the catch-all
-- policy) could update leads. The billing role only had the SELECT
-- policy from 20260830124223_billing_can_view_leads.sql, so every plan
-- change was silently filtered out by RLS: PostgREST still returned
-- 204 (since it doesn't report affected-row count without
-- `Prefer: return=representation`), so the UI showed a false "Plan
-- updated" success toast while nothing was ever written.
--
-- Postgres RLS policies are row-scoped, not column-scoped, and this
-- table has no per-app-role Postgres roles to attach a column-level
-- GRANT to (every app role shares the `authenticated` Postgres role;
-- authorization is enforced entirely through has_role() in RLS). So,
-- consistent with the existing "Sales can update leads" policy (full
-- row, not column-restricted), this grants billing full UPDATE access
-- on leads rather than a column subset — there's no lighter-weight way
-- to express "billing may only touch plan columns" in this codebase's
-- existing RLS architecture without introducing a new enforcement
-- mechanism (e.g. a BEFORE UPDATE trigger diffing OLD vs NEW), which is
-- out of scope for this fix.
CREATE POLICY "Billing can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'billing'::app_role));
