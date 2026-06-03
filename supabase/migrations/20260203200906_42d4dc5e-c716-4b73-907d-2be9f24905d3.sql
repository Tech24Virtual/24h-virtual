-- Add pipeline tracking columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'new',
ADD COLUMN IF NOT EXISTS assigned_sales_rep uuid,
ADD COLUMN IF NOT EXISTS assigned_onboarding_rep uuid,
ADD COLUMN IF NOT EXISTS service_type text,
ADD COLUMN IF NOT EXISTS plan_minutes integer,
ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS forwarding_number text,
ADD COLUMN IF NOT EXISTS onboarding_checklist jsonb DEFAULT '{
  "consultation_completed": false,
  "call_flows_created": false,
  "scripts_written": false,
  "dispositions_configured": false,
  "post_call_flow_setup": false,
  "forwarding_number_assigned": false,
  "test_call_completed": false
}'::jsonb,
ADD COLUMN IF NOT EXISTS payment_link_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Create index for pipeline stage filtering
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);

-- Create usage_records table for overage tracking
CREATE TABLE IF NOT EXISTS public.usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  client_id uuid,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  minutes_included integer NOT NULL DEFAULT 0,
  minutes_used integer NOT NULL DEFAULT 0,
  overage_rate numeric NOT NULL DEFAULT 0,
  billed boolean DEFAULT false,
  stripe_invoice_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create computed columns as regular columns (Postgres doesn't support virtual generated columns well)
-- We'll calculate overage_minutes and overage_amount in queries/application

-- Create indexes for usage_records
CREATE INDEX IF NOT EXISTS idx_usage_records_lead_id ON public.usage_records(lead_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_billing_period ON public.usage_records(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_usage_records_billed ON public.usage_records(billed);

-- Enable RLS on usage_records
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_records
CREATE POLICY "Admins can manage all usage records"
ON public.usage_records
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view own usage records"
ON public.usage_records
FOR SELECT
USING (client_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_usage_records_updated_at
BEFORE UPDATE ON public.usage_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();