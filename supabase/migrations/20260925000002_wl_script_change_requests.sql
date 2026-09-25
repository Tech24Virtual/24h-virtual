-- WL end-client script change requests. script_id (FK -> client_scripts) can't
-- be used for WL scripts since they live in a separate wl_client_scripts
-- table — the relevant script is identified inside proposed_changes instead
-- (same pattern already used by WLPortalAdminCampaignDetail.tsx). wl_client_id
-- is a real column so the WL partner's own RLS scoping can use it directly.
ALTER TABLE public.script_change_requests
  ADD COLUMN wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE;

CREATE POLICY "WL partners can view their clients' change requests"
  ON public.script_change_requests FOR SELECT
  USING (
    wl_client_id IN (
      SELECT wc.id FROM public.white_label_clients wc
      JOIN public.white_label_partners wp ON wp.id = wc.partner_id
      WHERE wp.user_id = auth.uid()
    )
  );

CREATE POLICY "WL partners can update their clients' change requests"
  ON public.script_change_requests FOR UPDATE
  USING (
    wl_client_id IN (
      SELECT wc.id FROM public.white_label_clients wc
      JOIN public.white_label_partners wp ON wp.id = wc.partner_id
      WHERE wp.user_id = auth.uid()
    )
  );

-- WL end-clients notify their own partner's owner when they submit a change
-- request. Scoped so a client can only target a user_id that is genuinely
-- their own partner's owner, not an arbitrary user.
CREATE POLICY "WL clients can notify their partner"
  ON public.notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.white_label_clients wc
      JOIN public.white_label_partners wp ON wp.id = wc.partner_id
      WHERE wc.user_id = auth.uid() AND wp.user_id = notifications.user_id
    )
  );
