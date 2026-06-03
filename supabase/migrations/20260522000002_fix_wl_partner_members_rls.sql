-- Fix infinite recursion in wl_pm_select_team policy
-- The original policy referenced wl_partner_members from within itself

CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT partner_id
  FROM wl_partner_members
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

DROP POLICY IF EXISTS wl_pm_select_team ON wl_partner_members;

CREATE POLICY wl_pm_select_team ON wl_partner_members
  FOR SELECT
  USING (partner_id = get_my_partner_id());
