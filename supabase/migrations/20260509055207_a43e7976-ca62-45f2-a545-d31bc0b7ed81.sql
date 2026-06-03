-- Phase 34 — approval_policy_versions audit log
CREATE TABLE IF NOT EXISTS public.approval_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.approval_policies(id) ON DELETE CASCADE,
  version_no integer NOT NULL,
  action text NOT NULL CHECK (action IN ('created','updated','activated','deactivated','deleted')),
  changed_by uuid NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_policy_versions_policy
  ON public.approval_policy_versions (policy_id, version_no DESC);

ALTER TABLE public.approval_policy_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read approval policy versions" ON public.approval_policy_versions;
CREATE POLICY "admins read approval policy versions"
  ON public.approval_policy_versions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- writes only via SECURITY DEFINER trigger; no direct insert/update/delete policies

CREATE OR REPLACE FUNCTION public.approval_policy_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next int;
  v_action text;
  v_diff jsonb := '{}'::jsonb;
  v_snap jsonb;
  v_user uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_snap := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_snap := to_jsonb(NEW);
    IF (OLD.active IS DISTINCT FROM NEW.active) THEN
      v_action := CASE WHEN NEW.active THEN 'activated' ELSE 'deactivated' END;
    ELSE
      v_action := 'updated';
    END IF;
    -- compact diff: only changed top-level keys
    SELECT jsonb_object_agg(key, jsonb_build_object('from', oldv, 'to', newv))
      INTO v_diff
      FROM (
        SELECT n.key,
               o.value AS oldv,
               n.value AS newv
          FROM jsonb_each(to_jsonb(NEW)) n
          LEFT JOIN jsonb_each(to_jsonb(OLD)) o ON o.key = n.key
         WHERE n.key NOT IN ('updated_at','created_at')
           AND COALESCE(o.value, 'null'::jsonb) IS DISTINCT FROM n.value
      ) d;
    v_diff := COALESCE(v_diff, '{}'::jsonb);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_snap := to_jsonb(OLD);
  END IF;

  SELECT COALESCE(MAX(version_no), 0) + 1
    INTO v_next
    FROM public.approval_policy_versions
   WHERE policy_id = COALESCE(NEW.id, OLD.id);

  INSERT INTO public.approval_policy_versions
    (policy_id, version_no, action, changed_by, diff, snapshot)
  VALUES
    (COALESCE(NEW.id, OLD.id), v_next, v_action, v_user, v_diff, v_snap);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS approval_policies_audit_ins ON public.approval_policies;
CREATE TRIGGER approval_policies_audit_ins
  AFTER INSERT ON public.approval_policies
  FOR EACH ROW EXECUTE FUNCTION public.approval_policy_audit();

DROP TRIGGER IF EXISTS approval_policies_audit_upd ON public.approval_policies;
CREATE TRIGGER approval_policies_audit_upd
  AFTER UPDATE ON public.approval_policies
  FOR EACH ROW EXECUTE FUNCTION public.approval_policy_audit();

DROP TRIGGER IF EXISTS approval_policies_audit_del ON public.approval_policies;
CREATE TRIGGER approval_policies_audit_del
  AFTER DELETE ON public.approval_policies
  FOR EACH ROW EXECUTE FUNCTION public.approval_policy_audit();

-- Backfill an initial 'created' version for any existing policies that don't have one
INSERT INTO public.approval_policy_versions (policy_id, version_no, action, changed_by, diff, snapshot)
SELECT p.id, 1, 'created', NULL, '{}'::jsonb, to_jsonb(p)
  FROM public.approval_policies p
 WHERE NOT EXISTS (
   SELECT 1 FROM public.approval_policy_versions v WHERE v.policy_id = p.id
 );