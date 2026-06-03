-- Phase 3 Migration 1: Rename candidate views + add true effective resolvers

-- 1. Rename candidate views
ALTER VIEW public.v_resolved_faqs RENAME TO v_candidate_faqs;
ALTER VIEW public.v_resolved_policies RENAME TO v_candidate_policies;

-- 2. Effective FAQ resolver
-- NOTE: precedence_rank in candidate views is inverse (department=4 highest, global=1 lowest).
-- Department > client > tenant > global is enforced by selecting MAX(precedence_rank) per question.
CREATE OR REPLACE FUNCTION public.resolve_effective_faqs(
  p_tenant_kind public.campaign_tenant_kind,
  p_wl_partner_id uuid,
  p_wl_client_id uuid,
  p_client_lead_id uuid,
  p_department_id uuid
)
RETURNS TABLE (
  id uuid,
  tenant_kind public.campaign_tenant_kind,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  scope text,
  client_department_id uuid,
  question text,
  answer_md text,
  tags text[],
  status text,
  version integer,
  effective_from timestamptz,
  effective_to timestamptz,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  precedence_rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT *
    FROM public.v_candidate_faqs c
    WHERE
      (c.effective_from IS NULL OR c.effective_from <= now())
      AND (c.effective_to IS NULL OR c.effective_to > now())
      AND (
        c.scope = 'global'
        OR (
          c.scope = 'tenant'
          AND c.tenant_kind = p_tenant_kind
          AND (
            (p_tenant_kind = 'direct_24h' AND c.wl_partner_id IS NULL)
            OR (p_tenant_kind = 'wl_partner' AND c.wl_partner_id = p_wl_partner_id)
          )
        )
        OR (
          c.scope = 'client'
          AND (
            (p_tenant_kind = 'direct_24h' AND c.client_lead_id = p_client_lead_id)
            OR (p_tenant_kind = 'wl_partner' AND c.wl_client_id = p_wl_client_id)
          )
        )
        OR (
          c.scope = 'department'
          AND c.client_department_id = p_department_id
        )
      )
  ),
  ranked AS (
    SELECT
      c.*,
      ROW_NUMBER() OVER (
        PARTITION BY c.question
        ORDER BY c.precedence_rank DESC, c.version DESC, c.updated_at DESC
      ) AS rn
    FROM candidates c
  )
  SELECT
    id, tenant_kind, wl_partner_id, client_lead_id, wl_client_id, scope,
    client_department_id, question, answer_md, tags, status, version,
    effective_from, effective_to, published_at, published_by,
    created_at, updated_at, created_by, precedence_rank
  FROM ranked
  WHERE rn = 1;
$$;

-- 3. Effective Policy resolver
CREATE OR REPLACE FUNCTION public.resolve_effective_policies(
  p_tenant_kind public.campaign_tenant_kind,
  p_wl_partner_id uuid,
  p_wl_client_id uuid,
  p_client_lead_id uuid,
  p_department_id uuid
)
RETURNS TABLE (
  id uuid,
  tenant_kind public.campaign_tenant_kind,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  scope text,
  client_department_id uuid,
  policy_kind text,
  title text,
  body_md text,
  tags text[],
  status text,
  version integer,
  effective_from timestamptz,
  effective_to timestamptz,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  precedence_rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT *
    FROM public.v_candidate_policies c
    WHERE
      (c.effective_from IS NULL OR c.effective_from <= now())
      AND (c.effective_to IS NULL OR c.effective_to > now())
      AND (
        c.scope = 'global'
        OR (
          c.scope = 'tenant'
          AND c.tenant_kind = p_tenant_kind
          AND (
            (p_tenant_kind = 'direct_24h' AND c.wl_partner_id IS NULL)
            OR (p_tenant_kind = 'wl_partner' AND c.wl_partner_id = p_wl_partner_id)
          )
        )
        OR (
          c.scope = 'client'
          AND (
            (p_tenant_kind = 'direct_24h' AND c.client_lead_id = p_client_lead_id)
            OR (p_tenant_kind = 'wl_partner' AND c.wl_client_id = p_wl_client_id)
          )
        )
        OR (
          c.scope = 'department'
          AND c.client_department_id = p_department_id
        )
      )
  ),
  ranked AS (
    SELECT
      c.*,
      ROW_NUMBER() OVER (
        PARTITION BY c.policy_kind, c.title
        ORDER BY c.precedence_rank DESC, c.version DESC, c.updated_at DESC
      ) AS rn
    FROM candidates c
  )
  SELECT
    id, tenant_kind, wl_partner_id, client_lead_id, wl_client_id, scope,
    client_department_id, policy_kind, title, body_md, tags, status, version,
    effective_from, effective_to, published_at, published_by,
    created_at, updated_at, created_by, precedence_rank
  FROM ranked
  WHERE rn = 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_effective_faqs(public.campaign_tenant_kind, uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_effective_policies(public.campaign_tenant_kind, uuid, uuid, uuid, uuid) TO authenticated;