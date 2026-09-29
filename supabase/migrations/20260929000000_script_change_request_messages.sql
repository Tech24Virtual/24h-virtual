-- Private WL Client <-> WL Partner messaging thread on script change requests.
-- 24H Virtual never sees this thread unless the partner forwards the request
-- (forwarded_to_24h), at which point existing + future messages become
-- visible to admin/supervisor too. Enforced entirely via RLS visible_to +
-- forwarded_to_24h, not client-side filtering.

ALTER TABLE public.script_change_requests
  ADD COLUMN forwarded_to_24h boolean NOT NULL DEFAULT false;

CREATE TABLE public.script_change_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.script_change_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  message text NOT NULL,
  visible_to text[] NOT NULL DEFAULT ARRAY['wl_client', 'white_label'],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_script_change_request_messages_request_id
  ON public.script_change_request_messages(request_id);

ALTER TABLE public.script_change_request_messages ENABLE ROW LEVEL SECURITY;

-- WL client can see messages on their own requests, when addressed to them
CREATE POLICY "WL client can view own request messages"
  ON public.script_change_request_messages FOR SELECT
  USING (
    'wl_client' = ANY(visible_to)
    AND EXISTS (
      SELECT 1 FROM public.script_change_requests scr
      JOIN public.white_label_clients wlc ON wlc.id = scr.wl_client_id
      WHERE scr.id = request_id AND wlc.user_id = auth.uid()
    )
  );

-- WL partner can see messages for their clients' requests, when addressed to them
CREATE POLICY "WL partner can view partner request messages"
  ON public.script_change_request_messages FOR SELECT
  USING (
    'white_label' = ANY(visible_to)
    AND EXISTS (
      SELECT 1 FROM public.script_change_requests scr
      JOIN public.white_label_clients wlc ON wlc.id = scr.wl_client_id
      JOIN public.white_label_partners wlp ON wlp.id = wlc.partner_id
      WHERE scr.id = request_id AND wlp.user_id = auth.uid()
    )
  );

-- Admin/Supervisor can only see messages once the partner has forwarded the request
CREATE POLICY "24H staff can view forwarded messages"
  ON public.script_change_request_messages FOR SELECT
  USING (
    '24h' = ANY(visible_to)
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
  );

-- WL client can send messages on their own request
CREATE POLICY "WL client can send request messages"
  ON public.script_change_request_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.script_change_requests scr
      JOIN public.white_label_clients wlc ON wlc.id = scr.wl_client_id
      WHERE scr.id = request_id AND wlc.user_id = auth.uid()
    )
  );

-- WL partner can send messages on their clients' requests
CREATE POLICY "WL partner can send request messages"
  ON public.script_change_request_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.script_change_requests scr
      JOIN public.white_label_clients wlc ON wlc.id = scr.wl_client_id
      JOIN public.white_label_partners wlp ON wlp.id = wlc.partner_id
      WHERE scr.id = request_id AND wlp.user_id = auth.uid()
    )
  );

-- WL partner can update visible_to on their clients' request messages
-- (used only to add '24h' to existing messages when forwarding)
CREATE POLICY "WL partner can forward request messages to 24H"
  ON public.script_change_request_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.script_change_requests scr
      JOIN public.white_label_clients wlc ON wlc.id = scr.wl_client_id
      JOIN public.white_label_partners wlp ON wlp.id = wlc.partner_id
      WHERE scr.id = request_id AND wlp.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.script_change_request_messages TO authenticated;
