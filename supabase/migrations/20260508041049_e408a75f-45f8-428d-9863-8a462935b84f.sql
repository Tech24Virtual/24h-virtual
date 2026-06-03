
-- ============================================================
-- Phase 5 — AI Voice / Hybrid Receptionist
-- Canonical AI receptionist config + readiness model
-- Reuses client_departments (call flows), campaigns, department_numbers
-- ============================================================

-- A. Receptionist mode + after-hours vocab
DO $$ BEGIN
  CREATE TYPE public.receptionist_mode AS ENUM ('ai_only', 'hybrid', 'human_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.after_hours_behavior AS ENUM ('voicemail', 'forward', 'overflow', 'message_only', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.escalation_strategy AS ENUM ('none', 'transfer_human', 'callback_request', 'supervisor', 'overflow_number');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- B. AI receptionist config — 1:1 with a call flow (client_departments)
CREATE TABLE IF NOT EXISTS public.call_flow_receptionist_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_department_id uuid NOT NULL UNIQUE REFERENCES public.client_departments(id) ON DELETE CASCADE,
  -- mirrored tenant identity for RLS scoping
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  -- behavior
  mode public.receptionist_mode NOT NULL DEFAULT 'hybrid',
  greeting text,
  after_hours public.after_hours_behavior NOT NULL DEFAULT 'voicemail',
  escalation public.escalation_strategy NOT NULL DEFAULT 'transfer_human',
  -- routing targets (canonical)
  primary_contact_id uuid REFERENCES public.client_contacts(id) ON DELETE SET NULL,
  overflow_department_id uuid REFERENCES public.client_departments(id) ON DELETE SET NULL,
  overflow_number text,
  voicemail_email text,
  -- hours: { tz, weekly: [ { day, open, close } ], holidays: [iso_date] }
  business_hours jsonb NOT NULL DEFAULT '{"tz":"America/New_York","weekly":[],"holidays":[]}'::jsonb,
  -- knowledge grounding pointers (campaign drives canonical content; this acks it)
  ground_in_campaign boolean NOT NULL DEFAULT true,
  knowledge_notes text,
  -- safety / live state
  enabled boolean NOT NULL DEFAULT false,
  last_validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_recep_cfg_dept ON public.call_flow_receptionist_configs(client_department_id);
CREATE INDEX IF NOT EXISTS idx_recep_cfg_tenant ON public.call_flow_receptionist_configs(tenant_kind, wl_partner_id, client_lead_id, wl_client_id);

ALTER TABLE public.call_flow_receptionist_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY recep_cfg_admin_all ON public.call_flow_receptionist_configs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY recep_cfg_member_select ON public.call_flow_receptionist_configs
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));

CREATE POLICY recep_cfg_supervisor_update ON public.call_flow_receptionist_configs
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role) AND is_tenant_member(auth.uid(), (tenant_kind)::text, wl_partner_id, client_lead_id, wl_client_id));

-- C. Auto-mirror tenant identity from parent client_department on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.trg_recep_cfg_mirror_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.client_departments;
BEGIN
  SELECT * INTO d FROM public.client_departments WHERE id = NEW.client_department_id;
  IF d.id IS NULL THEN RAISE EXCEPTION 'unknown call flow %', NEW.client_department_id; END IF;
  NEW.tenant_kind := d.tenant_kind;
  NEW.wl_partner_id := d.wl_partner_id;
  NEW.client_lead_id := d.client_lead_id;
  NEW.wl_client_id := d.wl_client_id;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_recep_cfg_mirror_tenant ON public.call_flow_receptionist_configs;
CREATE TRIGGER trg_recep_cfg_mirror_tenant
BEFORE INSERT OR UPDATE ON public.call_flow_receptionist_configs
FOR EACH ROW EXECUTE FUNCTION public.trg_recep_cfg_mirror_tenant();

