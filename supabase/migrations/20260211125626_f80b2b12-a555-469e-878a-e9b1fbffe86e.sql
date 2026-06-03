
-- =============================================
-- Sprint 6: Slack Integration Tables
-- =============================================

-- 1. slack_user_mappings: Maps CRM users to Slack user IDs
CREATE TABLE public.slack_user_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  slack_user_id text NOT NULL,
  slack_display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_slack_user_mappings_user_id ON public.slack_user_mappings (user_id);
CREATE UNIQUE INDEX idx_slack_user_mappings_slack_user_id ON public.slack_user_mappings (slack_user_id);

ALTER TABLE public.slack_user_mappings ENABLE ROW LEVEL SECURITY;

-- Admins full CRUD
CREATE POLICY "Admins can manage slack user mappings"
  ON public.slack_user_mappings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- Staff can read all (for display name resolution)
CREATE POLICY "Staff can read slack user mappings"
  ON public.slack_user_mappings FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- 2. slack_channels: Cached channel metadata
CREATE TABLE public.slack_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slack_channel_id text NOT NULL UNIQUE,
  name text NOT NULL,
  is_dm boolean NOT NULL DEFAULT false,
  is_private boolean NOT NULL DEFAULT false,
  topic text,
  members text[] NOT NULL DEFAULT '{}',
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slack_channels ENABLE ROW LEVEL SECURITY;

-- Staff can read channels
CREATE POLICY "Authenticated users can read slack channels"
  ON public.slack_channels FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins full CRUD for sync operations
CREATE POLICY "Admins can manage slack channels"
  ON public.slack_channels FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );


-- 3. slack_messages: Messages synced from Slack and sent from CRM
CREATE TABLE public.slack_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slack_channel_id text NOT NULL,
  slack_message_ts text NOT NULL,
  slack_user_id text,
  sender_name text,
  content text NOT NULL,
  is_from_crm boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_slack_messages_channel_ts ON public.slack_messages (slack_channel_id, slack_message_ts);
CREATE INDEX idx_slack_messages_channel ON public.slack_messages (slack_channel_id);

ALTER TABLE public.slack_messages ENABLE ROW LEVEL SECURITY;

-- Staff can read messages from channels they belong to
CREATE POLICY "Staff can read messages from their channels"
  ON public.slack_messages FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.slack_channels sc
      JOIN public.slack_user_mappings sum ON sum.user_id = auth.uid()
      WHERE sc.slack_channel_id = slack_messages.slack_channel_id
        AND sum.slack_user_id = ANY(sc.members)
    )
  );

-- Enable Realtime for slack_messages and slack_channels
ALTER PUBLICATION supabase_realtime ADD TABLE public.slack_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.slack_channels;
