-- System 11 Part D — Policy acknowledgment workflow for agents.
--
-- When a campaign_policy_blocks row transitions to status = 'approved' a DB
-- trigger inserts a pending policy_acknowledgments row for every agent assigned
-- to the policy's owning client (or, for global-scope policies, every agent in
-- client_agent_assignments).  Re-approvals reset existing rows back to pending
-- so agents must re-acknowledge updated policies.

-- ── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE public.policy_acknowledgments (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id       uuid        NOT NULL REFERENCES public.campaign_policy_blocks(id) ON DELETE CASCADE,
  agent_user_id   uuid        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz
);

CREATE UNIQUE INDEX uq_policy_ack_agent ON public.policy_acknowledgments(policy_id, agent_user_id);
CREATE INDEX idx_policy_ack_agent ON public.policy_acknowledgments(agent_user_id);
CREATE INDEX idx_policy_ack_status ON public.policy_acknowledgments(status);

ALTER TABLE public.policy_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Agents: read and update their own rows only
CREATE POLICY policy_ack_agent_select
  ON public.policy_acknowledgments FOR SELECT TO authenticated
  USING (agent_user_id = auth.uid());

CREATE POLICY policy_ack_agent_update
  ON public.policy_acknowledgments FOR UPDATE TO authenticated
  USING (agent_user_id = auth.uid())
  WITH CHECK (agent_user_id = auth.uid());

-- Admins + supervisors: full read access (for the visibility panel)
CREATE POLICY policy_ack_admin_select
  ON public.policy_acknowledgments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
  );

-- The trigger function is SECURITY DEFINER so it bypasses RLS — no INSERT
-- policy is needed for agents.  Admins/supervisors can insert manually if needed.
CREATE POLICY policy_ack_admin_insert
  ON public.policy_acknowledgments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_acknowledgments TO authenticated;

-- ── Trigger function ─────────────────────────────────────────────────────────
-- Fires on INSERT or UPDATE when status = 'approved'.
-- For client-scoped policies (client_lead_id IS NOT NULL): inserts one row per
-- agent assigned to that client via client_agent_assignments.
-- For global-scope policies (client_lead_id IS NULL): inserts one row per
-- distinct agent across all assignments.
-- ON CONFLICT resets to pending so re-approvals force re-acknowledgment.

CREATE OR REPLACE FUNCTION public.fn_create_policy_ack_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when transitioning into 'approved'
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.client_lead_id IS NOT NULL THEN
      -- Client-scoped policy: notify agents assigned to this client
      INSERT INTO public.policy_acknowledgments (policy_id, agent_user_id, status, created_at, acknowledged_at)
      SELECT NEW.id, caa.agent_id, 'pending', now(), NULL
      FROM public.client_agent_assignments caa
      WHERE caa.client_id = NEW.client_lead_id
      ON CONFLICT (policy_id, agent_user_id)
        DO UPDATE SET status = 'pending', acknowledged_at = NULL;
    ELSE
      -- Global policy: notify all agents in client_agent_assignments
      INSERT INTO public.policy_acknowledgments (policy_id, agent_user_id, status, created_at, acknowledged_at)
      SELECT NEW.id, DISTINCT_AGENTS.agent_id, 'pending', now(), NULL
      FROM (
        SELECT DISTINCT agent_id FROM public.client_agent_assignments
      ) DISTINCT_AGENTS
      ON CONFLICT (policy_id, agent_user_id)
        DO UPDATE SET status = 'pending', acknowledged_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_policy_approved_ack
  AFTER INSERT OR UPDATE OF status ON public.campaign_policy_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_policy_ack_requests();
