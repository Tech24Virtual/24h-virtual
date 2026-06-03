
-- =========================================================================
-- Campaign OS — Phase 2: Knowledge + Field Dictionary + Five9 Mapping
-- =========================================================================

-- ============================ campaign_faq_entries ============================
CREATE TABLE public.campaign_faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  scope text NOT NULL,
  client_department_id uuid REFERENCES public.client_departments(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer_md text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  version int NOT NULL DEFAULT 1,
  effective_from timestamptz,
  effective_to timestamptz,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT campaign_faq_entries_scope_chk CHECK (scope IN ('global','tenant','client','department')),
  CONSTRAINT campaign_faq_entries_status_chk CHECK (status IN ('draft','approved','archived')),
  CONSTRAINT campaign_faq_entries_dept_chk CHECK (scope <> 'department' OR client_department_id IS NOT NULL)
);
-- Global rows are exempt from identity trigger; identity trigger applies only to non-global scopes.
-- We allow global rows (all identity cols NULL).

CREATE OR REPLACE FUNCTION public.enforce_campaign_knowledge_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.scope = 'global' THEN
    -- Global: identity columns must all be NULL
    IF NEW.client_lead_id IS NOT NULL OR NEW.wl_client_id IS NOT NULL OR NEW.wl_partner_id IS NOT NULL THEN
      RAISE EXCEPTION 'global-scope rows must not carry identity columns';
    END IF;
    -- tenant_kind still set (NOT NULL) but ignored; allow either value
    RETURN NEW;
  END IF;
  -- Non-global: delegate to standard identity validator
  PERFORM public.enforce_campaign_tenant_identity_call(NEW);
  RETURN NEW;
END;
$$;

-- Wrapper that mimics enforce_campaign_tenant_identity but accepts a row
-- (we just inline the same logic, since trigger fns don't compose cleanly)
CREATE OR REPLACE FUNCTION public.enforce_campaign_tenant_identity_call(NEW record)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_lead int := 0; v_client int := 0;
BEGIN
  IF NEW.client_lead_id IS NOT NULL THEN v_lead := 1; END IF;
  IF NEW.wl_client_id IS NOT NULL THEN v_client := 1; END IF;
  IF (v_lead + v_client) <> 1 THEN
    RAISE EXCEPTION 'campaign identity error: exactly one of client_lead_id or wl_client_id must be set';
  END IF;
  IF NEW.tenant_kind = 'wl_partner' THEN
    IF NEW.wl_partner_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=wl_partner requires wl_partner_id'; END IF;
    IF NEW.wl_client_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=wl_partner requires wl_client_id'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.white_label_clients WHERE id = NEW.wl_client_id AND partner_id = NEW.wl_partner_id) THEN
      RAISE EXCEPTION 'wl_client does not belong to wl_partner';
    END IF;
  ELSIF NEW.tenant_kind = 'direct_24h' THEN
    IF NEW.wl_partner_id IS NOT NULL THEN RAISE EXCEPTION 'tenant_kind=direct_24h cannot carry wl_partner_id'; END IF;
    IF NEW.client_lead_id IS NULL THEN RAISE EXCEPTION 'tenant_kind=direct_24h requires client_lead_id'; END IF;
  ELSE
    RAISE EXCEPTION 'invalid tenant_kind';
  END IF;
END;
$$;

CREATE TRIGGER trg_campaign_faq_entries_identity BEFORE INSERT OR UPDATE ON public.campaign_faq_entries FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_knowledge_identity();
CREATE TRIGGER trg_campaign_faq_entries_immutable BEFORE UPDATE ON public.campaign_faq_entries FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();
CREATE TRIGGER trg_campaign_faq_entries_touch BEFORE UPDATE ON public.campaign_faq_entries FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.campaign_faq_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_faq_entries_admin_all ON public.campaign_faq_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY campaign_faq_entries_global_select ON public.campaign_faq_entries FOR SELECT TO authenticated USING (scope = 'global' AND status = 'approved');
CREATE POLICY campaign_faq_entries_member_select ON public.campaign_faq_entries FOR SELECT TO authenticated USING (scope <> 'global' AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY campaign_faq_entries_supervisor_update ON public.campaign_faq_entries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role) AND (scope = 'global' OR public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id))) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role) AND (scope = 'global' OR public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================ campaign_policy_blocks ============================
CREATE TABLE public.campaign_policy_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  scope text NOT NULL,
  client_department_id uuid REFERENCES public.client_departments(id) ON DELETE CASCADE,
  policy_kind text NOT NULL,
  title text NOT NULL,
  body_md text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  version int NOT NULL DEFAULT 1,
  effective_from timestamptz, effective_to timestamptz,
  published_at timestamptz, published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  CONSTRAINT campaign_policy_blocks_scope_chk CHECK (scope IN ('global','tenant','client','department')),
  CONSTRAINT campaign_policy_blocks_status_chk CHECK (status IN ('draft','approved','archived')),
  CONSTRAINT campaign_policy_blocks_kind_chk CHECK (policy_kind IN ('service_rule','restricted_disclosure','escalation_rule','general_policy')),
  CONSTRAINT campaign_policy_blocks_dept_chk CHECK (scope <> 'department' OR client_department_id IS NOT NULL)
);
CREATE TRIGGER trg_campaign_policy_blocks_identity BEFORE INSERT OR UPDATE ON public.campaign_policy_blocks FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_knowledge_identity();
CREATE TRIGGER trg_campaign_policy_blocks_immutable BEFORE UPDATE ON public.campaign_policy_blocks FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();
CREATE TRIGGER trg_campaign_policy_blocks_touch BEFORE UPDATE ON public.campaign_policy_blocks FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.campaign_policy_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_policy_blocks_admin_all ON public.campaign_policy_blocks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY campaign_policy_blocks_global_select ON public.campaign_policy_blocks FOR SELECT TO authenticated USING (scope = 'global' AND status = 'approved');
CREATE POLICY campaign_policy_blocks_member_select ON public.campaign_policy_blocks FOR SELECT TO authenticated USING (scope <> 'global' AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY campaign_policy_blocks_supervisor_update ON public.campaign_policy_blocks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role) AND (scope = 'global' OR public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id))) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role) AND (scope = 'global' OR public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================ campaign_knowledge_versions ============================
CREATE TABLE public.campaign_knowledge_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  version int NOT NULL,
  snapshot jsonb NOT NULL,
  tenant_kind public.campaign_tenant_kind,
  wl_partner_id uuid, client_lead_id uuid, wl_client_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT campaign_knowledge_versions_entity_chk CHECK (entity IN ('faq','policy'))
);
CREATE INDEX campaign_knowledge_versions_entity_idx ON public.campaign_knowledge_versions(entity, entity_id, version DESC);

