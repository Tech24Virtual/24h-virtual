-- Fix security vulnerabilities by adding baseline authentication policies
-- These PERMISSIVE policies require authentication as a baseline,
-- then RESTRICTIVE policies further limit access

-- profiles: Add baseline auth requirement
CREATE POLICY "Require authentication for profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- affiliate_referrals: Add baseline auth requirement  
CREATE POLICY "Require authentication for affiliate_referrals"
ON public.affiliate_referrals FOR SELECT
USING (auth.uid() IS NOT NULL);

-- affiliates: Add baseline auth requirement
CREATE POLICY "Require authentication for affiliates"
ON public.affiliates FOR SELECT
USING (auth.uid() IS NOT NULL);

-- call_logs: Add baseline auth requirement
CREATE POLICY "Require authentication for call_logs"
ON public.call_logs FOR SELECT
USING (auth.uid() IS NOT NULL);

-- leads: Add baseline auth requirement
CREATE POLICY "Require authentication for leads"
ON public.leads FOR SELECT
USING (auth.uid() IS NOT NULL);

-- job_applications: Add baseline auth requirement
CREATE POLICY "Require authentication for job_applications"
ON public.job_applications FOR SELECT
USING (auth.uid() IS NOT NULL);

-- referral_partners: Add baseline auth requirement
CREATE POLICY "Require authentication for referral_partners"
ON public.referral_partners FOR SELECT
USING (auth.uid() IS NOT NULL);

-- white_label_partners: Add baseline auth requirement
CREATE POLICY "Require authentication for white_label_partners"
ON public.white_label_partners FOR SELECT
USING (auth.uid() IS NOT NULL);

-- white_label_clients: Add baseline auth requirement
CREATE POLICY "Require authentication for white_label_clients"
ON public.white_label_clients FOR SELECT
USING (auth.uid() IS NOT NULL);

-- user_roles: Add baseline auth requirement
CREATE POLICY "Require authentication for user_roles"
ON public.user_roles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- notifications: Add baseline auth requirement
CREATE POLICY "Require authentication for notifications"
ON public.notifications FOR SELECT
USING (auth.uid() IS NOT NULL);

-- contracts: Add baseline auth requirement
CREATE POLICY "Require authentication for contracts"
ON public.contracts FOR SELECT
USING (auth.uid() IS NOT NULL);

-- feedback: Already has admin-only SELECT, no change needed

-- client_scripts: Add baseline auth requirement
CREATE POLICY "Require authentication for client_scripts"
ON public.client_scripts FOR SELECT
USING (auth.uid() IS NOT NULL);

-- white_label_branding: Add baseline auth requirement
CREATE POLICY "Require authentication for white_label_branding"
ON public.white_label_branding FOR SELECT
USING (auth.uid() IS NOT NULL);