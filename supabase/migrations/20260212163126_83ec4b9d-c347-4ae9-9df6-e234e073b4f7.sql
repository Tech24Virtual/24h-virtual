
-- ============================================
-- 1. New table: sales_targets
-- ============================================
CREATE TABLE public.sales_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_leads INT NOT NULL DEFAULT 0,
  target_conversions INT NOT NULL DEFAULT 0,
  target_revenue NUMERIC NOT NULL DEFAULT 0,
  actual_leads INT NOT NULL DEFAULT 0,
  actual_conversions INT NOT NULL DEFAULT 0,
  actual_revenue NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own targets"
  ON public.sales_targets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin full access to sales_targets"
  ON public.sales_targets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 2. New table: sales_commissions
-- ============================================
CREATE TABLE public.sales_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_rep_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id),
  commission_rate NUMERIC NOT NULL DEFAULT 0.10,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales reps can view their own commissions"
  ON public.sales_commissions FOR SELECT
  USING (auth.uid() = sales_rep_id);

CREATE POLICY "Admin full access to sales_commissions"
  ON public.sales_commissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 3. New table: sales_proposals
-- ============================================
CREATE TABLE public.sales_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id),
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  service_type TEXT,
  plan_minutes INT,
  billing_period TEXT DEFAULT 'monthly',
  billing_currency TEXT DEFAULT 'USD',
  monthly_price NUMERIC DEFAULT 0,
  setup_fee NUMERIC DEFAULT 0,
  custom_terms TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view proposals they created"
  ON public.sales_proposals FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own proposals"
  ON public.sales_proposals FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own proposals"
  ON public.sales_proposals FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admin full access to sales_proposals"
  ON public.sales_proposals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 4. Alter leads table -- add new columns
-- ============================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_temperature TEXT DEFAULT 'warm';