ALTER TABLE public.campaign_knowledge_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_knowledge_versions_admin_all ON public.campaign_knowledge_versions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY campaign_knowledge_versions_member_select ON public.campaign_knowledge_versions FOR SELECT TO authenticated USING (
  tenant_kind IS NULL OR public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id)
);

-- ============================ Resolver views ============================
CREATE OR REPLACE VIEW public.v_resolved_faqs WITH (security_invoker = true) AS
SELECT f.*, 
  CASE f.scope WHEN 'department' THEN 4 WHEN 'client' THEN 3 WHEN 'tenant' THEN 2 ELSE 1 END AS precedence_rank
FROM public.campaign_faq_entries f
WHERE f.status = 'approved';

CREATE OR REPLACE VIEW public.v_resolved_policies WITH (security_invoker = true) AS
SELECT p.*,
  CASE p.scope WHEN 'department' THEN 4 WHEN 'client' THEN 3 WHEN 'tenant' THEN 2 ELSE 1 END AS precedence_rank
FROM public.campaign_policy_blocks p
WHERE p.status = 'approved';

-- ============================ campaign_field_groups ============================
CREATE TABLE public.campaign_field_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  scope text NOT NULL,
  client_department_id uuid REFERENCES public.client_departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  CONSTRAINT campaign_field_groups_scope_chk CHECK (scope IN ('global','tenant','client','department'))
);
CREATE TRIGGER trg_campaign_field_groups_identity BEFORE INSERT OR UPDATE ON public.campaign_field_groups FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_knowledge_identity();
CREATE TRIGGER trg_campaign_field_groups_immutable BEFORE UPDATE ON public.campaign_field_groups FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();
CREATE TRIGGER trg_campaign_field_groups_touch BEFORE UPDATE ON public.campaign_field_groups FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.campaign_field_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_field_groups_admin_all ON public.campaign_field_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY campaign_field_groups_global_select ON public.campaign_field_groups FOR SELECT TO authenticated USING (scope = 'global');
CREATE POLICY campaign_field_groups_member_select ON public.campaign_field_groups FOR SELECT TO authenticated USING (scope <> 'global' AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY campaign_field_groups_supervisor_update ON public.campaign_field_groups FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role) AND (scope = 'global' OR public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id))) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role) AND (scope = 'global' OR public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================ campaign_fields ============================
CREATE TABLE public.campaign_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  scope text NOT NULL,
  client_department_id uuid REFERENCES public.client_departments(id) ON DELETE CASCADE,
  field_group_id uuid REFERENCES public.campaign_field_groups(id) ON DELETE SET NULL,
  field_key text NOT NULL,
  display_label text NOT NULL,
  field_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  is_internal_only boolean NOT NULL DEFAULT false,
  placeholder text, help_text text,
  validation_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  CONSTRAINT campaign_fields_scope_chk CHECK (scope IN ('global','tenant','client','department')),
  CONSTRAINT campaign_fields_type_chk CHECK (field_type IN ('text','long_text','number','boolean','dropdown','multi_select','date','datetime','phone','email','currency','rich_text','hidden')),
  CONSTRAINT campaign_fields_status_chk CHECK (status IN ('draft','active','archived'))
);
CREATE UNIQUE INDEX campaign_fields_global_key_uniq ON public.campaign_fields (lower(field_key)) WHERE scope = 'global';
CREATE UNIQUE INDEX campaign_fields_direct_key_uniq ON public.campaign_fields (client_lead_id, COALESCE(client_department_id::text,''), lower(field_key)) WHERE tenant_kind = 'direct_24h' AND scope <> 'global';
CREATE UNIQUE INDEX campaign_fields_wl_key_uniq ON public.campaign_fields (wl_client_id, COALESCE(client_department_id::text,''), lower(field_key)) WHERE tenant_kind = 'wl_partner' AND scope <> 'global';

