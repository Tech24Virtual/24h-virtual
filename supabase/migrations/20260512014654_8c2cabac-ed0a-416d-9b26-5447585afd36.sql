-- Phase 2A Slice 1: Notification spine

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event_key_uniq
  ON public.notifications (user_id, (metadata->>'event_key'))
  WHERE metadata ? 'event_key';

CREATE INDEX IF NOT EXISTS notifications_metadata_gin
  ON public.notifications USING gin (metadata);

-- Idempotent insert helper. Returns the inserted row id, or NULL when a row
-- with the same (user_id, event_key) already exists.
CREATE OR REPLACE FUNCTION public.notify_idempotent(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_category text,
  p_action_url text,
  p_metadata jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_meta jsonb;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;
  v_meta := COALESCE(p_metadata, '{}'::jsonb);

  INSERT INTO public.notifications
    (user_id, title, message, type, category, action_url, metadata)
  VALUES
    (p_user_id, p_title, p_message, p_type, p_category, p_action_url, v_meta)
  ON CONFLICT ON CONSTRAINT notifications_user_event_key_uniq DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_idempotent(uuid, text, text, text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.notify_idempotent(uuid, text, text, text, text, text, jsonb) TO service_role;
