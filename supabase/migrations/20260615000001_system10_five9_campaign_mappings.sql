-- System 10 — Five9 Campaign Mapping Validation
-- Part 1: five9_campaign_mappings table + RLS + grants
-- Part 2: refresh_go_live_snapshot — compute five9_ok
-- Part 3: enforce_go_live_checks — add five9_ok gate
-- Part 4: update client_confirm_go_live / supervisor_approve_go_live to include five9_ok in all_ok
-- Part 5: auto-refresh triggers for five9_campaign_mappings + five9_variable_mappings

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. five9_campaign_mappings
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.five9_campaign_mappings (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id          uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  five9_campaign_name  text        NOT NULL,
  five9_campaign_type  text,
  verified_at          timestamptz DEFAULT now(),
  created_by           uuid        REFERENCES auth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id)
);

ALTER TABLE public.five9_campaign_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS five9_mapping_admin_all        ON public.five9_campaign_mappings;
DROP POLICY IF EXISTS five9_mapping_supervisor_select ON public.five9_campaign_mappings;

CREATE POLICY five9_mapping_admin_all ON public.five9_campaign_mappings
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY five9_mapping_supervisor_select ON public.five9_campaign_mappings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.five9_campaign_mappings TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. refresh_go_live_snapshot — compute five9_ok
--    Conditions: mapping row exists AND department has >= 8 active variable mappings
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
  v_five9_ok boolean;
  v_dept_id  uuid;
  v_var_count bigint;