CREATE TRIGGER trg_campaign_fields_identity BEFORE INSERT OR UPDATE ON public.campaign_fields FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_knowledge_identity();
CREATE TRIGGER trg_campaign_fields_immutable BEFORE UPDATE ON public.campaign_fields FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();
CREATE TRIGGER trg_campaign_fields_touch BEFORE UPDATE ON public.campaign_fields FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.campaign_fields ENABLE ROW LEVEL SECURITY;
-- Admin/supervisor have raw access. Tenant members only see non-internal fields raw; client/partner UI MUST go through resolve_fields_for_audience.
CREATE POLICY campaign_fields_admin_all ON public.campaign_fields FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY campaign_fields_supervisor_select ON public.campaign_fields FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY campaign_fields_member_select_nonprivate ON public.campaign_fields FOR SELECT TO authenticated USING (
  is_internal_only = false AND (
    scope = 'global' OR public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id)
  )
);
CREATE POLICY campaign_fields_supervisor_update ON public.campaign_fields FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role) AND (scope = 'global' OR public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id))) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role) AND (scope = 'global' OR public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id)));

-- ============================ campaign_field_options ============================
CREATE TABLE public.campaign_field_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.campaign_fields(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_id, value)
);
ALTER TABLE public.campaign_field_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_field_options_admin_all ON public.campaign_field_options FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY campaign_field_options_select ON public.campaign_field_options FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.campaign_fields f WHERE f.id = field_id)
);
CREATE POLICY campaign_field_options_supervisor_update ON public.campaign_field_options FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role));

-- ============================ campaign_field_visibility_rules ============================
CREATE TABLE public.campaign_field_visibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.campaign_fields(id) ON DELETE CASCADE,
  audience text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_field_visibility_audience_chk CHECK (audience IN ('agent','supervisor','client','wl_partner','wl_end_client')),
  UNIQUE (field_id, audience)
);
ALTER TABLE public.campaign_field_visibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_field_visibility_rules_admin_all ON public.campaign_field_visibility_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY campaign_field_visibility_rules_supervisor ON public.campaign_field_visibility_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY campaign_field_visibility_rules_select ON public.campaign_field_visibility_rules FOR SELECT TO authenticated USING (true);

-- ============================ campaign_field_display_labels ============================
CREATE TABLE public.campaign_field_display_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.campaign_fields(id) ON DELETE CASCADE,
  audience text NOT NULL,
  label_override text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_field_display_labels_audience_chk CHECK (audience IN ('agent','supervisor','client','wl_partner','wl_end_client')),
  UNIQUE (field_id, audience)
);
ALTER TABLE public.campaign_field_display_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_field_display_labels_admin_all ON public.campaign_field_display_labels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY campaign_field_display_labels_supervisor ON public.campaign_field_display_labels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY campaign_field_display_labels_select ON public.campaign_field_display_labels FOR SELECT TO authenticated USING (true);

