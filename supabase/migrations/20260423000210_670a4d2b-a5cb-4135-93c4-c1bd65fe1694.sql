-- ============================================================================
-- Campaigns Refactor — Pass 1 (Structural)
-- Repurpose client_departments as call flows; introduce client_locations;
-- expand knowledge scopes to include 'location' and 'call_flow'.
-- All tables empty: zero data migration needed.
-- ============================================================================

-- 1. New table: client_locations
CREATE TABLE public.client_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_client_locations_lead ON public.client_locations(client_lead_id);
CREATE INDEX idx_client_locations_wl_client ON public.client_locations(wl_client_id);
CREATE INDEX idx_client_locations_partner ON public.client_locations(wl_partner_id);

-- Identity check: exactly one of (client_lead_id, wl_client_id) and partner consistent
ALTER TABLE public.client_locations ADD CONSTRAINT client_locations_identity_chk
  CHECK (
    (tenant_kind = 'direct_24h' AND client_lead_id IS NOT NULL AND wl_client_id IS NULL AND wl_partner_id IS NULL)
    OR
    (tenant_kind = 'wl_partner' AND wl_client_id IS NOT NULL AND client_lead_id IS NULL AND wl_partner_id IS NOT NULL)
  );

ALTER TABLE public.client_locations ENABLE ROW LEVEL SECURITY;

-- RLS: tenant members can read/write their own location rows; admins all
CREATE POLICY "client_locations_admin_all" ON public.client_locations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "client_locations_tenant_select" ON public.client_locations
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_kind = 'direct_24h' AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = client_lead_id AND l.user_id = auth.uid()))
    OR (tenant_kind = 'wl_partner' AND (
      EXISTS (SELECT 1 FROM public.white_label_clients c WHERE c.id = wl_client_id AND c.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.white_label_partners p WHERE p.id = wl_partner_id AND p.user_id = auth.uid())
    ))
  );

-- Identity immutable trigger
CREATE OR REPLACE FUNCTION public.enforce_client_locations_identity_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tenant_kind IS DISTINCT FROM OLD.tenant_kind
     OR NEW.wl_partner_id IS DISTINCT FROM OLD.wl_partner_id
     OR NEW.client_lead_id IS DISTINCT FROM OLD.client_lead_id
     OR NEW.wl_client_id IS DISTINCT FROM OLD.wl_client_id THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'client_locations identity columns are immutable for non-admin updates';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_client_locations_immutable
  BEFORE UPDATE ON public.client_locations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_client_locations_identity_immutable();

CREATE TRIGGER trg_client_locations_touch
  BEFORE UPDATE ON public.client_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Repurpose client_departments as call flows
ALTER TABLE public.client_departments
  ADD COLUMN client_location_id uuid REFERENCES public.client_locations(id) ON DELETE SET NULL,
  ADD COLUMN owner_kind text NOT NULL DEFAULT 'client' CHECK (owner_kind IN ('client','location')),
  ADD COLUMN routing_entry_type text NOT NULL DEFAULT 'direct' CHECK (routing_entry_type IN ('direct','ivr','both','logical')),
  ADD COLUMN display_name text;

ALTER TABLE public.client_departments
  ADD CONSTRAINT client_departments_owner_location_chk
  CHECK ((owner_kind = 'location') = (client_location_id IS NOT NULL));

CREATE INDEX idx_client_departments_location ON public.client_departments(client_location_id);

-- 3. Expand knowledge scopes: add client_location_id, allow 'location' / 'call_flow' scopes
-- Strategy: keep scope as text (already text), no enum change needed. Add column.

