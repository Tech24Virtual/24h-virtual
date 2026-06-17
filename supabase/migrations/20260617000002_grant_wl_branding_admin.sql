-- Admins need INSERT and UPDATE on white_label_branding to manage partner branding
-- via the new AdminPartnerBrandingTab. SELECT was already granted in 20260612090000.
-- The upsert (onConflict: partner_id) requires both INSERT and UPDATE.
GRANT INSERT, UPDATE ON public.white_label_branding TO authenticated;

-- RLS policy so admins can write any partner's branding row.
-- Checks user_roles directly to avoid calling the SECURITY DEFINER has_role() from RLS.
CREATE POLICY "admin_manage_wl_branding"
  ON public.white_label_branding
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
