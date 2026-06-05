-- System 11 Part B — Approval workflow bridge + client FAQ read view.
--
-- 1. Supervisors need INSERT on campaign_faq_entries so the approval bridge can
--    write new/updated FAQs directly into Campaign OS when approving FAQ change
--    requests from clients.
--
-- 2. Client SELECT is already covered by campaign_faq_entries_member_select
--    (is_tenant_member returns true for direct_24h leads whose user_id matches).
--    No additional SELECT policy needed.

CREATE POLICY campaign_faq_entries_supervisor_insert
  ON public.campaign_faq_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role));
