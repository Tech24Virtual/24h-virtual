-- Phase 2B Slice 2 — wl_partner_feedback_messages role expansion + team-membership policies
-- + auto-owner-membership trigger on white_label_partners

-- 1) Expand author_role to include partner_manager, partner_agent
ALTER TABLE public.wl_partner_feedback_messages
  DROP CONSTRAINT wl_partner_feedback_messages_author_role_check;

ALTER TABLE public.wl_partner_feedback_messages
  ADD CONSTRAINT wl_partner_feedback_messages_author_role_check
  CHECK (author_role = ANY (ARRAY[
    'partner_owner'::text,
    'partner_manager'::text,
    'partner_agent'::text,
    'wl_end_client'::text,
    'partner_internal'::text
  ]));

-- 2) Replace owner-only policies with active-member team policies.
--    SELECT: any active member of the partner can read all messages on their partner threads.
--    INSERT: any active member can post; author_role is forced to match their active role
--            (partner_owner / partner_manager / partner_agent). End-client policies unchanged.
DROP POLICY IF EXISTS wl_pfm_select_partner_owner ON public.wl_partner_feedback_messages;
DROP POLICY IF EXISTS wl_pfm_insert_partner_owner ON public.wl_partner_feedback_messages;

CREATE POLICY wl_pfm_select_partner_member
ON public.wl_partner_feedback_messages
FOR SELECT
TO authenticated
USING (public.wl_is_partner_member(partner_id, auth.uid()));

CREATE POLICY wl_pfm_insert_partner_member
ON public.wl_partner_feedback_messages
FOR INSERT
TO authenticated
WITH CHECK (
  author_kind = 'partner'
  AND author_user_id = auth.uid()
  AND public.wl_is_partner_member(partner_id, auth.uid())
  AND author_role = ('partner_' || public.wl_partner_member_role(partner_id, auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.wl_partner_feedback f
    WHERE f.id = wl_partner_feedback_messages.feedback_id
      AND f.partner_id = wl_partner_feedback_messages.partner_id
  )
);

-- 3) Trigger: ensure every white_label_partners row with a user_id has a matching active owner membership.
--    Required so future partners (created after the 2B-1 backfill) keep working with the team-membership
--    dispatcher. Idempotent via ON CONFLICT.
CREATE OR REPLACE FUNCTION public.ensure_wl_partner_owner_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.wl_partner_members (partner_id, user_id, role, status, activated_at)
    VALUES (NEW.id, NEW.user_id, 'owner', 'active', now())
    ON CONFLICT (partner_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_wl_partner_owner_member() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_wl_partner_owner_member ON public.white_label_partners;
CREATE TRIGGER trg_wl_partner_owner_member
AFTER INSERT OR UPDATE OF user_id ON public.white_label_partners
FOR EACH ROW
EXECUTE FUNCTION public.ensure_wl_partner_owner_member();