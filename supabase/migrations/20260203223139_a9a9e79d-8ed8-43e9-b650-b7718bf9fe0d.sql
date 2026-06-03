-- CRM Activities Table
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'note', 'call', 'email', 'meeting', 'status_change'
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- CRM Tasks Table
CREATE TABLE public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_activities
CREATE POLICY "Admins can manage all activities"
ON public.crm_activities FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view activities"
ON public.crm_activities FOR SELECT
USING (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents can create activities"
ON public.crm_activities FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

-- RLS Policies for crm_tasks
CREATE POLICY "Admins can manage all tasks"
ON public.crm_tasks FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view tasks"
ON public.crm_tasks FOR SELECT
USING (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents can create tasks"
ON public.crm_tasks FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Users can manage assigned tasks"
ON public.crm_tasks FOR ALL
USING (assigned_to = auth.uid());

-- Indexes for performance
CREATE INDEX idx_crm_activities_lead_id ON public.crm_activities(lead_id);
CREATE INDEX idx_crm_activities_created_at ON public.crm_activities(created_at DESC);
CREATE INDEX idx_crm_tasks_lead_id ON public.crm_tasks(lead_id);
CREATE INDEX idx_crm_tasks_due_date ON public.crm_tasks(due_date);
CREATE INDEX idx_crm_tasks_status ON public.crm_tasks(status);
CREATE INDEX idx_crm_tasks_assigned_to ON public.crm_tasks(assigned_to);