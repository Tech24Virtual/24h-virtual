
-- 1. missions table
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  period_start timestamptz,
  period_end timestamptz,
  initiated_by text,
  summary text,
  error_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users with admin/billing/hr can read missions"
  ON public.missions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'billing') OR
    public.has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Service role and admin can insert missions"
  ON public.missions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'billing') OR
    public.has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Admin can update missions"
  ON public.missions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. agent_runs table
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  step_name text NOT NULL,
  input_snapshot jsonb,
  output_snapshot jsonb,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated admin/billing/hr can read agent_runs"
  ON public.agent_runs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'billing') OR
    public.has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Authenticated admin/billing/hr can insert agent_runs"
  ON public.agent_runs FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'billing') OR
    public.has_role(auth.uid(), 'hr')
  );

-- 3. agent_configs table
CREATE TABLE public.agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  mode text NOT NULL DEFAULT 'simulation',
  max_auto_actions_per_run integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  error_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated admin can manage agent_configs"
  ON public.agent_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Billing/HR can read agent_configs"
  ON public.agent_configs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'billing') OR
    public.has_role(auth.uid(), 'hr')
  );

-- 4. agent_prompts table
CREATE TABLE public.agent_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  prompt_type text NOT NULL DEFAULT 'system',
  version integer NOT NULL DEFAULT 1,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage agent_prompts"
  ON public.agent_prompts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. mission_control_events table
CREATE TABLE public.mission_control_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  event_type text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mission_control_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated admin/billing/hr can read mission_control_events"
  ON public.mission_control_events FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'billing') OR
    public.has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Authenticated admin/billing/hr can insert mission_control_events"
  ON public.mission_control_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'billing') OR
    public.has_role(auth.uid(), 'hr')
  );

-- 6. billing_summaries table
CREATE TABLE public.billing_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  total_minutes integer NOT NULL DEFAULT 0,
  total_calls integer NOT NULL DEFAULT 0,
  included_minutes integer NOT NULL DEFAULT 0,
  overage_minutes integer NOT NULL DEFAULT 0,
  overage_amount numeric NOT NULL DEFAULT 0,
  plan_name text,
  stripe_invoice_id text,
  stripe_invoice_url text,
  mode_used text NOT NULL DEFAULT 'simulation',
  raw_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated admin/billing can read billing_summaries"
  ON public.billing_summaries FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'billing')
  );

CREATE POLICY "Authenticated admin/billing can insert billing_summaries"
  ON public.billing_summaries FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'billing')
  );

-- Seed agent_configs
INSERT INTO public.agent_configs (agent_name, enabled, mode)
VALUES
  ('CallReportAgent', true, 'simulation'),
  ('PayrollAgent', true, 'simulation');
