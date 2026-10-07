-- Offboarding is routed to Tech first: Tech deactivates Google / Five9 / Slack,
-- HR is notified when that is done.
ALTER TABLE public.offboarding
  ADD COLUMN IF NOT EXISTS assigned_to text DEFAULT 'tech',
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS tech_notes text,
  -- Denormalised because the tech role cannot read public.profiles
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS tech_completed_at timestamptz;

UPDATE public.offboarding o
SET agent_name = p.full_name
FROM public.profiles p
WHERE p.id = o.agent_id AND o.agent_name IS NULL;

-- Tech can see the queue and tick off their items (column scope enforced by the guard trigger below)
GRANT SELECT, UPDATE ON public.offboarding TO authenticated;

DROP POLICY IF EXISTS "Tech can view offboarding" ON public.offboarding;
CREATE POLICY "Tech can view offboarding" ON public.offboarding
  FOR SELECT USING (public.has_role(auth.uid(), 'tech'::app_role));

DROP POLICY IF EXISTS "Tech can update offboarding" ON public.offboarding;
CREATE POLICY "Tech can update offboarding" ON public.offboarding
  FOR UPDATE USING (public.has_role(auth.uid(), 'tech'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'tech'::app_role));

-- BEFORE INSERT: fill requested_by / agent_name
CREATE OR REPLACE FUNCTION public.offboarding_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.requested_by := COALESCE(NEW.requested_by, NEW.initiated_by);
  IF NEW.agent_name IS NULL THEN
    SELECT full_name INTO NEW.agent_name FROM public.profiles WHERE id = NEW.agent_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS offboarding_before_insert ON public.offboarding;
CREATE TRIGGER offboarding_before_insert
  BEFORE INSERT ON public.offboarding
  FOR EACH ROW EXECUTE FUNCTION public.offboarding_before_insert();

-- AFTER INSERT: notify every tech user
CREATE OR REPLACE FUNCTION public.offboarding_notify_tech()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  who text := COALESCE(NEW.agent_name, 'an employee');
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, category, is_read, action_url, metadata)
  SELECT ur.user_id,
         'Offboarding request: ' || who,
         'Offboarding request: ' || who || ' — Please complete deprovisioning (Google, Five9, Slack)',
         'warning', 'offboarding', false, '/staff/tech/offboarding',
         jsonb_build_object('offboarding_id', NEW.id, 'agent_id', NEW.agent_id)
  FROM public.user_roles ur
  WHERE ur.role = 'tech'::app_role;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS offboarding_notify_tech ON public.offboarding;
CREATE TRIGGER offboarding_notify_tech
  AFTER INSERT ON public.offboarding
  FOR EACH ROW EXECUTE FUNCTION public.offboarding_notify_tech();

-- BEFORE UPDATE: restrict tech-only users to their columns, stamp tech_completed_at, progress status
CREATE OR REPLACE FUNCTION public.offboarding_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tech_keys text[] := ARRAY['google_deprovisioned','five9_deprovisioned','slack_removed','tech_notes'];
  tech_done boolean;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'hr'::app_role)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF (to_jsonb(NEW) - tech_keys) IS DISTINCT FROM (to_jsonb(OLD) - tech_keys) THEN
      RAISE EXCEPTION 'Tech staff can only update deprovisioning items and tech notes on an offboarding record';
    END IF;
  END IF;

  tech_done := COALESCE(NEW.google_deprovisioned, false)
           AND COALESCE(NEW.five9_deprovisioned, false)
           AND COALESCE(NEW.slack_removed, false);

  IF tech_done THEN
    NEW.tech_completed_at := COALESCE(OLD.tech_completed_at, now());
  ELSE
    NEW.tech_completed_at := NULL;
  END IF;

  IF NEW.status = 'initiated'
     AND (COALESCE(NEW.google_deprovisioned, false) OR COALESCE(NEW.five9_deprovisioned, false) OR COALESCE(NEW.slack_removed, false)) THEN
    NEW.status := 'in_progress';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS offboarding_before_update ON public.offboarding;
CREATE TRIGGER offboarding_before_update
  BEFORE UPDATE ON public.offboarding
  FOR EACH ROW EXECUTE FUNCTION public.offboarding_before_update();

-- AFTER UPDATE: tech finished -> notify HR (and whoever requested it)
CREATE OR REPLACE FUNCTION public.offboarding_notify_hr_on_tech_done()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  who text := COALESCE(NEW.agent_name, 'employee');
BEGIN
  IF OLD.tech_completed_at IS NULL AND NEW.tech_completed_at IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, category, is_read, action_url, metadata)
    SELECT recipients.user_id,
           'Offboarding complete for ' || who,
           'Tech has finished deprovisioning ' || who || ' (Google, Five9, Slack). Remaining: final payout and equipment.',
           'success', 'offboarding', false, '/hr-portal/people/offboarding',
           jsonb_build_object('offboarding_id', NEW.id, 'agent_id', NEW.agent_id)
    FROM (
      SELECT user_id FROM public.user_roles WHERE role = 'hr'::app_role
      UNION
      SELECT NEW.requested_by WHERE NEW.requested_by IS NOT NULL
    ) AS recipients;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS offboarding_notify_hr_on_tech_done ON public.offboarding;
CREATE TRIGGER offboarding_notify_hr_on_tech_done
  AFTER UPDATE ON public.offboarding
  FOR EACH ROW EXECUTE FUNCTION public.offboarding_notify_hr_on_tech_done();
