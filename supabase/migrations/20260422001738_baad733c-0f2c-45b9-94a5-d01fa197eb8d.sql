
-- =========================================================================
-- Campaign OS — Phase 1: Foundations
-- =========================================================================

-- ---------- ENUMS ----------
CREATE TYPE public.campaign_tenant_kind AS ENUM ('direct_24h','wl_partner');

CREATE TYPE public.department_lifecycle AS ENUM (
  'lead','onboarding_started','intake_in_progress','build_packet_ready',
  'script_ready','training_ready','qa_ready','approved_for_go_live',
  'live','change_requested','archived'
);

CREATE TYPE public.department_type AS ENUM (
  'sales','billing','customer_service','new_claim','other_requests',
  'dealership','general_inquiry','custom'
);

CREATE TYPE public.phone_role AS ENUM (
  'main','overflow','after_hours','billing','sales','voicemail','callback','other'
);

-- ---------- HELPER: is_tenant_member ----------
CREATE OR REPLACE FUNCTION public.is_tenant_member(
  _user uuid,
  _tenant_kind text,
  _wl_partner_id uuid,
  _client_lead_id uuid,
  _wl_client_id uuid
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _user IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user, 'admin'::app_role) THEN RETURN true; END IF;
  IF public.has_role(_user, 'supervisor'::app_role) THEN RETURN true; END IF;

  IF _tenant_kind = 'wl_partner' AND _wl_partner_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.white_label_partners wp WHERE wp.id = _wl_partner_id AND wp.user_id = _user) THEN
      RETURN true;
    END IF;
  END IF;

  IF _wl_client_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.white_label_clients wc WHERE wc.id = _wl_client_id AND wc.user_id = _user) THEN
      RETURN true;
    END IF;
  END IF;

  IF _tenant_kind = 'direct_24h' AND _client_lead_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.leads l WHERE l.id = _client_lead_id AND l.user_id = _user) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- ---------- HELPER: enforce_campaign_tenant_identity ----------
CREATE OR REPLACE FUNCTION public.enforce_campaign_tenant_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_lead_count int := 0; v_client_count int := 0;
BEGIN
  IF NEW.client_lead_id IS NOT NULL THEN v_lead_count := 1; END IF;
  IF NEW.wl_client_id IS NOT NULL THEN v_client_count := 1; END IF;

  IF (v_lead_count + v_client_count) <> 1 THEN
    RAISE EXCEPTION 'campaign identity error: exactly one of client_lead_id or wl_client_id must be set';
  END IF;

  IF NEW.tenant_kind = 'wl_partner' THEN
    IF NEW.wl_partner_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=wl_partner requires wl_partner_id'; END IF;
    IF NEW.wl_client_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=wl_partner requires wl_client_id'; END IF;
  ELSIF NEW.tenant_kind = 'direct_24h' THEN
    IF NEW.wl_partner_id IS NOT NULL THEN RAISE EXCEPTION 'tenant_kind=direct_24h cannot carry wl_partner_id'; END IF;
    IF NEW.client_lead_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=direct_24h requires client_lead_id'; END IF;
  ELSE
    RAISE EXCEPTION 'invalid tenant_kind %', NEW.tenant_kind;
  END IF;

  IF NEW.tenant_kind = 'wl_partner' AND NEW.wl_partner_id IS NOT NULL AND NEW.wl_client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.white_label_clients WHERE id = NEW.wl_client_id AND partner_id = NEW.wl_partner_id) THEN
      RAISE EXCEPTION 'wl_client_id % does not belong to wl_partner_id %', NEW.wl_client_id, NEW.wl_partner_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------- HELPER: enforce_campaign_identity_immutable (UPDATE only) ----------
CREATE OR REPLACE FUNCTION public.enforce_campaign_identity_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_kind IS DISTINCT FROM OLD.tenant_kind
     OR NEW.wl_partner_id IS DISTINCT FROM OLD.wl_partner_id
     OR NEW.client_lead_id IS DISTINCT FROM OLD.client_lead_id
     OR NEW.wl_client_id IS DISTINCT FROM OLD.wl_client_id THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'campaign identity columns are immutable for non-admin updates';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------- HELPER: touch_updated_at ----------
