-- WLPortalProvider.fetchBranding() falls back to resolving a partner_id from
-- white_label_clients.client_portal_slug when the slug does not match any
-- white_label_partners.partner_slug.  Anon users need to execute this query
-- for the login page to show partner branding before authentication.
--
-- Only client_portal_slug and partner_id are exposed — both are public portal
-- identifiers with no PII.  All other columns remain inaccessible to anon.

GRANT SELECT (client_portal_slug, partner_id) ON public.white_label_clients TO anon;

CREATE POLICY "Anon can resolve client portal slugs"
  ON public.white_label_clients
  FOR SELECT
  TO anon
  USING (true);
