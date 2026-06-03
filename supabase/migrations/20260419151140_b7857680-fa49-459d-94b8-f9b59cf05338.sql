CREATE TABLE public.feature_launch_flags (
  feature_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  is_live BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.feature_launch_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read launch flags"
ON public.feature_launch_flags
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert launch flags"
ON public.feature_launch_flags
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update launch flags"
ON public.feature_launch_flags
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete launch flags"
ON public.feature_launch_flags
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_feature_launch_flags_updated_at
BEFORE UPDATE ON public.feature_launch_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_launch_flags;
ALTER TABLE public.feature_launch_flags REPLICA IDENTITY FULL;

INSERT INTO public.feature_launch_flags (feature_key, display_name, description, is_live) VALUES
  ('ai-receptionist', 'AI Receptionist', 'Public marketing page at /solutions/ai-receptionist. When OFF, visitors see a branded Coming Soon screen.', false),
  ('hybrid-receptionist', 'Hybrid Receptionist', 'Public marketing page at /solutions/hybrid-receptionist. When OFF, visitors see a branded Coming Soon screen.', false);