-- Atomic claim function using a conditional UPDATE.
-- Returns true if the row was claimed (rowcount = 1), false if another agent
-- already claimed it first. This eliminates the lost-update race in the client.
CREATE OR REPLACE FUNCTION claim_outbound_request(p_request_id uuid, p_agent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE outbound_call_requests
  SET
    status     = 'claimed',
    claimed_by = p_agent_id,
    claimed_at = now()
  WHERE id         = p_request_id
    AND status     = 'pending'
    AND claimed_by IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_outbound_request(uuid, uuid) TO authenticated;
