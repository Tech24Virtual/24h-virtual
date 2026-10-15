-- Attachments on WL client ticket replies.
--
-- Same shape as ticket_replies.attachments: [{ path, name, type, size }].
-- Files live in the private `ticket-attachments` bucket under
-- wl/<wl_client_tickets.id>/<uuid>-<filename>. Access mirrors the
-- support_tickets lane: you can read/upload only if wl_client_tickets RLS lets
-- you see that ticket (the WL client, the owning partner, or admin on
-- escalated tickets).

ALTER TABLE public.wl_client_ticket_replies
  ADD COLUMN IF NOT EXISTS attachments jsonb;

DROP POLICY IF EXISTS "WL ticket participants can upload attachments" ON storage.objects;
CREATE POLICY "WL ticket participants can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND (storage.foldername(name))[1] = 'wl'
    AND EXISTS (
      SELECT 1 FROM public.wl_client_tickets t
      WHERE t.id::text = (storage.foldername(name))[2]
    )
  );

DROP POLICY IF EXISTS "WL ticket participants can view attachments" ON storage.objects;
CREATE POLICY "WL ticket participants can view attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (storage.foldername(name))[1] = 'wl'
    AND EXISTS (
      SELECT 1 FROM public.wl_client_tickets t
      WHERE t.id::text = (storage.foldername(name))[2]
    )
  );
