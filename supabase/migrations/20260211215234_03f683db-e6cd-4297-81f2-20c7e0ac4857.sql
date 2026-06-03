
-- =============================================
-- Script Change Request System Tables
-- =============================================

-- 1. Script Change Requests
CREATE TABLE public.script_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  script_id UUID REFERENCES public.client_scripts(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  proposed_changes JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewer_notes TEXT,
  resolved_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'portal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.script_change_requests ENABLE ROW LEVEL SECURITY;

-- Clients can view their own requests
CREATE POLICY "Clients can view own change requests"
  ON public.script_change_requests FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

-- Clients can insert their own requests
CREATE POLICY "Clients can create change requests"
  ON public.script_change_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id);

-- Supervisors and admins can view all requests
CREATE POLICY "Supervisors can view all change requests"
  ON public.script_change_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- Supervisors and admins can update requests (approve/reject)
CREATE POLICY "Supervisors can update change requests"
  ON public.script_change_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- Anon can insert via quick link
CREATE POLICY "Anon can insert quick link requests"
  ON public.script_change_requests FOR INSERT TO anon
  WITH CHECK (source = 'quick_link');

-- Trigger for updated_at
CREATE TRIGGER update_script_change_requests_updated_at
  BEFORE UPDATE ON public.script_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_change_requests;

-- 2. Script Change Comments (threaded conversation)
CREATE TABLE public.script_change_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.script_change_requests(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT NOT NULL DEFAULT 'Unknown',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.script_change_comments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view comments on requests they have access to
CREATE POLICY "Clients can view comments on own requests"
  ON public.script_change_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.script_change_requests r
      WHERE r.id = request_id AND r.client_id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can view all comments"
  ON public.script_change_comments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- Authenticated users can insert comments on accessible requests
CREATE POLICY "Clients can comment on own requests"
  ON public.script_change_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.script_change_requests r
      WHERE r.id = request_id AND r.client_id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can comment on any request"
  ON public.script_change_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_change_comments;

-- 3. Client Quick Links
CREATE TABLE public.client_quick_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_quick_links ENABLE ROW LEVEL SECURITY;

-- Clients can view their own quick links
CREATE POLICY "Clients can view own quick links"
  ON public.client_quick_links FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

-- Clients can create their own quick links
CREATE POLICY "Clients can create quick links"
  ON public.client_quick_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id);

-- Clients can update their own quick links (deactivate)
CREATE POLICY "Clients can update own quick links"
  ON public.client_quick_links FOR UPDATE TO authenticated
  USING (auth.uid() = client_id);

-- Supervisors/admins full access
CREATE POLICY "Supervisors can manage all quick links"
  ON public.client_quick_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- Anon can read quick links (for token validation on public form)
CREATE POLICY "Anon can validate tokens"
  ON public.client_quick_links FOR SELECT TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
