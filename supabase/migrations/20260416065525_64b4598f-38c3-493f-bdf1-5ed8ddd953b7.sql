-- Phase 1: Add user_id to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Backfill user_id from auth.users email match
UPDATE public.leads SET user_id = au.id
FROM auth.users au WHERE leads.email = au.email AND leads.user_id IS NULL;

-- Index for FK lookups
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);

-- ============================================================
-- Phase 2a: Agent call_logs scoping
-- ============================================================
DROP POLICY IF EXISTS "Agents can view call logs" ON public.call_logs;

CREATE POLICY "Agents can view assigned client call logs"
ON public.call_logs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'agent'::app_role)
  AND client_id IN (
    SELECT client_id FROM public.client_agent_assignments WHERE agent_id = auth.uid()
  )
);

-- ============================================================
-- Phase 2b: Agent leads scoping
-- ============================================================
DROP POLICY IF EXISTS "Agents can view leads" ON public.leads;

CREATE POLICY "Agents can view assigned leads"
ON public.leads FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'agent'::app_role)
  AND id IN (
    SELECT client_id FROM public.client_agent_assignments WHERE agent_id = auth.uid()
  )
);

-- ============================================================
-- Phase 2c: Client self-access on leads (user_id, not email)
-- ============================================================
CREATE POLICY "Clients can view own lead record"
ON public.leads FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- Phase 2d: Slack screenshots storage - restrict to staff
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view screenshots" ON storage.objects;

CREATE POLICY "Staff can view screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'slack-screenshots'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'agent'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
  )
);

-- ============================================================
-- Phase 2e: Slack channels - restrict to staff
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read slack channels" ON public.slack_channels;

CREATE POLICY "Staff can read slack channels"
ON public.slack_channels FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'agent'::app_role)
  OR public.has_role(auth.uid(), 'supervisor'::app_role)
);

-- ============================================================
-- Phase 2f: Slack user mappings - restrict to staff
-- ============================================================
DROP POLICY IF EXISTS "Staff can read slack user mappings" ON public.slack_user_mappings;

CREATE POLICY "Staff can read slack user mappings"
ON public.slack_user_mappings FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'agent'::app_role)
  OR public.has_role(auth.uid(), 'supervisor'::app_role)
);

-- ============================================================
-- Phase 2g: WL client ticket replies - SELECT + INSERT
-- ============================================================
CREATE POLICY "WL clients view own ticket replies"
ON public.wl_client_ticket_replies FOR SELECT TO authenticated
USING (
  is_internal = false
  AND ticket_id IN (
    SELECT id FROM public.wl_client_tickets
    WHERE wl_client_id = public.get_wl_client_id(auth.uid())
  )
);

CREATE POLICY "WL clients insert own ticket replies"
ON public.wl_client_ticket_replies FOR INSERT TO authenticated
WITH CHECK (
  ticket_id IN (
    SELECT id FROM public.wl_client_tickets
    WHERE wl_client_id = public.get_wl_client_id(auth.uid())
  )
  AND author_type = 'client'
  AND is_internal = false
);

-- ============================================================
-- Phase 2h: Make work_queue authoritative for staff tickets
-- Drop ALL source-based staff policies
-- ============================================================
DROP POLICY IF EXISTS "Staff can view relevant tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Agents can view client tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Agents can update assigned client tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Supervisors can view client tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Supervisors can update client tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Billing can view billing tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Billing can update billing tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Sales can update assigned sales tickets" ON public.support_tickets;

-- Unified staff SELECT policy using work_queue
CREATE POLICY "Staff can view relevant tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR submitted_by = auth.uid()
  OR assigned_to = auth.uid()
  OR (public.has_role(auth.uid(), 'agent'::app_role) AND work_queue = 'agent')
  OR (public.has_role(auth.uid(), 'supervisor'::app_role) AND work_queue IN ('agent', 'supervisor'))
  OR (public.has_role(auth.uid(), 'sales'::app_role) AND work_queue = 'sales')
  OR (public.has_role(auth.uid(), 'billing'::app_role) AND work_queue = 'billing')
  OR (public.has_role(auth.uid(), 'tech'::app_role) AND work_queue = 'tech')
  OR (public.has_role(auth.uid(), 'hr'::app_role) AND work_queue = 'hr')
);

-- Department UPDATE policies using work_queue
CREATE POLICY "Agents can update assigned agent tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'agent'::app_role)
  AND work_queue = 'agent'
  AND assigned_to = auth.uid()
);

CREATE POLICY "Supervisors can update supervisor queue tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'supervisor'::app_role)
  AND work_queue IN ('agent', 'supervisor')
);

CREATE POLICY "Sales can update assigned sales tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'sales'::app_role)
  AND work_queue = 'sales'
  AND assigned_to = auth.uid()
);

CREATE POLICY "Billing can update billing queue tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'billing'::app_role)
  AND work_queue = 'billing'
);

CREATE POLICY "Tech can update tech queue tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'tech'::app_role)
  AND work_queue = 'tech'
);

CREATE POLICY "HR can update hr queue tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'hr'::app_role)
  AND work_queue = 'hr'
);

-- ============================================================
-- Phase 2i: Expand INSERT policy for support_tickets
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.support_tickets;

CREATE POLICY "Authenticated users can create tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);