-- Add unique constraint so upsert works
ALTER TABLE public.slack_user_mappings
  ADD CONSTRAINT slack_user_mappings_user_id_key UNIQUE (user_id);

-- Also add unique constraint on slack_user_id for completeness
ALTER TABLE public.slack_user_mappings
  ADD CONSTRAINT slack_user_mappings_slack_user_id_key UNIQUE (slack_user_id);
