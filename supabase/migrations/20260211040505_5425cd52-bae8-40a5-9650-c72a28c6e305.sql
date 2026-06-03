
-- 1. Add edited_by to agent_shifts
ALTER TABLE public.agent_shifts
ADD COLUMN edited_by uuid;

-- 2. Add employment_type and break_policy to agent_banking
ALTER TABLE public.agent_banking
ADD COLUMN employment_type text NOT NULL DEFAULT 'contractor',
ADD COLUMN break_policy text NOT NULL DEFAULT 'global';

-- 3. Create agent_schedules table
CREATE TABLE public.agent_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL,
  created_by uuid NOT NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_schedules ENABLE ROW LEVEL SECURITY;

-- Agents can view their own schedules
CREATE POLICY "Agents can view own schedules"
ON public.agent_schedules FOR SELECT
USING (agent_id = auth.uid());

-- Supervisors can view all schedules
CREATE POLICY "Supervisors can view all schedules"
ON public.agent_schedules FOR SELECT
USING (has_role(auth.uid(), 'supervisor'::app_role));

-- Supervisors can insert schedules
CREATE POLICY "Supervisors can insert schedules"
ON public.agent_schedules FOR INSERT
WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));

-- Supervisors can update schedules
CREATE POLICY "Supervisors can update schedules"
ON public.agent_schedules FOR UPDATE
USING (has_role(auth.uid(), 'supervisor'::app_role));

-- Supervisors can delete schedules
CREATE POLICY "Supervisors can delete schedules"
ON public.agent_schedules FOR DELETE
USING (has_role(auth.uid(), 'supervisor'::app_role));

-- Admins can manage all schedules
CREATE POLICY "Admins can manage all schedules"
ON public.agent_schedules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Notification trigger for shift edits by supervisor
CREATE OR REPLACE FUNCTION public.notify_agent_shift_edited()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when edited_at changed and edited_by is not the agent themselves
  IF NEW.edited_at IS DISTINCT FROM OLD.edited_at
     AND NEW.edited_by IS NOT NULL
     AND NEW.edited_by IS DISTINCT FROM NEW.agent_id
  THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      NEW.agent_id,
      'Your shift was edited',
      COALESCE('Reason: ' || NEW.edit_reason, 'A supervisor edited your shift times.'),
      'shift',
      '/staff/agent/shifts'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_agent_shift_edited
AFTER UPDATE ON public.agent_shifts
FOR EACH ROW
EXECUTE FUNCTION public.notify_agent_shift_edited();

-- 5. Allow supervisors to update agent_shifts (needed for supervisor edit)
CREATE POLICY "Supervisors can update shifts"
ON public.agent_shifts FOR UPDATE
USING (has_role(auth.uid(), 'supervisor'::app_role));
