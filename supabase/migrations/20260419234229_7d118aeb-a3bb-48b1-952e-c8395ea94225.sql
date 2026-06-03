
-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE public.chat_ownership_mode AS ENUM ('direct', 'wl');
CREATE TYPE public.chat_deployment_status AS ENUM ('draft', 'active', 'paused');
CREATE TYPE public.chat_ai_mode AS ENUM ('agent_only', 'ai_first', 'ai_only', 'offline_capture');
CREATE TYPE public.chat_conversation_status AS ENUM ('new', 'queued', 'assigned', 'active', 'waiting', 'closed');
CREATE TYPE public.chat_ai_state AS ENUM ('idle', 'active', 'handed_off', 'disabled');
CREATE TYPE public.chat_sender_type AS ENUM ('visitor', 'ai', 'agent', 'system');

-- =====================================================
-- TABLE: chat_deployments
-- =====================================================
CREATE TABLE public.chat_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ownership_mode public.chat_ownership_mode NOT NULL,
  direct_client_id uuid NULL,
  lead_id uuid NULL,
  wl_partner_id uuid NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  wl_client_id uuid NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  status public.chat_deployment_status NOT NULL DEFAULT 'draft',
  widget_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  embed_secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_deployments_ownership_check CHECK (
    (ownership_mode = 'direct' AND direct_client_id IS NOT NULL AND wl_partner_id IS NULL AND wl_client_id IS NULL)
    OR
    (ownership_mode = 'wl' AND wl_partner_id IS NOT NULL AND wl_client_id IS NOT NULL AND direct_client_id IS NULL)
  )
);

CREATE INDEX idx_chat_deployments_widget_token ON public.chat_deployments(widget_token);
CREATE INDEX idx_chat_deployments_direct_client ON public.chat_deployments(direct_client_id) WHERE direct_client_id IS NOT NULL;
CREATE INDEX idx_chat_deployments_wl_partner ON public.chat_deployments(wl_partner_id) WHERE wl_partner_id IS NOT NULL;
CREATE INDEX idx_chat_deployments_wl_client ON public.chat_deployments(wl_client_id) WHERE wl_client_id IS NOT NULL;

-- =====================================================
-- TABLE: chat_brand_configs (1:1 with deployment)
-- =====================================================
CREATE TABLE public.chat_brand_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL UNIQUE REFERENCES public.chat_deployments(id) ON DELETE CASCADE,
  logo_url text NULL,
  accent_color text NOT NULL DEFAULT '#3B82F6',
  launcher_label text NOT NULL DEFAULT 'Chat with us',
  greeting text NOT NULL DEFAULT 'Hi there! How can we help you today?',
  offline_message text NOT NULL DEFAULT 'We are currently offline. Leave a message and we will get back to you.',
  online_label text NOT NULL DEFAULT 'Online',
  offline_label text NOT NULL DEFAULT 'Offline',
  pre_chat_form_enabled boolean NOT NULL DEFAULT false,
  pre_chat_fields jsonb NOT NULL DEFAULT '[{"key":"name","label":"Name","required":true},{"key":"email","label":"Email","required":true}]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: chat_ai_configs (1:1 with deployment)
-- =====================================================
CREATE TABLE public.chat_ai_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL UNIQUE REFERENCES public.chat_deployments(id) ON DELETE CASCADE,
  mode public.chat_ai_mode NOT NULL DEFAULT 'agent_only',
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  system_instructions text NULL,
  escalation_keywords text[] NOT NULL DEFAULT ARRAY['human', 'agent', 'representative', 'speak to someone', 'frustrated'],
  handoff_on_low_confidence boolean NOT NULL DEFAULT true,
  handoff_after_intake boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: chat_visitors
-- =====================================================
CREATE TABLE public.chat_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL REFERENCES public.chat_deployments(id) ON DELETE CASCADE,
  visitor_uid text NOT NULL,
  name text NULL,
  email text NULL,
  phone text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deployment_id, visitor_uid)
);

