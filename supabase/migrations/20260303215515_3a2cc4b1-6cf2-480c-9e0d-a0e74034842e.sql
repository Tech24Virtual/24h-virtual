
ALTER TABLE white_label_branding
  ADD COLUMN IF NOT EXISTS cname_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cname_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS sidebar_style text DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS font_heading text,
  ADD COLUMN IF NOT EXISTS font_body text,
  ADD COLUMN IF NOT EXISTS portal_footer_text text,
  ADD COLUMN IF NOT EXISTS powered_by_visible boolean DEFAULT true;