-- D. Lifecycle event + audit on changes
CREATE OR REPLACE FUNCTION public.trg_recep_cfg_emit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE evt text;
BEGIN
  IF TG_OP = 'INSERT' THEN evt := 'voice.receptionist.configured';
  ELSIF TG_OP = 'UPDATE' AND OLD.enabled IS DISTINCT FROM NEW.enabled THEN
    evt := CASE WHEN NEW.enabled THEN 'voice.receptionist.enabled' ELSE 'voice.receptionist.disabled' END;
  ELSE evt := 'voice.receptionist.updated';
  END IF;

  PERFORM public.emit_dashboard_event(
    evt, 'admin', 'admin', 'call_flow', NULL,
    jsonb_build_object(
      'client_department_id', NEW.client_department_id,
      'mode', NEW.mode,
      'enabled', NEW.enabled
    )
  );
  PERFORM public.log_audit_event(
    evt, 'call_flow_receptionist_configs', NEW.id::text,
    jsonb_build_object('tenant_kind', NEW.tenant_kind, 'wl_partner_id', NEW.wl_partner_id, 'client_lead_id', NEW.client_lead_id, 'wl_client_id', NEW.wl_client_id),
    jsonb_build_object('mode', NEW.mode, 'after_hours', NEW.after_hours, 'escalation', NEW.escalation, 'enabled', NEW.enabled)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_recep_cfg_emit ON public.call_flow_receptionist_configs;
CREATE TRIGGER trg_recep_cfg_emit
AFTER INSERT OR UPDATE ON public.call_flow_receptionist_configs
FOR EACH ROW EXECUTE FUNCTION public.trg_recep_cfg_emit();

-- E. RPC: enable/disable receptionist (gated, audited)
CREATE OR REPLACE FUNCTION public.set_receptionist_enabled(_config_id uuid, _enabled boolean, _reason text DEFAULT NULL)
RETURNS public.call_flow_receptionist_configs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row public.call_flow_receptionist_configs;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.call_flow_receptionist_configs
     SET enabled = _enabled,
         last_validated_at = CASE WHEN _enabled THEN now() ELSE last_validated_at END
   WHERE id = _config_id
   RETURNING * INTO row;

  IF row.id IS NULL THEN RAISE EXCEPTION 'config not found'; END IF;

  PERFORM public.log_audit_event(
    CASE WHEN _enabled THEN 'voice.receptionist.go_live' ELSE 'voice.receptionist.taken_offline' END,
    'call_flow_receptionist_configs', row.id::text,
    jsonb_build_object('client_department_id', row.client_department_id),
    jsonb_build_object('reason', _reason)
  );
  RETURN row;
END $$;

GRANT EXECUTE ON FUNCTION public.set_receptionist_enabled(uuid, boolean, text) TO authenticated;

-- F. Readiness view — live-ready means: enabled config + active number + published campaign
CREATE OR REPLACE VIEW public.v_call_flow_receptionist_readiness
WITH (security_invoker = true) AS
SELECT
  d.id AS client_department_id,
  d.tenant_kind,
  d.wl_partner_id,
  d.client_lead_id,
  d.wl_client_id,
  d.client_location_id,
  COALESCE(d.display_name, d.department_name) AS flow_name,
  d.lifecycle,
  cfg.id AS config_id,
  cfg.mode,
  cfg.after_hours,
  cfg.escalation,
  cfg.enabled AS receptionist_enabled,
  cfg.last_validated_at,
  c.id AS campaign_id,
  c.status AS campaign_status,
  c.published_version_id IS NOT NULL AS has_published_script,
  EXISTS(SELECT 1 FROM public.department_numbers dn WHERE dn.client_department_id = d.id AND dn.active) AS has_active_number,
  CASE
    WHEN cfg.id IS NULL THEN 'unconfigured'
    WHEN NOT cfg.enabled THEN 'configured_offline'
    WHEN c.published_version_id IS NULL THEN 'awaiting_script_publish'
    WHEN NOT EXISTS(SELECT 1 FROM public.department_numbers dn WHERE dn.client_department_id = d.id AND dn.active) THEN 'awaiting_number'
    WHEN c.status = 'active' THEN 'live'
    ELSE 'ready_to_activate'
  END AS readiness_state
FROM public.client_departments d
LEFT JOIN public.call_flow_receptionist_configs cfg ON cfg.client_department_id = d.id
LEFT JOIN public.campaigns c ON c.client_department_id = d.id;

-- G. Account-level rollup (admin-facing)
CREATE OR REPLACE VIEW public.v_account_receptionist_status
WITH (security_invoker = true) AS
SELECT
  COALESCE(client_lead_id::text, wl_client_id::text) AS account_key,
  client_lead_id,
  wl_client_id,
  tenant_kind,
  COUNT(*) AS flow_count,
  COUNT(*) FILTER (WHERE readiness_state = 'live') AS live_count,
  COUNT(*) FILTER (WHERE readiness_state = 'unconfigured') AS unconfigured_count,
  COUNT(*) FILTER (WHERE readiness_state IN ('awaiting_script_publish','awaiting_number','configured_offline','ready_to_activate')) AS pending_count,
  MAX(last_validated_at) AS last_validated_at
FROM public.v_call_flow_receptionist_readiness
GROUP BY 1,2,3,4;

-- H. Client-safe summary view (RLS-scoped via leads.user_id)
CREATE OR REPLACE VIEW public.v_client_receptionist_summary
WITH (security_invoker = true) AS
SELECT
  l.id AS lead_id,
  COUNT(r.client_department_id) AS flow_count,
  COUNT(*) FILTER (WHERE r.readiness_state = 'live') AS live_count,
  COUNT(*) FILTER (WHERE r.readiness_state <> 'live') AS pending_count,
  bool_or(r.receptionist_enabled) AS any_enabled,
  MAX(r.last_validated_at) AS last_validated_at
FROM public.leads l
LEFT JOIN public.v_call_flow_receptionist_readiness r ON r.client_lead_id = l.id
WHERE l.user_id = auth.uid()
GROUP BY l.id;

GRANT SELECT ON public.v_call_flow_receptionist_readiness TO authenticated;
GRANT SELECT ON public.v_account_receptionist_status TO authenticated;
GRANT SELECT ON public.v_client_receptionist_summary TO authenticated;
