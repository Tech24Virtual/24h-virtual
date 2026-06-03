
-- Create shift_invoices table for pay period submissions
CREATE TABLE public.shift_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_hours NUMERIC(8,2) NOT NULL,
  total_break_minutes INT NOT NULL DEFAULT 0,
  net_hours NUMERIC(8,2) NOT NULL,
  agent_notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  supervisor_id UUID,
  supervisor_approved_at TIMESTAMPTZ,
  supervisor_notes TEXT,
  payout_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.shift_invoices ENABLE ROW LEVEL SECURITY;

-- Agents can view their own invoices
CREATE POLICY "Agents can view own invoices"
  ON public.shift_invoices FOR SELECT
  USING (auth.uid() = agent_id);

-- Agents can insert their own invoices
CREATE POLICY "Agents can insert own invoices"
  ON public.shift_invoices FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- Agents can update own submitted invoices (for notes before supervisor review)
CREATE POLICY "Agents can update own submitted invoices"
  ON public.shift_invoices FOR UPDATE
  USING (auth.uid() = agent_id AND status = 'submitted');

-- Supervisors can view all invoices
CREATE POLICY "Supervisors can view all invoices"
  ON public.shift_invoices FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'));

-- Supervisors can update invoices (approve/reject)
CREATE POLICY "Supervisors can update invoices"
  ON public.shift_invoices FOR UPDATE
  USING (public.has_role(auth.uid(), 'supervisor'));

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices"
  ON public.shift_invoices FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update invoices (mark paid)
CREATE POLICY "Admins can update invoices"
  ON public.shift_invoices FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Billing role can view and update invoices
CREATE POLICY "Billing can view invoices"
  ON public.shift_invoices FOR SELECT
  USING (public.has_role(auth.uid(), 'billing'));

CREATE POLICY "Billing can update invoices"
  ON public.shift_invoices FOR UPDATE
  USING (public.has_role(auth.uid(), 'billing'));

-- Enable realtime for shift_invoices
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_invoices;
