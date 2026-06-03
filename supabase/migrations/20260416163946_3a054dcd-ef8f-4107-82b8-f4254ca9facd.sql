ALTER TABLE outbound_call_requests ADD COLUMN IF NOT EXISTS wl_client_id uuid REFERENCES white_label_clients(id);
CREATE INDEX IF NOT EXISTS idx_outbound_call_requests_wl_client_id ON outbound_call_requests(wl_client_id);

CREATE POLICY "WL clients can view own outbound requests"
ON outbound_call_requests FOR SELECT
USING (wl_client_id IS NOT NULL AND wl_client_id = public.get_wl_client_id(auth.uid()));

CREATE POLICY "WL clients can insert own outbound requests"
ON outbound_call_requests FOR INSERT
WITH CHECK (wl_client_id IS NOT NULL AND wl_client_id = public.get_wl_client_id(auth.uid()));

CREATE POLICY "WL clients can cancel own pending requests"
ON outbound_call_requests FOR UPDATE
USING (wl_client_id IS NOT NULL AND wl_client_id = public.get_wl_client_id(auth.uid()) AND status = 'pending');