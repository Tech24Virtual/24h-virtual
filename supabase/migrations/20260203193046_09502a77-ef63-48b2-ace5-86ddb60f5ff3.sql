-- Affiliate Payouts Table
CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_details jsonb DEFAULT '{}',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  notes text
);

-- Enable RLS
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Affiliates can view their own payouts
CREATE POLICY "Affiliates can view own payouts"
ON public.affiliate_payouts FOR SELECT
USING (affiliate_id IN (
  SELECT id FROM affiliates WHERE user_id = auth.uid()
));

-- Affiliates can request payouts (insert)
CREATE POLICY "Affiliates can request payouts"
ON public.affiliate_payouts FOR INSERT
WITH CHECK (affiliate_id IN (
  SELECT id FROM affiliates WHERE user_id = auth.uid()
));

-- Admins can manage all payouts
CREATE POLICY "Admins can manage payouts"
ON public.affiliate_payouts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin Settings Table for global configuration
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "Admins can read settings"
ON public.admin_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert/update settings
CREATE POLICY "Admins can upsert settings"
ON public.admin_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default admin settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('company_name', '"24H Virtual"'),
  ('support_email', '"support@24hvirtual.com"'),
  ('enable_email_notifications', 'true'),
  ('enable_sms_notifications', 'false'),
  ('default_commission_rate', '10');