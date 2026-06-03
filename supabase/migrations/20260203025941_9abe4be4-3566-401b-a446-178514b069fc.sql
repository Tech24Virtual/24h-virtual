-- Fix the permissive RLS policy for referral_partners INSERT
DROP POLICY IF EXISTS "Anyone can submit referral" ON public.referral_partners;

-- Allow authenticated or anonymous users to submit referrals with proper check
CREATE POLICY "Authenticated users can submit referral"
  ON public.referral_partners FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);