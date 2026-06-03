-- Tighten wl-feedback-attachments upload policy: must scope to caller's
-- partner_id (for WL partner staff) or their partner_id via white_label_clients
-- (for WL end-clients). Folder convention: <partner_id>/<...>.

DROP POLICY IF EXISTS "wl_feedback_attach_upload" ON storage.objects;

CREATE POLICY "wl_feedback_attach_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'wl-feedback-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.white_label_partners WHERE user_id = auth.uid()
      UNION
      SELECT partner_id::text FROM public.white_label_clients WHERE user_id = auth.uid()
    )
  );

-- Existing wl_feedback_attach_partner_read SELECT policy already restricts reads
-- to partner-of-folder OR admin; admin signed-URL generation continues to work
-- because it uses the service-role key on the server.