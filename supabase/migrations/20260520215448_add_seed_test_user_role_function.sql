-- Migration: add_seed_test_user_role_function
-- Purpose: Helper function for seeding test users in staging/CI
-- IMPORTANT: This function bypasses RLS intentionally for seeding only
-- DO NOT deploy to production

CREATE OR REPLACE FUNCTION public.seed_test_user_role(
  p_user_id uuid,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow QA test emails to prevent misuse
  -- In production this function should not exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Grant execute to authenticated and service role
GRANT EXECUTE ON FUNCTION public.seed_test_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_test_user_role TO service_role;