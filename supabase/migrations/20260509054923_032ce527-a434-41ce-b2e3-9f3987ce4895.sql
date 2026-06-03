-- Phase 34 — require rejection reason on approval decisions
CREATE OR REPLACE FUNCTION public.decide_approval_request(
  p_request_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req approval_requests%ROWTYPE;
  v_user uuid := auth.uid();
  v_notes text := NULLIF(btrim(coalesce(p_notes, '')), '');
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF NOT public.has_role(v_user, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required to decide approval requests';
  END IF;
  IF p_decision NOT IN ('approved','rejected','cancelled') THEN
    RAISE EXCEPTION 'invalid decision %', p_decision;
  END IF;
  IF p_decision IN ('rejected','cancelled') AND v_notes IS NULL THEN
    RAISE EXCEPTION 'A reason is required when rejecting or cancelling an approval request';
  END IF;

  SELECT * INTO v_req FROM approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approval request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'approval request already decided (%).', v_req.status;
  END IF;

  UPDATE approval_requests
     SET status = p_decision,
         decision_notes = v_notes,
         decided_by = v_user,
         decided_at = now(),
         updated_at = now()
   WHERE id = p_request_id;

  -- Recompute the deal's approval_state based on remaining requests
  PERFORM public.evaluate_deal_approvals(v_req.deal_id);

  RETURN jsonb_build_object(
    'request_id', p_request_id,
    'decision', p_decision,
    'decided_at', now(),
    'notes', v_notes
  );
END;
$$;