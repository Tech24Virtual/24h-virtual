
-- Create the slack-screenshots storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('slack-screenshots', 'slack-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload screenshots to their folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'slack-screenshots'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Anyone authenticated can view screenshots (needed for message display)
CREATE POLICY "Authenticated users can view screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'slack-screenshots'
  AND auth.role() = 'authenticated'
);
