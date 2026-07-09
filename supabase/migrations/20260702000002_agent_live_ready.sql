-- Correction #11: track per-agent readiness for live calls.
-- Correction #12: per-agent refresher cadence (added here per the columns being
-- on the same profiles table as the readiness flag).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_ready_for_live_calls boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS live_calls_ready_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS refresher_interval_months int DEFAULT 1;
  -- 1 = new agent (monthly), 3 = senior agent (quarterly)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agent_start_date date;

-- Recompute is_ready_for_live_calls for an agent: true only when every required,
-- published module across their assigned campaigns has an unexpired, non-refresh signoff.
CREATE OR REPLACE FUNCTION public.check_agent_live_readiness(p_agent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_required int;
  v_signed_off int;
BEGIN
  -- Count required modules for this agent's assigned campaigns
  SELECT COUNT(DISTINCT m.id) INTO v_total_required
  FROM public.campaign_training_modules m
  JOIN public.campaign_training_assignments a ON a.module_id = m.id AND a.agent_id = p_agent_id
  WHERE m.required = true AND m.status = 'published';

  -- Count signed-off completions
  SELECT COUNT(DISTINCT s.module_id) INTO v_signed_off
  FROM public.campaign_training_signoffs s
  WHERE s.agent_id = p_agent_id
  AND (s.expires_at IS NULL OR s.expires_at > now())
  AND s.needs_refresh = false;

  -- Update readiness
  IF v_total_required > 0 AND v_signed_off >= v_total_required THEN
    UPDATE public.profiles
    SET is_ready_for_live_calls = true,
        live_calls_ready_at = COALESCE(live_calls_ready_at, now())
    WHERE id = p_agent_id;
  ELSE
    UPDATE public.profiles
    SET is_ready_for_live_calls = false
    WHERE id = p_agent_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_agent_live_readiness(uuid) FROM PUBLIC;

-- Trigger to check readiness after signoff insert/update/delete
CREATE OR REPLACE FUNCTION public.trg_check_live_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.check_agent_live_readiness(
    CASE TG_OP WHEN 'DELETE' THEN OLD.agent_id ELSE NEW.agent_id END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_readiness_on_signoff ON public.campaign_training_signoffs;
CREATE TRIGGER trg_live_readiness_on_signoff
  AFTER INSERT OR UPDATE OR DELETE ON public.campaign_training_signoffs
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_live_readiness();

-- New assignments can also change the "total required" denominator, so recheck then too.
CREATE OR REPLACE FUNCTION public.trg_check_live_readiness_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.check_agent_live_readiness(
    CASE TG_OP WHEN 'DELETE' THEN OLD.agent_id ELSE NEW.agent_id END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_readiness_on_assignment ON public.campaign_training_assignments;
CREATE TRIGGER trg_live_readiness_on_assignment
  AFTER INSERT OR UPDATE OR DELETE ON public.campaign_training_assignments
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_live_readiness_on_assignment();
