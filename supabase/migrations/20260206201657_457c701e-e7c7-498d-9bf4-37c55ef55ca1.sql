
-- Add activity tracking columns to support_tickets
ALTER TABLE public.support_tickets 
  ADD COLUMN last_activity_at timestamptz DEFAULT now(),
  ADD COLUMN last_activity_by uuid;

-- Create ticket_views table for per-user read tracking
CREATE TABLE public.ticket_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, ticket_id)
);

ALTER TABLE public.ticket_views ENABLE ROW LEVEL SECURITY;

-- RLS: users can only manage their own view records
CREATE POLICY "Users manage own ticket views"
  ON public.ticket_views FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger: update last_activity when a reply is added
CREATE OR REPLACE FUNCTION public.update_ticket_activity_on_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_activity_at = now(),
      last_activity_by = NEW.author_id
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_reply_update_activity
  AFTER INSERT ON public.ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_activity_on_reply();

-- Trigger: update last_activity when status changes
CREATE OR REPLACE FUNCTION public.update_ticket_activity_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_activity_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_status_update_activity
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_activity_on_status_change();