ALTER TABLE public.campaign_faq_entries
  ADD COLUMN client_location_id uuid REFERENCES public.client_locations(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_policy_blocks
  ADD COLUMN client_location_id uuid REFERENCES public.client_locations(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_fields
  ADD COLUMN client_location_id uuid REFERENCES public.client_locations(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_field_groups
  ADD COLUMN client_location_id uuid REFERENCES public.client_locations(id) ON DELETE CASCADE;

CREATE INDEX idx_campaign_faqs_location ON public.campaign_faq_entries(client_location_id);
CREATE INDEX idx_campaign_policies_location ON public.campaign_policy_blocks(client_location_id);
CREATE INDEX idx_campaign_fields_location ON public.campaign_fields(client_location_id);
CREATE INDEX idx_campaign_field_groups_location ON public.campaign_field_groups(client_location_id);

-- 4. Update resolver views to include 'location' and 'call_flow' tiers
-- call_flow = highest precedence (5), then location (4.5 -> use 4), then department (4), client (3), tenant (2), global (1).
-- Since 'department' is being supplanted by 'call_flow' (same column), we treat them as equivalent at rank 4.

DROP VIEW IF EXISTS public.v_candidate_faqs CASCADE;
CREATE VIEW public.v_candidate_faqs AS
SELECT
  f.id, f.tenant_kind, f.wl_partner_id, f.client_lead_id, f.wl_client_id,
  f.scope, f.client_department_id, f.client_location_id,
  f.question, f.answer_md, f.tags, f.status, f.version,
  f.effective_from, f.effective_to, f.published_at, f.published_by,
  f.created_at, f.updated_at, f.created_by,
  CASE f.scope
    WHEN 'call_flow'  THEN 5
    WHEN 'department' THEN 5
    WHEN 'location'   THEN 4
    WHEN 'client'     THEN 3
    WHEN 'tenant'     THEN 2
    ELSE 1
  END AS precedence_rank
FROM public.campaign_faq_entries f
WHERE f.status = 'approved';

DROP VIEW IF EXISTS public.v_candidate_policies CASCADE;
CREATE VIEW public.v_candidate_policies AS
SELECT
  p.id, p.tenant_kind, p.wl_partner_id, p.client_lead_id, p.wl_client_id,
  p.scope, p.client_department_id, p.client_location_id,
  p.policy_kind, p.title, p.body_md, p.tags, p.status, p.version,
  p.effective_from, p.effective_to, p.published_at, p.published_by,
  p.created_at, p.updated_at, p.created_by,
  CASE p.scope
    WHEN 'call_flow'  THEN 5
    WHEN 'department' THEN 5
    WHEN 'location'   THEN 4
    WHEN 'client'     THEN 3
    WHEN 'tenant'     THEN 2
    ELSE 1
  END AS precedence_rank
FROM public.campaign_policy_blocks p
WHERE p.status = 'approved';

-- 5. Update resolver functions to accept location and call_flow filters
DROP FUNCTION IF EXISTS public.resolve_effective_faqs(public.campaign_tenant_kind, uuid, uuid, uuid, uuid);
CREATE OR REPLACE FUNCTION public.resolve_effective_faqs(
  p_tenant_kind public.campaign_tenant_kind,
  p_wl_partner_id uuid,
  p_wl_client_id uuid,
  p_client_lead_id uuid,
  p_department_id uuid,
  p_location_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, tenant_kind public.campaign_tenant_kind, wl_partner_id uuid, client_lead_id uuid, wl_client_id uuid,
  scope text, client_department_id uuid, client_location_id uuid,
  question text, answer_md text, tags text[], status text, version int,
  effective_from timestamptz, effective_to timestamptz,
  published_at timestamptz, published_by uuid,
  created_at timestamptz, updated_at timestamptz, created_by uuid,
  precedence_rank int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH candidates AS (
    SELECT * FROM public.v_candidate_faqs c
    WHERE
      (c.effective_from IS NULL OR c.effective_from <= now())
      AND (c.effective_to IS NULL OR c.effective_to > now())
      AND (
        c.scope = 'global'
        OR (c.scope = 'tenant' AND c.tenant_kind = p_tenant_kind AND (
          (p_tenant_kind = 'direct_24h' AND c.wl_partner_id IS NULL)
          OR (p_tenant_kind = 'wl_partner' AND c.wl_partner_id = p_wl_partner_id)
        ))
        OR (c.scope = 'client' AND (
          (p_tenant_kind = 'direct_24h' AND c.client_lead_id = p_client_lead_id)
          OR (p_tenant_kind = 'wl_partner' AND c.wl_client_id = p_wl_client_id)
        ))
        OR (c.scope = 'location' AND c.client_location_id = p_location_id)
        OR (c.scope IN ('department','call_flow') AND c.client_department_id = p_department_id)
      )
  ),
  ranked AS (
    SELECT c.*, ROW_NUMBER() OVER (
      PARTITION BY c.question
      ORDER BY c.precedence_rank DESC, c.version DESC, c.updated_at DESC
    ) AS rn FROM candidates c
  )
  SELECT id, tenant_kind, wl_partner_id, client_lead_id, wl_client_id, scope,
         client_department_id, client_location_id,
         question, answer_md, tags, status, version,
         effective_from, effective_to, published_at, published_by,
         created_at, updated_at, created_by, precedence_rank
  FROM ranked WHERE rn = 1;
$$;

DROP FUNCTION IF EXISTS public.resolve_effective_policies(public.campaign_tenant_kind, uuid, uuid, uuid, uuid);
CREATE OR REPLACE FUNCTION public.resolve_effective_policies(
  p_tenant_kind public.campaign_tenant_kind,
  p_wl_partner_id uuid,
  p_wl_client_id uuid,
  p_client_lead_id uuid,
  p_department_id uuid,
  p_location_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, tenant_kind public.campaign_tenant_kind, wl_partner_id uuid, client_lead_id uuid, wl_client_id uuid,
  scope text, client_department_id uuid, client_location_id uuid,
  policy_kind text, title text, body_md text, tags text[], status text, version int,
  effective_from timestamptz, effective_to timestamptz,
  published_at timestamptz, published_by uuid,
  created_at timestamptz, updated_at timestamptz, created_by uuid,
  precedence_rank int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH candidates AS (
    SELECT * FROM public.v_candidate_policies c
    WHERE
      (c.effective_from IS NULL OR c.effective_from <= now())
      AND (c.effective_to IS NULL OR c.effective_to > now())
      AND (
        c.scope = 'global'
        OR (c.scope = 'tenant' AND c.tenant_kind = p_tenant_kind AND (
          (p_tenant_kind = 'direct_24h' AND c.wl_partner_id IS NULL)
          OR (p_tenant_kind = 'wl_partner' AND c.wl_partner_id = p_wl_partner_id)
        ))
        OR (c.scope = 'client' AND (
          (p_tenant_kind = 'direct_24h' AND c.client_lead_id = p_client_lead_id)
          OR (p_tenant_kind = 'wl_partner' AND c.wl_client_id = p_wl_client_id)
        ))
        OR (c.scope = 'location' AND c.client_location_id = p_location_id)
        OR (c.scope IN ('department','call_flow') AND c.client_department_id = p_department_id)
      )
  ),
  ranked AS (
    SELECT c.*, ROW_NUMBER() OVER (
      PARTITION BY c.policy_kind, c.title
      ORDER BY c.precedence_rank DESC, c.version DESC, c.updated_at DESC
    ) AS rn FROM candidates c
  )
  SELECT id, tenant_kind, wl_partner_id, client_lead_id, wl_client_id, scope,
         client_department_id, client_location_id,
         policy_kind, title, body_md, tags, status, version,
         effective_from, effective_to, published_at, published_by,
         created_at, updated_at, created_by, precedence_rank
  FROM ranked WHERE rn = 1;
$$;