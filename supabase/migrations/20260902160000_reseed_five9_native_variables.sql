-- The "Standard 12" seed rows in five9_native_variables were missing on
-- staging (table + RLS existed from migration 20260422011701, but the row
-- data itself was gone — table had 0 rows). Re-seed idempotently.

INSERT INTO public.five9_native_variables (variable_name, display_label, data_type, direction, description, sort_order) VALUES
  ('ANI', 'Caller Number (ANI)', 'string', 'in', 'Automatic Number Identification — calling party phone number.', 10),
  ('DNIS', 'Dialed Number (DNIS)', 'string', 'in', 'Dialed Number Identification Service — number the caller dialed.', 20),
  ('call_id', 'Call ID', 'string', 'in', 'Five9 unique call identifier.', 30),
  ('agent_id', 'Agent ID', 'string', 'in', 'Five9 agent identifier handling the call.', 40),
  ('campaign_name', 'Campaign Name', 'string', 'in', 'Five9 campaign the call was routed through.', 50),
  ('queue_name', 'Queue Name', 'string', 'in', 'Five9 skill / queue name.', 60),
  ('call_start', 'Call Start Time', 'timestamp', 'in', 'Timestamp when the call started.', 70),
  ('call_end', 'Call End Time', 'timestamp', 'in', 'Timestamp when the call ended.', 80),
  ('talk_time', 'Talk Time (sec)', 'number', 'in', 'Seconds the agent was on the call.', 90),
  ('hold_time', 'Hold Time (sec)', 'number', 'in', 'Seconds the caller spent on hold.', 100),
  ('disposition', 'Disposition', 'string', 'both', 'Call disposition selected by the agent.', 110),
  ('wrap_notes', 'Wrap-Up Notes', 'string', 'out', 'Free-text wrap-up notes captured after the call.', 120)
ON CONFLICT (variable_name) DO NOTHING;
