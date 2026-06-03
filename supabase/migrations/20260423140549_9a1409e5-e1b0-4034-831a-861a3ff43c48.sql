-- =========================================================================
-- Phase G — Supervisor True Scoping (P1-6a) + admin_settings flag
-- =========================================================================

-- 1) supervisor_tenant_assignments table
CREATE TABLE IF NOT EXISTS public.supervisor_tenant_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_kind public.campaign_tenant_kind NOT NULL,
  client_lead_id uuid NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_partner_id uuid NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  wl_client_id uuid NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL DEFAULT auth.uid(),
  -- Exactly one of (client_lead_id, wl_partner_id, wl_client_id) must be set
  CONSTRAINT supervisor_assignment_exactly_one_target CHECK (
    (CASE WHEN client_lead_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN wl_partner_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN wl_client_id IS NOT NULL THEN 1 ELSE 0 END)
    = 1
  ),
  CONSTRAINT supervisor_assignment_kind_matches CHECK (
    (tenant_kind = 'direct_24h' AND client_lead_id IS NOT NULL)
    OR (tenant_kind = 'wl_partner' AND (wl_partner_id IS NOT NULL OR wl_client_id IS NOT NULL))
  )
);

-- Composite uniqueness: one assignment row per supervisor / target tuple
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_assignment_unique_target
  ON public.supervisor_tenant_assignments (
    supervisor_user_id,
    COALESCE(client_lead_id, '00000000-0000-0000-0000-000000000000'),
    COALESCE(wl_partner_id, '00000000-0000-0000-0000-000000000000'),
    COALESCE(wl_client_id,  '00000000-0000-0000-0000-000000000000')
  );

CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor
  ON public.supervisor_tenant_assignments (supervisor_user_id);

ALTER TABLE public.supervisor_tenant_assignments ENABLE ROW LEVEL SECURITY;

-- Admins manage all
CREATE POLICY supervisor_assignments_admin_all
  ON public.supervisor_tenant_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Supervisors can read their own assignments (so the UI can self-introspect)
CREATE POLICY supervisor_assignments_self_select
  ON public.supervisor_tenant_assignments FOR SELECT TO authenticated
  USING (supervisor_user_id = auth.uid());

-- 2) Seed the feature flag (default = enforced, since this is the whole point)
INSERT INTO public.admin_settings (key, value)
VALUES ('supervisor_scope_enforced', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3) Helper that reads the flag (treats missing/false as not-enforced)
CREATE OR REPLACE FUNCTION public.is_supervisor_scope_enforced()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value)::text::boolean
       FROM public.admin_settings
       WHERE key = 'supervisor_scope_enforced'
       LIMIT 1),
    false
  );
$$;

-- 4) Helper: does the supervisor have an assignment that covers this row?
CREATE OR REPLACE FUNCTION public.supervisor_can_access_tenant(
  _user uuid,
  _tenant_kind text,
  _wl_partner_id uuid,
  _client_lead_id uuid,
  _wl_client_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supervisor_tenant_assignments a
    WHERE a.supervisor_user_id = _user
      AND (
        -- direct client match
        (_tenant_kind = 'direct_24h'
         AND _client_lead_id IS NOT NULL
         AND a.client_lead_id = _client_lead_id)
        OR
        -- WL end-client direct match (most specific WL grant)
        (_tenant_kind = 'wl_partner'
         AND _wl_client_id IS NOT NULL
         AND a.wl_client_id = _wl_client_id)
        OR
        -- WL partner-wide match (covers all clients under the partner)
        (_tenant_kind = 'wl_partner'
         AND _wl_partner_id IS NOT NULL
         AND a.wl_partner_id = _wl_partner_id
         AND a.wl_client_id IS NULL)
      )
  );
$$;

-- 5) Replace is_tenant_member to honor supervisor scope when enforced
CREATE OR REPLACE FUNCTION public.is_tenant_member(
  _user uuid,
  _tenant_kind text,
  _wl_partner_id uuid,
  _client_lead_id uuid,
  _wl_client_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user IS NULL THEN RETURN false; END IF;

  -- Admin: unconditional
  IF public.has_role(_user, 'admin'::app_role) THEN RETURN true; END IF;

  -- Supervisor: gated by assignments table when the flag is on,
  -- else admin-equivalent (legacy behavior).
  IF public.has_role(_user, 'supervisor'::app_role) THEN
    IF public.is_supervisor_scope_enforced() THEN
      RETURN public.supervisor_can_access_tenant(
        _user, _tenant_kind, _wl_partner_id, _client_lead_id, _wl_client_id
      );
    ELSE
      RETURN true;
    END IF;
  END IF;

  -- WL partner ownership
  IF _tenant_kind = 'wl_partner' AND _wl_partner_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.white_label_partners wp
               WHERE wp.id = _wl_partner_id AND wp.user_id = _user) THEN
      RETURN true;
    END IF;
  END IF;

  -- WL end-client ownership
  IF _wl_client_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.white_label_clients wc
               WHERE wc.id = _wl_client_id AND wc.user_id = _user) THEN
      RETURN true;
    END IF;
  END IF;

  -- Direct client (lead) ownership
  IF _tenant_kind = 'direct_24h' AND _client_lead_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.leads l
               WHERE l.id = _client_lead_id AND l.user_id = _user) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;