-- 1. Update app_role enum to include affiliate
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';

-- 2. Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  source TEXT,
  status TEXT DEFAULT 'new',
  score INTEGER DEFAULT 0,
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Affiliates table
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  affiliate_code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(5,4) DEFAULT 0.10,
  status TEXT DEFAULT 'pending',
  total_earnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Affiliate referrals table
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_name TEXT,
  status TEXT DEFAULT 'clicked',
  commission_amount DECIMAL(10,2) DEFAULT 150,
  click_timestamp TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ
);

-- 5. Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  category TEXT,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Job postings table
CREATE TABLE public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  description TEXT,
  requirements TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Job applications table
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE,
  applicant_user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resume_url TEXT,
  cover_letter TEXT,
  status TEXT DEFAULT 'new',
  workflow_stage TEXT DEFAULT 'Applied',
  applied_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_url TEXT,
  status TEXT DEFAULT 'pending',
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  type TEXT,
  page TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Admins can manage leads" ON public.leads
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can view leads" ON public.leads
  FOR SELECT USING (has_role(auth.uid(), 'agent'));

-- RLS Policies for affiliates
CREATE POLICY "Affiliates can view own data" ON public.affiliates
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Affiliates can update own data" ON public.affiliates
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage affiliates" ON public.affiliates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for affiliate referrals
CREATE POLICY "Affiliates can view own referrals" ON public.affiliate_referrals
  FOR SELECT USING (affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  ));
CREATE POLICY "Admins can manage referrals" ON public.affiliate_referrals
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for job postings
CREATE POLICY "Anyone can view active postings" ON public.job_postings
  FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can manage postings" ON public.job_postings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for job applications
CREATE POLICY "Applicants can view own applications" ON public.job_applications
  FOR SELECT USING (applicant_user_id = auth.uid());
CREATE POLICY "Applicants can insert" ON public.job_applications
  FOR INSERT WITH CHECK (applicant_user_id = auth.uid());
CREATE POLICY "Admins can manage applications" ON public.job_applications
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for contracts
CREATE POLICY "Users can view own contracts" ON public.contracts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage contracts" ON public.contracts
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for feedback
CREATE POLICY "Users can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can view feedback" ON public.feedback
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create updated_at trigger for leads
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for job applications
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();