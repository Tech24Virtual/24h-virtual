-- Allow WL partners to manage their own addon pricing
CREATE POLICY "Partners can manage own addon pricing"
  ON public.wl_addon_pricing
  FOR ALL
  USING (
    partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  );
