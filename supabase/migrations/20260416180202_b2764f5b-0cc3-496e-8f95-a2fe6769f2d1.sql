
-- Domain aliases for WL partner hostname masking
CREATE TABLE public.white_label_domain_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  alias_hostname text NOT NULL UNIQUE,
  cname_status text DEFAULT 'pending',
  cname_verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_wl_domain_aliases_hostname ON public.white_label_domain_aliases (alias_hostname);

-- Enable RLS
ALTER TABLE public.white_label_domain_aliases ENABLE ROW LEVEL SECURITY;

-- Anyone can read aliases (needed for hostname resolution before auth)
CREATE POLICY "Anyone can read domain aliases"
  ON public.white_label_domain_aliases
  FOR SELECT
  USING (true);

-- Partners can manage their own aliases
CREATE POLICY "Partners can manage own aliases"
  ON public.white_label_domain_aliases
  FOR ALL
  TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  );

-- Email branding fields on white_label_branding
ALTER TABLE public.white_label_branding
  ADD COLUMN IF NOT EXISTS email_from_name text,
  ADD COLUMN IF NOT EXISTS email_from_address text,
  ADD COLUMN IF NOT EXISTS email_reply_to text;

-- Index for fast hostname lookup on custom_domain
CREATE INDEX IF NOT EXISTS idx_wl_branding_custom_domain
  ON public.white_label_branding (custom_domain);
