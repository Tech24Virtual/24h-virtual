-- Promos/coupon system + Convert Lead dialog support (overage override).
--
-- STATUS: Applied directly to staging (sdsxdqsomxuimrjpaylv) via `supabase db
-- query` at implementation time. Kept here for documentation and so future
-- deployments (e.g. prod) pick it up.

-- Promos/coupons table
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  promo_type text NOT NULL CHECK (promo_type IN (
    'percentage_discount', 'fixed_discount', 'free_months',
    'free_feature', 'free_onboarding', 'free_integration',
    'free_call_recording', 'custom'
  )),
  discount_percentage numeric(5,2),
  discount_months int,
  free_feature_description text,
  applies_to text DEFAULT 'all' CHECK (applies_to IN ('all','setup_fee','monthly','overage')),
  max_uses int,
  current_uses int DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  notes text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins and sales can manage promotions" ON public.promotions;
CREATE POLICY "Admins and sales can manage promotions" ON public.promotions
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role)
  );

-- Track applied promos on leads
CREATE TABLE IF NOT EXISTS public.lead_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  promotion_id uuid NOT NULL REFERENCES public.promotions(id),
  applied_by uuid REFERENCES auth.users(id),
  applied_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  notes text,
  UNIQUE(lead_id, promotion_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_promotions TO authenticated;
ALTER TABLE public.lead_promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can manage lead promotions" ON public.lead_promotions;
CREATE POLICY "Staff can manage lead promotions" ON public.lead_promotions
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role) OR
    has_role(auth.uid(), 'billing'::app_role)
  );

-- Separate overage rate selection at conversion time (NULL = use plan default)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS overage_rate_override numeric(10,4);

-- Atomic usage counter bump, called after applying promos to a lead.
CREATE OR REPLACE FUNCTION public.increment_promo_usage(promo_ids uuid[])
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.promotions
  SET current_uses = current_uses + 1
  WHERE id = ANY(promo_ids);
$$;
GRANT EXECUTE ON FUNCTION public.increment_promo_usage(uuid[]) TO authenticated;

-- Seed default promotions (idempotent — safe to re-run).
INSERT INTO public.promotions (name, code, promo_type, discount_percentage, discount_months, applies_to, notes)
VALUES
  ('3 Months 10% Off', 'SAVE10-3M', 'percentage_discount', 10, 3, 'monthly', '10% discount for first 3 months'),
  ('Free Integration', 'FREE-INTEGRATION', 'free_feature', NULL, NULL, 'setup_fee', 'Waive integration setup fee'),
  ('Free Onboarding', 'FREE-ONBOARDING', 'free_onboarding', NULL, NULL, 'setup_fee', 'Waive onboarding fee'),
  ('Free Call Recording', 'FREE-RECORDING', 'free_call_recording', NULL, NULL, 'all', 'First 3 months call recording included'),
  ('6 Months 15% Off', 'SAVE15-6M', 'percentage_discount', 15, 6, 'monthly', '15% discount for first 6 months'),
  ('Free First Month', 'FIRST-MONTH-FREE', 'free_months', NULL, 1, 'monthly', 'First month free')
ON CONFLICT (code) DO NOTHING;

-- Add overage_rate column to billing_plans
ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS overage_rate numeric(10,4);

-- billing_plans has no unique constraint on name yet — without one, ON CONFLICT
-- below has no target to match and the seed would insert duplicate rows on
-- every re-run (this migration is applied ad hoc via `db query`, not tracked
-- as run-once). Add one so the seed is actually idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS billing_plans_name_unique_idx ON public.billing_plans (name);

-- Seed real billing plans from 24hvirtual.com pricing. service_type uses the
-- existing hyphenated vocabulary from BillingPlanEditorDialog's SERVICE_OPTIONS
-- (ai-receptionist | message-assistant | virtual-receptionist | virtual-secretary),
-- not the underscored form, so these plans show up correctly in the admin
-- billing editor/catalog and in the Convert Lead dialog's per-service grouping.
INSERT INTO public.billing_plans (name, plan_type, service_type, fixed_amount, minute_rate, included_minutes, overage_rate, is_active)
VALUES
  ('Starter', 'hybrid', 'virtual-receptionist', 149.00, 2.00, 50, 2.00, true),
  ('Popular', 'hybrid', 'virtual-receptionist', 499.00, 2.00, 250, 2.00, true),
  ('Business', 'hybrid', 'virtual-receptionist', 1499.00, 2.00, 1000, 2.00, true)
ON CONFLICT (name) DO NOTHING;
