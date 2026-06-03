
-- ========================================================================
-- Phase 2B - Slice 1: wl_partner_members + helpers + backfill
-- ========================================================================

CREATE TABLE public.wl_partner_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('owner','manager','agent')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','removed')),
  invited_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at    timestamptz NOT NULL DEFAULT now(),
  activated_at  timestamptz,
  removed_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, user_id)
);

CREATE INDEX wl_partner_members_partner_status_role_idx
  ON public.wl_partner_members (partner_id, status, role);
CREATE INDEX wl_partner_members_user_status_idx
  ON public.wl_partner_members (user_id, status);

-- updated_at trigger (reuse existing function)
CREATE TRIGGER wl_partner_members_set_updated_at
BEFORE UPDATE ON public.wl_partner_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================================
-- ENABLE + FORCE RLS
-- ========================================================================
ALTER TABLE public.wl_partner_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wl_partner_members FORCE ROW LEVEL SECURITY;

-- ========================================================================
-- Helper functions (security definer, narrow, no recursion)
-- ========================================================================

-- Active membership check. Defaults to active-only by design.
CREATE OR REPLACE FUNCTION public.wl_is_partner_member(_partner_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wl_partner_members m
    WHERE m.partner_id = _partner_id
      AND m.user_id    = _user_id
      AND m.status     = 'active'
  );
$$;

-- Returns role for an active member, or NULL.
CREATE OR REPLACE FUNCTION public.wl_partner_member_role(_partner_id uuid, _user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.role
  FROM public.wl_partner_members m
  WHERE m.partner_id = _partner_id
    AND m.user_id    = _user_id
    AND m.status     = 'active'
  LIMIT 1;
$$;

-- Owner or manager (active) may manage the team.
CREATE OR REPLACE FUNCTION public.wl_can_manage_partner_team(_partner_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wl_partner_members m
    WHERE m.partner_id = _partner_id
      AND m.user_id    = _user_id
      AND m.status     = 'active'
      AND m.role IN ('owner','manager')
  );
$$;

-- Owner or manager (active) may assign feedback within partner.
CREATE OR REPLACE FUNCTION public.wl_can_assign_in_partner(_partner_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wl_partner_members m
    WHERE m.partner_id = _partner_id
      AND m.user_id    = _user_id
      AND m.status     = 'active'
      AND m.role IN ('owner','manager')
  );
$$;

-- Strict owner check: ONLY active owners may mutate owner-role rows.
-- Used by future dispatcher to enforce "managers must not touch owner memberships".
CREATE OR REPLACE FUNCTION public.wl_is_partner_owner(_partner_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wl_partner_members m
    WHERE m.partner_id = _partner_id
      AND m.user_id    = _user_id
      AND m.status     = 'active'
      AND m.role       = 'owner'
  );
$$;

-- Lock down execution: only authenticated callers (RLS still applies via
-- the underlying SELECTs running as definer). service_role retains access.
REVOKE ALL ON FUNCTION public.wl_is_partner_member(uuid, uuid)        FROM public;
REVOKE ALL ON FUNCTION public.wl_partner_member_role(uuid, uuid)      FROM public;
REVOKE ALL ON FUNCTION public.wl_can_manage_partner_team(uuid, uuid)  FROM public;
REVOKE ALL ON FUNCTION public.wl_can_assign_in_partner(uuid, uuid)    FROM public;
REVOKE ALL ON FUNCTION public.wl_is_partner_owner(uuid, uuid)         FROM public;
GRANT EXECUTE ON FUNCTION public.wl_is_partner_member(uuid, uuid)        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wl_partner_member_role(uuid, uuid)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wl_can_manage_partner_team(uuid, uuid)  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wl_can_assign_in_partner(uuid, uuid)    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wl_is_partner_owner(uuid, uuid)         TO authenticated, service_role;

-- ========================================================================
-- RLS POLICIES (read-only for clients; mutations via edge fn / service role)
-- ========================================================================

-- Members of the partner (any role, any status) can read the full team list.
-- Includes suspended/removed for audit visibility; UI filters to active for
-- operational surfaces. End-clients and admins are NOT members and see nothing.
CREATE POLICY "wl_pm_select_team"
ON public.wl_partner_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.wl_partner_members self
    WHERE self.partner_id = wl_partner_members.partner_id
      AND self.user_id    = auth.uid()
      AND self.status     = 'active'
  )
);

-- A user may always read their own membership row(s).
CREATE POLICY "wl_pm_select_self"
ON public.wl_partner_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- No INSERT / UPDATE / DELETE policies => all mutations go through service-role
-- edge function in Slice 2B-2. FORCE RLS guarantees this even for table owner.

-- ========================================================================
-- BACKFILL: one active 'owner' row per existing partner with a linked user
-- ========================================================================
INSERT INTO public.wl_partner_members (partner_id, user_id, role, status, activated_at)
SELECT p.id, p.user_id, 'owner', 'active', now()
FROM public.white_label_partners p
WHERE p.user_id IS NOT NULL
ON CONFLICT (partner_id, user_id) DO NOTHING;