CREATE OR REPLACE FUNCTION public.campaign_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

-- ============================ tenant_brand_profiles ============================
CREATE TABLE public.tenant_brand_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  brand_label text, logo_url text,
  primary_color text, secondary_color text, accent_color text,
  sender_name text, sender_email text,
  support_email text, support_phone text,
  footer_html text, social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE UNIQUE INDEX tenant_brand_profiles_direct_uniq ON public.tenant_brand_profiles (client_lead_id) WHERE tenant_kind = 'direct_24h';
CREATE UNIQUE INDEX tenant_brand_profiles_wl_uniq ON public.tenant_brand_profiles (wl_partner_id, wl_client_id) WHERE tenant_kind = 'wl_partner';

CREATE TRIGGER trg_tenant_brand_profiles_identity BEFORE INSERT OR UPDATE ON public.tenant_brand_profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_tenant_identity();
CREATE TRIGGER trg_tenant_brand_profiles_immutable BEFORE UPDATE ON public.tenant_brand_profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();
CREATE TRIGGER trg_tenant_brand_profiles_touch BEFORE UPDATE ON public.tenant_brand_profiles FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.tenant_brand_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_brand_profiles_admin_all ON public.tenant_brand_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY tenant_brand_profiles_member_select ON public.tenant_brand_profiles FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY tenant_brand_profiles_supervisor_update ON public.tenant_brand_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role));

-- ============================ client_contacts ============================
CREATE TABLE public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  name text NOT NULL, email text, phone text,
  role text NOT NULL DEFAULT 'primary',
  is_primary boolean NOT NULL DEFAULT false, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  CONSTRAINT client_contacts_role_chk CHECK (role IN ('primary','billing','escalation','tech','other'))
);
CREATE UNIQUE INDEX client_contacts_direct_email_uniq ON public.client_contacts (client_lead_id, lower(email)) WHERE tenant_kind = 'direct_24h' AND email IS NOT NULL;
CREATE UNIQUE INDEX client_contacts_wl_email_uniq ON public.client_contacts (wl_client_id, lower(email)) WHERE tenant_kind = 'wl_partner' AND email IS NOT NULL;

CREATE TRIGGER trg_client_contacts_identity BEFORE INSERT OR UPDATE ON public.client_contacts FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_tenant_identity();
CREATE TRIGGER trg_client_contacts_immutable BEFORE UPDATE ON public.client_contacts FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();
CREATE TRIGGER trg_client_contacts_touch BEFORE UPDATE ON public.client_contacts FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_contacts_admin_all ON public.client_contacts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY client_contacts_member_select ON public.client_contacts FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY client_contacts_supervisor_update ON public.client_contacts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role));

-- ============================ client_departments ============================
CREATE TABLE public.client_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  department_name text NOT NULL,
  department_type public.department_type NOT NULL DEFAULT 'custom',
  service_type text,
  lifecycle public.department_lifecycle NOT NULL DEFAULT 'lead',
  go_live_status text,
  onboarding_owner uuid, supervisor_owner uuid,
  primary_contact_id uuid REFERENCES public.client_contacts(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid
);
CREATE UNIQUE INDEX client_departments_direct_name_uniq ON public.client_departments (client_lead_id, lower(department_name)) WHERE tenant_kind = 'direct_24h';
CREATE UNIQUE INDEX client_departments_wl_name_uniq ON public.client_departments (wl_client_id, lower(department_name)) WHERE tenant_kind = 'wl_partner';

CREATE TRIGGER trg_client_departments_identity BEFORE INSERT OR UPDATE ON public.client_departments FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_tenant_identity();
CREATE TRIGGER trg_client_departments_immutable BEFORE UPDATE ON public.client_departments FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();
CREATE TRIGGER trg_client_departments_touch BEFORE UPDATE ON public.client_departments FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.client_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_departments_admin_all ON public.client_departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY client_departments_member_select ON public.client_departments FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY client_departments_supervisor_update ON public.client_departments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role));

