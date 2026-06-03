CREATE POLICY "Anyone can read public build status keys"
ON public.admin_settings
FOR SELECT
TO anon, authenticated
USING (
  key IN (
    'wave_1_uat_signoff_confirmed',
    'wave_2_uat_signoff_confirmed',
    'wave_3_uat_signoff_confirmed'
  )
);