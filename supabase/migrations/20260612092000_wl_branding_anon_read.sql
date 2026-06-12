-- The WL portal login page loads before authentication — the anon role must be
-- able to read the two tables WLPortalProvider queries to build the branded
-- login screen (title, favicon, colours). Both tables contain only
-- public-facing display data; no PII or sensitive config is exposed.

GRANT SELECT ON public.white_label_partners TO anon;
GRANT SELECT ON public.white_label_branding TO anon;

CREATE POLICY "Anon can read partner slugs for login page"
  ON public.white_label_partners
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read partner branding for login page"
  ON public.white_label_branding
  FOR SELECT
  TO anon
  USING (true);
