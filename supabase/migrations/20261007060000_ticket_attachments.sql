-- Image / PDF attachments on ticket replies (support_tickets lane).
-- Objects are stored at  ticket-attachments/<ticket_id>/<uuid>-<filename>  and referenced from
-- ticket_replies.attachments as [{ path, name, type, size }]. The bucket is private; the UI signs URLs.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments', 'ticket-attachments', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ticket_replies
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Access follows the ticket: a user can upload to / read from a ticket's folder only if they can
-- already see that ticket under support_tickets RLS (the subquery runs as the caller). This keeps
-- direct clients, WL partners and staff queues isolated from each other's attachments.
DROP POLICY IF EXISTS "Ticket participants can upload ticket attachments" ON storage.objects;
CREATE POLICY "Ticket participants can upload ticket attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Ticket participants can view ticket attachments" ON storage.objects;
CREATE POLICY "Ticket participants can view ticket attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id::text = (storage.foldername(name))[1]
    )
  );
