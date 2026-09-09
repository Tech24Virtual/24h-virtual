-- Tech Dashboard QA: the 'tech' role was missing RLS grants on four tables
-- it needs for pages that are guarded specifically for tech
-- (src/routes/StaffRoutes.tsx: guard("tech", ...)), causing those pages to
-- silently show empty/broken states even though real data exists:
--
-- - five9_variable_mappings / five9_drift_snapshots (src/pages/staff/TechFive9.tsx):
--   only had SELECT policies for admin/tenant-members (mappings) or admin
--   only (snapshots) — tech got zero rows back with no error, so the
--   Variable Mappings and Drift Detection tabs always looked empty.
-- - platform_knowledge (src/pages/staff/TechKnowledgeBase.tsx): INSERT/
--   UPDATE/DELETE were admin-only. Create failed loudly (RLS violation
--   error), but Edit/Delete failed *silently* — PostgREST matched zero rows
--   under the admin-only USING clause and returned success, so the UI's
--   .update()/.delete() calls (with no .select() to check rows-affected)
--   showed false "Entry updated"/"Entry deleted" toasts while nothing
--   changed. (Same silent-no-op class as the billing/leads fix in
--   20260909000000_billing_can_update_leads_plan.sql — fixed on the app
--   side too, see TechKnowledgeBase.tsx.)
-- - leads (src/pages/staff/TechChatDeployments.tsx): the "Direct Client"
--   deployment wizard step queries active leads for its client picker, but
--   tech had no SELECT policy on leads (only agent/billing/sales/
--   supervisor/self-view existed), so the dropdown was always empty.

CREATE POLICY "Tech can view five9 variable mappings"
ON public.five9_variable_mappings
FOR SELECT
USING (has_role(auth.uid(), 'tech'::app_role));

CREATE POLICY "Tech can view five9 drift snapshots"
ON public.five9_drift_snapshots
FOR SELECT
USING (has_role(auth.uid(), 'tech'::app_role));

CREATE POLICY "Tech can manage platform knowledge"
ON public.platform_knowledge
FOR ALL
USING (has_role(auth.uid(), 'tech'::app_role))
WITH CHECK (has_role(auth.uid(), 'tech'::app_role));

CREATE POLICY "Tech can view leads for deployments"
ON public.leads
FOR SELECT
USING (has_role(auth.uid(), 'tech'::app_role));
