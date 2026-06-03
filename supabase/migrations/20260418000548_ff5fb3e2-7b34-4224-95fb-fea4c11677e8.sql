
-- ============================================================
-- Phase 7A: Campaign engagement loop
-- Add per-recipient tracking and let WL clients toggle is_active.
-- ============================================================

-- 1. Recipients table: one row per contact targeted by a campaign.
CREATE TABLE public.wl_campaign_recipients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES public.wl_client_campaigns(id) ON DELETE CASCADE,
  wl_client_id    uuid NOT NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  partner_id      uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  contact_name    text,
  contact_phone   text,
  contact_email   text,
  -- Lifecycle: queued -> sent -> opened -> replied -> converted (or failed)
  status          text NOT NULL DEFAULT 'queued',
  sent_at         timestamptz,
  opened_at       timestamptz,
  replied_at      timestamptz,
  converted_at    timestamptz,
  failed_at       timestamptz,
  failure_reason  text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wl_campaign_recipients_campaign ON public.wl_campaign_recipients(campaign_id);
CREATE INDEX idx_wl_campaign_recipients_client   ON public.wl_campaign_recipients(wl_client_id);
CREATE INDEX idx_wl_campaign_recipients_status   ON public.wl_campaign_recipients(status);

ALTER TABLE public.wl_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Validation trigger: status must be in known set, and updated_at maintained.
CREATE OR REPLACE FUNCTION public.validate_wl_campaign_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('queued','sent','opened','replied','converted','failed','suppressed') THEN
    RAISE EXCEPTION 'invalid recipient status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_wl_campaign_recipient
BEFORE INSERT OR UPDATE ON public.wl_campaign_recipients
FOR EACH ROW EXECUTE FUNCTION public.validate_wl_campaign_recipient();

-- RLS: admin, billing, partner-of-record, and the owning client.
CREATE POLICY "Admin full access on wl_campaign_recipients"
  ON public.wl_campaign_recipients FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Billing access on wl_campaign_recipients"
  ON public.wl_campaign_recipients FOR SELECT
  USING (has_role(auth.uid(), 'billing'::app_role));

CREATE POLICY "Partners manage own campaign recipients"
  ON public.wl_campaign_recipients FOR ALL
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "WL clients view own campaign recipients"
  ON public.wl_campaign_recipients FOR SELECT
  TO authenticated
  USING (wl_client_id IN (SELECT id FROM public.white_label_clients WHERE user_id = auth.uid()));

-- 2. Aggregate metrics view (security_invoker so RLS on base table applies).
CREATE OR REPLACE VIEW public.wl_campaign_metrics
WITH (security_invoker = on) AS
SELECT
  c.id              AS campaign_id,
  c.wl_client_id,
  c.partner_id,
  COUNT(r.id)                                                                                           AS total_recipients,
  COUNT(*) FILTER (WHERE r.status IN ('sent','opened','replied','converted'))                          AS sent_count,
  COUNT(*) FILTER (WHERE r.status IN ('opened','replied','converted'))                                 AS opened_count,
  COUNT(*) FILTER (WHERE r.status IN ('replied','converted'))                                          AS replied_count,
  COUNT(*) FILTER (WHERE r.status = 'converted')                                                       AS converted_count,
  COUNT(*) FILTER (WHERE r.status = 'failed')                                                          AS failed_count,
  COUNT(*) FILTER (WHERE r.status = 'queued')                                                          AS queued_count
FROM public.wl_client_campaigns c
LEFT JOIN public.wl_campaign_recipients r ON r.campaign_id = c.id
GROUP BY c.id, c.wl_client_id, c.partner_id;

-- 3. Let WL clients pause/resume their own campaigns. RLS only allows
--    them to UPDATE rows where they own the wl_client_id, but currently
--    no UPDATE policy exists for clients — add one scoped to is_active.
CREATE POLICY "WL clients toggle own campaigns active flag"
  ON public.wl_client_campaigns FOR UPDATE
  TO authenticated
  USING (wl_client_id IN (SELECT id FROM public.white_label_clients WHERE user_id = auth.uid()))
  WITH CHECK (wl_client_id IN (SELECT id FROM public.white_label_clients WHERE user_id = auth.uid()));
