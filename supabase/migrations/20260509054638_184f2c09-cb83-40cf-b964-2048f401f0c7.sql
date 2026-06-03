
-- Configurable SLA per policy + dedupe stamps on requests
ALTER TABLE public.approval_policies
  ADD COLUMN IF NOT EXISTS sla_hours int NOT NULL DEFAULT 24;

ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS sla_hours_snapshot int,
  ADD COLUMN IF NOT EXISTS created_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_notified_at timestamptz;

-- Snapshot SLA on insert so policy edits don't retroactively change breach math
CREATE OR REPLACE FUNCTION public.approval_request_snapshot_sla()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sla int;
BEGIN
  IF NEW.sla_hours_snapshot IS NULL AND NEW.policy_id IS NOT NULL THEN
    SELECT sla_hours INTO v_sla FROM approval_policies WHERE id = NEW.policy_id;
    NEW.sla_hours_snapshot := COALESCE(v_sla, 24);
  ELSIF NEW.sla_hours_snapshot IS NULL THEN
    NEW.sla_hours_snapshot := 24;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_approval_request_snapshot_sla ON public.approval_requests;
CREATE TRIGGER trg_approval_request_snapshot_sla
  BEFORE INSERT ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.approval_request_snapshot_sla();

-- Helper that POSTs a payload to notify-approval-event with the project anon key
CREATE OR REPLACE FUNCTION public.fire_approval_notification(p_request_id uuid, p_event text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v jsonb;
  v_hours_pending numeric;
BEGIN
  SELECT jsonb_build_object(
    'type', p_event,
    'request_id', ar.id,
    'deal_id', ar.deal_id,
    'required_role', ar.required_role,
    'tier', ar.tier,
    'reason', ar.reason,
    'policy_name', p.name,
    'scope', d.scope,
    'deal_type', d.deal_type,
    'stage', d.stage,
    'estimated_discount_pct', d.estimated_discount_pct,
    'is_non_standard_term', d.is_non_standard_term,
    'is_exception', d.is_exception,
    'sla_hours', ar.sla_hours_snapshot,
    'hours_pending', EXTRACT(epoch FROM (now() - ar.requested_at))/3600
  ) INTO v
  FROM approval_requests ar
  JOIN renewal_expansion_deals d ON d.id = ar.deal_id
  LEFT JOIN approval_policies p ON p.id = ar.policy_id
  WHERE ar.id = p_request_id;

  IF v IS NULL THEN RETURN; END IF;

  PERFORM net.http_post(
    url := 'https://grbwstopaqvmybmmtiiv.supabase.co/functions/v1/notify-approval-event',
    body := v,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYndzdG9wYXF2bXlibW10aWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjkxMjQsImV4cCI6MjA4NTY0NTEyNH0.d6XVSev5y9nFiGDOD8ts0ZkuEPJQPFW9WbbUttBwESI'
    )::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fire_approval_notification(%, %) failed: %', p_request_id, p_event, SQLERRM;
END $$;

-- Trigger: notify on new pending request
CREATE OR REPLACE FUNCTION public.approval_request_notify_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.created_notified_at IS NULL THEN
    PERFORM public.fire_approval_notification(NEW.id, 'approval_required');
    UPDATE approval_requests SET created_notified_at = now() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_approval_request_notify_created ON public.approval_requests;
CREATE TRIGGER trg_approval_request_notify_created
  AFTER INSERT ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.approval_request_notify_created();

-- Cron-friendly RPC: notify SLA breaches (one-shot per breach)
CREATE OR REPLACE FUNCTION public.dispatch_approval_sla_breaches()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_count int := 0;
BEGIN
  FOR r IN
    SELECT id FROM approval_requests
    WHERE status = 'pending'
      AND sla_notified_at IS NULL
      AND requested_at <= now() - make_interval(hours => COALESCE(sla_hours_snapshot, 24))
    ORDER BY requested_at ASC
    LIMIT 200
  LOOP
    PERFORM public.fire_approval_notification(r.id, 'approval_sla_breach');
    UPDATE approval_requests SET sla_notified_at = now() WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('breaches_notified', v_count, 'ran_at', now());
END $$;

REVOKE ALL ON FUNCTION public.dispatch_approval_sla_breaches() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_approval_sla_breaches() TO service_role;
