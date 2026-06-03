-- Phase 3: Create ticketing system tables

-- Step 1: Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  source TEXT NOT NULL,
  category TEXT,
  
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_email TEXT,
  submitter_name TEXT,
  
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.white_label_partners(id) ON DELETE SET NULL,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  linked_task_id UUID REFERENCES public.crm_tasks(id) ON DELETE SET NULL
);

-- Step 2: Create ticket_replies table
CREATE TABLE public.ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Enable RLS on both tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- Step 4: Create updated_at trigger for support_tickets
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 5: Create indexes for performance
CREATE INDEX idx_support_tickets_source ON public.support_tickets(source);
CREATE INDEX idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_submitted_by ON public.support_tickets(submitted_by);
CREATE INDEX idx_support_tickets_lead_id ON public.support_tickets(lead_id);
CREATE INDEX idx_ticket_replies_ticket_id ON public.ticket_replies(ticket_id);

-- ============================================
-- RLS POLICIES FOR support_tickets
-- ============================================

-- Admins can manage ALL tickets
CREATE POLICY "Admins can manage all tickets"
ON public.support_tickets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Sales can view sales-source tickets only
CREATE POLICY "Sales can view sales tickets"
ON public.support_tickets FOR SELECT
USING (
  has_role(auth.uid(), 'sales'::app_role) 
  AND source = 'sales'
);

-- Sales can update sales-source tickets they're assigned to
CREATE POLICY "Sales can update assigned sales tickets"
ON public.support_tickets FOR UPDATE
USING (
  has_role(auth.uid(), 'sales'::app_role) 
  AND source = 'sales'
  AND assigned_to = auth.uid()
);

-- Agents can view client portal tickets
CREATE POLICY "Agents can view client tickets"
ON public.support_tickets FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND source = 'client_portal'
);

-- Agents can update client portal tickets they're assigned to
CREATE POLICY "Agents can update assigned client tickets"
ON public.support_tickets FOR UPDATE
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND source = 'client_portal'
  AND assigned_to = auth.uid()
);

-- Supervisors can view client portal tickets
CREATE POLICY "Supervisors can view client tickets"
ON public.support_tickets FOR SELECT
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND source = 'client_portal'
);

-- Supervisors can update any client portal tickets
CREATE POLICY "Supervisors can update client tickets"
ON public.support_tickets FOR UPDATE
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND source = 'client_portal'
);

-- Billing can view billing-category tickets from any source
CREATE POLICY "Billing can view billing tickets"
ON public.support_tickets FOR SELECT
USING (
  has_role(auth.uid(), 'billing'::app_role) 
  AND category = 'billing'
);

-- Billing can update billing-category tickets
CREATE POLICY "Billing can update billing tickets"
ON public.support_tickets FOR UPDATE
USING (
  has_role(auth.uid(), 'billing'::app_role) 
  AND category = 'billing'
);

-- Users can view their own submitted tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (submitted_by = auth.uid());

-- Authenticated users can create tickets from portals
CREATE POLICY "Authenticated users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND source IN ('client_portal', 'affiliate_portal', 'white_label_portal')
);

-- ============================================
-- RLS POLICIES FOR ticket_replies
-- ============================================

-- Admins can manage all replies
CREATE POLICY "Admins can manage ticket replies"
ON public.ticket_replies FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view replies for tickets they can see
CREATE POLICY "Staff can view ticket replies"
ON public.ticket_replies FOR SELECT
USING (
  (has_role(auth.uid(), 'sales'::app_role) 
   OR has_role(auth.uid(), 'agent'::app_role) 
   OR has_role(auth.uid(), 'supervisor'::app_role)
   OR has_role(auth.uid(), 'billing'::app_role))
);

-- Staff can insert replies
CREATE POLICY "Staff can add ticket replies"
ON public.ticket_replies FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'sales'::app_role) 
   OR has_role(auth.uid(), 'agent'::app_role) 
   OR has_role(auth.uid(), 'supervisor'::app_role)
   OR has_role(auth.uid(), 'billing'::app_role))
);

-- Users can view replies on their tickets (non-internal only)
CREATE POLICY "Users can view own ticket replies"
ON public.ticket_replies FOR SELECT
USING (
  is_internal = false
  AND EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_replies.ticket_id 
    AND st.submitted_by = auth.uid()
  )
);

-- Users can reply to their own tickets
CREATE POLICY "Users can reply to own tickets"
ON public.ticket_replies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_replies.ticket_id 
    AND st.submitted_by = auth.uid()
  )
  AND is_internal = false
);