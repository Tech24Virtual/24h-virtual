-- Admin QA fix: addon_products (Product Catalog) and admin_settings (Settings
-- page) were missing INSERT/UPDATE/DELETE grants for `authenticated`, so every
-- create/update/delete (and admin_settings reads) failed with a permission
-- error even though RLS already correctly scoped writes to admins.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.addon_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_settings TO authenticated;
