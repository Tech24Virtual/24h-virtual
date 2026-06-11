-- WL clients must be able to read their portal partner's branding so that
-- WLPortalContext can inject the correct title, favicon, and colours.
-- The existing RLS only covered the partner owner (white_label_partners.user_id
-- = auth.uid()), which excludes wl_client users entirely.

CREATE POLICY "WL clients can view their partner branding"
  ON public.white_label_branding
  FOR SELECT
  USING (
    partner_id IN (
      SELECT partner_id
      FROM   public.white_label_clients
      WHERE  user_id = auth.uid()
    )
  );