BEGIN
  -- Live automated checks from the view
  SELECT script_published, faqs_ok, policies_ok, training_ok
  INTO v_check
  FROM public.campaign_go_live_checks
  WHERE campaign_id = p_campaign_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Fetch this campaign's department for variable coverage check
  SELECT client_department_id INTO v_dept_id
  FROM public.campaigns
  WHERE id = p_campaign_id;

  -- Count active variable mappings for this department
  IF v_dept_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_var_count
    FROM public.five9_variable_mappings
    WHERE client_department_id = v_dept_id AND is_active = true;
  ELSE
    v_var_count := 0;
  END IF;

  -- five9_ok = campaign has a Five9 mapping AND ≥8 active variable mappings
  v_five9_ok := (
    EXISTS (SELECT 1 FROM public.five9_campaign_mappings WHERE campaign_id = p_campaign_id)
    AND v_var_count >= 8
  );

  -- Preserve manual approvals already recorded in the snapshot
  SELECT supervisor_approved, client_confirmed
  INTO v_existing
  FROM public.campaign_go_live_status_snapshots
  WHERE campaign_id = p_campaign_id;

  v_all_ok :=
    COALESCE(v_check.script_published,       false) AND
    COALESCE(v_check.faqs_ok,                false) AND
    COALESCE(v_check.policies_ok,            false) AND
    COALESCE(v_check.training_ok,            false) AND
    COALESCE(v_existing.supervisor_approved, false) AND
    COALESCE(v_existing.client_confirmed,    false) AND
    COALESCE(v_five9_ok,                     false);

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
    false, false, COALESCE(v_five9_ok, false),
    false, now()
  )
  ON CONFLICT (campaign_id) DO UPDATE SET
    script_published  = COALESCE(v_check.script_published, false),
    faqs_ok           = COALESCE(v_check.faqs_ok,          false),
    policies_ok       = COALESCE(v_check.policies_ok,       false),
    training_ok       = COALESCE(v_check.training_ok,       false),
    five9_ok          = COALESCE(v_five9_ok, false),
    all_ok            = v_all_ok,
    last_evaluated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_go_live_snapshot(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. enforce_go_live_checks — add five9_ok gate
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

  -- Manual approvals + Five9 gate from the snapshot
  SELECT supervisor_approved, client_confirmed, five9_ok
  INTO v_snapshot
  FROM public.campaign_go_live_status_snapshots
  WHERE campaign_id = NEW.id;

  IF v_check IS NULL OR NOT v_check.script_published  THEN v_missing := v_missing || 'published script';        END IF;
  IF v_check IS NULL OR NOT v_check.faqs_ok           THEN v_missing := v_missing || 'approved FAQ';            END IF;
  IF v_check IS NULL OR NOT v_check.policies_ok       THEN v_missing := v_missing || 'approved policy';         END IF;
  IF v_check IS NULL OR NOT v_check.training_ok       THEN v_missing := v_missing || 'training signoffs';       END IF;
  IF v_snapshot IS NULL OR NOT v_snapshot.client_confirmed    THEN v_missing := v_missing || 'client confirmation';   END IF;
  IF v_snapshot IS NULL OR NOT v_snapshot.supervisor_approved THEN v_missing := v_missing || 'supervisor sign-off';   END IF;
  IF v_snapshot IS NULL OR NOT v_snapshot.five9_ok            THEN v_missing := v_missing || 'Five9 campaign mapping'; END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Campaign is not ready to go live. Missing: %. Use Force activate to override.',
      array_to_string(v_missing, ', ')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_go_live_checks ON public.campaigns;
CREATE TRIGGER trg_enforce_go_live_checks
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_go_live_checks();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Update client_confirm_go_live to include five9_ok in all_ok
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.client_confirm_go_live(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_s          RECORD;
  v_new_all_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'client'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: client role required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = p_campaign_id
      AND c.client_lead_id IN (
        SELECT id FROM public.leads WHERE user_id = auth.uid()
      )
  ) THEN
    RAISE EXCEPTION 'Campaign not found or not accessible';
  END IF;

  SELECT script_published, faqs_ok, policies_ok, training_ok, supervisor_approved, five9_ok
  INTO v_s
  FROM public.campaign_go_live_status_snapshots
  WHERE campaign_id = p_campaign_id;

  v_new_all_ok :=
    COALESCE(v_s.script_published,    false) AND
    COALESCE(v_s.faqs_ok,             false) AND
    COALESCE(v_s.policies_ok,         false) AND
    COALESCE(v_s.training_ok,         false) AND
    COALESCE(v_s.supervisor_approved, false) AND
    COALESCE(v_s.five9_ok,            false) AND
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
-- 5. Update supervisor_approve_go_live to include five9_ok in all_ok
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

  SELECT script_published, faqs_ok, policies_ok, training_ok, client_confirmed, five9_ok
  INTO v_s
  FROM public.campaign_go_live_status_snapshots
  WHERE campaign_id = p_campaign_id;

  v_new_all_ok :=
    COALESCE(v_s.script_published,  false) AND
    COALESCE(v_s.faqs_ok,           false) AND
    COALESCE(v_s.policies_ok,       false) AND
    COALESCE(v_s.training_ok,       false) AND
    COALESCE(v_s.five9_ok,          false) AND
    COALESCE(v_s.client_confirmed,  false) AND
    true; -- supervisor_approved = true as of now

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
-- 6. Trigger: five9_campaign_mappings changes → refresh snapshot
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_sync_snapshot_on_five9_mapping_change()
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

DROP TRIGGER IF EXISTS trg_snapshot_five9_mapping_change ON public.five9_campaign_mappings;
CREATE TRIGGER trg_snapshot_five9_mapping_change
  AFTER INSERT OR UPDATE OR DELETE ON public.five9_campaign_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_snapshot_on_five9_mapping_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Trigger: five9_variable_mappings changes → refresh snapshots for affected
--    campaigns (same department) so variable coverage re-evaluates
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_sync_snapshot_on_five9_variable_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_campaign RECORD;
  v_dept_id  uuid;
BEGIN
  v_dept_id := COALESCE(NEW.client_department_id, OLD.client_department_id);
  IF v_dept_id IS NULL THEN RETURN NULL; END IF;

  FOR v_campaign IN
    SELECT id FROM public.campaigns
    WHERE client_department_id = v_dept_id AND status != 'archived'
  LOOP
    PERFORM public.refresh_go_live_snapshot(v_campaign.id);
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_five9_variable_change ON public.five9_variable_mappings;
CREATE TRIGGER trg_snapshot_five9_variable_change
  AFTER INSERT OR UPDATE OF is_active OR DELETE ON public.five9_variable_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_snapshot_on_five9_variable_change();
