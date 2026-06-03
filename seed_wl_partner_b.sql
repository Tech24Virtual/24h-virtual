-- Create WL Partner B (for cross-partner isolation tests)
INSERT INTO public.white_label_partners (
  user_id,
  company_name,
  contact_name,
  email,
  partner_slug,
  status,
  tier
)
VALUES (
  'PARTNER-B-UUID-HERE',
  'QA Test Agency B',
  'QA Owner B',
  'qa-wl-partner-b@24hv-test.com',
  'qa-test-agency-b',
  'active',
  'reseller'
)
ON CONFLICT (partner_slug) DO UPDATE
  SET status = 'active';

-- Create branding for Partner B
INSERT INTO public.white_label_branding (
  partner_id,
  primary_color,
  secondary_color,
  powered_by_visible
)
SELECT 
  id,
  '#ef4444',
  '#f97316',
  false
FROM public.white_label_partners
WHERE partner_slug = 'qa-test-agency-b'
ON CONFLICT (partner_id) DO NOTHING;