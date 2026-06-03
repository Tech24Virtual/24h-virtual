-- Migration: add_seed_profile_function
-- Purpose: Helper function for seeding test user profiles in staging/CI

CREATE OR REPLACE FUNCTION public.seed_test_user_profile(
  p_user_id uuid,
  p_full_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (p_user_id, p_full_name)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_test_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_test_user_profile TO service_role;