-- =====================================================
-- PART 1: CREATE NEW TABLES
-- =====================================================

-- Table: call_report_imports - Track imported reports from Pabbly
CREATE TABLE public.call_report_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  import_source text NOT NULL DEFAULT 'pabbly',
  original_filename text,
  file_format text,
  import_status text NOT NULL DEFAULT 'pending',
  records_imported integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_log jsonb DEFAULT '[]'::jsonb,
  pabbly_execution_id text,
  email_subject text,
  email_from text,
  received_at timestamp with time zone,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: payment_failures - Track failed payment attempts
CREATE TABLE public.payment_failures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  failure_code text,
  failure_message text,
  attempt_number integer DEFAULT 1,
  failed_at timestamp with time zone DEFAULT now(),
  retry_scheduled_at timestamp with time zone,
  resolved_at timestamp with time zone,
  resolution_type text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: client_report_mappings - Map emails/patterns to clients
CREATE TABLE public.client_report_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  match_type text NOT NULL,
  match_value text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- PART 2: ADD COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add enhanced fields to call_logs
ALTER TABLE public.call_logs
ADD COLUMN IF NOT EXISTS external_call_id text,
ADD COLUMN IF NOT EXISTS talk_time_seconds integer,
ADD COLUMN IF NOT EXISTS acw_seconds integer,
ADD COLUMN IF NOT EXISTS handle_time_seconds integer,
ADD COLUMN IF NOT EXISTS billable_minutes numeric,
ADD COLUMN IF NOT EXISTS call_direction text,
ADD COLUMN IF NOT EXISTS agent_name text,
ADD COLUMN IF NOT EXISTS campaign_name text,
ADD COLUMN IF NOT EXISTS import_id uuid REFERENCES public.call_report_imports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS call_date date,
ADD COLUMN IF NOT EXISTS call_time time;

-- Add billing fields to leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS payment_method_type text DEFAULT 'auto_charge',
ADD COLUMN IF NOT EXISTS invoice_terms text DEFAULT 'net_15',
ADD COLUMN IF NOT EXISTS payment_method_on_file boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
ADD COLUMN IF NOT EXISTS last_payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_payment_status text,
ADD COLUMN IF NOT EXISTS payment_failure_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'US',
ADD COLUMN IF NOT EXISTS billing_currency text DEFAULT 'usd';

-- =====================================================
-- PART 3: CREATE INDEXES
-- =====================================================

-- Index for deduplication on call_logs
CREATE INDEX IF NOT EXISTS idx_call_logs_external_call_id ON public.call_logs(external_call_id);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_call_logs_call_date ON public.call_logs(call_date);

-- Index for payment failures lookup
CREATE INDEX IF NOT EXISTS idx_payment_failures_lead_id ON public.payment_failures(lead_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_resolved ON public.payment_failures(resolved_at) WHERE resolved_at IS NULL;

-- Index for report mappings
CREATE INDEX IF NOT EXISTS idx_client_report_mappings_lead ON public.client_report_mappings(lead_id);
CREATE INDEX IF NOT EXISTS idx_client_report_mappings_active ON public.client_report_mappings(is_active) WHERE is_active = true;

-- =====================================================
-- PART 4: ENABLE RLS ON NEW TABLES
-- =====================================================

ALTER TABLE public.call_report_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_report_mappings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 5: RLS POLICIES FOR call_report_imports
-- =====================================================

-- Admins can manage all import records
CREATE POLICY "Admins can manage call report imports"
ON public.call_report_imports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Agents can view import records
CREATE POLICY "Agents can view call report imports"
ON public.call_report_imports
FOR SELECT
USING (has_role(auth.uid(), 'agent'::app_role));

-- =====================================================
-- PART 6: RLS POLICIES FOR payment_failures
-- =====================================================

-- Admins can manage all payment failures
CREATE POLICY "Admins can manage payment failures"
ON public.payment_failures
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- PART 7: RLS POLICIES FOR client_report_mappings
-- =====================================================

-- Admins can manage all report mappings
CREATE POLICY "Admins can manage client report mappings"
ON public.client_report_mappings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));