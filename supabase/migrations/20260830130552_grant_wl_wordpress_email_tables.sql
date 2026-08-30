-- wl_wordpress_connections and wl_email_sends both had correct RLS policies
-- for partner-scoped access, but were missing the underlying table-level
-- GRANTs to authenticated entirely — RLS policies are inert without them.
-- This caused GrowthHub.tsx's Promise.all to silently fail on exactly
-- these 2 of its 7 queries for every white-label partner.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_wordpress_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_email_sends TO authenticated;
