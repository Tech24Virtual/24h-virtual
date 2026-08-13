-- WL Partner Plans — pricing plans created by WL partners for their clients
CREATE TABLE public.wl_partner_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('fixed', 'custom')),
  monthly_cost numeric,
  included_minutes integer,
  overage_cost_per_minute numeric NOT NULL,
  free_trial boolean NOT NULL DEFAULT false,
  free_trial_days integer CHECK (free_trial_days IN (7, 14)),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wl_partner_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can manage own plans"
  ON public.wl_partner_plans
  FOR ALL
  USING (
    partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all plans"
  ON public.wl_partner_plans
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_partner_plans TO authenticated;

-- Add plan_id to white_label_clients so each client can be assigned a plan
ALTER TABLE public.white_label_clients
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.wl_partner_plans(id) ON DELETE SET NULL;
