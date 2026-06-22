-- Assign qa-agent to all active leads so the agent portal Clients page
-- has meaningful test data. Idempotent via ON CONFLICT DO NOTHING.
INSERT INTO client_agent_assignments (agent_id, client_id)
SELECT
  (SELECT id FROM auth.users WHERE email = 'qa-agent@24hv-test.com'),
  l.id
FROM leads l
WHERE l.pipeline_stage = 'active'
ON CONFLICT DO NOTHING;
