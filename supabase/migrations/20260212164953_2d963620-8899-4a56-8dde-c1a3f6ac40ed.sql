
-- Table: client_agent_assignments
CREATE TABLE public.client_agent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  assigned_by UUID,
  is_primary BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_agent_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors and admins can manage assignments"
  ON public.client_agent_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Agents can view their own assignments"
  ON public.client_agent_assignments FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

-- Table: agent_performance_reviews
CREATE TABLE public.agent_performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  quality_score INT CHECK (quality_score BETWEEN 1 AND 5),
  attendance_score INT CHECK (attendance_score BETWEEN 1 AND 5),
  communication_score INT CHECK (communication_score BETWEEN 1 AND 5),
  overall_score NUMERIC GENERATED ALWAYS AS ((quality_score + attendance_score + communication_score) / 3.0) STORED,
  strengths TEXT,
  areas_for_improvement TEXT,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors and admins can manage reviews"
  ON public.agent_performance_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Agents can view their published reviews"
  ON public.agent_performance_reviews FOR SELECT TO authenticated
  USING (agent_id = auth.uid() AND status = 'published');

-- Table: supervisor_escalations
CREATE TABLE public.supervisor_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL,
  target_department TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  related_agent_id UUID,
  related_client_id UUID,
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supervisor_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors and admins can manage escalations"
  ON public.supervisor_escalations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Target department staff can view escalations"
  ON public.supervisor_escalations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR
    public.has_role(auth.uid(), 'billing') OR
    public.has_role(auth.uid(), 'sales')
  );

-- Indexes
CREATE INDEX idx_client_agent_assignments_agent ON public.client_agent_assignments(agent_id);
CREATE INDEX idx_client_agent_assignments_client ON public.client_agent_assignments(client_id);
CREATE INDEX idx_agent_performance_reviews_agent ON public.agent_performance_reviews(agent_id);
CREATE INDEX idx_supervisor_escalations_status ON public.supervisor_escalations(status);
