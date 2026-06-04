-- System 9: Client Setup Wizard — submit permissions
--
-- The original onboarding RLS only gave clients SELECT on handoffs and
-- SELECT+UPDATE on their fillable items. The wizard also needs to:
--   1. Flip the handoff status to ready_for_submission
--   2. Insert an activity log row
-- Both are handled by the SECURITY DEFINER function below so the client
-- never needs a direct UPDATE policy on handoffs or INSERT on activity.

CREATE OR REPLACE FUNCTION public.submit_client_setup()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_handoff_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Resolve the submittable handoff for this client (collecting_info or needs_more_info)
  SELECT h.id INTO v_handoff_id
  FROM public.client_onboarding_handoffs h
  JOIN public.leads l ON l.id = h.client_lead_id
  WHERE (h.client_user_id = auth.uid() OR l.user_id = auth.uid())
    AND h.status IN ('collecting_info', 'needs_more_info')
  ORDER BY h.created_at DESC
  LIMIT 1;

  IF v_handoff_id IS NULL THEN
    RAISE EXCEPTION 'No submittable handoff found for this user';
  END IF;

  UPDATE public.client_onboarding_handoffs
    SET status = 'ready_for_submission',
        updated_at = now()
  WHERE id = v_handoff_id;

  INSERT INTO public.client_onboarding_activity
    (handoff_id, event_type, actor_id, actor_label, meta_json)
  VALUES
    (v_handoff_id, 'handoff_submitted', auth.uid(), 'client', '{}'::jsonb);

  RETURN v_handoff_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_client_setup() FROM public;
GRANT EXECUTE ON FUNCTION public.submit_client_setup() TO authenticated;