CREATE INDEX idx_chat_visitors_deployment ON public.chat_visitors(deployment_id);

-- =====================================================
-- TABLE: chat_conversations
-- =====================================================
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL REFERENCES public.chat_deployments(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL REFERENCES public.chat_visitors(id) ON DELETE CASCADE,
  ownership_mode public.chat_ownership_mode NOT NULL,
  direct_client_id uuid NULL,
  wl_partner_id uuid NULL,
  wl_client_id uuid NULL,
  status public.chat_conversation_status NOT NULL DEFAULT 'new',
  ai_state public.chat_ai_state NOT NULL DEFAULT 'idle',
  assigned_agent_id uuid NULL,
  channel text NOT NULL DEFAULT 'webchat',
  ai_summary text NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_agent_count integer NOT NULL DEFAULT 0,
  unread_visitor_count integer NOT NULL DEFAULT 0,
  closed_at timestamptz NULL,
  closed_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX idx_chat_conversations_assigned_agent ON public.chat_conversations(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX idx_chat_conversations_direct_client ON public.chat_conversations(direct_client_id) WHERE direct_client_id IS NOT NULL;
CREATE INDEX idx_chat_conversations_wl_partner ON public.chat_conversations(wl_partner_id) WHERE wl_partner_id IS NOT NULL;
CREATE INDEX idx_chat_conversations_deployment ON public.chat_conversations(deployment_id);
CREATE INDEX idx_chat_conversations_last_message ON public.chat_conversations(last_message_at DESC);

-- =====================================================
-- TABLE: chat_messages
-- =====================================================
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type public.chat_sender_type NOT NULL,
  sender_id uuid NULL,
  sender_name text NULL,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);

-- =====================================================
-- TABLE: chat_assignments (history)
-- =====================================================
CREATE TABLE public.chat_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  assigned_by uuid NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz NULL,
  reason text NULL
);

CREATE INDEX idx_chat_assignments_conversation ON public.chat_assignments(conversation_id);
CREATE INDEX idx_chat_assignments_agent ON public.chat_assignments(agent_id);

-- =====================================================
-- TABLE: chat_handoff_events
-- =====================================================
CREATE TABLE public.chat_handoff_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  trigger_detail text NULL,
  ai_summary text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_handoff_events_conversation ON public.chat_handoff_events(conversation_id);

-- =====================================================
-- TABLE: chat_canned_responses
-- =====================================================
CREATE TABLE public.chat_canned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NULL REFERENCES public.chat_deployments(id) ON DELETE CASCADE,
  shortcut text NOT NULL,
  body text NOT NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_canned_responses_deployment ON public.chat_canned_responses(deployment_id);

