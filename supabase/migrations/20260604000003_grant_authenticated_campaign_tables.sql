-- Fix: grant authenticated role data-access on Campaign OS tables.
--
-- campaigns and campaign_scenarios were created without the standard
-- GRANT SELECT/INSERT/UPDATE/DELETE … TO authenticated, matching the same
-- pattern as the client_onboarding_* tables fixed in 20260604000002.
-- Without SELECT, every browser client query throws "permission denied"
-- before RLS even evaluates, causing the Campaigns page error card.
--
-- client_departments already has SELECT for authenticated (not repeated here).
-- RLS policies (campaigns_member_select, campaign_scenarios_member_select)
-- continue to enforce row-level tenant isolation via is_tenant_member().

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_scenarios TO authenticated;
