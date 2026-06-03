
-- Create storage bucket for WL branding assets (logos, favicons)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wl-branding-assets', 'wl-branding-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their partner folder
CREATE POLICY "Partners can upload branding assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'wl-branding-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.white_label_partners WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to update their own assets
CREATE POLICY "Partners can update their branding assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'wl-branding-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.white_label_partners WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to delete their own assets
CREATE POLICY "Partners can delete their branding assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'wl-branding-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.white_label_partners WHERE user_id = auth.uid()
  )
);

-- Public read access for branding assets (needed for portal rendering)
CREATE POLICY "Anyone can view branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'wl-branding-assets');
