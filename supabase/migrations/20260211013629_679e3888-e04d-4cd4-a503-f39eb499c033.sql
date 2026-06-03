
-- Add account_code to leads for Reach59 client mapping
ALTER TABLE public.leads ADD COLUMN account_code text;
CREATE UNIQUE INDEX idx_leads_account_code ON public.leads (account_code) WHERE account_code IS NOT NULL;

-- Add Reach59 cross-reference columns to outbound_call_requests
ALTER TABLE public.outbound_call_requests ADD COLUMN external_request_id text;
ALTER TABLE public.outbound_call_requests ADD COLUMN client_account_code text;