-- =====================================================
-- TABLE: chat_activity_log
-- =====================================================
CREATE TABLE public.chat_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  deployment_id uuid NULL REFERENCES public.chat_deployments(id) ON DELETE CASCADE,
  actor_id uuid NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_activity_conversation ON public.chat_activity_log(conversation_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- updated_at maintenance
CREATE TRIGGER chat_deployments_updated_at
  BEFORE UPDATE ON public.chat_deployments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER chat_brand_configs_updated_at
  BEFORE UPDATE ON public.chat_brand_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER chat_ai_configs_updated_at
  BEFORE UPDATE ON public.chat_ai_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER chat_canned_responses_updated_at
  BEFORE UPDATE ON public.chat_canned_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update last_message_at + unread counters on message insert
CREATE OR REPLACE FUNCTION public.chat_message_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type = 'visitor' THEN
    UPDATE public.chat_conversations
    SET last_message_at = NEW.created_at,
        unread_agent_count = unread_agent_count + 1
    WHERE id = NEW.conversation_id;
  ELSIF NEW.sender_type IN ('agent', 'ai') THEN
    UPDATE public.chat_conversations
    SET last_message_at = NEW.created_at,
        unread_visitor_count = unread_visitor_count + 1
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE public.chat_conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_after_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_message_after_insert();

-- Validate direct_client_id points to a viable lead (warning only)
CREATE OR REPLACE FUNCTION public.chat_deployment_validate_direct_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage text;
BEGIN
  IF NEW.ownership_mode = 'direct' AND NEW.direct_client_id IS NOT NULL THEN
    SELECT pipeline_stage INTO v_stage FROM public.leads WHERE id = NEW.direct_client_id;
    IF v_stage IS NULL THEN
      RAISE EXCEPTION 'direct_client_id % does not exist in leads', NEW.direct_client_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_deployments_validate_client
  BEFORE INSERT OR UPDATE ON public.chat_deployments
  FOR EACH ROW EXECUTE FUNCTION public.chat_deployment_validate_direct_client();

-- Notification fan-out when conversation status flips to queued
CREATE OR REPLACE FUNCTION public.chat_notify_on_queued()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent RECORD;
  v_title text := 'New chat in queue';
  v_message text := 'A visitor needs an agent';
  v_action_url text := '/staff/agent/workspace';
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'queued')
     OR (TG_OP = 'INSERT' AND NEW.status = 'queued') THEN

    -- Direct: notify only agents assigned to this client
    IF NEW.ownership_mode = 'direct' AND NEW.direct_client_id IS NOT NULL THEN
      FOR v_agent IN
        SELECT DISTINCT agent_id FROM public.client_agent_assignments
        WHERE client_id = NEW.direct_client_id
      LOOP
        INSERT INTO public.notifications (user_id, title, message, category, action_url)
        VALUES (v_agent.agent_id, v_title, v_message, 'chat', v_action_url);
      END LOOP;
    END IF;

    -- WL: notify supervisors and admins
    IF NEW.ownership_mode = 'wl' THEN
      FOR v_agent IN
        SELECT DISTINCT user_id FROM public.user_roles
        WHERE role IN ('supervisor'::app_role, 'admin'::app_role)
      LOOP
        INSERT INTO public.notifications (user_id, title, message, category, action_url)
        VALUES (v_agent.user_id, 'New WL chat in queue', v_message, 'chat', v_action_url);
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_conversations_notify_queued
  AFTER INSERT OR UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.chat_notify_on_queued();

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.chat_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_brand_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_handoff_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_activity_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: chat_deployments
-- =====================================================
CREATE POLICY "Admins manage all deployments"
  ON public.chat_deployments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tech manages all deployments"
  ON public.chat_deployments FOR ALL
  USING (public.has_role(auth.uid(), 'tech'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'tech'::app_role));

