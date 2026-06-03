-- Phase F: Retraining auto-expiry
ALTER TABLE public.campaign_training_modules
  ADD COLUMN IF NOT EXISTS retraining_interval_days int;

ALTER TABLE public.campaign_training_signoffs
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS needs_refresh boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refresh_reason text;

CREATE TABLE IF NOT EXISTS public.campaign_training_retraining_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  trigger_kind text NOT NULL CHECK (trigger_kind IN ('script_published','faq_approved','policy_approved','manual')),
  trigger_entity_id uuid,
  affected_signoffs int NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_training_retraining_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and supervisors read retraining events"
  ON public.campaign_training_retraining_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "System inserts retraining events"
  ON public.campaign_training_retraining_events FOR INSERT
  WITH CHECK (true);

-- Trigger: populate expires_at on signoff insert from the module interval
CREATE OR REPLACE FUNCTION public.set_signoff_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_days int;
BEGIN
  SELECT retraining_interval_days INTO v_days
    FROM public.campaign_training_modules
   WHERE id = NEW.module_id;
  IF v_days IS NOT NULL AND v_days > 0 THEN
    NEW.expires_at := COALESCE(NEW.signed_off_at, now()) + (v_days || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_signoff_expiry ON public.campaign_training_signoffs;
CREATE TRIGGER trg_set_signoff_expiry
  BEFORE INSERT ON public.campaign_training_signoffs
  FOR EACH ROW EXECUTE FUNCTION public.set_signoff_expiry();

-- Flip needs_refresh when script publishes, faq approves, or policy approves on this campaign
CREATE OR REPLACE FUNCTION public.flag_signoffs_needs_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign uuid;
  v_kind text;
  v_count int := 0;
BEGIN
  IF TG_TABLE_NAME = 'campaign_script_documents' THEN
    IF NEW.status <> 'published' OR (OLD.status IS NOT DISTINCT FROM NEW.status) THEN RETURN NEW; END IF;
    v_campaign := NEW.campaign_id;
    v_kind := 'script_published';
  ELSIF TG_TABLE_NAME = 'campaign_faq_entries' THEN
    IF NEW.status <> 'approved' OR (OLD.status IS NOT DISTINCT FROM NEW.status) THEN RETURN NEW; END IF;
    v_kind := 'faq_approved';
    -- find campaigns whose go_live_checks would be affected (department or tenant scope)
    UPDATE public.campaign_training_signoffs s
       SET needs_refresh = true,
           refresh_reason = 'FAQ approved: ' || COALESCE(NEW.question,'')
     WHERE s.campaign_id IN (
       SELECT c.id FROM public.campaigns c
       WHERE (NEW.scope = 'global')
          OR (NEW.scope = 'department' AND c.client_department_id = NEW.client_department_id)
          OR (NEW.scope = 'tenant' AND c.tenant_kind = NEW.tenant_kind)
     )
       AND COALESCE(s.needs_refresh, false) = false;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    INSERT INTO public.campaign_training_retraining_events
      (campaign_id, trigger_kind, trigger_entity_id, affected_signoffs, note)
    SELECT DISTINCT s.campaign_id, v_kind, NEW.id, v_count, 'FAQ approved'
      FROM public.campaign_training_signoffs s
     WHERE s.needs_refresh = true AND s.refresh_reason LIKE 'FAQ approved%'
     LIMIT 1;
    RETURN NEW;
  ELSIF TG_TABLE_NAME = 'campaign_policy_blocks' THEN
    IF NEW.status <> 'approved' OR (OLD.status IS NOT DISTINCT FROM NEW.status) THEN RETURN NEW; END IF;
    v_kind := 'policy_approved';
    UPDATE public.campaign_training_signoffs s
       SET needs_refresh = true,
           refresh_reason = 'Policy approved: ' || COALESCE(NEW.title,'')
     WHERE s.campaign_id IN (
       SELECT c.id FROM public.campaigns c
       WHERE (NEW.scope = 'global')
          OR (NEW.scope = 'department' AND c.client_department_id = NEW.client_department_id)
          OR (NEW.scope = 'tenant' AND c.tenant_kind = NEW.tenant_kind)
     )
       AND COALESCE(s.needs_refresh, false) = false;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    INSERT INTO public.campaign_training_retraining_events
      (campaign_id, trigger_kind, trigger_entity_id, affected_signoffs, note)
    SELECT DISTINCT s.campaign_id, v_kind, NEW.id, v_count, 'Policy approved'
      FROM public.campaign_training_signoffs s
     WHERE s.needs_refresh = true AND s.refresh_reason LIKE 'Policy approved%'
     LIMIT 1;
    RETURN NEW;
  END IF;

  -- script_published path
  UPDATE public.campaign_training_signoffs
     SET needs_refresh = true,
         refresh_reason = 'Script document republished'
   WHERE campaign_id = v_campaign
     AND COALESCE(needs_refresh, false) = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    INSERT INTO public.campaign_training_retraining_events
      (campaign_id, trigger_kind, trigger_entity_id, affected_signoffs, note)
    VALUES (v_campaign, v_kind, NEW.id, v_count, 'Script republished');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flag_signoffs_script ON public.campaign_script_documents;
CREATE TRIGGER trg_flag_signoffs_script
  AFTER UPDATE OF status ON public.campaign_script_documents
  FOR EACH ROW EXECUTE FUNCTION public.flag_signoffs_needs_refresh();

DROP TRIGGER IF EXISTS trg_flag_signoffs_faq ON public.campaign_faq_entries;
CREATE TRIGGER trg_flag_signoffs_faq
  AFTER UPDATE OF status ON public.campaign_faq_entries
  FOR EACH ROW EXECUTE FUNCTION public.flag_signoffs_needs_refresh();

DROP TRIGGER IF EXISTS trg_flag_signoffs_policy ON public.campaign_policy_blocks;
CREATE TRIGGER trg_flag_signoffs_policy
  AFTER UPDATE OF status ON public.campaign_policy_blocks
  FOR EACH ROW EXECUTE FUNCTION public.flag_signoffs_needs_refresh();

-- Status view: current | expiring_soon (<7d) | expired | needs_refresh
CREATE OR REPLACE VIEW public.campaign_training_signoff_status
WITH (security_invoker='true') AS
SELECT
  s.id AS signoff_id,
  s.module_id,
  s.campaign_id,
  s.agent_id,
  s.signed_off_at,
  s.expires_at,
  s.needs_refresh,
  s.refresh_reason,
  CASE
    WHEN COALESCE(s.needs_refresh, false) THEN 'needs_refresh'
    WHEN s.expires_at IS NOT NULL AND s.expires_at <= now() THEN 'expired'
    WHEN s.expires_at IS NOT NULL AND s.expires_at <= now() + interval '7 days' THEN 'expiring_soon'
    ELSE 'current'
  END AS status
FROM public.campaign_training_signoffs s;

GRANT SELECT ON public.campaign_training_signoff_status TO authenticated;

-- Update the go-live view: training_ok now requires non-expired, non-needs_refresh signoffs
CREATE OR REPLACE VIEW public.campaign_go_live_checks
WITH (security_invoker='true') AS
WITH fresh_signoffs AS (
  SELECT s.campaign_id, count(*)::int AS total
    FROM public.campaign_training_signoffs s
   WHERE COALESCE(s.needs_refresh, false) = false
     AND (s.expires_at IS NULL OR s.expires_at > now())
   GROUP BY s.campaign_id
)
SELECT
  c.id AS campaign_id,
  c.client_department_id,
  EXISTS (
    SELECT 1 FROM campaign_script_documents d
    WHERE d.campaign_id = c.id AND d.status = 'published'
  ) OR c.published_version_id IS NOT NULL AS script_published,
  COALESCE((
    SELECT count(*)::integer FROM campaign_faq_entries f
    WHERE f.status = 'approved'
      AND (f.client_department_id = c.client_department_id
           OR f.scope = 'global'
           OR (f.scope = 'tenant' AND f.tenant_kind = c.tenant_kind))
  ), 0) AS faqs_approved_count,
  COALESCE((
    SELECT count(*)::integer FROM campaign_policy_blocks p
    WHERE p.status = 'approved'
      AND (p.client_department_id = c.client_department_id
           OR p.scope = 'global'
           OR (p.scope = 'tenant' AND p.tenant_kind = c.tenant_kind))
  ), 0) AS policies_approved_count,
  COALESCE(tc.required_modules, 0)::integer AS required_modules,
  COALESCE(fs.total, 0)::integer AS required_signoffs,
  COALESCE((
    SELECT count(*) FROM campaign_faq_entries f
    WHERE f.status = 'approved'
      AND (f.client_department_id = c.client_department_id OR f.scope = 'global' OR (f.scope = 'tenant' AND f.tenant_kind = c.tenant_kind))
  ), 0) > 0 AS faqs_ok,
  COALESCE((
    SELECT count(*) FROM campaign_policy_blocks p
    WHERE p.status = 'approved'
      AND (p.client_department_id = c.client_department_id OR p.scope = 'global' OR (p.scope = 'tenant' AND p.tenant_kind = c.tenant_kind))
  ), 0) > 0 AS policies_ok,
  (COALESCE(tc.required_modules, 0) = 0 OR COALESCE(fs.total, 0) >= COALESCE(tc.required_modules, 0)) AS training_ok,
  (
    (EXISTS (SELECT 1 FROM campaign_script_documents d WHERE d.campaign_id = c.id AND d.status = 'published') OR c.published_version_id IS NOT NULL)
    AND COALESCE((
      SELECT count(*) FROM campaign_faq_entries f
      WHERE f.status = 'approved'
        AND (f.client_department_id = c.client_department_id OR f.scope = 'global' OR (f.scope = 'tenant' AND f.tenant_kind = c.tenant_kind))
    ), 0) > 0
    AND COALESCE((
      SELECT count(*) FROM campaign_policy_blocks p
      WHERE p.status = 'approved'
        AND (p.client_department_id = c.client_department_id OR p.scope = 'global' OR (p.scope = 'tenant' AND p.tenant_kind = c.tenant_kind))
    ), 0) > 0
    AND (COALESCE(tc.required_modules, 0) = 0 OR COALESCE(fs.total, 0) >= COALESCE(tc.required_modules, 0))
  ) AS all_ok
FROM campaigns c
LEFT JOIN campaign_training_coverage tc ON tc.campaign_id = c.id
LEFT JOIN fresh_signoffs fs ON fs.campaign_id = c.id;