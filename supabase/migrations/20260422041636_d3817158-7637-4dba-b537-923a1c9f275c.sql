
-- =========================================================================
-- Phase 4 Wave 1 — campaigns, campaign_scenarios, campaign_publish_versions
-- Mirrors campaign_faq_entries patterns. Identity-immutable, tenant-scoped.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. campaigns
-- -------------------------------------------------------------------------
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  client_department_id uuid NOT NULL UNIQUE
    REFERENCES public.client_departments(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  published_version_id uuid NULL, -- FK added after campaign_publish_versions exists
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL DEFAULT auth.uid()
);

CREATE INDEX idx_campaigns_status_updated
  ON public.campaigns (status, updated_at DESC);
CREATE INDEX idx_campaigns_tenant
  ON public.campaigns (tenant_kind, wl_partner_id, client_lead_id, wl_client_id);

CREATE TRIGGER trg_campaigns_enforce_identity
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_tenant_identity();

CREATE TRIGGER trg_campaigns_immutable_identity
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();

CREATE TRIGGER trg_campaigns_touch_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_admin_all ON public.campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY campaigns_member_select ON public.campaigns
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));

CREATE POLICY campaigns_supervisor_update ON public.campaigns
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor')
         AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor')
         AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));

-- -------------------------------------------------------------------------
-- 2. campaign_publish_versions  (placeholder storage, no Wave 1 writes)
-- -------------------------------------------------------------------------
CREATE TABLE public.campaign_publish_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_publish_versions_campaign_version
  ON public.campaign_publish_versions (campaign_id, version DESC);

CREATE TRIGGER trg_cpv_enforce_identity
  BEFORE INSERT OR UPDATE ON public.campaign_publish_versions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_tenant_identity();

CREATE TRIGGER trg_cpv_immutable_identity
  BEFORE UPDATE ON public.campaign_publish_versions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();

CREATE TRIGGER trg_cpv_touch_updated_at
  BEFORE UPDATE ON public.campaign_publish_versions
  FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.campaign_publish_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY cpv_admin_all ON public.campaign_publish_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY cpv_member_select ON public.campaign_publish_versions
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));

CREATE POLICY cpv_supervisor_update ON public.campaign_publish_versions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor')
         AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor')
         AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));

-- Now safe to add the FK from campaigns.published_version_id
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_published_version_id_fkey
  FOREIGN KEY (published_version_id)
  REFERENCES public.campaign_publish_versions(id)
  ON DELETE SET NULL;

-- -------------------------------------------------------------------------
-- 3. campaign_scenarios
-- -------------------------------------------------------------------------
CREATE TABLE public.campaign_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  client_department_id uuid NULL, -- trigger-populated from parent campaign
  title text NOT NULL,
  trigger_md text NOT NULL,
  expected_outcome_md text NOT NULL,
  disposition text NULL,
  routing text NULL,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'archived')),
  version int NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL DEFAULT auth.uid()
);

CREATE INDEX idx_campaign_scenarios_campaign_sort
  ON public.campaign_scenarios (campaign_id, sort_order, created_at);
CREATE INDEX idx_campaign_scenarios_dept_status
  ON public.campaign_scenarios (client_department_id, status);

-- Trigger: inherit client_department_id from parent campaign on every write
CREATE OR REPLACE FUNCTION public.inherit_dept_from_campaign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_dept uuid;
BEGIN
  SELECT client_department_id INTO parent_dept
  FROM public.campaigns
  WHERE id = NEW.campaign_id;

  IF parent_dept IS NULL THEN
    RAISE EXCEPTION 'campaign % not found or has no department', NEW.campaign_id;
  END IF;

  NEW.client_department_id := parent_dept;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scenarios_inherit_dept
  BEFORE INSERT OR UPDATE ON public.campaign_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.inherit_dept_from_campaign();

CREATE TRIGGER trg_scenarios_enforce_identity
  BEFORE INSERT OR UPDATE ON public.campaign_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_tenant_identity();

CREATE TRIGGER trg_scenarios_immutable_identity
  BEFORE UPDATE ON public.campaign_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();

CREATE TRIGGER trg_scenarios_touch_updated_at
  BEFORE UPDATE ON public.campaign_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.campaign_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_scenarios_admin_all ON public.campaign_scenarios
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY campaign_scenarios_member_select ON public.campaign_scenarios
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));

CREATE POLICY campaign_scenarios_supervisor_update ON public.campaign_scenarios
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor')
         AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor')
         AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