-- ============================ department_numbers ============================
CREATE TABLE public.department_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_department_id uuid NOT NULL REFERENCES public.client_departments(id) ON DELETE CASCADE,
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  dnis text, forwarding_number text, ani_display text, transfer_display text,
  voicemail_enabled boolean NOT NULL DEFAULT false,
  callback_enabled boolean NOT NULL DEFAULT false,
  phone_role public.phone_role NOT NULL DEFAULT 'main',
  active boolean NOT NULL DEFAULT true, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid
);
CREATE UNIQUE INDEX department_numbers_dnis_active_uniq ON public.department_numbers (dnis) WHERE active = true AND dnis IS NOT NULL;

CREATE TRIGGER trg_department_numbers_identity BEFORE INSERT OR UPDATE ON public.department_numbers FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_tenant_identity();
CREATE TRIGGER trg_department_numbers_immutable BEFORE UPDATE ON public.department_numbers FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();
CREATE TRIGGER trg_department_numbers_touch BEFORE UPDATE ON public.department_numbers FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.department_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY department_numbers_admin_all ON public.department_numbers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY department_numbers_member_select ON public.department_numbers FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY department_numbers_supervisor_update ON public.department_numbers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role));

-- ============================ campaign_audit_log ============================
CREATE TABLE public.campaign_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid, client_lead_id uuid, wl_client_id uuid,
  entity text NOT NULL, entity_id uuid,
  action text NOT NULL, actor_id uuid,
  before jsonb, after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaign_audit_log_entity_idx ON public.campaign_audit_log (entity, entity_id, created_at DESC);
CREATE INDEX campaign_audit_log_tenant_idx ON public.campaign_audit_log (tenant_kind, wl_partner_id, client_lead_id, wl_client_id, created_at DESC);

ALTER TABLE public.campaign_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_audit_log_admin_all ON public.campaign_audit_log FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY campaign_audit_log_member_select ON public.campaign_audit_log FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));

-- ============================ v_tenant_brand ============================
-- Resolves brand precedence: explicit override > WL branding > 24H default.
CREATE OR REPLACE VIEW public.v_tenant_brand AS
WITH overrides AS (
  SELECT tbp.tenant_kind, tbp.wl_partner_id, tbp.client_lead_id, tbp.wl_client_id,
    tbp.brand_label, tbp.logo_url, tbp.primary_color, tbp.secondary_color, tbp.accent_color,
    tbp.sender_name, tbp.sender_email, tbp.support_email, tbp.support_phone,
    tbp.footer_html, tbp.social_links, 'override'::text AS source
  FROM public.tenant_brand_profiles tbp
),
wl_brand AS (
  SELECT 'wl_partner'::public.campaign_tenant_kind AS tenant_kind,
    wlb.partner_id AS wl_partner_id, NULL::uuid AS client_lead_id, NULL::uuid AS wl_client_id,
    wlb.company_name AS brand_label, wlb.logo_url,
    wlb.primary_color, wlb.secondary_color, wlb.accent_color,
    COALESCE(wlb.email_from_name, wlb.company_name) AS sender_name,
    COALESCE(wlb.email_from_address, wlb.support_email) AS sender_email,
    wlb.support_email, wlb.support_phone,
    wlb.email_footer AS footer_html, '{}'::jsonb AS social_links,
    'wl_branding'::text AS source
  FROM public.white_label_branding wlb
)
SELECT * FROM overrides
UNION ALL
SELECT * FROM wl_brand
WHERE NOT EXISTS (
  SELECT 1 FROM overrides o
  WHERE o.tenant_kind = 'wl_partner'
    AND o.wl_partner_id = wl_brand.wl_partner_id
    AND o.wl_client_id IS NULL
);
