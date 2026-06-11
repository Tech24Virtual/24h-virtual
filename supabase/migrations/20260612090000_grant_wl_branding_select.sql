-- white_label_branding was missing a table-level SELECT grant for authenticated
-- users. RLS policies on the table already restrict rows to the correct partner.
-- Without this grant, WLPortalProvider's fetchBranding() silently returns null,
-- leaving path-based portal routes with no title/favicon/theme injection.
GRANT SELECT ON public.white_label_branding TO authenticated;
