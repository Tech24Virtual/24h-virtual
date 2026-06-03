-- Allow WL clients to view their own campaigns inside the masked portal
CREATE POLICY "WL clients view own campaigns"
ON public.wl_client_campaigns
FOR SELECT
TO authenticated
USING (
  wl_client_id IN (
    SELECT id FROM public.white_label_clients WHERE user_id = auth.uid()
  )
);