-- ============================ resolve_fields_for_audience (projection) ============================
-- SECURITY DEFINER projection: strips internal-only fields and respects visibility rules.
-- All client/partner-facing UIs MUST read through this function. Internal data is never exposed via this path.
CREATE OR REPLACE FUNCTION public.resolve_fields_for_audience(
  _client_department_id uuid,
  _audience text
) RETURNS TABLE (
  field_id uuid,
  field_group_id uuid,
  field_key text,
  display_label text,
  field_type text,
  is_required boolean,
  placeholder text,
  help_text text,
  validation_json jsonb,
  sort_order int,
  scope text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_internal_audience boolean := _audience IN ('agent','supervisor');
  v_dept record;
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  IF _audience NOT IN ('agent','supervisor','client','wl_partner','wl_end_client') THEN
    RAISE EXCEPTION 'invalid audience %', _audience;
  END IF;

  -- Resolve department's tenant identity for membership check
  SELECT * INTO v_dept FROM public.client_departments WHERE id = _client_department_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Caller must be a member of that tenant
  IF NOT public.is_tenant_member(v_user, v_dept.tenant_kind::text, v_dept.wl_partner_id, v_dept.client_lead_id, v_dept.wl_client_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    f.id AS field_id,
    f.field_group_id,
    f.field_key,
    COALESCE(dl.label_override, f.display_label) AS display_label,
    f.field_type,
    f.is_required,
    f.placeholder,
    f.help_text,
    f.validation_json,
    f.sort_order,
    f.scope
  FROM public.campaign_fields f
  LEFT JOIN public.campaign_field_display_labels dl ON dl.field_id = f.id AND dl.audience = _audience
  LEFT JOIN public.campaign_field_visibility_rules vr ON vr.field_id = f.id AND vr.audience = _audience
  WHERE f.status = 'active'
    AND (v_internal_audience OR f.is_internal_only = false)
    AND COALESCE(vr.visible, true) = true
    AND (
      f.scope = 'global'
      OR (f.scope = 'tenant' AND (
            (v_dept.tenant_kind = 'direct_24h' AND f.client_lead_id = v_dept.client_lead_id)
            OR (v_dept.tenant_kind = 'wl_partner' AND f.wl_partner_id = v_dept.wl_partner_id)
          ))
      OR (f.scope = 'client' AND (
            (v_dept.tenant_kind = 'direct_24h' AND f.client_lead_id = v_dept.client_lead_id)
            OR (v_dept.tenant_kind = 'wl_partner' AND f.wl_client_id = v_dept.wl_client_id)
          ))
      OR (f.scope = 'department' AND f.client_department_id = _client_department_id)
    )
  ORDER BY f.sort_order, f.display_label;
END;
$$;

-- ============================ five9_variable_groups ============================
CREATE TABLE public.five9_variable_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid
);
CREATE TRIGGER trg_five9_variable_groups_identity BEFORE INSERT OR UPDATE ON public.five9_variable_groups FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_tenant_identity();
CREATE TRIGGER trg_five9_variable_groups_immutable BEFORE UPDATE ON public.five9_variable_groups FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();
CREATE TRIGGER trg_five9_variable_groups_touch BEFORE UPDATE ON public.five9_variable_groups FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.five9_variable_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY five9_variable_groups_admin_all ON public.five9_variable_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY five9_variable_groups_member_select ON public.five9_variable_groups FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY five9_variable_groups_supervisor_update ON public.five9_variable_groups FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id)) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));

-- ============================ five9_variable_mappings ============================
CREATE TABLE public.five9_variable_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  client_department_id uuid REFERENCES public.client_departments(id) ON DELETE CASCADE,
  field_id uuid REFERENCES public.campaign_fields(id) ON DELETE SET NULL,
  variable_group_id uuid REFERENCES public.five9_variable_groups(id) ON DELETE SET NULL,
  five9_variable_name text NOT NULL,
  five9_variable_kind text NOT NULL,
  data_type text NOT NULL,
  direction text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  CONSTRAINT five9_variable_mappings_kind_chk CHECK (five9_variable_kind IN ('native','custom','campaign_profile')),
  CONSTRAINT five9_variable_mappings_type_chk CHECK (data_type IN ('text','number','boolean','date','datetime','phone','email'))
);
CREATE UNIQUE INDEX five9_variable_mappings_dept_uniq
  ON public.five9_variable_mappings (COALESCE(client_department_id::text,''), lower(five9_variable_name));

CREATE TRIGGER trg_five9_variable_mappings_identity BEFORE INSERT OR UPDATE ON public.five9_variable_mappings FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_tenant_identity();
CREATE TRIGGER trg_five9_variable_mappings_immutable BEFORE UPDATE ON public.five9_variable_mappings FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_identity_immutable();
CREATE TRIGGER trg_five9_variable_mappings_touch BEFORE UPDATE ON public.five9_variable_mappings FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

ALTER TABLE public.five9_variable_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY five9_variable_mappings_admin_all ON public.five9_variable_mappings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY five9_variable_mappings_member_select ON public.five9_variable_mappings FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
CREATE POLICY five9_variable_mappings_supervisor_update ON public.five9_variable_mappings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id)) WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
