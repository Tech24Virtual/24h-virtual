-- 1. Add originating_source to support_tickets
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS originating_source TEXT;

-- Backfill existing tickets
UPDATE support_tickets SET originating_source = source WHERE originating_source IS NULL;

-- 2. Create task_notes table for chat-like updates
CREATE TABLE public.task_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.crm_tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view task notes"
  ON public.task_notes FOR SELECT
  USING (
    has_role(auth.uid(), 'agent'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Staff can add task notes"
  ON public.task_notes FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'agent'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Enable realtime for task notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_notes;

-- Index for performance
CREATE INDEX idx_task_notes_task_id ON public.task_notes(task_id);
CREATE INDEX idx_task_notes_created_at ON public.task_notes(created_at);