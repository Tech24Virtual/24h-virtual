-- Create WL Partner A (qa-wl-owner)
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
  '4e23a656-f30e-4669-a72d-aa68f55a6965',
  'QA Test Agency',
  'QA Owner',
  'qa-wl-owner@24hv-test.com',
  'qa-test-agency',
  'active',
  'reseller'
)
ON CONFLICT (partner_slug) DO UPDATE
  SET contact_name = 'QA Owner',
      email = 'qa-wl-owner@24hv-test.com',
      status = 'active';

-- Create branding for Partner A
INSERT INTO public.white_label_branding (
  partner_id,
  primary_color,
  secondary_color,
  powered_by_visible
)
SELECT 
  id,
  '#6366f1',
  '#8b5cf6',
  false
FROM public.white_label_partners 
WHERE partner_slug = 'qa-test-agency'
ON CONFLICT (partner_id) DO NOTHING;

-- Dismiss the "Welcome Aboard" modal for test WL partners
-- so it doesn't interfere with automated tests
UPDATE public.profiles 
SET partner_welcome_seen = true 
WHERE id = '4e23a656-f30e-4669-a72d-aa68f55a6965';