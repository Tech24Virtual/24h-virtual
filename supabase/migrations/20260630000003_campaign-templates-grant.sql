-- campaign_templates: table was created with RLS policies (admin_all, member_select)
-- but no table-level GRANT was ever issued. Direct SELECT queries from the browser
-- client fail silently (returns empty / 403) even though the save_campaign_as_template
-- and clone_template_into_department RPCs work (they are SECURITY DEFINER).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_templates TO authenticated;
