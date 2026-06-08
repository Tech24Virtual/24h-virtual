-- System 12 — QA & Go-Live Checklist
-- Part A: extend snapshot table + write triggers
-- Part B: regression notifier
-- Part C: client_confirm_go_live RPC
-- Part D: supervisor_approve_go_live RPC
-- Plus: updated enforce_go_live_checks (adds supervisor + client gates)

-- ─────────────────────────────────────────────────────────────────────────────
-- A1. Extend campaign_go_live_status_snapshots
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.campaign_go_live_status_snapshots
  ADD COLUMN IF NOT EXISTS supervisor_approved    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supervisor_approved_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS supervisor_approved_by uuid        NULL,
  ADD COLUMN IF NOT EXISTS client_confirmed       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_confirmed_at    timestamptz NULL,
  ADD COLUMN IF NOT EXISTS five9_ok               boolean     NOT NULL DEFAULT false;

-- Recompute all_ok for every existing row now that the formula has changed.
-- (supervisor_approved and client_confirmed both default false, so existing
--  rows that weren't all_ok stay false; rows that were all_ok flip to false
--  until the supervisor and client act — that's correct behaviour.)
UPDATE public.campaign_go_live_status_snapshots
   SET all_ok = (
     script_published AND faqs_ok AND policies_ok AND training_ok
     AND supervisor_approved AND client_confirmed
   );

-- ─────────────────────────────────────────────────────────────────────────────
-- A2. RLS on campaign_go_live_status_snapshots
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.campaign_go_live_status_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS snapshot_admin_all        ON public.campaign_go_live_status_snapshots;
DROP POLICY IF EXISTS snapshot_supervisor_select ON public.campaign_go_live_status_snapshots;
DROP POLICY IF EXISTS snapshot_client_select     ON public.campaign_go_live_status_snapshots;

-- Admins: full access
CREATE POLICY snapshot_admin_all ON public.campaign_go_live_status_snapshots
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Supervisors: read all
CREATE POLICY snapshot_supervisor_select ON public.campaign_go_live_status_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

-- Clients: read only their own campaigns' snapshots
CREATE POLICY snapshot_client_select ON public.campaign_go_live_status_snapshots
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'client'::app_role)
    AND campaign_id IN (
      SELECT c.id FROM public.campaigns c
      WHERE c.client_lead_id IN (
        SELECT id FROM public.leads WHERE user_id = auth.uid()
      )
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.campaign_go_live_status_snapshots TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- A3. Snapshot refresh helper (called by all write triggers)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.refresh_go_live_snapshot(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_check    RECORD;
  v_existing RECORD;
  v_all_ok   boolean;
BEGIN
  -- Live automated checks from the view
  SELECT script_published, faqs_ok, policies_ok, training_ok
  INTO v_check
  FROM public.campaign_go_live_checks
  WHERE campaign_id = p_campaign_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Preserve manual approvals already recorded in the snapshot
  SELECT supervisor_approved, client_confirmed
  INTO v_existing
  FROM public.campaign_go_live_status_snapshots
  WHERE campaign_id = p_campaign_id;

  v_all_ok :=
    COALESCE(v_check.script_published, false) AND
    COALESCE(v_check.faqs_ok,          false) AND
    COALESCE(v_check.policies_ok,       false) AND
    COALESCE(v_check.training_ok,       false) AND
    COALESCE(v_existing.supervisor_approved, false) AND
    COALESCE(v_existing.client_confirmed,    false);

  INSERT INTO public.campaign_go_live_status_snapshots(
    campaign_id,
    script_published, faqs_ok, policies_ok, training_ok,
    supervisor_approved, client_confirmed, five9_ok,
    all_ok, last_evaluated_at
  ) VALUES (
    p_campaign_id,
    COALESCE(v_check.script_published, false),
    COALESCE(v_check.faqs_ok,          false),
    COALESCE(v_check.policies_ok,       false),
    COALESCE(v_check.training_ok,       false),
    false, false, false,
    false, now()
  )
  ON CONFLICT (campaign_id) DO UPDATE SET
    script_published  = COALESCE(v_check.script_published, false),
    faqs_ok           = COALESCE(v_check.faqs_ok,          false),
    policies_ok       = COALESCE(v_check.policies_ok,       false),
    training_ok       = COALESCE(v_check.training_ok,       false),
    all_ok            = v_all_ok,
    last_evaluated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_go_live_snapshot(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- A4. Trigger: campaign_script_documents → refresh snapshot
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_sync_snapshot_on_script_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.refresh_go_live_snapshot(COALESCE(NEW.campaign_id, OLD.campaign_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_script_change ON public.campaign_script_documents;
CREATE TRIGGER trg_snapshot_script_change
  AFTER INSERT OR UPDATE OF status ON public.campaign_script_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_snapshot_on_script_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- A5. Trigger: campaign_faq_entries → refresh snapshot(s)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_sync_snapshot_on_faq_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_campaign RECORD;
  v_dept_id  uuid;
  v_scope    text;
BEGIN
  -- Only react to status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NULL;
  END IF;

  v_dept_id := COALESCE(NEW.client_department_id, OLD.client_department_id);
  v_scope   := COALESCE(NEW.scope::text, OLD.scope::text, 'department');

  IF v_scope = 'global' OR v_dept_id IS NULL THEN
    -- Global: refresh all non-archived campaigns
    FOR v_campaign IN
      SELECT id FROM public.campaigns WHERE status != 'archived'
    LOOP
      PERFORM public.refresh_go_live_snapshot(v_campaign.id);
    END LOOP;
  ELSE
    -- Department-scoped: refresh campaigns for this department only
    FOR v_campaign IN
      SELECT id FROM public.campaigns
      WHERE client_department_id = v_dept_id AND status != 'archived'
    LOOP
      PERFORM public.refresh_go_live_snapshot(v_campaign.id);
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_faq_change ON public.campaign_faq_entries;
CREATE TRIGGER trg_snapshot_faq_change
  AFTER INSERT OR UPDATE OF status ON public.campaign_faq_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_snapshot_on_faq_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- A6. Trigger: campaign_policy_blocks → refresh snapshot(s)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_sync_snapshot_on_policy_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_campaign RECORD;
  v_dept_id  uuid;
  v_scope    text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NULL;
  END IF;

  v_dept_id := COALESCE(NEW.client_department_id, OLD.client_department_id);
  v_scope   := COALESCE(NEW.scope::text, OLD.scope::text, 'department');

  IF v_scope = 'global' OR v_dept_id IS NULL THEN
    FOR v_campaign IN
      SELECT id FROM public.campaigns WHERE status != 'archived'
    LOOP
      PERFORM public.refresh_go_live_snapshot(v_campaign.id);
    END LOOP;
  ELSE
    FOR v_campaign IN
      SELECT id FROM public.campaigns
      WHERE client_department_id = v_dept_id AND status != 'archived'
    LOOP
      PERFORM public.refresh_go_live_snapshot(v_campaign.id);
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_policy_change ON public.campaign_policy_blocks;
CREATE TRIGGER trg_snapshot_policy_change
  AFTER INSERT OR UPDATE OF status ON public.campaign_policy_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_snapshot_on_policy_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- A7. Trigger: campaign_training_signoffs → refresh snapshot
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_sync_snapshot_on_training_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.refresh_go_live_snapshot(COALESCE(NEW.campaign_id, OLD.campaign_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_training_change ON public.campaign_training_signoffs;
CREATE TRIGGER trg_snapshot_training_change
  AFTER INSERT OR UPDATE ON public.campaign_training_signoffs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_snapshot_on_training_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- B. Regression notifier — all_ok TRUE → FALSE fan-out
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_go_live_regression()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_campaign_name text;
  v_user          RECORD;
BEGIN
  -- Only fire when all_ok flips TRUE → FALSE
  IF NOT (OLD.all_ok = true AND NEW.all_ok = false) THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_campaign_name
  FROM public.campaigns
  WHERE id = NEW.campaign_id;

  FOR v_user IN
    SELECT DISTINCT user_id
    FROM public.user_roles
    WHERE role IN ('admin'::app_role, 'supervisor'::app_role)
  LOOP
    BEGIN
      INSERT INTO public.notifications(user_id, title, message, category, action_url)
      VALUES (
        v_user.user_id,
        'Go-live regression: ' || COALESCE(v_campaign_name, 'Campaign'),
        'Campaign "' || COALESCE(v_campaign_name, 'Unknown') ||
          '" was ready for go-live but a check has now failed. Review required.',
        'campaign',
        '/admin/campaign-os/campaigns/' || NEW.campaign_id || '?tab=go-live'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- never block the update on notification failure
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_go_live_regression ON public.campaign_go_live_status_snapshots;
CREATE TRIGGER trg_notify_go_live_regression
  AFTER UPDATE OF all_ok ON public.campaign_go_live_status_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_go_live_regression();

-- ─────────────────────────────────────────────────────────────────────────────
-- C. client_confirm_go_live RPC
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.client_confirm_go_live(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_s         RECORD;
  v_new_all_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'client'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: client role required';
  END IF;

  -- Verify the campaign belongs to this client
  IF NOT EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = p_campaign_id
      AND c.client_lead_id IN (
        SELECT id FROM public.leads WHERE user_id = auth.uid()
      )
  ) THEN
    RAISE EXCEPTION 'Campaign not found or not accessible';
  END IF;

  -- Read current automated snapshot state to compute new all_ok
  SELECT script_published, faqs_ok, policies_ok, training_ok, supervisor_approved
  INTO v_s
  FROM public.campaign_go_live_status_snapshots
  WHERE campaign_id = p_campaign_id;

  v_new_all_ok :=
    COALESCE(v_s.script_published,   false) AND
    COALESCE(v_s.faqs_ok,            false) AND
    COALESCE(v_s.policies_ok,        false) AND
    COALESCE(v_s.training_ok,        false) AND
    COALESCE(v_s.supervisor_approved, false) AND
    true; -- client_confirmed = true as of now

  INSERT INTO public.campaign_go_live_status_snapshots(
    campaign_id,
    client_confirmed, client_confirmed_at,
    all_ok, last_evaluated_at
  ) VALUES (
    p_campaign_id,
    true, now(),
    false, now()
  )
  ON CONFLICT (campaign_id) DO UPDATE SET
    client_confirmed    = true,
    client_confirmed_at = now(),
    all_ok              = v_new_all_ok,
    last_evaluated_at   = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_confirm_go_live(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- D. supervisor_approve_go_live RPC
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.supervisor_approve_go_live(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_s              RECORD;
  v_new_all_ok     boolean;
  v_campaign_name  text;
  v_admin          RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (
    public.has_role(auth.uid(), 'supervisor'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Forbidden: supervisor or admin role required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.campaigns WHERE id = p_campaign_id) THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  SELECT display_name INTO v_campaign_name FROM public.campaigns WHERE id = p_campaign_id;

  SELECT script_published, faqs_ok, policies_ok, training_ok, client_confirmed
  INTO v_s
  FROM public.campaign_go_live_status_snapshots
  WHERE campaign_id = p_campaign_id;

  v_new_all_ok :=
    COALESCE(v_s.script_published,  false) AND
    COALESCE(v_s.faqs_ok,           false) AND
    COALESCE(v_s.policies_ok,       false) AND
    COALESCE(v_s.training_ok,       false) AND
    true AND                               -- supervisor_approved = true as of now
    COALESCE(v_s.client_confirmed,  false);

  INSERT INTO public.campaign_go_live_status_snapshots(
    campaign_id,
    supervisor_approved, supervisor_approved_at, supervisor_approved_by,
    all_ok, last_evaluated_at
  ) VALUES (
    p_campaign_id,
    true, now(), auth.uid(),
    false, now()
  )
  ON CONFLICT (campaign_id) DO UPDATE SET
    supervisor_approved    = true,
    supervisor_approved_at = now(),
    supervisor_approved_by = auth.uid(),
    all_ok                 = v_new_all_ok,
    last_evaluated_at      = now();

  -- Notify all admins of supervisor sign-off
  FOR v_admin IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role = 'admin'::app_role
  LOOP
    BEGIN
      INSERT INTO public.notifications(user_id, title, message, category, action_url)
      VALUES (
        v_admin.user_id,
        'Supervisor approved: ' || COALESCE(v_campaign_name, 'Campaign'),
        'Supervisor has signed off "' || COALESCE(v_campaign_name, 'Campaign') ||
          '" for go-live. Verify all automated checks still pass before activating.',
        'campaign',
        '/admin/campaign-os/campaigns/' || p_campaign_id || '?tab=go-live'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.supervisor_approve_go_live(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Updated enforce_go_live_checks — now includes supervisor + client gates
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_go_live_checks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_check    RECORD;
  v_snapshot RECORD;
  v_missing  text[] := '{}';
BEGIN
  -- Only fire on draft → active transition
  IF NEW.status <> 'active' OR OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  -- Fresh admin override bypasses all checks
  IF NEW.go_live_override_at IS NOT NULL
     AND (OLD.go_live_override_at IS NULL
          OR NEW.go_live_override_at > OLD.go_live_override_at) THEN
    RETURN NEW;
  END IF;

  -- Automated checks from the live view
  SELECT script_published, faqs_ok, policies_ok, training_ok
  INTO v_check
  FROM public.campaign_go_live_checks
  WHERE campaign_id = NEW.id;

  -- Manual approvals from the snapshot
  SELECT supervisor_approved, client_confirmed
  INTO v_snapshot
  FROM public.campaign_go_live_status_snapshots
  WHERE campaign_id = NEW.id;

  IF v_check IS NULL OR NOT v_check.script_published  THEN v_missing := v_missing || 'published script';      END IF;
  IF v_check IS NULL OR NOT v_check.faqs_ok           THEN v_missing := v_missing || 'approved FAQ';          END IF;
  IF v_check IS NULL OR NOT v_check.policies_ok       THEN v_missing := v_missing || 'approved policy';       END IF;
  IF v_check IS NULL OR NOT v_check.training_ok       THEN v_missing := v_missing || 'training signoffs';     END IF;
  IF v_snapshot IS NULL OR NOT v_snapshot.client_confirmed    THEN v_missing := v_missing || 'client confirmation'; END IF;
  IF v_snapshot IS NULL OR NOT v_snapshot.supervisor_approved THEN v_missing := v_missing || 'supervisor sign-off'; END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Campaign is not ready to go live. Missing: %. Use Force activate to override.',
      array_to_string(v_missing, ', ')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger already exists; replacing the function is sufficient.
-- Re-create trigger to be explicit (idempotent).
DROP TRIGGER IF EXISTS trg_enforce_go_live_checks ON public.campaigns;
CREATE TRIGGER trg_enforce_go_live_checks
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_go_live_checks();

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants for notification table access from SECURITY DEFINER functions
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.user_roles    TO authenticated;
GRANT SELECT ON public.campaigns     TO authenticated;
GRANT SELECT ON public.leads         TO authenticated;
