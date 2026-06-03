CREATE OR REPLACE FUNCTION public.seed_test_wl_partner(
  p_user_id uuid,
  p_slug text,
  p_company text,
  p_email text,
  p_contact_name text DEFAULT 'QA Owner',
  p_color text DEFAULT '#6366f1'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
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
    p_user_id,
    p_company,
    p_contact_name,
    p_email,
    p_slug,
    'active',
    'reseller'
  )
  ON CONFLICT (partner_slug) DO UPDATE
    SET user_id = p_user_id,
        status = 'active'
  RETURNING id INTO v_partner_id;

  INSERT INTO public.white_label_branding (
    partner_id,
    primary_color,
    secondary_color,
    powered_by_visible
  )
  VALUES (v_partner_id, p_color, '#8b5cf6', false)
  ON CONFLICT (partner_id) DO NOTHING;

  -- Dismiss welcome modal for test users
  UPDATE public.profiles 
  SET partner_welcome_seen = true 
  WHERE id = p_user_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_test_wl_partner TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_test_wl_partner TO service_role;