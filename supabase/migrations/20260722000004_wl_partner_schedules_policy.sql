CREATE POLICY "Partners can view own client schedules"
  ON public.wl_client_schedules
  FOR SELECT
  USING (
    wl_client_id IN (
      SELECT id FROM public.white_label_clients
      WHERE partner_id IN (
        SELECT id FROM public.white_label_partners
        WHERE user_id = auth.uid()
      )
    )
  );
