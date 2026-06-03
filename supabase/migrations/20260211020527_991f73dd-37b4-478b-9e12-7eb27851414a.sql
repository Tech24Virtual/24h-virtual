
-- Create agent_shifts table
CREATE TABLE public.agent_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  status text NOT NULL DEFAULT 'active',
  void_reason text,
  total_break_minutes int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create agent_shift_breaks table
CREATE TABLE public.agent_shift_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.agent_shifts(id) ON DELETE CASCADE,
  break_type int NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_shift_breaks ENABLE ROW LEVEL SECURITY;

-- Agent shifts RLS: agents can SELECT/INSERT/UPDATE own shifts
CREATE POLICY "Agents can view own shifts"
  ON public.agent_shifts FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can create own shifts"
  ON public.agent_shifts FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own shifts"
  ON public.agent_shifts FOR UPDATE TO authenticated
  USING (agent_id = auth.uid());

-- Supervisors and admins can view all shifts
CREATE POLICY "Supervisors can view all shifts"
  ON public.agent_shifts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Admins can view all shifts"
  ON public.agent_shifts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Agent shift breaks RLS: agents can manage breaks on own shifts
CREATE POLICY "Agents can view own breaks"
  ON public.agent_shift_breaks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_shifts WHERE id = shift_id AND agent_id = auth.uid()));

CREATE POLICY "Agents can create own breaks"
  ON public.agent_shift_breaks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_shifts WHERE id = shift_id AND agent_id = auth.uid()));

CREATE POLICY "Agents can update own breaks"
  ON public.agent_shift_breaks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_shifts WHERE id = shift_id AND agent_id = auth.uid()));

-- Supervisors and admins can view all breaks
CREATE POLICY "Supervisors can view all breaks"
  ON public.agent_shift_breaks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_shifts WHERE id = shift_id AND 1=1) AND public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Admins can view all breaks"
  ON public.agent_shift_breaks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No DELETE policies - shifts cannot be deleted

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_shift_breaks;
