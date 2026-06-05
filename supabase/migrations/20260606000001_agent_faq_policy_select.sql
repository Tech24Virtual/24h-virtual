-- Grant agents SELECT on approved FAQs and policies for their assigned clients.
--
-- The existing member_select policies cover admins/supervisors/clients/wl-parties
-- via is_tenant_member(), but agents are staff — they have no client_lead_id of
-- their own and is_tenant_member() returns false for them.
--
-- Agents access clients through client_agent_assignments (agent_id → client_id).
-- client_id in that table maps 1:1 with client_lead_id in Campaign OS tables.
-- Global-scope rows (client_lead_id IS NULL) are already readable by all
-- authenticated users via the existing _global_select policies.

CREATE POLICY campaign_faq_entries_agent_select
  ON public.campaign_faq_entries
  FOR SELECT TO authenticated
  USING (
    status = 'approved'
    AND public.has_role(auth.uid(), 'agent'::app_role)
    AND client_lead_id IN (
      SELECT client_id FROM public.client_agent_assignments WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY campaign_policy_blocks_agent_select
  ON public.campaign_policy_blocks
  FOR SELECT TO authenticated
  USING (
    status = 'approved'
    AND public.has_role(auth.uid(), 'agent'::app_role)
    AND client_lead_id IN (
      SELECT client_id FROM public.client_agent_assignments WHERE agent_id = auth.uid()
    )
  );
