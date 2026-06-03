-- Create wl_partner_leads table (isolated from internal leads table)
CREATE TABLE public.wl_partner_leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,

  -- Contact
  name                text NOT NULL,
  email               text NOT NULL,
  phone               text,
  company             text,

  -- Pipeline
  pipeline_stage      text NOT NULL DEFAULT 'new'
                      CHECK (pipeline_stage IN ('new','contacted','qualified','proposal','won','lost')),
  temperature         text CHECK (temperature IN ('hot','warm','cold')),
  source              text,
  service_interest    text,
  estimated_value     numeric(10,2),
  currency            text DEFAULT 'USD',

  -- Ownership inside partner org (for future sub-users)
  assigned_to         uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Notes + metadata
  notes               text,
  next_followup_at    timestamptz,
  last_activity_at    timestamptz DEFAULT now(),

  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wl_partner_leads_partner_idx       ON public.wl_partner_leads(partner_id);
CREATE INDEX wl_partner_leads_partner_stage_idx ON public.wl_partner_leads(partner_id, pipeline_stage);
CREATE INDEX wl_partner_leads_partner_created   ON public.wl_partner_leads(partner_id, created_at DESC);

ALTER TABLE public.wl_partner_leads ENABLE ROW LEVEL SECURITY;

-- Reuse existing updated_at trigger
CREATE TRIGGER wl_partner_leads_set_updated_at
  BEFORE UPDATE ON public.wl_partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger (length caps + email regex; partner-scoped, no public path)
CREATE OR REPLACE FUNCTION public.validate_wl_partner_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  IF length(NEW.email) > 254 THEN
    RAISE EXCEPTION 'Email too long (max 254 characters)';
  END IF;
  IF NEW.name IS NULL OR length(trim(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Name too long (max 200 characters)';
  END IF;
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 30 THEN
    RAISE EXCEPTION 'Phone number too long (max 30 characters)';
  END IF;
  IF NEW.phone IS NOT NULL AND NEW.phone !~ '^[0-9+\-\s\(\)\.]+$' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  IF NEW.company IS NOT NULL AND length(NEW.company) > 200 THEN
    RAISE EXCEPTION 'Company name too long (max 200 characters)';
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 5000 THEN
    RAISE EXCEPTION 'Notes too long (max 5000 characters)';
  END IF;
  IF NEW.source IS NOT NULL AND length(NEW.source) > 100 THEN
    RAISE EXCEPTION 'Source too long (max 100 characters)';
  END IF;
  IF NEW.service_interest IS NOT NULL AND length(NEW.service_interest) > 200 THEN
    RAISE EXCEPTION 'Service interest too long (max 200 characters)';
  END IF;
  IF NEW.currency IS NOT NULL AND length(NEW.currency) > 8 THEN
    RAISE EXCEPTION 'Currency code too long';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wl_partner_leads_validate
  BEFORE INSERT OR UPDATE ON public.wl_partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.validate_wl_partner_lead();

-- Immutable partner_id trigger (prevents tenant-hop on UPDATE)
CREATE OR REPLACE FUNCTION public.enforce_wl_partner_lead_immutable_partner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'partner_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wl_partner_leads_immutable_partner
  BEFORE UPDATE ON public.wl_partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wl_partner_lead_immutable_partner();

-- RLS: SELECT
CREATE POLICY "wl_partner_leads partner select"
  ON public.wl_partner_leads FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS: INSERT
CREATE POLICY "wl_partner_leads partner insert"
  ON public.wl_partner_leads FOR INSERT
  WITH CHECK (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS: UPDATE
CREATE POLICY "wl_partner_leads partner update"
  ON public.wl_partner_leads FOR UPDATE
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS: DELETE
CREATE POLICY "wl_partner_leads partner delete"
  ON public.wl_partner_leads FOR DELETE
  USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );