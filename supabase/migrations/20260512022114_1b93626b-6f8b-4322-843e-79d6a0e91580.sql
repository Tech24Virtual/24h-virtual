
CREATE TABLE public.feedback_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL CHECK (source_table IN ('feedback','wl_partner_feedback')),
  source_id uuid NOT NULL,
  tenant_kind text NOT NULL CHECK (tenant_kind IN ('direct_24h','wl_partner')),
  wl_partner_id uuid NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('engineering','billing','ops_task','support_ticket','external')),
  label text NOT NULL,
  url text NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_handoffs_partner_consistency CHECK (
    (tenant_kind = 'wl_partner' AND wl_partner_id IS NOT NULL)
    OR (tenant_kind = 'direct_24h' AND wl_partner_id IS NULL)
  )
);

CREATE INDEX feedback_handoffs_source_idx ON public.feedback_handoffs (source_table, source_id);
CREATE INDEX feedback_handoffs_partner_idx ON public.feedback_handoffs (wl_partner_id);

ALTER TABLE public.feedback_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_handoffs FORCE ROW LEVEL SECURITY;

-- Admin reads: direct (24H) handoffs only
CREATE POLICY "feedback_handoffs admin read direct"
  ON public.feedback_handoffs
  FOR SELECT
  TO authenticated
  USING (
    tenant_kind = 'direct_24h'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Partner owner reads: only their own partner's WL handoffs
CREATE POLICY "feedback_handoffs partner read own wl"
  ON public.feedback_handoffs
  FOR SELECT
  TO authenticated
  USING (
    tenant_kind = 'wl_partner'
    AND wl_partner_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.white_label_partners p
      WHERE p.id = feedback_handoffs.wl_partner_id
        AND p.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated.
-- Mutations occur exclusively through the service-role edge function path
-- (update-feedback-status link_handoff / unlink_handoff).
