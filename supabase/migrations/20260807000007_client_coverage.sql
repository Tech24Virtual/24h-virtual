-- Client coverage configuration
-- Applies to both WL clients and direct 24H clients
CREATE TABLE public.client_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Either wl_client_id OR lead_id must be set (not both)
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE SET NULL,

  -- Coverage days
  coverage_days text NOT NULL DEFAULT 'mf' CHECK (coverage_days IN ('mf', 'ss', '247')),

  -- Coverage hours
  coverage_hours text NOT NULL DEFAULT 'business' CHECK (coverage_hours IN ('business', 'afterhours', 'both')),

  -- Coverage type
  coverage_type text NOT NULL DEFAULT 'fulltime' CHECK (coverage_type IN ('fulltime', 'overflow')),

  -- Fixed times (when not 24/7)
  start_time time,
  end_time time,
  timezone text DEFAULT 'America/Toronto',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Only one coverage record per client
  UNIQUE (wl_client_id),
  UNIQUE (lead_id)
);

ALTER TABLE public.client_coverage ENABLE ROW LEVEL SECURITY;

-- WL partners can manage coverage for their own clients
CREATE POLICY "Partners can manage own client coverage"
  ON public.client_coverage FOR ALL
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR wl_client_id IN (SELECT id FROM public.white_label_clients WHERE partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    ))
  )
  WITH CHECK (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR wl_client_id IN (SELECT id FROM public.white_label_clients WHERE partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    ))
  );

-- WL clients can manage their own coverage
CREATE POLICY "WL clients can manage own coverage"
  ON public.client_coverage FOR ALL
  USING (wl_client_id IN (SELECT id FROM public.white_label_clients WHERE user_id = auth.uid()))
  WITH CHECK (wl_client_id IN (SELECT id FROM public.white_label_clients WHERE user_id = auth.uid()));

-- Direct clients can manage their own coverage
CREATE POLICY "Direct clients can manage own coverage"
  ON public.client_coverage FOR ALL
  USING (lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid()))
  WITH CHECK (lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid()));

-- Admins can manage all coverage
CREATE POLICY "Admins can manage all coverage"
  ON public.client_coverage FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_coverage TO authenticated;
