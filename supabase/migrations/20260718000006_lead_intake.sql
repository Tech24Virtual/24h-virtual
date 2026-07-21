-- Lead intake pipeline: source vocabulary, intake tracking columns, partner-request linkage.
--
-- The requested `leads_source_check` list (website, wl_partner_request, affiliate_request,
-- referral_request, manual, import, five9, zapier, api, sales_team, other) does NOT cover the
-- values already in production use:
--   - src/lib/intake/captureLead.ts's LeadSource union (onboarding_wizard, call_advisor,
--     gpt_advisor, cost_calculator, launch_estimator, call_flow_builder, demo_consultation,
--     exit_intent, blog_lead, chat_widget, partner_interest, coming_soon, contact_form,
--     admin_manual, other) — live public funnels insert these today.
--   - Existing staging data: 'direct', 'referral' (distinct from the new 'referral_request').
-- Adding the constraint with only the requested 11 values would (a) fail to apply, since Postgres
-- validates existing rows at creation time and 'admin_manual'/'direct'/'referral' rows already
-- exist, and (b) break every live public lead-capture funnel going forward. The constraint below
-- is the union of both vocabularies so nothing already shipping breaks.
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check
  CHECK (source IS NULL OR source IN (
    -- existing captureLead.ts vocabulary
    'onboarding_wizard', 'call_advisor', 'gpt_advisor', 'cost_calculator', 'launch_estimator',
    'call_flow_builder', 'demo_consultation', 'exit_intent', 'blog_lead', 'chat_widget',
    'partner_interest', 'coming_soon', 'contact_form', 'admin_manual', 'other',
    -- existing legacy values found in production data
    'direct', 'referral',
    -- new lead-intake pipeline vocabulary
    'website', 'wl_partner_request', 'affiliate_request', 'referral_request',
    'manual', 'import', 'five9', 'zapier', 'api', 'sales_team'
  ));

-- Intake tracking columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS intake_form_data jsonb,
  ADD COLUMN IF NOT EXISTS intake_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_wl_partner_request boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_affiliate_request boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_referral_request boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referred_by_partner_id uuid REFERENCES public.white_label_partners(id),
  ADD COLUMN IF NOT EXISTS referred_by_affiliate_id uuid REFERENCES public.affiliates(id);

-- NOTE: no new "notify admin/sales on new lead" trigger here. Two triggers already do this for
-- every insert on public.leads, and adding a third would double-notify:
--   - `on_new_lead_notify_admin` -> notify_admin_new_lead() -> calls the send-admin-notification
--     edge function with the full lead record (including `source`), which emails/notifies admins.
--   - `trg_leads_auto_assign` -> assign_lead_to_sales_rep() -> round-robins NEW.assigned_to to the
--     least-loaded sales rep (when assigned_to IS NULL) and inserts a "New lead assigned"
--     notification for that specific rep.
-- Both fire regardless of `source`, so leads created via the new lead-intake edge function are
-- already covered by this existing pipeline with no changes needed.
