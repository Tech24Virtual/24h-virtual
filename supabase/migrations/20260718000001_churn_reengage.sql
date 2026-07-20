-- CRM pipeline restructure: churn + re-engage tracking for leads.
--
-- STATUS: Applied directly to staging (sdsxdqsomxuimrjpaylv) via `supabase db
-- query` at implementation time. Kept here for documentation and so future
-- deployments (e.g. prod) pick it up.

-- pipeline_stage is a plain `text` column guarded by a CHECK constraint
-- (leads_pipeline_stage_check), not an enum type. Confirmed via:
--   SELECT pg_typeof(pipeline_stage) FROM leads LIMIT 1;   -- => text

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS churned_at timestamptz,
  ADD COLUMN IF NOT EXISTS churn_reason text,
  ADD COLUMN IF NOT EXISTS wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wl_churn_contact_eligible_at timestamptz;

-- The existing CHECK constraint already allows 'churned' but not 're_engage'.
-- Drop and recreate with 're_engage' added — every other allowed value is
-- preserved as-is.
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_pipeline_stage_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_pipeline_stage_check
  CHECK (pipeline_stage = ANY (ARRAY[
    'new'::text, 'contacted'::text, 'qualified'::text, 'proposal'::text,
    'sales'::text, 'onboarding'::text, 'ready_for_billing'::text,
    'active'::text, 'won'::text, 'lost'::text, 'churned'::text,
    're_engage'::text
  ]));

-- "Admins can manage leads" (cmd = ALL) already covers UPDATE, and a "Sales
-- can update leads" policy already exists, so table-level UPDATE grants were
-- already effectively required and present. Re-asserted here as a no-op
-- safety net in case the authenticated role's grant was ever revoked.
GRANT UPDATE ON public.leads TO authenticated;

-- Daily check: auto-move WL-sourced churned clients into re_engage once
-- their partner-exclusivity window (set on churn, +3 months) has elapsed.
SELECT cron.schedule(
  'wl-churn-eligibility-check',
  '0 9 * * *',
  $$
  UPDATE public.leads
  SET pipeline_stage = 're_engage'
  WHERE pipeline_stage = 'churned'
  AND wl_partner_id IS NOT NULL
  AND wl_churn_contact_eligible_at IS NOT NULL
  AND wl_churn_contact_eligible_at <= now();
  $$
);
