-- Add billing control columns to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS custom_plan_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_minute_rate numeric,
ADD COLUMN IF NOT EXISTS custom_plan_name text,
ADD COLUMN IF NOT EXISTS billing_anchor_day integer DEFAULT 1;

-- Create addon_products table (master catalog of add-ons)
CREATE TABLE public.addon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  default_price numeric NOT NULL,
  billing_type text NOT NULL CHECK (billing_type IN ('one_time', 'recurring', 'usage_based')),
  unit text,
  stripe_product_id text,
  stripe_price_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create client_addons table (track active add-ons per client)
CREATE TABLE public.client_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  addon_slug text NOT NULL,
  addon_name text NOT NULL,
  price numeric NOT NULL,
  billing_type text NOT NULL CHECK (billing_type IN ('one_time', 'recurring', 'usage_based')),
  quantity integer DEFAULT 1,
  is_active boolean DEFAULT true,
  stripe_subscription_item_id text,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create custom_plans table (custom pricing arrangements)
CREATE TABLE public.custom_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('per_minute', 'fixed', 'hybrid')),
  plan_name text NOT NULL,
  minute_rate numeric,
  fixed_amount numeric,
  minimum_monthly numeric,
  stripe_product_id text,
  stripe_price_id text,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.addon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for addon_products (admin only)
CREATE POLICY "Admins can manage addon products"
ON public.addon_products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active addon products"
ON public.addon_products FOR SELECT
USING (is_active = true);

-- RLS policies for client_addons
CREATE POLICY "Admins can manage client addons"
ON public.client_addons FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view own addons"
ON public.client_addons FOR SELECT
USING (lead_id IN (
  SELECT id FROM public.leads WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
));

-- RLS policies for custom_plans
CREATE POLICY "Admins can manage custom plans"
ON public.custom_plans FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view own custom plans"
ON public.custom_plans FOR SELECT
USING (lead_id IN (
  SELECT id FROM public.leads WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
));

-- Create updated_at triggers
CREATE TRIGGER update_addon_products_updated_at
BEFORE UPDATE ON public.addon_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_addons_updated_at
BEFORE UPDATE ON public.client_addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_plans_updated_at
BEFORE UPDATE ON public.custom_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_client_addons_lead_id ON public.client_addons(lead_id);
CREATE INDEX idx_client_addons_is_active ON public.client_addons(is_active);
CREATE INDEX idx_custom_plans_lead_id ON public.custom_plans(lead_id);
CREATE INDEX idx_addon_products_slug ON public.addon_products(slug);