CREATE POLICY "Supervisors view all deployments"
  ON public.chat_deployments FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Agents view deployments for their clients"
  ON public.chat_deployments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND ownership_mode = 'direct'
    AND direct_client_id IN (
      SELECT client_id FROM public.client_agent_assignments WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "WL partners view their deployments"
  ON public.chat_deployments FOR SELECT
  USING (
    ownership_mode = 'wl'
    AND wl_partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES: chat_brand_configs
-- =====================================================
CREATE POLICY "Admins manage all brand configs"
  ON public.chat_brand_configs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tech manages all brand configs"
  ON public.chat_brand_configs FOR ALL
  USING (public.has_role(auth.uid(), 'tech'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'tech'::app_role));

CREATE POLICY "Staff view brand configs for visible deployments"
  ON public.chat_brand_configs FOR SELECT
  USING (
    deployment_id IN (SELECT id FROM public.chat_deployments)
  );

-- =====================================================
-- RLS POLICIES: chat_ai_configs
-- =====================================================
CREATE POLICY "Admins manage all ai configs"
  ON public.chat_ai_configs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tech manages all ai configs"
  ON public.chat_ai_configs FOR ALL
  USING (public.has_role(auth.uid(), 'tech'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'tech'::app_role));

CREATE POLICY "Staff view ai configs for visible deployments"
  ON public.chat_ai_configs FOR SELECT
  USING (
    deployment_id IN (SELECT id FROM public.chat_deployments)
  );

-- =====================================================
-- RLS POLICIES: chat_visitors
-- =====================================================
CREATE POLICY "Admins manage visitors"
  ON public.chat_visitors FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view visitors via conversation visibility"
  ON public.chat_visitors FOR SELECT
  USING (
    id IN (SELECT visitor_id FROM public.chat_conversations)
  );

-- =====================================================
-- RLS POLICIES: chat_conversations
-- =====================================================
CREATE POLICY "Admins manage all conversations"
  ON public.chat_conversations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors view all conversations"
  ON public.chat_conversations FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors update all conversations"
  ON public.chat_conversations FOR UPDATE
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Agents view conversations for their clients or assigned"
  ON public.chat_conversations FOR SELECT
  USING (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND (
      assigned_agent_id = auth.uid()
      OR (
        ownership_mode = 'direct'
        AND direct_client_id IN (
          SELECT client_id FROM public.client_agent_assignments WHERE agent_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Agents update only their assigned conversations"
  ON public.chat_conversations FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND assigned_agent_id = auth.uid()
  );

CREATE POLICY "WL partners view their conversations"
  ON public.chat_conversations FOR SELECT
  USING (
    ownership_mode = 'wl'
    AND wl_partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES: chat_messages
-- =====================================================
CREATE POLICY "Admins manage all messages"
  ON public.chat_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view messages via conversation visibility"
  ON public.chat_messages FOR SELECT
  USING (
    conversation_id IN (SELECT id FROM public.chat_conversations)
  );

CREATE POLICY "Agents insert messages on assigned conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_type = 'agent'
    AND sender_id = auth.uid()
    AND conversation_id IN (
      SELECT id FROM public.chat_conversations WHERE assigned_agent_id = auth.uid()
    )
  );

CREATE POLICY "Supervisors insert messages on any conversation"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'supervisor'::app_role)
    AND sender_type IN ('agent', 'system')
  );

-- =====================================================
-- RLS POLICIES: chat_assignments
-- =====================================================
CREATE POLICY "Admins manage assignments"
  ON public.chat_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors manage assignments"
  ON public.chat_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Staff view assignments via conversation"
  ON public.chat_assignments FOR SELECT
  USING (
    conversation_id IN (SELECT id FROM public.chat_conversations)
  );

CREATE POLICY "Agents insert their own assignment"
  ON public.chat_assignments FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND agent_id = auth.uid()
  );

-- =====================================================
-- RLS POLICIES: chat_handoff_events
-- =====================================================
CREATE POLICY "Admins manage handoff events"
  ON public.chat_handoff_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view handoff events via conversation"
  ON public.chat_handoff_events FOR SELECT
  USING (
    conversation_id IN (SELECT id FROM public.chat_conversations)
  );

-- =====================================================
-- RLS POLICIES: chat_canned_responses
-- =====================================================
CREATE POLICY "Admins manage canned responses"
  ON public.chat_canned_responses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tech manages canned responses"
  ON public.chat_canned_responses FOR ALL
  USING (public.has_role(auth.uid(), 'tech'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'tech'::app_role));

CREATE POLICY "Staff view canned responses"
  ON public.chat_canned_responses FOR SELECT
  USING (
    public.has_role(auth.uid(), 'agent'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
    OR public.has_role(auth.uid(), 'tech'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- =====================================================
-- RLS POLICIES: chat_activity_log
-- =====================================================
CREATE POLICY "Admins manage activity log"
  ON public.chat_activity_log FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view activity log via conversation"
  ON public.chat_activity_log FOR SELECT
  USING (
    public.has_role(auth.uid(), 'supervisor'::app_role)
    OR public.has_role(auth.uid(), 'tech'::app_role)
    OR conversation_id IN (SELECT id FROM public.chat_conversations)
  );

-- =====================================================
-- REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
