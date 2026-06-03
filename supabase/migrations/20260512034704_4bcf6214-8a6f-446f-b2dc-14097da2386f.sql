
CREATE TABLE public.wl_partner_feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.wl_partner_feedback(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  author_kind text NOT NULL CHECK (author_kind IN ('partner','submitter')),
  author_role text NOT NULL CHECK (author_role IN ('partner_owner','wl_end_client','partner_internal')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 8000),
  visible_to_submitter boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wl_pfm_feedback_id_idx ON public.wl_partner_feedback_messages(feedback_id);
CREATE INDEX wl_pfm_partner_id_idx  ON public.wl_partner_feedback_messages(partner_id);

ALTER TABLE public.wl_partner_feedback_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wl_partner_feedback_messages FORCE ROW LEVEL SECURITY;

-- 1) SELECT: partner owner reads own thread.
CREATE POLICY wl_pfm_select_partner_owner ON public.wl_partner_feedback_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.white_label_partners p
    WHERE p.id = wl_partner_feedback_messages.partner_id
      AND p.user_id = auth.uid()
  )
);

-- 2) SELECT: end-client reads only own feedback, visible-only.
CREATE POLICY wl_pfm_select_end_client ON public.wl_partner_feedback_messages
FOR SELECT TO authenticated
USING (
  visible_to_submitter = true
  AND EXISTS (
    SELECT 1
    FROM public.wl_partner_feedback f
    WHERE f.id = wl_partner_feedback_messages.feedback_id
      AND f.partner_id = wl_partner_feedback_messages.partner_id
      AND f.submitted_by_user_id = auth.uid()
  )
);

-- 3) INSERT: partner owner posts on own row.
CREATE POLICY wl_pfm_insert_partner_owner ON public.wl_partner_feedback_messages
FOR INSERT TO authenticated
WITH CHECK (
  author_kind = 'partner'
  AND author_role = 'partner_owner'
  AND author_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.white_label_partners p
    WHERE p.id = wl_partner_feedback_messages.partner_id
      AND p.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.wl_partner_feedback f
    WHERE f.id = wl_partner_feedback_messages.feedback_id
      AND f.partner_id = wl_partner_feedback_messages.partner_id
  )
);

-- 4) INSERT: end-client posts on own non-closed row, always visible.
CREATE POLICY wl_pfm_insert_end_client ON public.wl_partner_feedback_messages
FOR INSERT TO authenticated
WITH CHECK (
  author_kind = 'submitter'
  AND author_role = 'wl_end_client'
  AND author_user_id = auth.uid()
  AND visible_to_submitter = true
  AND EXISTS (
    SELECT 1
    FROM public.wl_partner_feedback f
    WHERE f.id = wl_partner_feedback_messages.feedback_id
      AND f.partner_id = wl_partner_feedback_messages.partner_id
      AND f.submitted_by_user_id = auth.uid()
      AND f.status NOT IN ('closed')
  )
);
