-- Add new enum values for partner roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'white_label';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'referrer';

-- Create white_label_partners table
CREATE TABLE public.white_label_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  address TEXT,
  industry TEXT,
  company_size TEXT,
  services_interested TEXT[],
  tech_platform TEXT,
  hosting_preference TEXT,
  call_volume TEXT,
  customization_needs TEXT,
  agreed_to_terms BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  tier TEXT DEFAULT 'reseller',
  monthly_fee NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create referral_partners table
CREATE TABLE public.referral_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  referrer_company_name TEXT NOT NULL,
  referrer_name TEXT NOT NULL,
  referrer_email TEXT NOT NULL,
  referrer_phone TEXT,
  referred_company_name TEXT NOT NULL,
  referred_contact_name TEXT NOT NULL,
  referred_email TEXT NOT NULL,
  referred_phone TEXT,
  relationship TEXT,
  expected_needs TEXT,
  is_current_client BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  reward_amount NUMERIC DEFAULT 0,
  reward_paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create white_label_clients table for reseller's clients
CREATE TABLE public.white_label_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  plan TEXT DEFAULT 'starter',
  monthly_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create white_label_branding table for custom branding settings
CREATE TABLE public.white_label_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0B60B0',
  secondary_color TEXT DEFAULT '#40A578',
  custom_domain TEXT,
  phone_greeting TEXT,
  email_footer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.white_label_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_branding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for white_label_partners
CREATE POLICY "Users can view own white label data"
  ON public.white_label_partners FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own white label application"
  ON public.white_label_partners FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own white label data"
  ON public.white_label_partners FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all white label partners"
  ON public.white_label_partners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for referral_partners
CREATE POLICY "Users can view own referrals"
  ON public.referral_partners FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can submit referral"
  ON public.referral_partners FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all referrals"
  ON public.referral_partners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for white_label_clients
CREATE POLICY "Partners can view own clients"
  ON public.white_label_clients FOR SELECT
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can insert own clients"
  ON public.white_label_clients FOR INSERT
  WITH CHECK (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can update own clients"
  ON public.white_label_clients FOR UPDATE
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can delete own clients"
  ON public.white_label_clients FOR DELETE
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all white label clients"
  ON public.white_label_clients FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for white_label_branding
CREATE POLICY "Partners can view own branding"
  ON public.white_label_branding FOR SELECT
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can insert own branding"
  ON public.white_label_branding FOR INSERT
  WITH CHECK (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can update own branding"
  ON public.white_label_branding FOR UPDATE
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all branding"
  ON public.white_label_branding FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on white_label_partners
CREATE TRIGGER update_white_label_partners_updated_at
  BEFORE UPDATE ON public.white_label_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on white_label_clients
CREATE TRIGGER update_white_label_clients_updated_at
  BEFORE UPDATE ON public.white_label_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on white_label_branding
CREATE TRIGGER update_white_label_branding_updated_at
  BEFORE UPDATE ON public.white_label_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();