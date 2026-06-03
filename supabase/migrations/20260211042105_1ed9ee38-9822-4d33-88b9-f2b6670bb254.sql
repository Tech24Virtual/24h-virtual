
-- 1. New table: agent_skills
CREATE TABLE public.agent_skills (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL,
  skill_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, skill_name)
);

ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can read own skills" ON public.agent_skills
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Supervisors can read all skills" ON public.agent_skills
  FOR SELECT USING (has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Admins can manage all skills" ON public.agent_skills
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can insert skills" ON public.agent_skills
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors can update skills" ON public.agent_skills
  FOR UPDATE USING (has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors can delete skills" ON public.agent_skills
  FOR DELETE USING (has_role(auth.uid(), 'supervisor'::app_role));

-- 2. New table: open_shifts
CREATE TABLE public.open_shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_agent_id uuid NOT NULL,
  original_schedule_id uuid,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  required_skills text[] NOT NULL DEFAULT '{}',
  notes text,
  status text NOT NULL DEFAULT 'open',
  claimed_by uuid,
  claimed_at timestamptz,
  posted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.open_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view open shifts" ON public.open_shifts
  FOR SELECT USING (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents can claim open shifts" ON public.open_shifts
  FOR UPDATE USING (has_role(auth.uid(), 'agent'::app_role) AND status = 'open')
  WITH CHECK (claimed_by = auth.uid());

CREATE POLICY "Supervisors can manage open shifts" ON public.open_shifts
  FOR ALL USING (has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Admins can manage open shifts" ON public.open_shifts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. New table: time_off_requests
CREATE TABLE public.time_off_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL,
  request_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own requests" ON public.time_off_requests
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Agents can create requests" ON public.time_off_requests
  FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Supervisors can view all requests" ON public.time_off_requests
  FOR SELECT USING (has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors can update requests" ON public.time_off_requests
  FOR UPDATE USING (has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Admins can manage all requests" ON public.time_off_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Add recurrence columns to agent_schedules
ALTER TABLE public.agent_schedules
  ADD COLUMN recurrence_type text,
  ADD COLUMN recurrence_days integer,
  ADD COLUMN recurrence_end_date date,
  ADD COLUMN parent_schedule_id uuid;

-- 5. Notification trigger: time_off_requests
CREATE OR REPLACE FUNCTION public.notify_time_off_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staff RECORD;
  v_category text;
  v_title text;
  v_message text;
  v_agent_name text;
BEGIN
  SELECT full_name INTO v_agent_name FROM public.profiles WHERE id = NEW.agent_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.request_type = 'sick' THEN
      v_category := 'urgent';
      v_title := '🔴 Sick Day Reported';
    ELSE
      v_category := 'schedule';
      v_title := 'Time Off Request';
    END IF;
    v_message := COALESCE(v_agent_name, 'An agent') || ' — ' || NEW.start_date || ' to ' || NEW.end_date;

    FOR v_staff IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('supervisor'::app_role, 'admin'::app_role)
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (v_staff.user_id, v_title, v_message, v_category, '/staff/supervisor/schedule');
    END LOOP;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      v_title := 'Time Off Approved';
      v_message := NEW.start_date || ' to ' || NEW.end_date || ' has been approved.';
    ELSIF NEW.status = 'denied' THEN
      v_title := 'Time Off Denied';
      v_message := NEW.start_date || ' to ' || NEW.end_date || ' was denied.' || COALESCE(' Reason: ' || NEW.review_notes, '');
    ELSE
      RETURN NEW;
    END IF;
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (NEW.agent_id, v_title, v_message, 'schedule', '/staff/agent/schedule');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_time_off_request
  AFTER INSERT OR UPDATE ON public.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_time_off_request();

-- 6. Notification trigger: open shift posted
CREATE OR REPLACE FUNCTION public.notify_open_shift_posted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agent RECORD;
  v_message text;
BEGIN
  v_message := 'Shift on ' || NEW.shift_date || ' (' || NEW.start_time || ' - ' || NEW.end_time || ') needs coverage.';

  IF array_length(NEW.required_skills, 1) > 0 THEN
    FOR v_agent IN
      SELECT DISTINCT ask.agent_id
      FROM public.agent_skills ask
      WHERE ask.skill_name = ANY(NEW.required_skills)
        AND ask.agent_id != NEW.original_agent_id
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (v_agent.agent_id, 'Open Shift Available', v_message, 'schedule', '/staff/agent/schedule');
    END LOOP;
  ELSE
    FOR v_agent IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'agent'::app_role AND ur.user_id != NEW.original_agent_id
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (v_agent.user_id, 'Open Shift Available', v_message, 'schedule', '/staff/agent/schedule');
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_open_shift_posted
  AFTER INSERT ON public.open_shifts
  FOR EACH ROW EXECUTE FUNCTION public.notify_open_shift_posted();

-- 7. Notification trigger: shift claimed
CREATE OR REPLACE FUNCTION public.notify_shift_claimed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claimer_name text;
BEGIN
  IF OLD.claimed_by IS NULL AND NEW.claimed_by IS NOT NULL THEN
    SELECT full_name INTO v_claimer_name FROM public.profiles WHERE id = NEW.claimed_by;
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      NEW.posted_by,
      'Shift Claimed',
      COALESCE(v_claimer_name, 'An agent') || ' claimed the shift on ' || NEW.shift_date,
      'schedule',
      '/staff/supervisor/schedule'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_shift_claimed
  AFTER UPDATE ON public.open_shifts
  FOR EACH ROW EXECUTE FUNCTION public.notify_shift_claimed();
