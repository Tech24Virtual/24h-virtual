-- Correction #17 Part 3: map a client assignment to a Slack channel so agents
-- can send a message straight to the client's channel from within the CRM.

ALTER TABLE public.client_agent_assignments
  ADD COLUMN IF NOT EXISTS slack_channel_id text,
  ADD COLUMN IF NOT EXISTS slack_channel_name text;
