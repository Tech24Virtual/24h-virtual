-- Grant table-level access on campaign_knowledge_versions to authenticated.
--
-- The table was created with RLS policies (admin_all, member_select) but
-- without the GRANT that lets the role attempt a query before RLS fires.
-- Without this, even admins get "permission denied for table
-- campaign_knowledge_versions" before the admin_all policy is evaluated.
--
-- SELECT: needed by any role that reads version history.
-- INSERT: needed by the admin writing snapshots on FAQ/policy upsert.

GRANT SELECT, INSERT ON public.campaign_knowledge_versions TO authenticated;
