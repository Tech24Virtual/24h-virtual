-- The previous admin policy ("Admins can manage all branding") had with_check = null.
-- PostgreSQL FOR ALL policies with null WITH CHECK use the USING clause implicitly,
-- but this produces ambiguous behaviour for INSERT ... ON CONFLICT DO UPDATE, which
-- requires both INSERT and UPDATE paths to pass simultaneously. Combined with the
-- second policy added in 20260617000002, we ended up with two competing FOR ALL admin
-- policies that caused the upsert to fail with "permission denied."
--
-- Fix: drop both admin policies, recreate one clean policy with explicit USING and
-- WITH CHECK. We use has_role() (SECURITY DEFINER, postgres owner) which is the
-- codebase's standard for admin RLS and safely bypasses user_roles row-level security.

DROP POLICY IF EXISTS "Admins can manage all branding"  ON public.white_label_branding;
DROP POLICY IF EXISTS "admin_manage_wl_branding"        ON public.white_label_branding;

CREATE POLICY "admin_manage_wl_branding"
  ON public.white_label_branding
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Ensure table-level grants are present (idempotent).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.white_label_branding TO authenticated;
