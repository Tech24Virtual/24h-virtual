-- Remove the overly broad authentication policies we just added
-- The existing RESTRICTIVE policies are correct, but need a proper PERMISSIVE baseline

DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for affiliate_referrals" ON public.affiliate_referrals;
DROP POLICY IF EXISTS "Require authentication for affiliates" ON public.affiliates;
DROP POLICY IF EXISTS "Require authentication for call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Require authentication for leads" ON public.leads;
DROP POLICY IF EXISTS "Require authentication for job_applications" ON public.job_applications;
DROP POLICY IF EXISTS "Require authentication for referral_partners" ON public.referral_partners;
DROP POLICY IF EXISTS "Require authentication for white_label_partners" ON public.white_label_partners;
DROP POLICY IF EXISTS "Require authentication for white_label_clients" ON public.white_label_clients;
DROP POLICY IF EXISTS "Require authentication for user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Require authentication for notifications" ON public.notifications;
DROP POLICY IF EXISTS "Require authentication for contracts" ON public.contracts;
DROP POLICY IF EXISTS "Require authentication for client_scripts" ON public.client_scripts;
DROP POLICY IF EXISTS "Require authentication for white_label_branding" ON public.white_label_branding;

-- Convert existing RESTRICTIVE policies to PERMISSIVE (the default)
-- This is the correct approach - PERMISSIVE policies use OR logic

-- profiles: Drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- affiliate_referrals
DROP POLICY IF EXISTS "Affiliates can view own referrals" ON public.affiliate_referrals;
DROP POLICY IF EXISTS "Admins can manage referrals" ON public.affiliate_referrals;
CREATE POLICY "Affiliates can view own referrals" ON public.affiliate_referrals FOR SELECT 
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage referrals" ON public.affiliate_referrals FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- affiliates
DROP POLICY IF EXISTS "Affiliates can view own data" ON public.affiliates;
DROP POLICY IF EXISTS "Affiliates can update own data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can manage affiliates" ON public.affiliates;
CREATE POLICY "Affiliates can view own data" ON public.affiliates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Affiliates can update own data" ON public.affiliates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage affiliates" ON public.affiliates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- call_logs
DROP POLICY IF EXISTS "Clients can view own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Admins can view all call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Admins and agents can insert call logs" ON public.call_logs;
CREATE POLICY "Clients can view own call logs" ON public.call_logs FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Admins can view all call logs" ON public.call_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can view call logs" ON public.call_logs FOR SELECT USING (has_role(auth.uid(), 'agent'::app_role));
CREATE POLICY "Admins and agents can insert call logs" ON public.call_logs FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role));

-- leads
DROP POLICY IF EXISTS "Admins can manage leads" ON public.leads;
DROP POLICY IF EXISTS "Agents can view leads" ON public.leads;
CREATE POLICY "Admins can manage leads" ON public.leads FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Agents can view leads" ON public.leads FOR SELECT USING (has_role(auth.uid(), 'agent'::app_role));

