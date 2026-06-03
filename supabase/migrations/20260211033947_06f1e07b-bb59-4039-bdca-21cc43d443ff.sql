
-- Create agent_banking table
CREATE TABLE public.agent_banking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL UNIQUE,
  bank_name text,
  account_holder_name text,
  account_number_encrypted text,
  routing_number text,
  institution_number text,
  transit_number text,
  account_type text NOT NULL DEFAULT 'checking',
  swift_bic text,
  iban text,
  currency text NOT NULL DEFAULT 'CAD',
  country text NOT NULL DEFAULT 'CA',
  airwallex_beneficiary_id text,
  hourly_rate numeric(8,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_banking ENABLE ROW LEVEL SECURITY;

-- Agents can read their own banking record
CREATE POLICY "Agents can view own banking" ON public.agent_banking
  FOR SELECT USING (auth.uid() = agent_id);

-- Agents can insert their own banking record
CREATE POLICY "Agents can insert own banking" ON public.agent_banking
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

-- Agents can update their own banking record
CREATE POLICY "Agents can update own banking" ON public.agent_banking
  FOR UPDATE USING (auth.uid() = agent_id);

-- Admin can manage all banking records
CREATE POLICY "Admins can manage all banking" ON public.agent_banking
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Billing can view all banking records
CREATE POLICY "Billing can view all banking" ON public.agent_banking
  FOR SELECT USING (has_role(auth.uid(), 'billing'::app_role));

-- Billing can update banking records (for setting hourly rate, beneficiary id)
CREATE POLICY "Billing can update banking" ON public.agent_banking
  FOR UPDATE USING (has_role(auth.uid(), 'billing'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_agent_banking_updated_at
  BEFORE UPDATE ON public.agent_banking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add payout columns to shift_invoices
ALTER TABLE public.shift_invoices
  ADD COLUMN payout_amount numeric(10,2),
  ADD COLUMN airwallex_transfer_id text;
