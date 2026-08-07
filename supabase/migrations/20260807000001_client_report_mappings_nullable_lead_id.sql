-- client_report_mappings.lead_id was NOT NULL with no default, which blocks
-- creating wl_campaign mappings (wl_client_id + partner_id set, no lead_id) —
-- the exact shape ingest-five9-call/index.ts already reads for WL routing.
-- Table has 0 rows currently, so this was never actually exercised.
ALTER TABLE public.client_report_mappings ALTER COLUMN lead_id DROP NOT NULL;