-- job_applications
DROP POLICY IF EXISTS "Applicants can view own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Applicants can insert" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can manage applications" ON public.job_applications;
CREATE POLICY "Applicants can view own applications" ON public.job_applications FOR SELECT USING (applicant_user_id = auth.uid());
CREATE POLICY "Applicants can insert" ON public.job_applications FOR INSERT WITH CHECK (applicant_user_id = auth.uid());
CREATE POLICY "Admins can manage applications" ON public.job_applications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- referral_partners
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referral_partners;
DROP POLICY IF EXISTS "Admins can manage all referrals" ON public.referral_partners;
DROP POLICY IF EXISTS "Authenticated users can submit referral" ON public.referral_partners;
CREATE POLICY "Users can view own referrals" ON public.referral_partners FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all referrals" ON public.referral_partners FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can submit referral" ON public.referral_partners FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- white_label_partners
DROP POLICY IF EXISTS "Users can view own white label data" ON public.white_label_partners;
DROP POLICY IF EXISTS "Users can insert own white label application" ON public.white_label_partners;
DROP POLICY IF EXISTS "Users can update own white label data" ON public.white_label_partners;
DROP POLICY IF EXISTS "Admins can manage all white label partners" ON public.white_label_partners;
CREATE POLICY "Users can view own white label data" ON public.white_label_partners FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own white label application" ON public.white_label_partners FOR INSERT WITH CHECK ((user_id = auth.uid()) OR (user_id IS NULL));
CREATE POLICY "Users can update own white label data" ON public.white_label_partners FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all white label partners" ON public.white_label_partners FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- white_label_clients
DROP POLICY IF EXISTS "Partners can view own clients" ON public.white_label_clients;
DROP POLICY IF EXISTS "Partners can insert own clients" ON public.white_label_clients;
DROP POLICY IF EXISTS "Partners can update own clients" ON public.white_label_clients;
DROP POLICY IF EXISTS "Partners can delete own clients" ON public.white_label_clients;
DROP POLICY IF EXISTS "Admins can manage all white label clients" ON public.white_label_clients;
CREATE POLICY "Partners can view own clients" ON public.white_label_clients FOR SELECT 
  USING (partner_id IN (SELECT id FROM white_label_partners WHERE user_id = auth.uid()));
CREATE POLICY "Partners can insert own clients" ON public.white_label_clients FOR INSERT 
  WITH CHECK (partner_id IN (SELECT id FROM white_label_partners WHERE user_id = auth.uid()));
CREATE POLICY "Partners can update own clients" ON public.white_label_clients FOR UPDATE 
  USING (partner_id IN (SELECT id FROM white_label_partners WHERE user_id = auth.uid()));
CREATE POLICY "Partners can delete own clients" ON public.white_label_clients FOR DELETE 
  USING (partner_id IN (SELECT id FROM white_label_partners WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all white label clients" ON public.white_label_clients FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- contracts
DROP POLICY IF EXISTS "Users can view own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Admins can manage contracts" ON public.contracts;
CREATE POLICY "Users can view own contracts" ON public.contracts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage contracts" ON public.contracts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- client_scripts
DROP POLICY IF EXISTS "Clients can view own scripts" ON public.client_scripts;
DROP POLICY IF EXISTS "Clients can insert own scripts" ON public.client_scripts;
DROP POLICY IF EXISTS "Clients can update own scripts" ON public.client_scripts;
DROP POLICY IF EXISTS "Clients can delete own scripts" ON public.client_scripts;
DROP POLICY IF EXISTS "Admins can view all scripts" ON public.client_scripts;
CREATE POLICY "Clients can view own scripts" ON public.client_scripts FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Clients can insert own scripts" ON public.client_scripts FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients can update own scripts" ON public.client_scripts FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "Clients can delete own scripts" ON public.client_scripts FOR DELETE USING (auth.uid() = client_id);
CREATE POLICY "Admins can view all scripts" ON public.client_scripts FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- white_label_branding
DROP POLICY IF EXISTS "Partners can view own branding" ON public.white_label_branding;
DROP POLICY IF EXISTS "Partners can insert own branding" ON public.white_label_branding;
DROP POLICY IF EXISTS "Partners can update own branding" ON public.white_label_branding;
DROP POLICY IF EXISTS "Admins can manage all branding" ON public.white_label_branding;
CREATE POLICY "Partners can view own branding" ON public.white_label_branding FOR SELECT 
  USING (partner_id IN (SELECT id FROM white_label_partners WHERE user_id = auth.uid()));
CREATE POLICY "Partners can insert own branding" ON public.white_label_branding FOR INSERT 
  WITH CHECK (partner_id IN (SELECT id FROM white_label_partners WHERE user_id = auth.uid()));
CREATE POLICY "Partners can update own branding" ON public.white_label_branding FOR UPDATE 
  USING (partner_id IN (SELECT id FROM white_label_partners WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all branding" ON public.white_label_branding FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));