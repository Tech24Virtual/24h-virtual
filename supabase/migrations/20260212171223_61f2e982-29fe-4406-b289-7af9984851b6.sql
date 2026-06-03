
-- Create affiliate_marketing_assets table
CREATE TABLE public.affiliate_marketing_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  asset_type TEXT NOT NULL DEFAULT 'banner',
  asset_url TEXT NOT NULL,
  dimensions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_marketing_assets ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
CREATE POLICY "Admins can manage marketing assets"
ON public.affiliate_marketing_assets
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Affiliates can view active assets
CREATE POLICY "Affiliates can view active marketing assets"
ON public.affiliate_marketing_assets
FOR SELECT
TO authenticated
USING (is_active = true);

-- Alter affiliate_referrals: add lead_id
ALTER TABLE public.affiliate_referrals
ADD COLUMN lead_id UUID REFERENCES public.leads(id);

-- Alter affiliates: add tier, lifetime_referrals, payment preferences
ALTER TABLE public.affiliates
ADD COLUMN tier TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN lifetime_referrals INTEGER NOT NULL DEFAULT 0,
ADD COLUMN payment_email TEXT,
ADD COLUMN payment_method_preferred TEXT;
