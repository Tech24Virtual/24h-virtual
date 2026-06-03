-- 1. Add safety_thresholds to agent_configs
ALTER TABLE public.agent_configs ADD COLUMN IF NOT EXISTS safety_thresholds jsonb DEFAULT '{}';

-- 2. Create platform_settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  force_simulation_mode boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage platform_settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_settings (force_simulation_mode) VALUES (false);

-- 3. Add sales role to mission read policies
CREATE POLICY "Sales can read missions"
  ON public.missions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales can read agent_runs"
  ON public.agent_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales can read mission_control_events"
  ON public.mission_control_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'sales'));