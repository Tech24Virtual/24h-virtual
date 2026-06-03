
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS tenant_kind text;

UPDATE public.support_tickets
  SET tenant_kind = CASE
    WHEN linked_wl_client_ticket_id IS NOT NULL THEN 'wl_forwarded'
    ELSE 'direct'
  END
  WHERE tenant_kind IS NULL;

ALTER TABLE public.support_tickets
  ALTER COLUMN tenant_kind SET DEFAULT 'direct';
ALTER TABLE public.support_tickets
  ALTER COLUMN tenant_kind SET NOT NULL;

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_tenant_kind_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_tenant_kind_check
  CHECK (tenant_kind IN ('direct','wl_forwarded'));

CREATE INDEX IF NOT EXISTS idx_support_tickets_linked_wl_client_ticket_id
  ON public.support_tickets(linked_wl_client_ticket_id)
  WHERE linked_wl_client_ticket_id IS NOT NULL;

ALTER TABLE public.ticket_replies
  ADD COLUMN IF NOT EXISTS author_role text;

ALTER TABLE public.wl_client_ticket_replies
  ADD COLUMN IF NOT EXISTS author_role text;

CREATE TABLE IF NOT EXISTS public.wl_ticket_forwards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wl_client_ticket_id uuid NOT NULL REFERENCES public.wl_client_tickets(id) ON DELETE CASCADE,
  support_ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  forwarded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  forwarded_at timestamptz NOT NULL DEFAULT now(),
  unlinked_at timestamptz,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wl_client_ticket_id, support_ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_wl_ticket_forwards_wl_ticket
  ON public.wl_ticket_forwards(wl_client_ticket_id);
CREATE INDEX IF NOT EXISTS idx_wl_ticket_forwards_support_ticket
  ON public.wl_ticket_forwards(support_ticket_id);
CREATE INDEX IF NOT EXISTS idx_wl_ticket_forwards_partner
  ON public.wl_ticket_forwards(partner_id);

ALTER TABLE public.wl_ticket_forwards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wl_ticket_forwards_admin_all ON public.wl_ticket_forwards;
CREATE POLICY wl_ticket_forwards_admin_all
  ON public.wl_ticket_forwards
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS wl_ticket_forwards_partner_select ON public.wl_ticket_forwards;
CREATE POLICY wl_ticket_forwards_partner_select
  ON public.wl_ticket_forwards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wl_partner_members m
      WHERE m.partner_id = wl_ticket_forwards.partner_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

ALTER TABLE public.support_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies FORCE ROW LEVEL SECURITY;
ALTER TABLE public.wl_client_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.wl_client_ticket_replies FORCE ROW LEVEL SECURITY;
ALTER TABLE public.wl_ticket_forwards FORCE ROW LEVEL SECURITY;
