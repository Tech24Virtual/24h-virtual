-- Allow WL partners to read outbound call requests for their own clients
CREATE POLICY "Partners can view own client outbound requests"
  ON public.outbound_call_requests
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
