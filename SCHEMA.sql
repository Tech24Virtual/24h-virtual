-- =====================================================================
-- Database Schema Export (public schema)
-- Generated: 2026-05-20T18:39:55Z
-- =====================================================================

-- ============= ENUM TYPES =============
CREATE TYPE public.after_hours_behavior AS ENUM ('voicemail', 'forward', 'overflow', 'message_only', 'closed');

CREATE TYPE public.app_role AS ENUM ('admin', 'client', 'agent', 'affiliate', 'white_label', 'referrer', 'sales', 'billing', 'supervisor', 'tech', 'hr', 'wl_client');

CREATE TYPE public.approval_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TYPE public.approval_state AS ENUM ('not_required', 'pending', 'approved', 'rejected');

CREATE TYPE public.campaign_tenant_kind AS ENUM ('direct_24h', 'wl_partner');

CREATE TYPE public.chat_ai_mode AS ENUM ('agent_only', 'ai_first', 'ai_only', 'offline_capture');

CREATE TYPE public.chat_ai_state AS ENUM ('idle', 'active', 'handed_off', 'disabled');

CREATE TYPE public.chat_conversation_status AS ENUM ('new', 'queued', 'assigned', 'active', 'waiting', 'closed');

CREATE TYPE public.chat_deployment_status AS ENUM ('draft', 'active', 'paused');

CREATE TYPE public.chat_ownership_mode AS ENUM ('direct', 'wl');

CREATE TYPE public.chat_sender_type AS ENUM ('visitor', 'ai', 'agent', 'system');

CREATE TYPE public.deal_scope AS ENUM ('direct', 'partner');

CREATE TYPE public.deal_stage AS ENUM ('identified', 'outreach_started', 'proposal_prepared', 'proposal_sent', 'negotiation', 'verbally_approved', 'implemented', 'closed_won', 'closed_lost', 'deferred');

CREATE TYPE public.deal_status AS ENUM ('open', 'won', 'lost', 'deferred', 'stalled');

CREATE TYPE public.deal_type AS ENUM ('renewal', 'expansion', 'downsell', 'save');

CREATE TYPE public.department_lifecycle AS ENUM ('lead', 'onboarding_started', 'intake_in_progress', 'build_packet_ready', 'script_ready', 'training_ready', 'qa_ready', 'approved_for_go_live', 'live', 'change_requested', 'archived');

CREATE TYPE public.department_type AS ENUM ('sales', 'billing', 'customer_service', 'new_claim', 'other_requests', 'dealership', 'general_inquiry', 'custom');

CREATE TYPE public.escalation_strategy AS ENUM ('none', 'transfer_human', 'callback_request', 'supervisor', 'overflow_number');

CREATE TYPE public.phone_role AS ENUM ('main', 'overflow', 'after_hours', 'billing', 'sales', 'voicemail', 'callback', 'other');

CREATE TYPE public.receptionist_mode AS ENUM ('ai_only', 'hybrid', 'human_only');


-- ============= TABLES =============

-- ---------- public.addon_products ----------
CREATE TABLE public.addon_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  default_price numeric NOT NULL,
  billing_type text NOT NULL,
  unit text,
  stripe_product_id text,
  stripe_price_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ---------- public.admin_email_connections ----------
CREATE TABLE public.admin_email_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'resend'::text,
  api_key_encrypted text NOT NULL,
  from_name text NOT NULL,
  from_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  last_tested_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.admin_email_contacts ----------
CREATE TABLE public.admin_email_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  tags text[] DEFAULT '{}'::text[],
  subscribed boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.admin_email_sends ----------
CREATE TABLE public.admin_email_sends (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  newsletter_draft_id uuid,
  subject text NOT NULL,
  recipients_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  sent_at timestamp with time zone,
  resend_batch_id text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.admin_newsletter_drafts ----------
CREATE TABLE public.admin_newsletter_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  draft_month date NOT NULL,
  subject_line text,
  html_content text,
  plain_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ---------- public.admin_seo_reports ----------
CREATE TABLE public.admin_seo_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_month date NOT NULL,
  total_posts integer DEFAULT 0,
  total_keywords integer DEFAULT 0,
  keywords_covered integer DEFAULT 0,
  narrative text,
  report_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ---------- public.admin_settings ----------
CREATE TABLE public.admin_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- ---------- public.admin_social_snippets ----------
CREATE TABLE public.admin_social_snippets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blog_post_id uuid,
  platform text NOT NULL,
  snippet_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ---------- public.admin_wordpress_connection ----------
CREATE TABLE public.admin_wordpress_connection (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  site_url text NOT NULL,
  username text NOT NULL,
  app_password_encrypted text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  last_tested_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.affiliate_marketing_assets ----------
CREATE TABLE public.affiliate_marketing_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  asset_type text NOT NULL DEFAULT 'banner'::text,
  asset_url text NOT NULL,
  dimensions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.affiliate_payouts ----------
CREATE TABLE public.affiliate_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  payment_method text,
  payment_details jsonb DEFAULT '{}'::jsonb,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  notes text
);

-- ---------- public.affiliate_referrals ----------
CREATE TABLE public.affiliate_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  affiliate_id uuid,
  referred_email text NOT NULL,
  referred_name text,
  status text DEFAULT 'clicked'::text,
  commission_amount numeric(10,2) DEFAULT 150,
  click_timestamp timestamp with time zone DEFAULT now(),
  converted_at timestamp with time zone,
  lead_id uuid,
  retention_bonus_amount numeric DEFAULT 50,
  last_retention_paid_at timestamp with time zone,
  retention_payments_count integer DEFAULT 0
);

-- ---------- public.affiliates ----------
CREATE TABLE public.affiliates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  name text,
  affiliate_code text NOT NULL,
  commission_rate numeric(5,4) DEFAULT 0.10,
  status text DEFAULT 'pending'::text,
  total_earnings numeric(10,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  tier text NOT NULL DEFAULT 'standard'::text,
  lifetime_referrals integer NOT NULL DEFAULT 0,
  payment_email text,
  payment_method_preferred text
);

-- ---------- public.agent_banking ----------
CREATE TABLE public.agent_banking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  bank_name text,
  account_holder_name text,
  account_number_encrypted text,
  routing_number text,
  institution_number text,
  transit_number text,
  account_type text NOT NULL DEFAULT 'checking'::text,
  swift_bic text,
  iban text,
  currency text NOT NULL DEFAULT 'CAD'::text,
  country text NOT NULL DEFAULT 'CA'::text,
  airwallex_beneficiary_id text,
  hourly_rate numeric(8,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  employment_type text NOT NULL DEFAULT 'contractor'::text,
  break_policy text NOT NULL DEFAULT 'global'::text
);

-- ---------- public.agent_configs ----------
CREATE TABLE public.agent_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  mode text NOT NULL DEFAULT 'simulation'::text,
  max_auto_actions_per_run integer NOT NULL DEFAULT 0,
  last_run_at timestamp with time zone,
  error_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  safety_thresholds jsonb DEFAULT '{}'::jsonb
);

-- ---------- public.agent_onboarding ----------
CREATE TABLE public.agent_onboarding (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  applicant_user_id uuid NOT NULL,
  supervisor_id uuid NOT NULL,
  job_application_id uuid,
  status text NOT NULL DEFAULT 'offer_pending'::text,
  pay_rate numeric,
  pay_type text DEFAULT 'hourly'::text,
  schedule_type text DEFAULT 'full_time'::text,
  contract_text text,
  contract_signed_at timestamp with time zone,
  banking_submitted boolean NOT NULL DEFAULT false,
  google_email text,
  five9_username text,
  five9_password_encrypted text,
  slack_invited boolean NOT NULL DEFAULT false,
  training_checklist jsonb DEFAULT '[]'::jsonb,
  training_completed_at timestamp with time zone,
  live_training_scheduled_at timestamp with time zone,
  live_training_completed_at timestamp with time zone,
  slack_channels_assigned boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  onboarding_template_id uuid,
  hr_approved_by uuid
);

-- ---------- public.agent_onboarding_log ----------
CREATE TABLE public.agent_onboarding_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  onboarding_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.agent_performance_reviews ----------
CREATE TABLE public.agent_performance_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  quality_score integer,
  attendance_score integer,
  communication_score integer,
  overall_score numeric,
  strengths text,
  areas_for_improvement text,
  notes text,
  status text DEFAULT 'draft'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- ---------- public.agent_prompts ----------
CREATE TABLE public.agent_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  prompt_type text NOT NULL DEFAULT 'system'::text,
  version integer NOT NULL DEFAULT 1,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.agent_runs ----------
CREATE TABLE public.agent_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  agent_name text NOT NULL,
  step_name text NOT NULL,
  input_snapshot jsonb,
  output_snapshot jsonb,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.agent_schedules ----------
CREATE TABLE public.agent_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  created_by uuid NOT NULL,
  shift_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'scheduled'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  recurrence_type text,
  recurrence_days integer,
  recurrence_end_date date,
  parent_schedule_id uuid
);

-- ---------- public.agent_shift_breaks ----------
CREATE TABLE public.agent_shift_breaks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  break_type integer NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.agent_shifts ----------
CREATE TABLE public.agent_shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  clock_in timestamp with time zone NOT NULL DEFAULT now(),
  clock_out timestamp with time zone,
  status text NOT NULL DEFAULT 'active'::text,
  void_reason text,
  total_break_minutes integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  edited_at timestamp with time zone,
  edit_reason text,
  original_clock_in timestamp with time zone,
  original_clock_out timestamp with time zone,
  manual_deduction_minutes integer NOT NULL DEFAULT 0,
  edited_by uuid
);

-- ---------- public.agent_skills ----------
CREATE TABLE public.agent_skills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  skill_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.ai_draft_log ----------
CREATE TABLE public.ai_draft_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid,
  prompt text NOT NULL,
  response jsonb,
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash'::text,
  status text NOT NULL DEFAULT 'ok'::text,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.approval_policies ----------
CREATE TABLE public.approval_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  scope text NOT NULL,
  deal_type text NOT NULL,
  min_discount_pct numeric(6,2),
  triggers_on_non_standard_term boolean NOT NULL DEFAULT false,
  triggers_on_exception boolean NOT NULL DEFAULT false,
  triggers_on_unknown_discount boolean NOT NULL DEFAULT false,
  required_approver_role text NOT NULL DEFAULT 'admin'::text,
  tier integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  sla_hours integer NOT NULL DEFAULT 24
);

-- ---------- public.approval_policy_versions ----------
CREATE TABLE public.approval_policy_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL,
  version_no integer NOT NULL,
  action text NOT NULL,
  changed_by uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot jsonb NOT NULL
);

-- ---------- public.approval_requests ----------
CREATE TABLE public.approval_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  policy_id uuid,
  required_role text NOT NULL DEFAULT 'admin'::text,
  tier integer NOT NULL DEFAULT 1,
  status public.approval_request_status NOT NULL DEFAULT 'pending'::approval_request_status,
  reason text,
  decision_notes text,
  decided_by uuid,
  decided_at timestamp with time zone,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  sla_hours_snapshot integer,
  created_notified_at timestamp with time zone,
  sla_notified_at timestamp with time zone,
  estimated_discount_pct_snapshot numeric,
  is_non_standard_term_snapshot boolean,
  is_exception_snapshot boolean,
  proposed_plan_key_snapshot text,
  proposed_term_months_snapshot integer
);

-- ---------- public.audit_log ----------
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_table text,
  target_id text,
  tenant_context jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.autoblog_queue ----------
CREATE TABLE public.autoblog_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  keyword_id uuid,
  keyword_text text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued'::text,
  content_length text NOT NULL DEFAULT 'medium'::text,
  tone text NOT NULL DEFAULT 'professional'::text,
  angle text,
  generated_post_id uuid,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.automation_check_runs ----------
CREATE TABLE public.automation_check_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  check_name text NOT NULL,
  status text NOT NULL,
  recs_created integer NOT NULL DEFAULT 0,
  recs_resolved integer NOT NULL DEFAULT 0,
  error_text text,
  ran_at timestamp with time zone NOT NULL DEFAULT now(),
  triggered_by text NOT NULL DEFAULT 'cron'::text
);

-- ---------- public.automation_recommendations ----------
CREATE TABLE public.automation_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  kind text NOT NULL,
  tier text NOT NULL DEFAULT 'recommend'::text,
  severity text NOT NULL DEFAULT 'info'::text,
  title text NOT NULL,
  detail text,
  drill_route text,
  dedupe_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open'::text,
  resolved_reason text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  first_detected_at timestamp with time zone NOT NULL DEFAULT now(),
  last_detected_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.billing_notes ----------
CREATE TABLE public.billing_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  created_by uuid NOT NULL,
  note text NOT NULL,
  note_type text NOT NULL DEFAULT 'general'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.billing_summaries ----------
CREATE TABLE public.billing_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  client_id uuid NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  total_minutes integer NOT NULL DEFAULT 0,
  total_calls integer NOT NULL DEFAULT 0,
  included_minutes integer NOT NULL DEFAULT 0,
  overage_minutes integer NOT NULL DEFAULT 0,
  overage_amount numeric NOT NULL DEFAULT 0,
  plan_name text,
  stripe_invoice_id text,
  stripe_invoice_url text,
  mode_used text NOT NULL DEFAULT 'simulation'::text,
  raw_details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.blog_internal_links ----------
CREATE TABLE public.blog_internal_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blog_post_id uuid NOT NULL,
  target_url text NOT NULL,
  anchor_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.blog_posts ----------
CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text,
  featured_image_url text,
  author text DEFAULT '24H Virtual'::text,
  category text DEFAULT 'Tips & Guides'::text,
  tags text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'draft'::text,
  published_at timestamp with time zone,
  scheduled_publish_at timestamp with time zone,
  meta_title text,
  meta_description text,
  old_wordpress_url text,
  reading_time integer DEFAULT 5,
  content_word_count integer DEFAULT 0,
  views integer DEFAULT 0,
  ai_generated boolean DEFAULT false,
  internal_link_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  primary_path text,
  primary_offer text,
  source text DEFAULT 'local'::text
);

-- ---------- public.call_flow_receptionist_configs ----------
CREATE TABLE public.call_flow_receptionist_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_department_id uuid NOT NULL,
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  mode public.receptionist_mode NOT NULL DEFAULT 'hybrid'::receptionist_mode,
  greeting text,
  after_hours public.after_hours_behavior NOT NULL DEFAULT 'voicemail'::after_hours_behavior,
  escalation public.escalation_strategy NOT NULL DEFAULT 'transfer_human'::escalation_strategy,
  primary_contact_id uuid,
  overflow_department_id uuid,
  overflow_number text,
  voicemail_email text,
  business_hours jsonb NOT NULL DEFAULT '{"tz": "America/New_York", "weekly": [], "holidays": []}'::jsonb,
  ground_in_campaign boolean NOT NULL DEFAULT true,
  knowledge_notes text,
  enabled boolean NOT NULL DEFAULT false,
  last_validated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ---------- public.call_logs ----------
CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  caller_name text,
  caller_phone text,
  call_duration integer,
  call_type text,
  status text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  external_call_id text,
  talk_time_seconds integer,
  acw_seconds integer,
  handle_time_seconds integer,
  billable_minutes numeric,
  call_direction text,
  agent_name text,
  campaign_name text,
  import_id uuid,
  call_date date,
  call_time time without time zone,
  caller_email text,
  caller_number text,
  disposition text,
  dnis text
);

-- ---------- public.call_report_imports ----------
CREATE TABLE public.call_report_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  import_source text NOT NULL DEFAULT 'pabbly'::text,
  original_filename text,
  file_format text,
  import_status text NOT NULL DEFAULT 'pending'::text,
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

-- ---------- public.campaign_audit_log ----------
CREATE TABLE public.campaign_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  actor_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_department_type_defaults ----------
CREATE TABLE public.campaign_department_type_defaults (
  department_type public.department_type NOT NULL,
  default_field_group_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_faqs_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_five9_mappings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- ---------- public.campaign_faq_entries ----------
CREATE TABLE public.campaign_faq_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  scope text NOT NULL,
  client_department_id uuid,
  question text NOT NULL,
  answer_md text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'draft'::text,
  version integer NOT NULL DEFAULT 1,
  effective_from timestamp with time zone,
  effective_to timestamp with time zone,
  published_at timestamp with time zone,
  published_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  client_location_id uuid
);

-- ---------- public.campaign_field_display_labels ----------
CREATE TABLE public.campaign_field_display_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL,
  audience text NOT NULL,
  label_override text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_field_groups ----------
CREATE TABLE public.campaign_field_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  scope text NOT NULL,
  client_department_id uuid,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  client_location_id uuid
);

-- ---------- public.campaign_field_options ----------
CREATE TABLE public.campaign_field_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_field_visibility_rules ----------
CREATE TABLE public.campaign_field_visibility_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL,
  audience text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_fields ----------
CREATE TABLE public.campaign_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  scope text NOT NULL,
  client_department_id uuid,
  field_group_id uuid,
  field_key text NOT NULL,
  display_label text NOT NULL,
  field_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  is_internal_only boolean NOT NULL DEFAULT false,
  placeholder text,
  help_text text,
  validation_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  client_location_id uuid
);

-- ---------- public.campaign_go_live_status_snapshots ----------
CREATE TABLE public.campaign_go_live_status_snapshots (
  campaign_id uuid NOT NULL,
  all_ok boolean NOT NULL DEFAULT false,
  faqs_ok boolean NOT NULL DEFAULT false,
  policies_ok boolean NOT NULL DEFAULT false,
  training_ok boolean NOT NULL DEFAULT false,
  script_published boolean NOT NULL DEFAULT false,
  last_evaluated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_knowledge_versions ----------
CREATE TABLE public.campaign_knowledge_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  tenant_kind public.campaign_tenant_kind,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ---------- public.campaign_policy_blocks ----------
CREATE TABLE public.campaign_policy_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  scope text NOT NULL,
  client_department_id uuid,
  policy_kind text NOT NULL,
  title text NOT NULL,
  body_md text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'draft'::text,
  version integer NOT NULL DEFAULT 1,
  effective_from timestamp with time zone,
  effective_to timestamp with time zone,
  published_at timestamp with time zone,
  published_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  client_location_id uuid
);

-- ---------- public.campaign_publish_versions ----------
CREATE TABLE public.campaign_publish_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  campaign_id uuid NOT NULL,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  published_by uuid,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_scenarios ----------
CREATE TABLE public.campaign_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  campaign_id uuid NOT NULL,
  client_department_id uuid,
  title text NOT NULL,
  trigger_md text NOT NULL,
  expected_outcome_md text NOT NULL,
  disposition text,
  routing text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'draft'::text,
  version integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- ---------- public.campaign_script_document_versions ----------
CREATE TABLE public.campaign_script_document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  version_number integer NOT NULL,
  tree jsonb NOT NULL,
  notes text,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  published_by uuid
);

-- ---------- public.campaign_script_documents ----------
CREATE TABLE public.campaign_script_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  wl_client_id uuid,
  client_lead_id uuid,
  title text NOT NULL DEFAULT 'Untitled Script'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  current_version_id uuid,
  tree jsonb NOT NULL DEFAULT '{"edges": [], "nodes": [], "intents": []}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- ---------- public.campaign_templates ----------
CREATE TABLE public.campaign_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  source_campaign_id uuid,
  name text NOT NULL,
  description text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_training_completions ----------
CREATE TABLE public.campaign_training_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  agent_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_training_lessons ----------
CREATE TABLE public.campaign_training_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body_md text NOT NULL DEFAULT ''::text,
  sort_order integer NOT NULL DEFAULT 0,
  passing_score integer NOT NULL DEFAULT 80,
  required boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_training_modules ----------
CREATE TABLE public.campaign_training_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  title text NOT NULL,
  summary text,
  body_md text NOT NULL DEFAULT ''::text,
  required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'::text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  retraining_interval_days integer
);

-- ---------- public.campaign_training_quiz_attempts ----------
CREATE TABLE public.campaign_training_quiz_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  module_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  attempted_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_training_quiz_questions ----------
CREATE TABLE public.campaign_training_quiz_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  question text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer NOT NULL DEFAULT 0,
  explanation text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_training_retraining_events ----------
CREATE TABLE public.campaign_training_retraining_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  trigger_kind text NOT NULL,
  trigger_entity_id uuid,
  affected_signoffs integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.campaign_training_signoffs ----------
CREATE TABLE public.campaign_training_signoffs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  completion_id uuid NOT NULL,
  module_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  signed_off_by uuid NOT NULL,
  signed_off_at timestamp with time zone NOT NULL DEFAULT now(),
  signoff_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  needs_refresh boolean NOT NULL DEFAULT false,
  refresh_reason text
);

-- ---------- public.campaigns ----------
CREATE TABLE public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  client_department_id uuid NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  published_version_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  legacy_script_cutover_at timestamp with time zone,
  go_live_override_at timestamp with time zone,
  go_live_override_by uuid,
  go_live_override_reason text
);

-- ---------- public.capacity_assumptions ----------
CREATE TABLE public.capacity_assumptions (
  scope text NOT NULL,
  csm_accounts_per_head integer NOT NULL DEFAULT 40,
  support_tickets_per_agent_per_month integer NOT NULL DEFAULT 600,
  implementation_projects_per_specialist integer NOT NULL DEFAULT 12,
  wl_rollout_per_ops_head integer NOT NULL DEFAULT 4,
  arpu_assumption numeric(12,2) NOT NULL DEFAULT 500,
  tickets_per_account_per_month numeric(8,2) NOT NULL DEFAULT 4,
  new_projects_per_new_account numeric(6,2) NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  notes text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.capacity_supply ----------
CREATE TABLE public.capacity_supply (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  function text NOT NULL,
  current_headcount numeric(6,2) NOT NULL DEFAULT 0,
  planned_headcount numeric(6,2),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.chat_activity_log ----------
CREATE TABLE public.chat_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid,
  deployment_id uuid,
  actor_id uuid,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.chat_ai_configs ----------
CREATE TABLE public.chat_ai_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL,
  mode public.chat_ai_mode NOT NULL DEFAULT 'agent_only'::chat_ai_mode,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  system_instructions text,
  escalation_keywords text[] NOT NULL DEFAULT ARRAY['human'::text, 'agent'::text, 'representative'::text, 'speak to someone'::text, 'frustrated'::text],
  handoff_on_low_confidence boolean NOT NULL DEFAULT true,
  handoff_after_intake boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.chat_assignments ----------
CREATE TABLE public.chat_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  unassigned_at timestamp with time zone,
  reason text
);

-- ---------- public.chat_brand_configs ----------
CREATE TABLE public.chat_brand_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL,
  logo_url text,
  accent_color text NOT NULL DEFAULT '#3B82F6'::text,
  launcher_label text NOT NULL DEFAULT 'Chat with us'::text,
  greeting text NOT NULL DEFAULT 'Hi there! How can we help you today?'::text,
  offline_message text NOT NULL DEFAULT 'We are currently offline. Leave a message and we will get back to you.'::text,
  online_label text NOT NULL DEFAULT 'Online'::text,
  offline_label text NOT NULL DEFAULT 'Offline'::text,
  pre_chat_form_enabled boolean NOT NULL DEFAULT false,
  pre_chat_fields jsonb NOT NULL DEFAULT '[{"key": "name", "label": "Name", "required": true}, {"key": "email", "label": "Email", "required": true}]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.chat_canned_responses ----------
CREATE TABLE public.chat_canned_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deployment_id uuid,
  shortcut text NOT NULL,
  body text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.chat_conversations ----------
CREATE TABLE public.chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL,
  visitor_id uuid NOT NULL,
  ownership_mode public.chat_ownership_mode NOT NULL,
  direct_client_id uuid,
  wl_partner_id uuid,
  wl_client_id uuid,
  status public.chat_conversation_status NOT NULL DEFAULT 'new'::chat_conversation_status,
  ai_state public.chat_ai_state NOT NULL DEFAULT 'idle'::chat_ai_state,
  assigned_agent_id uuid,
  channel text NOT NULL DEFAULT 'webchat'::text,
  ai_summary text,
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  unread_agent_count integer NOT NULL DEFAULT 0,
  unread_visitor_count integer NOT NULL DEFAULT 0,
  closed_at timestamp with time zone,
  closed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.chat_deployments ----------
CREATE TABLE public.chat_deployments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ownership_mode public.chat_ownership_mode NOT NULL,
  direct_client_id uuid,
  lead_id uuid,
  wl_partner_id uuid,
  wl_client_id uuid,
  display_name text NOT NULL,
  status public.chat_deployment_status NOT NULL DEFAULT 'draft'::chat_deployment_status,
  widget_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
  embed_secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.chat_handoff_events ----------
CREATE TABLE public.chat_handoff_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  trigger_type text NOT NULL,
  trigger_detail text,
  ai_summary text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.chat_messages ----------
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_type public.chat_sender_type NOT NULL,
  sender_id uuid,
  sender_name text,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.chat_visitors ----------
CREATE TABLE public.chat_visitors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL,
  visitor_uid text NOT NULL,
  name text,
  email text,
  phone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.client_addons ----------
CREATE TABLE public.client_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  addon_slug text NOT NULL,
  addon_name text NOT NULL,
  price numeric NOT NULL,
  billing_type text NOT NULL,
  quantity integer DEFAULT 1,
  is_active boolean DEFAULT true,
  stripe_subscription_item_id text,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ---------- public.client_agent_assignments ----------
CREATE TABLE public.client_agent_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  assigned_by uuid,
  is_primary boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- ---------- public.client_contacts ----------
CREATE TABLE public.client_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'primary'::text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ---------- public.client_departments ----------
CREATE TABLE public.client_departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  department_name text NOT NULL,
  department_type public.department_type NOT NULL DEFAULT 'custom'::department_type,
  service_type text,
  lifecycle public.department_lifecycle NOT NULL DEFAULT 'lead'::department_lifecycle,
  go_live_status text,
  onboarding_owner uuid,
  supervisor_owner uuid,
  primary_contact_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  client_location_id uuid,
  owner_kind text NOT NULL DEFAULT 'client'::text,
  routing_entry_type text NOT NULL DEFAULT 'direct'::text,
  display_name text
);

-- ---------- public.client_handoff_documents ----------
CREATE TABLE public.client_handoff_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  handoff_id uuid NOT NULL,
  document_type text NOT NULL DEFAULT 'other'::text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active'::text
);

-- ---------- public.client_handoff_items ----------
CREATE TABLE public.client_handoff_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  handoff_id uuid NOT NULL,
  item_key text NOT NULL,
  label text NOT NULL,
  item_type text NOT NULL DEFAULT 'text'::text,
  is_required boolean NOT NULL DEFAULT true,
  is_client_fillable boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'::text,
  value_json jsonb,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.client_handoff_requests ----------
CREATE TABLE public.client_handoff_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  handoff_id uuid NOT NULL,
  request_type text NOT NULL DEFAULT 'clarification'::text,
  title text NOT NULL,
  message text NOT NULL,
  target_item_key text,
  status text NOT NULL DEFAULT 'open'::text,
  requested_by uuid,
  resolved_by uuid,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone
);

-- ---------- public.client_locations ----------
CREATE TABLE public.client_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  name text NOT NULL,
  code text,
  status text NOT NULL DEFAULT 'active'::text,
  address text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ---------- public.client_onboarding_activity ----------
CREATE TABLE public.client_onboarding_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  handoff_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_id uuid,
  actor_label text,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.client_onboarding_handoffs ----------
CREATE TABLE public.client_onboarding_handoffs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_lead_id uuid NOT NULL,
  client_user_id uuid,
  status text NOT NULL DEFAULT 'collecting_info'::text,
  checklist_template text NOT NULL DEFAULT 'direct_client_default'::text,
  checklist_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  current_intake_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.client_quick_links ----------
CREATE TABLE public.client_quick_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.client_report_mappings ----------
CREATE TABLE public.client_report_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  match_type text NOT NULL,
  match_value text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  wl_client_id uuid,
  partner_id uuid
);

-- ---------- public.client_scripts ----------
CREATE TABLE public.client_scripts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  name text NOT NULL,
  greeting text,
  faqs jsonb DEFAULT '[]'::jsonb,
  call_handling_rules jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  migrated_to_campaign_id uuid,
  migrated_at timestamp with time zone
);

-- ---------- public.communication_actions ----------
CREATE TABLE public.communication_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  target_id uuid NOT NULL,
  template_id uuid NOT NULL,
  play_id uuid,
  channel text NOT NULL DEFAULT 'in_app'::text,
  status text NOT NULL DEFAULT 'suggested'::text,
  suppression_reason text,
  rendered_subject text,
  rendered_body text,
  sent_at timestamp with time zone,
  approved_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deal_id uuid
);

-- ---------- public.communication_templates ----------
CREATE TABLE public.communication_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app'::text,
  play_type text NOT NULL,
  template_key text NOT NULL,
  sequence_key text,
  step_number integer NOT NULL DEFAULT 1,
  subject text NOT NULL,
  body text NOT NULL,
  allowed_tokens text[] NOT NULL DEFAULT ARRAY[]::text[],
  requires_approval boolean NOT NULL DEFAULT true,
  auto_send boolean NOT NULL DEFAULT false,
  suppression_hours integer NOT NULL DEFAULT 72,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.contracts ----------
CREATE TABLE public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  document_url text,
  status text DEFAULT 'pending'::text,
  signed_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- ---------- public.crm_activities ----------
CREATE TABLE public.crm_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- ---------- public.crm_tasks ----------
CREATE TABLE public.crm_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  priority text NOT NULL DEFAULT 'medium'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  assigned_to uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  visibility text DEFAULT 'universal'::text
);

-- ---------- public.custom_plans ----------
CREATE TABLE public.custom_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  plan_type text NOT NULL,
  plan_name text NOT NULL,
  minute_rate numeric,
  fixed_amount numeric,
  minimum_monthly numeric,
  stripe_product_id text,
  stripe_price_id text,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ---------- public.dashboard_events ----------
CREATE TABLE public.dashboard_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  surface text NOT NULL,
  persona text NOT NULL DEFAULT 'anonymous'::text,
  target text,
  session_id text,
  path text,
  user_id uuid,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.data_export_snapshots ----------
CREATE TABLE public.data_export_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_type text NOT NULL,
  scope text NOT NULL,
  partner_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  generated_by uuid,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text
);

-- ---------- public.department_numbers ----------
CREATE TABLE public.department_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_department_id uuid NOT NULL,
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  dnis text,
  forwarding_number text,
  ani_display text,
  transfer_display text,
  voicemail_enabled boolean NOT NULL DEFAULT false,
  callback_enabled boolean NOT NULL DEFAULT false,
  phone_role public.phone_role NOT NULL DEFAULT 'main'::phone_role,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ---------- public.direct_success_plays ----------
CREATE TABLE public.direct_success_plays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  play_type text NOT NULL,
  status text NOT NULL DEFAULT 'not_started'::text,
  notes text,
  follow_up_date date,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  template_id uuid,
  due_date date,
  last_touch_at timestamp with time zone,
  reminder_enabled boolean NOT NULL DEFAULT true
);

-- ---------- public.disc_audiences ----------
CREATE TABLE public.disc_audiences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  audience_name text NOT NULL,
  audience_slug text NOT NULL,
  audience_type text NOT NULL DEFAULT 'industry'::text,
  description text,
  primary_needs jsonb DEFAULT '[]'::jsonb,
  messaging_angle text,
  default_cta text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.disc_faq_sets ----------
CREATE TABLE public.disc_faq_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  topic_cluster text,
  audience text,
  status text NOT NULL DEFAULT 'draft'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.disc_faqs ----------
CREATE TABLE public.disc_faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  faq_set_id uuid NOT NULL,
  question text NOT NULL,
  answer_short text,
  answer_full text,
  display_order integer NOT NULL DEFAULT 0,
  applicable_page_types jsonb DEFAULT '[]'::jsonb,
  applicable_keywords jsonb DEFAULT '[]'::jsonb,
  applicable_countries jsonb DEFAULT '[]'::jsonb,
  applicable_audiences jsonb DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.disc_generated_pages ----------
CREATE TABLE public.disc_generated_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid,
  location_id uuid,
  keyword_id uuid,
  audience_id uuid,
  page_type text NOT NULL,
  slug text NOT NULL,
  full_url text,
  page_title text,
  meta_title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  breadcrumb_title text,
  h1 text,
  hero_content text,
  direct_answer_content text,
  local_overview_content text,
  problem_section_content text,
  solution_section_content text,
  feature_section_content text,
  faq_content jsonb DEFAULT '[]'::jsonb,
  faq_set_id uuid,
  internal_links_payload jsonb DEFAULT '[]'::jsonb,
  schema_payload jsonb DEFAULT '{}'::jsonb,
  word_count integer NOT NULL DEFAULT 0,
  quality_score integer NOT NULL DEFAULT 0,
  duplicate_warning_score integer NOT NULL DEFAULT 0,
  readiness_state text NOT NULL DEFAULT 'draft'::text,
  publish_status text NOT NULL DEFAULT 'unpublished'::text,
  indexation_status text NOT NULL DEFAULT 'index'::text,
  include_in_sitemap boolean NOT NULL DEFAULT false,
  manual_override boolean NOT NULL DEFAULT false,
  source_combination_hash text,
  last_updated_display timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone
);

-- ---------- public.disc_internal_link_items ----------
CREATE TABLE public.disc_internal_link_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  link_set_id uuid NOT NULL,
  anchor_text text NOT NULL,
  target_url text NOT NULL,
  target_type text NOT NULL DEFAULT 'pillar'::text,
  display_order integer NOT NULL DEFAULT 0,
  conditions_json jsonb DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.disc_internal_link_sets ----------
CREATE TABLE public.disc_internal_link_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  link_group_type text NOT NULL DEFAULT 'cluster'::text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.disc_keywords ----------
CREATE TABLE public.disc_keywords (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  keyword_slug text NOT NULL,
  keyword_plural text,
  topic_cluster text,
  search_intent text,
  audience_default uuid,
  product_category text,
  primary_cta_type text,
  default_direct_answer text,
  default_problem_angle text,
  default_solution_angle text,
  default_feature_set jsonb DEFAULT '[]'::jsonb,
  default_faq_set_id uuid,
  active boolean NOT NULL DEFAULT true,
  priority_score integer NOT NULL DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.disc_locations ----------
CREATE TABLE public.disc_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  city text NOT NULL,
  city_slug text NOT NULL,
  state_or_province text,
  state_or_province_slug text,
  state_or_province_abbr text,
  country text NOT NULL,
  country_slug text NOT NULL,
  metro text,
  region text,
  nearby_cities jsonb DEFAULT '[]'::jsonb,
  priority_score integer NOT NULL DEFAULT 50,
  active boolean NOT NULL DEFAULT true,
  custom_city_intro text,
  local_challenge text,
  local_benefit text,
  service_boundary_note text,
  custom_cta_override text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  seeded boolean NOT NULL DEFAULT false
);

-- ---------- public.disc_publish_log ----------
CREATE TABLE public.disc_publish_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  generated_page_id uuid NOT NULL,
  actor_user_id uuid,
  action_type text NOT NULL,
  old_status text,
  new_status text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.disc_templates ----------
CREATE TABLE public.disc_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug_pattern text NOT NULL,
  page_type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'::text,
  title_template text,
  meta_title_template text,
  meta_description_template text,
  og_title_template text,
  og_description_template text,
  breadcrumb_template text,
  h1_template text,
  hero_template text,
  direct_answer_template text,
  local_overview_template text,
  problem_section_template text,
  solution_section_template text,
  feature_section_template text,
  faq_intro_template text,
  cta_template text,
  schema_type_defaults jsonb DEFAULT '[]'::jsonb,
  internal_link_defaults jsonb DEFAULT '[]'::jsonb,
  min_word_count integer NOT NULL DEFAULT 400,
  min_faq_count integer NOT NULL DEFAULT 3,
  quality_threshold integer NOT NULL DEFAULT 70,
  requires_location_specific_content boolean NOT NULL DEFAULT false,
  requires_keyword_specific_content boolean NOT NULL DEFAULT false,
  requires_audience_specific_content boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.email_followups ----------
CREATE TABLE public.email_followups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  subject text NOT NULL,
  contact_email text NOT NULL,
  direction text NOT NULL,
  notes text,
  follow_up_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  completed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.experiment_allocation_log ----------
CREATE TABLE public.experiment_allocation_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL,
  variant_key text NOT NULL,
  algorithm text NOT NULL,
  weight numeric,
  sample_size_at_decision integer,
  reward_count_at_decision integer,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.feature_launch_flags ----------
CREATE TABLE public.feature_launch_flags (
  feature_key text NOT NULL,
  display_name text NOT NULL,
  description text,
  is_live boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- ---------- public.feedback ----------
CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  message text NOT NULL,
  type text,
  page text,
  created_at timestamp with time zone DEFAULT now(),
  title text,
  description text,
  mode text NOT NULL DEFAULT 'direct'::text,
  priority text NOT NULL DEFAULT 'normal'::text,
  status text NOT NULL DEFAULT 'new'::text,
  source_dashboard text,
  role text,
  assigned_to uuid,
  attachment_url text,
  created_by_email text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolved_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.feedback_handoffs ----------
CREATE TABLE public.feedback_handoffs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  tenant_kind text NOT NULL,
  wl_partner_id uuid,
  kind text NOT NULL,
  label text NOT NULL,
  url text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.feedback_messages ----------
CREATE TABLE public.feedback_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  author_kind text NOT NULL,
  body text NOT NULL,
  visible_to_submitter boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.five9_drift_snapshots ----------
CREATE TABLE public.five9_drift_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  wl_client_id uuid,
  client_lead_id uuid,
  client_department_id uuid,
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL,
  drift jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_by uuid
);

-- ---------- public.five9_native_variables ----------
CREATE TABLE public.five9_native_variables (
  variable_name text NOT NULL,
  display_label text NOT NULL,
  data_type text NOT NULL,
  direction text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.five9_variable_groups ----------
CREATE TABLE public.five9_variable_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ---------- public.five9_variable_mappings ----------
CREATE TABLE public.five9_variable_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  client_department_id uuid,
  field_id uuid,
  variable_group_id uuid,
  five9_variable_name text NOT NULL,
  five9_variable_kind text NOT NULL,
  data_type text NOT NULL,
  direction text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ---------- public.forecast_assumptions ----------
CREATE TABLE public.forecast_assumptions (
  assumption_key text NOT NULL DEFAULT 'default'::text,
  baseline_monthly_churn_rate numeric(6,4) NOT NULL DEFAULT 0.025,
  baseline_monthly_expansion_rate numeric(6,4) NOT NULL DEFAULT 0.005,
  new_business_mrr_direct numeric(12,2) NOT NULL DEFAULT 0,
  new_business_mrr_wl numeric(12,2) NOT NULL DEFAULT 0,
  horizon_months integer NOT NULL DEFAULT 12,
  notes text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.forecast_snapshots ----------
CREATE TABLE public.forecast_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  label text,
  notes text,
  horizon_start date NOT NULL,
  horizon_end date NOT NULL,
  parameters jsonb NOT NULL,
  payload jsonb NOT NULL,
  parameters_hash text NOT NULL,
  created_by uuid,
  source text NOT NULL DEFAULT 'manual'::text
);

-- ---------- public.forecast_stage_probabilities ----------
CREATE TABLE public.forecast_stage_probabilities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_type public.deal_type NOT NULL,
  stage public.deal_stage NOT NULL,
  probability numeric(5,4) NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.gtm_targets ----------
CREATE TABLE public.gtm_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  period date NOT NULL,
  scope text NOT NULL,
  target_new_business_mrr numeric(12,2),
  target_nrr numeric(6,4),
  target_renewal_rate numeric(6,4),
  notes text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.hr_communications ----------
CREATE TABLE public.hr_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'general'::text,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.internal_fulfillment_activity ----------
CREATE TABLE public.internal_fulfillment_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_type text NOT NULL,
  actor_user_id uuid,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.internal_fulfillment_intake_documents ----------
CREATE TABLE public.internal_fulfillment_intake_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  source_document_id uuid,
  document_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.internal_fulfillment_intakes ----------
CREATE TABLE public.internal_fulfillment_intakes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid,
  source_handoff_id uuid,
  proposal_id uuid,
  lead_id uuid,
  intake_number text NOT NULL,
  status text NOT NULL DEFAULT 'new_submission'::text,
  priority text NOT NULL DEFAULT 'normal'::text,
  submitted_by uuid,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  received_at timestamp with time zone,
  approved_at timestamp with time zone,
  activated_at timestamp with time zone,
  closed_at timestamp with time zone,
  assigned_to uuid,
  snapshot_json jsonb NOT NULL,
  snapshot_version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'wl'::text,
  client_lead_id uuid
);

-- ---------- public.internal_fulfillment_notes ----------
CREATE TABLE public.internal_fulfillment_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL,
  author_user_id uuid,
  note_type text NOT NULL DEFAULT 'general'::text,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.job_applications ----------
CREATE TABLE public.job_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_posting_id uuid,
  applicant_user_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  resume_url text,
  cover_letter text,
  status text DEFAULT 'new'::text,
  workflow_stage text DEFAULT 'Applied'::text,
  applied_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ---------- public.job_postings ----------
CREATE TABLE public.job_postings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department text,
  location text,
  description text,
  requirements text,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- ---------- public.keyword_tracker ----------
CREATE TABLE public.keyword_tracker (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  category text NOT NULL DEFAULT 'primary'::text,
  search_volume integer DEFAULT 0,
  difficulty text DEFAULT 'medium'::text,
  target_page text,
  target_blog_post_id uuid,
  content_status text NOT NULL DEFAULT 'no_content'::text,
  ranking_position integer,
  monthly_impressions integer,
  monthly_clicks integer,
  ctr numeric,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  sort_priority integer NOT NULL DEFAULT 0
);

-- ---------- public.lead_conversions ----------
CREATE TABLE public.lead_conversions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  converted_at timestamp with time zone NOT NULL DEFAULT now(),
  converted_by uuid,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.leads ----------
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  source text,
  status text DEFAULT 'new'::text,
  score integer DEFAULT 0,
  notes text,
  assigned_to uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  pipeline_stage text DEFAULT 'new'::text,
  assigned_sales_rep uuid,
  assigned_onboarding_rep uuid,
  service_type text,
  plan_minutes integer,
  billing_period text DEFAULT 'monthly'::text,
  forwarding_number text,
  onboarding_checklist jsonb DEFAULT '{"scripts_written": false, "call_flows_created": false, "test_call_completed": false, "post_call_flow_setup": false, "consultation_completed": false, "dispositions_configured": false, "forwarding_number_assigned": false}'::jsonb,
  payment_link_sent_at timestamp with time zone,
  subscription_started_at timestamp with time zone,
  stripe_customer_id text,
  stripe_subscription_id text,
  dynamic_billing_enabled boolean DEFAULT true,
  custom_plan_enabled boolean DEFAULT false,
  custom_minute_rate numeric,
  custom_plan_name text,
  billing_anchor_day integer DEFAULT 1,
  payment_method_type text DEFAULT 'auto_charge'::text,
  invoice_terms text DEFAULT 'net_15'::text,
  payment_method_on_file boolean DEFAULT false,
  stripe_payment_method_id text,
  last_payment_date timestamp with time zone,
  last_payment_status text,
  payment_failure_count integer DEFAULT 0,
  country text DEFAULT 'US'::text,
  billing_currency text DEFAULT 'usd'::text,
  promo_code text,
  account_code text,
  last_contacted_at timestamp with time zone,
  next_follow_up timestamp with time zone,
  lead_temperature text DEFAULT 'warm'::text,
  user_id uuid,
  qualified_at timestamp with time zone,
  won_at timestamp with time zone,
  lost_at timestamp with time zone,
  lost_reason text
);

-- ---------- public.meetings ----------
CREATE TABLE public.meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  event_type text,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 30,
  status text NOT NULL DEFAULT 'scheduled'::text,
  attendee_name text,
  attendee_email text,
  calendly_event_id text,
  calendly_event_url text,
  meeting_link text,
  location text,
  notes text,
  assigned_to uuid,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.mission_control_events ----------
CREATE TABLE public.mission_control_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  agent_name text NOT NULL,
  event_type text NOT NULL,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.missions ----------
CREATE TABLE public.missions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  initiated_by text,
  summary text,
  error_flag boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- ---------- public.notifications ----------
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  message text,
  type text,
  category text,
  is_read boolean DEFAULT false,
  action_url text,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ---------- public.offboarding ----------
CREATE TABLE public.offboarding (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  initiated_by uuid NOT NULL,
  reason text NOT NULL DEFAULT 'resignation'::text,
  reason_details text,
  status text NOT NULL DEFAULT 'initiated'::text,
  last_working_day date,
  exit_interview_notes text,
  google_deprovisioned boolean NOT NULL DEFAULT false,
  five9_deprovisioned boolean NOT NULL DEFAULT false,
  slack_removed boolean NOT NULL DEFAULT false,
  final_payout_processed boolean NOT NULL DEFAULT false,
  equipment_returned boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- ---------- public.offboarding_templates ----------
CREATE TABLE public.offboarding_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.offer_exposures ----------
CREATE TABLE public.offer_exposures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  offer_id uuid,
  offer_key text,
  experiment_id uuid,
  variant_key text,
  surface text NOT NULL,
  audience text,
  event text NOT NULL,
  plan_key text,
  stripe_price_id text,
  user_id uuid,
  lead_id uuid,
  visitor_key text,
  partner_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.offers ----------
CREATE TABLE public.offers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  label text NOT NULL,
  surface text NOT NULL,
  audience text NOT NULL DEFAULT 'all'::text,
  plan_key text NOT NULL,
  stripe_price_id text,
  experiment_id uuid,
  variant_key text,
  is_baseline boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  partner_id uuid,
  eligibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_min_usd numeric,
  price_max_usd numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.onboarding_templates ----------
CREATE TABLE public.onboarding_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.open_shifts ----------
CREATE TABLE public.open_shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_agent_id uuid NOT NULL,
  original_schedule_id uuid,
  shift_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  required_skills text[] NOT NULL DEFAULT '{}'::text[],
  notes text,
  status text NOT NULL DEFAULT 'open'::text,
  claimed_by uuid,
  claimed_at timestamp with time zone,
  posted_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.outbound_call_attempts ----------
CREATE TABLE public.outbound_call_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  agent_id uuid,
  agent_name text,
  attempt_number integer NOT NULL DEFAULT 1,
  outcome text NOT NULL,
  notes text,
  retry_scheduled_for timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.outbound_call_requests ----------
CREATE TABLE public.outbound_call_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  lead_id uuid,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  reason text,
  urgency text NOT NULL DEFAULT 'normal'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  claimed_by uuid,
  claimed_at timestamp with time zone,
  completed_at timestamp with time zone,
  outcome text,
  outcome_notes text,
  source text NOT NULL DEFAULT 'portal'::text,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  next_retry_at timestamp with time zone,
  last_attempt_at timestamp with time zone,
  last_attempt_outcome text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  external_request_id text,
  client_account_code text,
  callback_type text NOT NULL DEFAULT 'instant'::text,
  callback_window text,
  routing_mode text NOT NULL DEFAULT 'human'::text,
  intent text NOT NULL DEFAULT 'sales'::text,
  target_queue text,
  source_channel text NOT NULL DEFAULT 'web_widget'::text,
  source_url text,
  five9_campaign_id text,
  dial_status text,
  recording_url text,
  wl_client_id uuid
);

-- ---------- public.outline_progress ----------
CREATE TABLE public.outline_progress (
  feature_id text NOT NULL,
  tested boolean NOT NULL DEFAULT false,
  tested_by uuid,
  tested_at timestamp with time zone,
  notes text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.partner_success_plays ----------
CREATE TABLE public.partner_success_plays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  play_type text NOT NULL,
  status text NOT NULL DEFAULT 'not_started'::text,
  notes text,
  follow_up_date date,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  template_id uuid,
  due_date date,
  last_touch_at timestamp with time zone,
  reminder_enabled boolean NOT NULL DEFAULT true
);

-- ---------- public.payment_failures ----------
CREATE TABLE public.payment_failures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
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

-- ---------- public.people ----------
CREATE TABLE public.people (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  primary_email text NOT NULL,
  full_name text NOT NULL,
  type_tags text[] DEFAULT '{}'::text[],
  profile_id uuid,
  lead_id uuid,
  slack_user_id text,
  stripe_customer_id text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.people_external_ids ----------
CREATE TABLE public.people_external_ids (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  source text NOT NULL,
  external_id text NOT NULL,
  extra jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.platform_knowledge ----------
CREATE TABLE public.platform_knowledge (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dashboard text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  content_type text NOT NULL DEFAULT 'feature'::text,
  sort_order integer NOT NULL DEFAULT 0,
  onboarding_step integer
);

-- ---------- public.platform_settings ----------
CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  force_simulation_mode boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- ---------- public.play_suggestions ----------
CREATE TABLE public.play_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  target_id uuid NOT NULL,
  template_id uuid NOT NULL,
  opportunity_type text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  resulting_play_id uuid,
  decided_by uuid,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.playbook_templates ----------
CREATE TABLE public.playbook_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  play_type text NOT NULL,
  template_key text NOT NULL,
  title text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'opportunity'::text,
  trigger_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_followup_days integer NOT NULL DEFAULT 7,
  auto_create boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.pricing_experiment_assignments ----------
CREATE TABLE public.pricing_experiment_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL,
  variant_key text NOT NULL,
  lead_id uuid,
  visitor_key text,
  surface_key text,
  assigned_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.pricing_experiments ----------
CREATE TABLE public.pricing_experiments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hypothesis text,
  status text NOT NULL DEFAULT 'draft'::text,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  primary_metric text,
  secondary_metrics text[],
  target_audience text,
  decision_rule text,
  owner_user_id uuid,
  scheduled_for timestamp with time zone,
  paused_at timestamp with time zone,
  min_sample_per_variant integer NOT NULL DEFAULT 100,
  allocation_mode text NOT NULL DEFAULT 'fixed'::text,
  bandit_algorithm text NOT NULL DEFAULT 'thompson'::text,
  max_exposure_per_variant integer,
  kill_switch_active boolean NOT NULL DEFAULT false,
  sequential_looks integer NOT NULL DEFAULT 5,
  min_effect_size numeric,
  loss_threshold_pct numeric
);

-- ---------- public.profiles ----------
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  company_name text,
  phone text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  business_hours jsonb DEFAULT '{"friday": {"end": "17:00", "start": "09:00", "enabled": true}, "monday": {"end": "17:00", "start": "09:00", "enabled": true}, "sunday": {"end": "17:00", "start": "09:00", "enabled": false}, "tuesday": {"end": "17:00", "start": "09:00", "enabled": true}, "saturday": {"end": "17:00", "start": "09:00", "enabled": false}, "thursday": {"end": "17:00", "start": "09:00", "enabled": true}, "wednesday": {"end": "17:00", "start": "09:00", "enabled": true}}'::jsonb,
  notification_preferences jsonb DEFAULT '{"sms_notifications": false, "email_notifications": true}'::jsonb,
  after_hours_settings jsonb DEFAULT '{"take_messages": true, "holiday_coverage": true, "emergency_escalation": false}'::jsonb,
  employment_status text DEFAULT 'active'::text,
  hire_date date,
  department text,
  job_title text,
  reporting_to uuid,
  onboarding_completed boolean NOT NULL DEFAULT false,
  onboarding_completed_at timestamp with time zone,
  is_demo_account boolean NOT NULL DEFAULT false,
  partner_welcome_seen boolean NOT NULL DEFAULT false
);

-- ---------- public.qa_environment_flags ----------
CREATE TABLE public.qa_environment_flags (
  id boolean NOT NULL DEFAULT true,
  qa_seed_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- ---------- public.qa_phase2_results ----------
CREATE TABLE public.qa_phase2_results (
  id bigint NOT NULL DEFAULT nextval('qa_phase2_results_id_seq'::regclass),
  run_at timestamp with time zone NOT NULL DEFAULT now(),
  check_name text NOT NULL,
  passed boolean NOT NULL,
  detail text
);

-- ---------- public.qa_release_gates ----------
CREATE TABLE public.qa_release_gates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  release_label text NOT NULL,
  scope_summary text,
  scope_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  gate_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision text NOT NULL DEFAULT 'pending'::text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  decided_by uuid,
  decided_at timestamp with time zone
);

-- ---------- public.referral_partners ----------
CREATE TABLE public.referral_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  referrer_company_name text NOT NULL,
  referrer_name text NOT NULL,
  referrer_email text NOT NULL,
  referrer_phone text,
  referred_company_name text NOT NULL,
  referred_contact_name text NOT NULL,
  referred_email text NOT NULL,
  referred_phone text,
  relationship text,
  expected_needs text,
  is_current_client boolean DEFAULT false,
  status text DEFAULT 'pending'::text,
  reward_amount numeric DEFAULT 0,
  reward_paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- ---------- public.renewal_expansion_deals ----------
CREATE TABLE public.renewal_expansion_deals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scope public.deal_scope NOT NULL,
  target_id uuid NOT NULL,
  deal_type public.deal_type NOT NULL,
  related_renewal_workflow_id uuid,
  related_partner_play_id uuid,
  related_direct_play_id uuid,
  owner_user_id uuid,
  current_plan_key text,
  current_subscription_id uuid,
  proposed_plan_key text,
  proposed_offer_id uuid,
  proposed_term_months integer,
  proposed_price_summary text,
  stage public.deal_stage NOT NULL DEFAULT 'identified'::deal_stage,
  status public.deal_status NOT NULL DEFAULT 'open'::deal_status,
  outcome_reason text,
  expected_close_date date,
  implemented_at timestamp with time zone,
  notes text,
  stage_changed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  approval_state public.approval_state NOT NULL DEFAULT 'not_required'::approval_state,
  estimated_discount_pct numeric(6,2),
  is_non_standard_term boolean NOT NULL DEFAULT false,
  is_exception boolean NOT NULL DEFAULT false,
  approval_evaluated_at timestamp with time zone
);

-- ---------- public.renewal_workflows ----------
CREATE TABLE public.renewal_workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  target_id uuid NOT NULL,
  subscription_id text,
  renewal_date date NOT NULL,
  stage text NOT NULL DEFAULT 'approaching'::text,
  outcome_notes text,
  last_touch_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.revops_period_snapshots ----------
CREATE TABLE public.revops_period_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  period_start_date date NOT NULL,
  period_end_date date NOT NULL,
  label text NOT NULL,
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  captured_by uuid,
  linked_forecast_snapshot_id uuid,
  linked_board_pack_ref text,
  notes text,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ---------- public.revops_snapshot_capacity ----------
CREATE TABLE public.revops_snapshot_capacity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  scope text NOT NULL,
  function text NOT NULL,
  demand numeric,
  current_supply numeric,
  gap_now numeric,
  over_under_pct numeric,
  gtm_target_new_mrr numeric,
  gtm_forecast_new_mrr numeric,
  gtm_variance_pct numeric
);

-- ---------- public.revops_snapshot_metrics ----------
CREATE TABLE public.revops_snapshot_metrics (
  snapshot_id uuid NOT NULL,
  starting_mrr_usd numeric,
  ending_mrr_usd numeric,
  net_new_mrr_usd numeric,
  new_mrr_usd numeric,
  churned_mrr_usd numeric,
  expansion_mrr_usd numeric,
  contraction_mrr_usd numeric,
  new_subs integer,
  churned_subs integer,
  ending_active_subs integer,
  nrr_pct numeric,
  grr_pct numeric,
  direct_mrr_usd numeric,
  wl_recurring_proxy_usd numeric
);

-- ---------- public.revops_snapshot_pipeline ----------
CREATE TABLE public.revops_snapshot_pipeline (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  bucket text NOT NULL,
  deal_type text,
  stage text,
  count integer NOT NULL DEFAULT 0,
  weighted_count numeric,
  notes text
);

-- ---------- public.sales_commissions ----------
CREATE TABLE public.sales_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sales_rep_id uuid NOT NULL,
  lead_id uuid,
  commission_rate numeric NOT NULL DEFAULT 0.10,
  base_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  approved_by uuid,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.sales_proposals ----------
CREATE TABLE public.sales_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  created_by uuid NOT NULL,
  title text NOT NULL,
  service_type text,
  plan_minutes integer,
  billing_period text DEFAULT 'monthly'::text,
  billing_currency text DEFAULT 'USD'::text,
  monthly_price numeric DEFAULT 0,
  setup_fee numeric DEFAULT 0,
  custom_terms text,
  status text NOT NULL DEFAULT 'draft'::text,
  sent_at timestamp with time zone,
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone
);

-- ---------- public.sales_targets ----------
CREATE TABLE public.sales_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  target_leads integer NOT NULL DEFAULT 0,
  target_conversions integer NOT NULL DEFAULT 0,
  target_revenue numeric NOT NULL DEFAULT 0,
  actual_leads integer NOT NULL DEFAULT 0,
  actual_conversions integer NOT NULL DEFAULT 0,
  actual_revenue numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.saved_scenarios ----------
CREATE TABLE public.saved_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL,
  notes text,
  baseline jsonb NOT NULL DEFAULT '{}'::jsonb,
  levers jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  scenario_key text,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.script_change_comments ----------
CREATE TABLE public.script_change_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  author_id uuid,
  author_name text NOT NULL DEFAULT 'Unknown'::text,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.script_change_requests ----------
CREATE TABLE public.script_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  script_id uuid,
  request_type text NOT NULL DEFAULT 'other'::text,
  title text NOT NULL,
  description text,
  proposed_changes jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewer_notes text,
  resolved_at timestamp with time zone,
  source text NOT NULL DEFAULT 'portal'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.shift_invoices ----------
CREATE TABLE public.shift_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_hours numeric(8,2) NOT NULL,
  total_break_minutes integer NOT NULL DEFAULT 0,
  net_hours numeric(8,2) NOT NULL,
  agent_notes text,
  status text NOT NULL DEFAULT 'submitted'::text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  supervisor_id uuid,
  supervisor_approved_at timestamp with time zone,
  supervisor_notes text,
  payout_date date,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  payout_amount numeric(10,2),
  airwallex_transfer_id text
);

-- ---------- public.slack_channels ----------
CREATE TABLE public.slack_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slack_channel_id text NOT NULL,
  name text NOT NULL,
  is_dm boolean NOT NULL DEFAULT false,
  is_private boolean NOT NULL DEFAULT false,
  topic text,
  members text[] NOT NULL DEFAULT '{}'::text[],
  last_synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.slack_messages ----------
CREATE TABLE public.slack_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slack_channel_id text NOT NULL,
  slack_message_ts text NOT NULL,
  slack_user_id text,
  sender_name text,
  content text NOT NULL,
  is_from_crm boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.slack_user_mappings ----------
CREATE TABLE public.slack_user_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slack_user_id text NOT NULL,
  slack_display_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.supervisor_escalations ----------
CREATE TABLE public.supervisor_escalations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL,
  target_department text NOT NULL,
  subject text NOT NULL,
  description text,
  priority text DEFAULT 'medium'::text,
  related_agent_id uuid,
  related_client_id uuid,
  status text DEFAULT 'open'::text,
  resolved_at timestamp with time zone,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- ---------- public.supervisor_tenant_assignments ----------
CREATE TABLE public.supervisor_tenant_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supervisor_user_id uuid NOT NULL,
  tenant_kind public.campaign_tenant_kind NOT NULL,
  client_lead_id uuid,
  wl_partner_id uuid,
  wl_client_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- ---------- public.support_requests ----------
CREATE TABLE public.support_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  issue_type text DEFAULT 'bug'::text,
  description text NOT NULL,
  page_url text,
  console_errors jsonb,
  ai_response text,
  ai_analyzed_at timestamp with time zone,
  status text DEFAULT 'pending'::text,
  resolution_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  dashboard_context text
);

-- ---------- public.support_tickets ----------
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_number integer NOT NULL DEFAULT nextval('support_tickets_ticket_number_seq'::regclass),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium'::text,
  status text NOT NULL DEFAULT 'open'::text,
  source text NOT NULL,
  category text,
  submitted_by uuid,
  submitter_email text,
  submitter_name text,
  lead_id uuid,
  partner_id uuid,
  affiliate_id uuid,
  assigned_to uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  linked_task_id uuid,
  originating_source text,
  last_activity_at timestamp with time zone DEFAULT now(),
  last_activity_by uuid,
  sla_deadline timestamp with time zone,
  work_queue text,
  wl_client_id uuid,
  linked_wl_client_ticket_id uuid,
  tenant_kind text NOT NULL DEFAULT 'direct'::text
);

-- ---------- public.task_notes ----------
CREATE TABLE public.task_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  author_id uuid,
  author_name text,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.tech_issues ----------
CREATE TABLE public.tech_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reported_by uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'other'::text,
  priority text NOT NULL DEFAULT 'medium'::text,
  status text NOT NULL DEFAULT 'open'::text,
  assigned_to uuid,
  affected_department text,
  resolution_notes text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.tenant_brand_profiles ----------
CREATE TABLE public.tenant_brand_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid,
  client_lead_id uuid,
  wl_client_id uuid,
  brand_label text,
  logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  sender_name text,
  sender_email text,
  support_email text,
  support_phone text,
  footer_html text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ---------- public.ticket_replies ----------
CREATE TABLE public.ticket_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  message text NOT NULL,
  author_id uuid,
  author_name text,
  is_internal boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  visible_to_partner boolean DEFAULT false,
  author_role text
);

-- ---------- public.ticket_views ----------
CREATE TABLE public.ticket_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_id uuid NOT NULL,
  last_viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  view_context character varying NOT NULL DEFAULT 'default'::character varying
);

-- ---------- public.time_off_requests ----------
CREATE TABLE public.time_off_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  request_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.training_templates ----------
CREATE TABLE public.training_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.usage_records ----------
CREATE TABLE public.usage_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  client_id uuid,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  minutes_included integer NOT NULL DEFAULT 0,
  minutes_used integer NOT NULL DEFAULT 0,
  overage_rate numeric NOT NULL DEFAULT 0,
  billed boolean DEFAULT false,
  stripe_invoice_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  original_tier_minutes integer,
  original_tier_price numeric,
  optimal_tier_minutes integer,
  optimal_tier_price numeric,
  static_cost numeric,
  dynamic_cost numeric,
  dynamic_savings numeric DEFAULT 0,
  service_type text
);

-- ---------- public.user_roles ----------
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.white_label_branding ----------
CREATE TABLE public.white_label_branding (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#0B60B0'::text,
  secondary_color text DEFAULT '#40A578'::text,
  custom_domain text,
  phone_greeting text,
  email_footer text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_name text,
  support_email text,
  support_phone text,
  favicon_url text,
  login_page_title text DEFAULT 'Client Portal'::text,
  welcome_message text,
  cname_status text DEFAULT 'pending'::text,
  cname_verified_at timestamp with time zone,
  accent_color text,
  sidebar_style text DEFAULT 'light'::text,
  font_heading text,
  font_body text,
  portal_footer_text text,
  powered_by_visible boolean DEFAULT true,
  email_from_name text,
  email_from_address text,
  email_reply_to text,
  cname_last_checked_at timestamp with time zone
);

-- ---------- public.white_label_clients ----------
CREATE TABLE public.white_label_clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  client_name text NOT NULL,
  contact_name text,
  email text NOT NULL,
  phone text,
  plan text DEFAULT 'starter'::text,
  monthly_value numeric DEFAULT 0,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  service_type text NOT NULL DEFAULT 'virtual_receptionist'::text,
  language_support text NOT NULL DEFAULT 'english_only'::text,
  num_campaigns integer NOT NULL DEFAULT 1,
  billing_verified boolean NOT NULL DEFAULT false,
  verified_by uuid,
  client_portal_slug text,
  user_id uuid,
  welcome_seen boolean NOT NULL DEFAULT false,
  enabled_modules jsonb DEFAULT '["dashboard", "calls", "scripts", "schedule", "billing", "support", "settings", "outbound-requests"]'::jsonb
);

-- ---------- public.white_label_domain_aliases ----------
CREATE TABLE public.white_label_domain_aliases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  alias_hostname text NOT NULL,
  cname_status text DEFAULT 'pending'::text,
  cname_verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  cname_last_checked_at timestamp with time zone
);

-- ---------- public.white_label_partners ----------
CREATE TABLE public.white_label_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  address text,
  industry text,
  company_size text,
  services_interested text[],
  tech_platform text,
  hosting_preference text,
  call_volume text,
  customization_needs text,
  agreed_to_terms boolean DEFAULT false,
  status text DEFAULT 'pending'::text,
  tier text DEFAULT 'reseller'::text,
  monthly_fee numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  services_offered text,
  target_location text,
  brand_voice_notes text,
  partner_slug text NOT NULL,
  default_enabled_modules jsonb DEFAULT '["dashboard", "calls", "scripts", "schedule", "billing", "support", "settings", "outbound-requests"]'::jsonb
);

-- ---------- public.wizard_sessions ----------
CREATE TABLE public.wizard_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_token text NOT NULL,
  user_id uuid,
  lead_id uuid,
  email text,
  service text,
  industry text,
  country text,
  billing_currency text,
  plan_minutes integer,
  billing_period text,
  current_step integer NOT NULL DEFAULT 1,
  completed_steps int4[] NOT NULL DEFAULT '{}'::integer[],
  is_complete boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_addon_pricing ----------
CREATE TABLE public.wl_addon_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  addon_product_id uuid NOT NULL,
  wholesale_price numeric NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_blog_queue ----------
CREATE TABLE public.wl_blog_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  keyword_id uuid,
  keyword_text text NOT NULL,
  content_length text NOT NULL DEFAULT 'medium'::text,
  tone text NOT NULL DEFAULT 'professional'::text,
  angle text,
  status text NOT NULL DEFAULT 'queued'::text,
  generated_title text,
  generated_content text,
  generated_meta_title text,
  generated_meta_description text,
  generated_excerpt text,
  wp_post_id integer,
  wp_post_url text,
  error_message text,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_call_logs ----------
CREATE TABLE public.wl_call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  wl_client_id uuid NOT NULL,
  external_call_id text,
  caller_name text,
  caller_phone text,
  caller_email text,
  caller_number text,
  call_date date,
  call_time time without time zone,
  call_duration integer DEFAULT 0,
  talk_time_seconds integer DEFAULT 0,
  acw_seconds integer DEFAULT 0,
  handle_time_seconds integer DEFAULT 0,
  billable_minutes numeric DEFAULT 0,
  call_direction text DEFAULT 'inbound'::text,
  call_type text DEFAULT 'inbound'::text,
  status text DEFAULT 'completed'::text,
  campaign_name text,
  disposition text,
  dnis text,
  agent_name text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_campaign_recipients ----------
CREATE TABLE public.wl_campaign_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  wl_client_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  contact_name text,
  contact_phone text,
  contact_email text,
  status text NOT NULL DEFAULT 'queued'::text,
  sent_at timestamp with time zone,
  opened_at timestamp with time zone,
  replied_at timestamp with time zone,
  converted_at timestamp with time zone,
  failed_at timestamp with time zone,
  failure_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_client_campaigns ----------
CREATE TABLE public.wl_client_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wl_client_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  campaign_name text NOT NULL,
  department text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_client_reviews ----------
CREATE TABLE public.wl_client_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  wl_client_id uuid NOT NULL,
  reviewer_name text,
  reviewer_email text,
  rating integer NOT NULL DEFAULT 5,
  title text,
  content text,
  source text NOT NULL DEFAULT 'portal'::text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_client_schedules ----------
CREATE TABLE public.wl_client_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  wl_client_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ---------- public.wl_client_scripts ----------
CREATE TABLE public.wl_client_scripts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  wl_client_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  category text DEFAULT 'general'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  migrated_to_campaign_id uuid,
  migrated_at timestamp with time zone
);

-- ---------- public.wl_client_service_config ----------
CREATE TABLE public.wl_client_service_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wl_client_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  service_type text NOT NULL DEFAULT 'virtual_receptionist'::text,
  language_support text NOT NULL DEFAULT 'english_only'::text,
  estimated_monthly_minutes integer DEFAULT 0,
  partner_retail_rate numeric,
  billing_verified boolean NOT NULL DEFAULT false,
  verified_by uuid,
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_client_ticket_replies ----------
CREATE TABLE public.wl_client_ticket_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  message text NOT NULL,
  author_type text NOT NULL DEFAULT 'partner'::text,
  author_name text,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  author_role text
);

-- ---------- public.wl_client_tickets ----------
CREATE TABLE public.wl_client_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  wl_client_id uuid NOT NULL,
  ticket_number integer NOT NULL DEFAULT nextval('wl_client_tickets_ticket_number_seq'::regclass),
  subject text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium'::text,
  status text NOT NULL DEFAULT 'open'::text,
  submitted_by_type text NOT NULL DEFAULT 'partner'::text,
  submitted_by_name text,
  submitted_by_email text,
  assigned_to text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  linked_support_ticket_id uuid,
  is_escalated_to_24h boolean DEFAULT false,
  mask_24h_from_client boolean DEFAULT true
);

-- ---------- public.wl_email_connections ----------
CREATE TABLE public.wl_email_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'resend'::text,
  api_key_encrypted text NOT NULL,
  from_name text NOT NULL,
  from_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  last_tested_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_email_contacts ----------
CREATE TABLE public.wl_email_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  email text NOT NULL,
  name text,
  tags text[] DEFAULT '{}'::text[],
  subscribed boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_email_sends ----------
CREATE TABLE public.wl_email_sends (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  newsletter_draft_id uuid,
  subject text NOT NULL,
  recipients_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  sent_at timestamp with time zone,
  resend_batch_id text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_invoices ----------
CREATE TABLE public.wl_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  invoice_number text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'paid'::text,
  stripe_invoice_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_keyword_tracker ----------
CREATE TABLE public.wl_keyword_tracker (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  keyword text NOT NULL,
  category text NOT NULL DEFAULT 'service'::text,
  content_status text NOT NULL DEFAULT 'not_started'::text,
  sort_priority integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_knowledge_base ----------
CREATE TABLE public.wl_knowledge_base (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general'::text,
  tags text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  content_type text NOT NULL DEFAULT 'article'::text,
  sort_order integer NOT NULL DEFAULT 0,
  onboarding_step integer,
  audience text NOT NULL DEFAULT 'client'::text
);

-- ---------- public.wl_newsletter_drafts ----------
CREATE TABLE public.wl_newsletter_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  draft_month date NOT NULL,
  subject_line text,
  html_content text,
  plain_text text,
  post_ids uuid[] DEFAULT '{}'::uuid[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_client_portal_access ----------
CREATE TABLE public.wl_partner_client_portal_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  handoff_id uuid NOT NULL,
  proposal_id uuid NOT NULL,
  token_hash text NOT NULL,
  recipient_email text,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  first_viewed_at timestamp with time zone,
  last_viewed_at timestamp with time zone,
  view_count integer NOT NULL DEFAULT 0,
  acknowledged_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_feedback ----------
CREATE TABLE public.wl_partner_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  origin text NOT NULL,
  submitted_by_type text NOT NULL,
  submitted_by_user_id uuid,
  submitted_by_email text,
  submitted_by_name text,
  type text NOT NULL DEFAULT 'feedback'::text,
  title text,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'normal'::text,
  status text NOT NULL DEFAULT 'new'::text,
  source_dashboard text NOT NULL,
  page text,
  attachment_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_to uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_feedback_escalations ----------
CREATE TABLE public.wl_partner_feedback_escalations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wl_feedback_id uuid NOT NULL,
  linked_feedback_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  escalated_by uuid,
  partner_summary text NOT NULL,
  include_end_client_identity boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_feedback_messages ----------
CREATE TABLE public.wl_partner_feedback_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  author_kind text NOT NULL,
  author_role text NOT NULL,
  body text NOT NULL,
  visible_to_submitter boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_handoff_documents ----------
CREATE TABLE public.wl_partner_handoff_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  handoff_id uuid NOT NULL,
  document_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_handoff_items ----------
CREATE TABLE public.wl_partner_handoff_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  handoff_id uuid NOT NULL,
  item_key text NOT NULL,
  label text NOT NULL,
  item_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  value_json jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_handoff_requests ----------
CREATE TABLE public.wl_partner_handoff_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  handoff_id uuid NOT NULL,
  intake_id uuid NOT NULL,
  request_type text NOT NULL,
  title text NOT NULL,
  message text,
  target_item_key text,
  status text NOT NULL DEFAULT 'open'::text,
  requested_by uuid,
  resolved_by uuid,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_leads ----------
CREATE TABLE public.wl_partner_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  pipeline_stage text NOT NULL DEFAULT 'new'::text,
  temperature text,
  source text,
  service_interest text,
  estimated_value numeric(10,2),
  currency text DEFAULT 'USD'::text,
  assigned_to uuid,
  notes text,
  next_followup_at timestamp with time zone,
  last_activity_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_members ----------
CREATE TABLE public.wl_partner_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  invited_by uuid,
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  activated_at timestamp with time zone,
  removed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_onboarding_handoffs ----------
CREATE TABLE public.wl_partner_onboarding_handoffs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  proposal_id uuid NOT NULL,
  lead_id uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  client_name_snapshot text,
  client_email_snapshot text,
  company_snapshot text,
  accepted_scope_snapshot text,
  accepted_amount_snapshot numeric,
  currency_snapshot text,
  handoff_notes text,
  onboarding_owner uuid,
  kickoff_due_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  checklist_state jsonb NOT NULL DEFAULT '[]'::jsonb,
  submission_status text NOT NULL DEFAULT 'collecting_info'::text,
  completion_percent integer NOT NULL DEFAULT 0,
  submitted_at timestamp with time zone,
  last_resubmitted_at timestamp with time zone,
  current_intake_id uuid
);

-- ---------- public.wl_partner_proposal_activity ----------
CREATE TABLE public.wl_partner_proposal_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  proposal_id uuid NOT NULL,
  share_id uuid,
  event_type text NOT NULL,
  actor_user_id uuid,
  actor_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_proposal_shares ----------
CREATE TABLE public.wl_partner_proposal_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  proposal_id uuid NOT NULL,
  token_hash text NOT NULL,
  created_by uuid,
  recipient_name text,
  recipient_email text,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  last_viewed_at timestamp with time zone,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_proposals ----------
CREATE TABLE public.wl_partner_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  lead_id uuid,
  created_by uuid,
  proposal_number text NOT NULL,
  title text NOT NULL,
  offering_name text,
  scope_summary text,
  amount numeric(12,2),
  currency text,
  notes text,
  status text NOT NULL DEFAULT 'draft'::text,
  valid_until timestamp with time zone,
  sent_at timestamp with time zone,
  viewed_at timestamp with time zone,
  accepted_at timestamp with time zone,
  declined_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_by_name text,
  acceptance_note text,
  declined_reason text,
  last_recipient_name text,
  last_recipient_email text,
  checklist_template text NOT NULL DEFAULT 'standard'::text
);

-- ---------- public.wl_partner_tasks ----------
CREATE TABLE public.wl_partner_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  proposal_id uuid,
  lead_id uuid,
  handoff_id uuid,
  title text NOT NULL,
  description text,
  task_type text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  priority text NOT NULL DEFAULT 'medium'::text,
  source_event text NOT NULL,
  due_at timestamp with time zone,
  completed_at timestamp with time zone,
  assigned_to uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_partner_usage_summary ----------
CREATE TABLE public.wl_partner_usage_summary (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  total_minutes_all_clients numeric NOT NULL DEFAULT 0,
  total_calls_all_clients integer NOT NULL DEFAULT 0,
  active_client_count integer NOT NULL DEFAULT 0,
  volume_discount_active boolean NOT NULL DEFAULT false,
  volume_discount_rate numeric,
  total_campaign_fees numeric NOT NULL DEFAULT 0,
  total_wholesale_cost numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_seo_reports ----------
CREATE TABLE public.wl_seo_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  report_month date NOT NULL,
  stats_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  narrative text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_social_snippets ----------
CREATE TABLE public.wl_social_snippets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  blog_queue_id uuid NOT NULL,
  platform text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_terms_agreements ----------
CREATE TABLE public.wl_terms_agreements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  agreement_version text NOT NULL,
  agreement_content text NOT NULL,
  wholesale_pricing_snapshot jsonb,
  signed_at timestamp with time zone,
  signed_by uuid,
  ip_address text,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_ticket_forwards ----------
CREATE TABLE public.wl_ticket_forwards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wl_client_ticket_id uuid NOT NULL,
  support_ticket_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  forwarded_by uuid,
  forwarded_at timestamp with time zone NOT NULL DEFAULT now(),
  unlinked_at timestamp with time zone,
  summary text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_usage_records ----------
CREATE TABLE public.wl_usage_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  wl_client_id uuid NOT NULL,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  total_minutes_used numeric NOT NULL DEFAULT 0,
  total_calls integer NOT NULL DEFAULT 0,
  base_rate_applied numeric NOT NULL DEFAULT 0,
  secretary_surcharge_applied numeric NOT NULL DEFAULT 0,
  language_surcharge_applied numeric NOT NULL DEFAULT 0,
  effective_rate numeric NOT NULL DEFAULT 0,
  wholesale_cost numeric NOT NULL DEFAULT 0,
  partner_retail_revenue numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_wholesale_pricing ----------
CREATE TABLE public.wl_wholesale_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  campaign_setup_fee numeric NOT NULL DEFAULT 100,
  additional_campaign_fee numeric NOT NULL DEFAULT 25,
  tier_under_100_rate numeric NOT NULL DEFAULT 1.95,
  tier_under_500_rate numeric NOT NULL DEFAULT 1.75,
  tier_under_1000_rate numeric NOT NULL DEFAULT 1.55,
  tier_over_1000_rate numeric NOT NULL DEFAULT 1.35,
  secretary_surcharge numeric NOT NULL DEFAULT 0.05,
  spanish_surcharge numeric NOT NULL DEFAULT 0.05,
  french_surcharge numeric NOT NULL DEFAULT 0.05,
  both_languages_surcharge numeric NOT NULL DEFAULT 0.07,
  volume_discount_min_minutes integer NOT NULL DEFAULT 10000,
  volume_discount_min_clients integer NOT NULL DEFAULT 10,
  volume_discount_fixed_rate numeric,
  volume_discount_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- public.wl_wordpress_connections ----------
CREATE TABLE public.wl_wordpress_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  site_url text NOT NULL,
  wp_username text NOT NULL,
  app_password text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected'::text,
  last_tested_at timestamp with time zone,
  auto_publish boolean NOT NULL DEFAULT false,
  default_category text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);


-- ============= PRIMARY KEYS / UNIQUE / CHECK CONSTRAINTS =============

-- ============= FOREIGN KEYS =============
ALTER TABLE public.admin_email_sends ADD CONSTRAINT admin_email_sends_newsletter_draft_id_fkey FOREIGN KEY (newsletter_draft_id) REFERENCES admin_newsletter_drafts(id) ON DELETE SET NULL;
ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.admin_social_snippets ADD CONSTRAINT admin_social_snippets_blog_post_id_fkey FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE;
ALTER TABLE public.affiliate_payouts ADD CONSTRAINT affiliate_payouts_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE;
ALTER TABLE public.affiliate_referrals ADD CONSTRAINT affiliate_referrals_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE;
ALTER TABLE public.affiliate_referrals ADD CONSTRAINT affiliate_referrals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id);
ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.agent_onboarding ADD CONSTRAINT agent_onboarding_job_application_id_fkey FOREIGN KEY (job_application_id) REFERENCES job_applications(id);
ALTER TABLE public.agent_onboarding ADD CONSTRAINT agent_onboarding_onboarding_template_id_fkey FOREIGN KEY (onboarding_template_id) REFERENCES onboarding_templates(id);
ALTER TABLE public.agent_onboarding_log ADD CONSTRAINT agent_onboarding_log_onboarding_id_fkey FOREIGN KEY (onboarding_id) REFERENCES agent_onboarding(id) ON DELETE CASCADE;
ALTER TABLE public.agent_runs ADD CONSTRAINT agent_runs_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE;
ALTER TABLE public.agent_shift_breaks ADD CONSTRAINT agent_shift_breaks_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES agent_shifts(id) ON DELETE CASCADE;
ALTER TABLE public.ai_draft_log ADD CONSTRAINT ai_draft_log_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.approval_policy_versions ADD CONSTRAINT approval_policy_versions_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES approval_policies(id) ON DELETE CASCADE;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES renewal_expansion_deals(id) ON DELETE CASCADE;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES approval_policies(id) ON DELETE SET NULL;
ALTER TABLE public.autoblog_queue ADD CONSTRAINT autoblog_queue_generated_post_id_fkey FOREIGN KEY (generated_post_id) REFERENCES blog_posts(id) ON DELETE SET NULL;
ALTER TABLE public.autoblog_queue ADD CONSTRAINT autoblog_queue_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES keyword_tracker(id) ON DELETE SET NULL;
ALTER TABLE public.automation_recommendations ADD CONSTRAINT automation_recommendations_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.billing_notes ADD CONSTRAINT billing_notes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.billing_summaries ADD CONSTRAINT billing_summaries_client_id_fkey FOREIGN KEY (client_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.billing_summaries ADD CONSTRAINT billing_summaries_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE;
ALTER TABLE public.blog_internal_links ADD CONSTRAINT blog_internal_links_blog_post_id_fkey FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE;
ALTER TABLE public.call_flow_receptionist_configs ADD CONSTRAINT call_flow_receptionist_configs_client_department_id_fkey FOREIGN KEY (client_department_id) REFERENCES client_departments(id) ON DELETE CASCADE;
ALTER TABLE public.call_flow_receptionist_configs ADD CONSTRAINT call_flow_receptionist_configs_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.call_flow_receptionist_configs ADD CONSTRAINT call_flow_receptionist_configs_overflow_department_id_fkey FOREIGN KEY (overflow_department_id) REFERENCES client_departments(id) ON DELETE SET NULL;
ALTER TABLE public.call_flow_receptionist_configs ADD CONSTRAINT call_flow_receptionist_configs_primary_contact_id_fkey FOREIGN KEY (primary_contact_id) REFERENCES client_contacts(id) ON DELETE SET NULL;
ALTER TABLE public.call_flow_receptionist_configs ADD CONSTRAINT call_flow_receptionist_configs_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.call_flow_receptionist_configs ADD CONSTRAINT call_flow_receptionist_configs_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES leads(id);
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_import_id_fkey FOREIGN KEY (import_id) REFERENCES call_report_imports(id) ON DELETE SET NULL;
ALTER TABLE public.call_report_imports ADD CONSTRAINT call_report_imports_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE public.campaign_faq_entries ADD CONSTRAINT campaign_faq_entries_client_department_id_fkey FOREIGN KEY (client_department_id) REFERENCES client_departments(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_faq_entries ADD CONSTRAINT campaign_faq_entries_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_faq_entries ADD CONSTRAINT campaign_faq_entries_client_location_id_fkey FOREIGN KEY (client_location_id) REFERENCES client_locations(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_faq_entries ADD CONSTRAINT campaign_faq_entries_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_faq_entries ADD CONSTRAINT campaign_faq_entries_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_field_display_labels ADD CONSTRAINT campaign_field_display_labels_field_id_fkey FOREIGN KEY (field_id) REFERENCES campaign_fields(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_field_groups ADD CONSTRAINT campaign_field_groups_client_department_id_fkey FOREIGN KEY (client_department_id) REFERENCES client_departments(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_field_groups ADD CONSTRAINT campaign_field_groups_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_field_groups ADD CONSTRAINT campaign_field_groups_client_location_id_fkey FOREIGN KEY (client_location_id) REFERENCES client_locations(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_field_groups ADD CONSTRAINT campaign_field_groups_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_field_groups ADD CONSTRAINT campaign_field_groups_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_field_options ADD CONSTRAINT campaign_field_options_field_id_fkey FOREIGN KEY (field_id) REFERENCES campaign_fields(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_field_visibility_rules ADD CONSTRAINT campaign_field_visibility_rules_field_id_fkey FOREIGN KEY (field_id) REFERENCES campaign_fields(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_fields ADD CONSTRAINT campaign_fields_client_department_id_fkey FOREIGN KEY (client_department_id) REFERENCES client_departments(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_fields ADD CONSTRAINT campaign_fields_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_fields ADD CONSTRAINT campaign_fields_client_location_id_fkey FOREIGN KEY (client_location_id) REFERENCES client_locations(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_fields ADD CONSTRAINT campaign_fields_field_group_id_fkey FOREIGN KEY (field_group_id) REFERENCES campaign_field_groups(id) ON DELETE SET NULL;
ALTER TABLE public.campaign_fields ADD CONSTRAINT campaign_fields_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_fields ADD CONSTRAINT campaign_fields_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_go_live_status_snapshots ADD CONSTRAINT campaign_go_live_status_snapshots_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_policy_blocks ADD CONSTRAINT campaign_policy_blocks_client_department_id_fkey FOREIGN KEY (client_department_id) REFERENCES client_departments(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_policy_blocks ADD CONSTRAINT campaign_policy_blocks_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_policy_blocks ADD CONSTRAINT campaign_policy_blocks_client_location_id_fkey FOREIGN KEY (client_location_id) REFERENCES client_locations(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_policy_blocks ADD CONSTRAINT campaign_policy_blocks_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_policy_blocks ADD CONSTRAINT campaign_policy_blocks_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_publish_versions ADD CONSTRAINT campaign_publish_versions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_publish_versions ADD CONSTRAINT campaign_publish_versions_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_publish_versions ADD CONSTRAINT campaign_publish_versions_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_publish_versions ADD CONSTRAINT campaign_publish_versions_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_scenarios ADD CONSTRAINT campaign_scenarios_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_scenarios ADD CONSTRAINT campaign_scenarios_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_scenarios ADD CONSTRAINT campaign_scenarios_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_scenarios ADD CONSTRAINT campaign_scenarios_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_script_document_versions ADD CONSTRAINT campaign_script_document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES campaign_script_documents(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_script_documents ADD CONSTRAINT campaign_script_documents_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_script_documents ADD CONSTRAINT campaign_script_documents_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_script_documents ADD CONSTRAINT campaign_script_documents_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_script_documents ADD CONSTRAINT campaign_script_documents_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_templates ADD CONSTRAINT campaign_templates_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_templates ADD CONSTRAINT campaign_templates_source_campaign_id_fkey FOREIGN KEY (source_campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.campaign_templates ADD CONSTRAINT campaign_templates_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_templates ADD CONSTRAINT campaign_templates_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_completions ADD CONSTRAINT campaign_training_completions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_completions ADD CONSTRAINT campaign_training_completions_module_id_fkey FOREIGN KEY (module_id) REFERENCES campaign_training_modules(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_lessons ADD CONSTRAINT campaign_training_lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES campaign_training_modules(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_modules ADD CONSTRAINT campaign_training_modules_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_modules ADD CONSTRAINT campaign_training_modules_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_modules ADD CONSTRAINT campaign_training_modules_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_modules ADD CONSTRAINT campaign_training_modules_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_quiz_attempts ADD CONSTRAINT campaign_training_quiz_attempts_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_quiz_attempts ADD CONSTRAINT campaign_training_quiz_attempts_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES campaign_training_lessons(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_quiz_attempts ADD CONSTRAINT campaign_training_quiz_attempts_module_id_fkey FOREIGN KEY (module_id) REFERENCES campaign_training_modules(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_quiz_questions ADD CONSTRAINT campaign_training_quiz_questions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES campaign_training_lessons(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_retraining_events ADD CONSTRAINT campaign_training_retraining_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_signoffs ADD CONSTRAINT campaign_training_signoffs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_signoffs ADD CONSTRAINT campaign_training_signoffs_completion_id_fkey FOREIGN KEY (completion_id) REFERENCES campaign_training_completions(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_training_signoffs ADD CONSTRAINT campaign_training_signoffs_module_id_fkey FOREIGN KEY (module_id) REFERENCES campaign_training_modules(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_client_department_id_fkey FOREIGN KEY (client_department_id) REFERENCES client_departments(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_published_version_id_fkey FOREIGN KEY (published_version_id) REFERENCES campaign_publish_versions(id) ON DELETE SET NULL;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.chat_activity_log ADD CONSTRAINT chat_activity_log_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE;
ALTER TABLE public.chat_activity_log ADD CONSTRAINT chat_activity_log_deployment_id_fkey FOREIGN KEY (deployment_id) REFERENCES chat_deployments(id) ON DELETE CASCADE;
ALTER TABLE public.chat_ai_configs ADD CONSTRAINT chat_ai_configs_deployment_id_fkey FOREIGN KEY (deployment_id) REFERENCES chat_deployments(id) ON DELETE CASCADE;
ALTER TABLE public.chat_assignments ADD CONSTRAINT chat_assignments_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE;
ALTER TABLE public.chat_brand_configs ADD CONSTRAINT chat_brand_configs_deployment_id_fkey FOREIGN KEY (deployment_id) REFERENCES chat_deployments(id) ON DELETE CASCADE;
ALTER TABLE public.chat_canned_responses ADD CONSTRAINT chat_canned_responses_deployment_id_fkey FOREIGN KEY (deployment_id) REFERENCES chat_deployments(id) ON DELETE CASCADE;
ALTER TABLE public.chat_conversations ADD CONSTRAINT chat_conversations_deployment_id_fkey FOREIGN KEY (deployment_id) REFERENCES chat_deployments(id) ON DELETE CASCADE;
ALTER TABLE public.chat_conversations ADD CONSTRAINT chat_conversations_visitor_id_fkey FOREIGN KEY (visitor_id) REFERENCES chat_visitors(id) ON DELETE CASCADE;
ALTER TABLE public.chat_deployments ADD CONSTRAINT chat_deployments_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.chat_deployments ADD CONSTRAINT chat_deployments_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.chat_handoff_events ADD CONSTRAINT chat_handoff_events_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE;
ALTER TABLE public.chat_visitors ADD CONSTRAINT chat_visitors_deployment_id_fkey FOREIGN KEY (deployment_id) REFERENCES chat_deployments(id) ON DELETE CASCADE;
ALTER TABLE public.client_addons ADD CONSTRAINT client_addons_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.client_contacts ADD CONSTRAINT client_contacts_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.client_contacts ADD CONSTRAINT client_contacts_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.client_contacts ADD CONSTRAINT client_contacts_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.client_departments ADD CONSTRAINT client_departments_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.client_departments ADD CONSTRAINT client_departments_client_location_id_fkey FOREIGN KEY (client_location_id) REFERENCES client_locations(id) ON DELETE SET NULL;
ALTER TABLE public.client_departments ADD CONSTRAINT client_departments_primary_contact_id_fkey FOREIGN KEY (primary_contact_id) REFERENCES client_contacts(id) ON DELETE SET NULL;
ALTER TABLE public.client_departments ADD CONSTRAINT client_departments_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.client_departments ADD CONSTRAINT client_departments_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.client_handoff_documents ADD CONSTRAINT client_handoff_documents_handoff_id_fkey FOREIGN KEY (handoff_id) REFERENCES client_onboarding_handoffs(id) ON DELETE CASCADE;
ALTER TABLE public.client_handoff_items ADD CONSTRAINT client_handoff_items_handoff_id_fkey FOREIGN KEY (handoff_id) REFERENCES client_onboarding_handoffs(id) ON DELETE CASCADE;
ALTER TABLE public.client_handoff_requests ADD CONSTRAINT client_handoff_requests_handoff_id_fkey FOREIGN KEY (handoff_id) REFERENCES client_onboarding_handoffs(id) ON DELETE CASCADE;
ALTER TABLE public.client_locations ADD CONSTRAINT client_locations_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.client_locations ADD CONSTRAINT client_locations_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.client_locations ADD CONSTRAINT client_locations_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.client_onboarding_activity ADD CONSTRAINT client_onboarding_activity_handoff_id_fkey FOREIGN KEY (handoff_id) REFERENCES client_onboarding_handoffs(id) ON DELETE CASCADE;
ALTER TABLE public.client_onboarding_handoffs ADD CONSTRAINT client_onboarding_handoffs_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.client_onboarding_handoffs ADD CONSTRAINT client_onboarding_handoffs_client_user_id_fkey FOREIGN KEY (client_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.client_onboarding_handoffs ADD CONSTRAINT client_onboarding_handoffs_current_intake_id_fkey FOREIGN KEY (current_intake_id) REFERENCES internal_fulfillment_intakes(id) ON DELETE SET NULL;
ALTER TABLE public.client_report_mappings ADD CONSTRAINT client_report_mappings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.client_report_mappings ADD CONSTRAINT client_report_mappings_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id);
ALTER TABLE public.client_report_mappings ADD CONSTRAINT client_report_mappings_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id);
ALTER TABLE public.client_scripts ADD CONSTRAINT client_scripts_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.client_scripts ADD CONSTRAINT client_scripts_migrated_to_campaign_id_fkey FOREIGN KEY (migrated_to_campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.communication_actions ADD CONSTRAINT communication_actions_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES renewal_expansion_deals(id) ON DELETE SET NULL;
ALTER TABLE public.communication_actions ADD CONSTRAINT communication_actions_template_id_fkey FOREIGN KEY (template_id) REFERENCES communication_templates(id) ON DELETE CASCADE;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.crm_activities ADD CONSTRAINT crm_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.crm_activities ADD CONSTRAINT crm_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.crm_tasks ADD CONSTRAINT crm_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);
ALTER TABLE public.crm_tasks ADD CONSTRAINT crm_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.crm_tasks ADD CONSTRAINT crm_tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.custom_plans ADD CONSTRAINT custom_plans_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.dashboard_events ADD CONSTRAINT dashboard_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.data_export_snapshots ADD CONSTRAINT data_export_snapshots_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.department_numbers ADD CONSTRAINT department_numbers_client_department_id_fkey FOREIGN KEY (client_department_id) REFERENCES client_departments(id) ON DELETE CASCADE;
ALTER TABLE public.department_numbers ADD CONSTRAINT department_numbers_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.department_numbers ADD CONSTRAINT department_numbers_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.department_numbers ADD CONSTRAINT department_numbers_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.direct_success_plays ADD CONSTRAINT direct_success_plays_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.direct_success_plays ADD CONSTRAINT direct_success_plays_template_id_fkey FOREIGN KEY (template_id) REFERENCES playbook_templates(id) ON DELETE SET NULL;
ALTER TABLE public.disc_faqs ADD CONSTRAINT disc_faqs_faq_set_id_fkey FOREIGN KEY (faq_set_id) REFERENCES disc_faq_sets(id) ON DELETE CASCADE;
ALTER TABLE public.disc_generated_pages ADD CONSTRAINT disc_generated_pages_audience_id_fkey FOREIGN KEY (audience_id) REFERENCES disc_audiences(id) ON DELETE SET NULL;
ALTER TABLE public.disc_generated_pages ADD CONSTRAINT disc_generated_pages_faq_set_id_fkey FOREIGN KEY (faq_set_id) REFERENCES disc_faq_sets(id) ON DELETE SET NULL;
ALTER TABLE public.disc_generated_pages ADD CONSTRAINT disc_generated_pages_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES disc_keywords(id) ON DELETE SET NULL;
ALTER TABLE public.disc_generated_pages ADD CONSTRAINT disc_generated_pages_location_id_fkey FOREIGN KEY (location_id) REFERENCES disc_locations(id) ON DELETE SET NULL;
ALTER TABLE public.disc_generated_pages ADD CONSTRAINT disc_generated_pages_template_id_fkey FOREIGN KEY (template_id) REFERENCES disc_templates(id) ON DELETE SET NULL;
ALTER TABLE public.disc_internal_link_items ADD CONSTRAINT disc_internal_link_items_link_set_id_fkey FOREIGN KEY (link_set_id) REFERENCES disc_internal_link_sets(id) ON DELETE CASCADE;
ALTER TABLE public.disc_publish_log ADD CONSTRAINT disc_publish_log_generated_page_id_fkey FOREIGN KEY (generated_page_id) REFERENCES disc_generated_pages(id) ON DELETE CASCADE;
ALTER TABLE public.email_followups ADD CONSTRAINT email_followups_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id);
ALTER TABLE public.experiment_allocation_log ADD CONSTRAINT experiment_allocation_log_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES pricing_experiments(id) ON DELETE CASCADE;
ALTER TABLE public.feature_launch_flags ADD CONSTRAINT feature_launch_flags_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.feedback_handoffs ADD CONSTRAINT feedback_handoffs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.feedback_handoffs ADD CONSTRAINT feedback_handoffs_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.feedback_messages ADD CONSTRAINT feedback_messages_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id);
ALTER TABLE public.feedback_messages ADD CONSTRAINT feedback_messages_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE;
ALTER TABLE public.five9_drift_snapshots ADD CONSTRAINT five9_drift_snapshots_client_department_id_fkey FOREIGN KEY (client_department_id) REFERENCES client_departments(id) ON DELETE CASCADE;
ALTER TABLE public.five9_drift_snapshots ADD CONSTRAINT five9_drift_snapshots_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.five9_drift_snapshots ADD CONSTRAINT five9_drift_snapshots_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.five9_drift_snapshots ADD CONSTRAINT five9_drift_snapshots_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.five9_variable_groups ADD CONSTRAINT five9_variable_groups_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.five9_variable_groups ADD CONSTRAINT five9_variable_groups_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.five9_variable_groups ADD CONSTRAINT five9_variable_groups_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.five9_variable_mappings ADD CONSTRAINT five9_variable_mappings_client_department_id_fkey FOREIGN KEY (client_department_id) REFERENCES client_departments(id) ON DELETE CASCADE;
ALTER TABLE public.five9_variable_mappings ADD CONSTRAINT five9_variable_mappings_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.five9_variable_mappings ADD CONSTRAINT five9_variable_mappings_field_id_fkey FOREIGN KEY (field_id) REFERENCES campaign_fields(id) ON DELETE SET NULL;
ALTER TABLE public.five9_variable_mappings ADD CONSTRAINT five9_variable_mappings_variable_group_id_fkey FOREIGN KEY (variable_group_id) REFERENCES five9_variable_groups(id) ON DELETE SET NULL;
ALTER TABLE public.five9_variable_mappings ADD CONSTRAINT five9_variable_mappings_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.five9_variable_mappings ADD CONSTRAINT five9_variable_mappings_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.forecast_snapshots ADD CONSTRAINT forecast_snapshots_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.internal_fulfillment_activity ADD CONSTRAINT internal_fulfillment_activity_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES internal_fulfillment_intakes(id) ON DELETE CASCADE;
ALTER TABLE public.internal_fulfillment_intake_documents ADD CONSTRAINT internal_fulfillment_intake_documents_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES internal_fulfillment_intakes(id) ON DELETE CASCADE;
ALTER TABLE public.internal_fulfillment_intake_documents ADD CONSTRAINT internal_fulfillment_intake_documents_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES wl_partner_handoff_documents(id) ON DELETE SET NULL;
ALTER TABLE public.internal_fulfillment_intakes ADD CONSTRAINT internal_fulfillment_intakes_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE public.internal_fulfillment_intakes ADD CONSTRAINT internal_fulfillment_intakes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES wl_partner_leads(id) ON DELETE SET NULL;
ALTER TABLE public.internal_fulfillment_intakes ADD CONSTRAINT internal_fulfillment_intakes_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE RESTRICT;
ALTER TABLE public.internal_fulfillment_intakes ADD CONSTRAINT internal_fulfillment_intakes_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES wl_partner_proposals(id) ON DELETE RESTRICT;
ALTER TABLE public.internal_fulfillment_intakes ADD CONSTRAINT internal_fulfillment_intakes_source_handoff_id_fkey FOREIGN KEY (source_handoff_id) REFERENCES wl_partner_onboarding_handoffs(id) ON DELETE RESTRICT;
ALTER TABLE public.internal_fulfillment_notes ADD CONSTRAINT internal_fulfillment_notes_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES internal_fulfillment_intakes(id) ON DELETE CASCADE;
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_applicant_user_id_fkey FOREIGN KEY (applicant_user_id) REFERENCES auth.users(id);
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE CASCADE;
ALTER TABLE public.keyword_tracker ADD CONSTRAINT keyword_tracker_target_blog_post_id_fkey FOREIGN KEY (target_blog_post_id) REFERENCES blog_posts(id) ON DELETE SET NULL;
ALTER TABLE public.lead_conversions ADD CONSTRAINT lead_conversions_converted_by_fkey FOREIGN KEY (converted_by) REFERENCES auth.users(id);
ALTER TABLE public.lead_conversions ADD CONSTRAINT lead_conversions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.leads ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);
ALTER TABLE public.leads ADD CONSTRAINT leads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.meetings ADD CONSTRAINT meetings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id);
ALTER TABLE public.mission_control_events ADD CONSTRAINT mission_control_events_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.offer_exposures ADD CONSTRAINT offer_exposures_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD CONSTRAINT offers_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES pricing_experiments(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD CONSTRAINT offers_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.outbound_call_attempts ADD CONSTRAINT outbound_call_attempts_request_id_fkey FOREIGN KEY (request_id) REFERENCES outbound_call_requests(id) ON DELETE CASCADE;
ALTER TABLE public.outbound_call_requests ADD CONSTRAINT outbound_call_requests_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id);
ALTER TABLE public.outbound_call_requests ADD CONSTRAINT outbound_call_requests_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id);
ALTER TABLE public.partner_success_plays ADD CONSTRAINT partner_success_plays_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_success_plays ADD CONSTRAINT partner_success_plays_template_id_fkey FOREIGN KEY (template_id) REFERENCES playbook_templates(id) ON DELETE SET NULL;
ALTER TABLE public.payment_failures ADD CONSTRAINT payment_failures_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.people ADD CONSTRAINT people_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE public.people ADD CONSTRAINT people_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.people_external_ids ADD CONSTRAINT people_external_ids_person_id_fkey FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;
ALTER TABLE public.play_suggestions ADD CONSTRAINT play_suggestions_template_id_fkey FOREIGN KEY (template_id) REFERENCES playbook_templates(id) ON DELETE CASCADE;
ALTER TABLE public.pricing_experiment_assignments ADD CONSTRAINT pricing_experiment_assignments_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES pricing_experiments(id) ON DELETE CASCADE;
ALTER TABLE public.pricing_experiment_assignments ADD CONSTRAINT pricing_experiment_assignments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE public.pricing_experiments ADD CONSTRAINT pricing_experiments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.qa_release_gates ADD CONSTRAINT qa_release_gates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.qa_release_gates ADD CONSTRAINT qa_release_gates_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.renewal_expansion_deals ADD CONSTRAINT renewal_expansion_deals_related_direct_play_id_fkey FOREIGN KEY (related_direct_play_id) REFERENCES direct_success_plays(id) ON DELETE SET NULL;
ALTER TABLE public.renewal_expansion_deals ADD CONSTRAINT renewal_expansion_deals_related_partner_play_id_fkey FOREIGN KEY (related_partner_play_id) REFERENCES partner_success_plays(id) ON DELETE SET NULL;
ALTER TABLE public.renewal_expansion_deals ADD CONSTRAINT renewal_expansion_deals_related_renewal_workflow_id_fkey FOREIGN KEY (related_renewal_workflow_id) REFERENCES renewal_workflows(id) ON DELETE SET NULL;
ALTER TABLE public.revops_period_snapshots ADD CONSTRAINT revops_period_snapshots_captured_by_fkey FOREIGN KEY (captured_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.revops_period_snapshots ADD CONSTRAINT revops_period_snapshots_linked_forecast_snapshot_id_fkey FOREIGN KEY (linked_forecast_snapshot_id) REFERENCES forecast_snapshots(id) ON DELETE SET NULL;
ALTER TABLE public.revops_snapshot_capacity ADD CONSTRAINT revops_snapshot_capacity_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES revops_period_snapshots(id) ON DELETE CASCADE;
ALTER TABLE public.revops_snapshot_metrics ADD CONSTRAINT revops_snapshot_metrics_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES revops_period_snapshots(id) ON DELETE CASCADE;
ALTER TABLE public.revops_snapshot_pipeline ADD CONSTRAINT revops_snapshot_pipeline_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES revops_period_snapshots(id) ON DELETE CASCADE;
ALTER TABLE public.sales_commissions ADD CONSTRAINT sales_commissions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id);
ALTER TABLE public.sales_proposals ADD CONSTRAINT sales_proposals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id);
ALTER TABLE public.script_change_comments ADD CONSTRAINT script_change_comments_request_id_fkey FOREIGN KEY (request_id) REFERENCES script_change_requests(id) ON DELETE CASCADE;
ALTER TABLE public.script_change_requests ADD CONSTRAINT script_change_requests_script_id_fkey FOREIGN KEY (script_id) REFERENCES client_scripts(id) ON DELETE SET NULL;
ALTER TABLE public.supervisor_tenant_assignments ADD CONSTRAINT supervisor_tenant_assignments_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.supervisor_tenant_assignments ADD CONSTRAINT supervisor_tenant_assignments_supervisor_user_id_fkey FOREIGN KEY (supervisor_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.supervisor_tenant_assignments ADD CONSTRAINT supervisor_tenant_assignments_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.supervisor_tenant_assignments ADD CONSTRAINT supervisor_tenant_assignments_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_linked_task_id_fkey FOREIGN KEY (linked_task_id) REFERENCES crm_tasks(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_linked_wl_client_ticket_id_fkey FOREIGN KEY (linked_wl_client_ticket_id) REFERENCES wl_client_tickets(id);
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id);
ALTER TABLE public.task_notes ADD CONSTRAINT task_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);
ALTER TABLE public.task_notes ADD CONSTRAINT task_notes_task_id_fkey FOREIGN KEY (task_id) REFERENCES crm_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_brand_profiles ADD CONSTRAINT tenant_brand_profiles_client_lead_id_fkey FOREIGN KEY (client_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_brand_profiles ADD CONSTRAINT tenant_brand_profiles_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_brand_profiles ADD CONSTRAINT tenant_brand_profiles_wl_partner_id_fkey FOREIGN KEY (wl_partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.ticket_replies ADD CONSTRAINT ticket_replies_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ticket_replies ADD CONSTRAINT ticket_replies_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;
ALTER TABLE public.ticket_views ADD CONSTRAINT ticket_views_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;
ALTER TABLE public.usage_records ADD CONSTRAINT usage_records_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.white_label_branding ADD CONSTRAINT white_label_branding_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.white_label_clients ADD CONSTRAINT white_label_clients_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.white_label_clients ADD CONSTRAINT white_label_clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.white_label_domain_aliases ADD CONSTRAINT white_label_domain_aliases_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.white_label_partners ADD CONSTRAINT white_label_partners_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.wizard_sessions ADD CONSTRAINT wizard_sessions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE public.wizard_sessions ADD CONSTRAINT wizard_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.wl_addon_pricing ADD CONSTRAINT wl_addon_pricing_addon_product_id_fkey FOREIGN KEY (addon_product_id) REFERENCES addon_products(id) ON DELETE CASCADE;
ALTER TABLE public.wl_addon_pricing ADD CONSTRAINT wl_addon_pricing_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_blog_queue ADD CONSTRAINT wl_blog_queue_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES wl_keyword_tracker(id) ON DELETE SET NULL;
ALTER TABLE public.wl_blog_queue ADD CONSTRAINT wl_blog_queue_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_call_logs ADD CONSTRAINT wl_call_logs_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_call_logs ADD CONSTRAINT wl_call_logs_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.wl_campaign_recipients ADD CONSTRAINT wl_campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES wl_client_campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.wl_campaign_recipients ADD CONSTRAINT wl_campaign_recipients_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_campaign_recipients ADD CONSTRAINT wl_campaign_recipients_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_campaigns ADD CONSTRAINT wl_client_campaigns_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_campaigns ADD CONSTRAINT wl_client_campaigns_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_reviews ADD CONSTRAINT wl_client_reviews_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_reviews ADD CONSTRAINT wl_client_reviews_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_schedules ADD CONSTRAINT wl_client_schedules_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_schedules ADD CONSTRAINT wl_client_schedules_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_scripts ADD CONSTRAINT wl_client_scripts_migrated_to_campaign_id_fkey FOREIGN KEY (migrated_to_campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.wl_client_scripts ADD CONSTRAINT wl_client_scripts_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_scripts ADD CONSTRAINT wl_client_scripts_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_service_config ADD CONSTRAINT wl_client_service_config_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_service_config ADD CONSTRAINT wl_client_service_config_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_ticket_replies ADD CONSTRAINT wl_client_ticket_replies_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES wl_client_tickets(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_tickets ADD CONSTRAINT wl_client_tickets_linked_support_ticket_id_fkey FOREIGN KEY (linked_support_ticket_id) REFERENCES support_tickets(id);
ALTER TABLE public.wl_client_tickets ADD CONSTRAINT wl_client_tickets_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_client_tickets ADD CONSTRAINT wl_client_tickets_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.wl_email_connections ADD CONSTRAINT wl_email_connections_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_email_contacts ADD CONSTRAINT wl_email_contacts_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_email_sends ADD CONSTRAINT wl_email_sends_newsletter_draft_id_fkey FOREIGN KEY (newsletter_draft_id) REFERENCES wl_newsletter_drafts(id) ON DELETE SET NULL;
ALTER TABLE public.wl_email_sends ADD CONSTRAINT wl_email_sends_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_invoices ADD CONSTRAINT wl_invoices_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_keyword_tracker ADD CONSTRAINT wl_keyword_tracker_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_knowledge_base ADD CONSTRAINT wl_knowledge_base_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_newsletter_drafts ADD CONSTRAINT wl_newsletter_drafts_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_client_portal_access ADD CONSTRAINT wl_partner_client_portal_access_handoff_id_fkey FOREIGN KEY (handoff_id) REFERENCES wl_partner_onboarding_handoffs(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_client_portal_access ADD CONSTRAINT wl_partner_client_portal_access_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_client_portal_access ADD CONSTRAINT wl_partner_client_portal_access_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES wl_partner_proposals(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_feedback ADD CONSTRAINT wl_partner_feedback_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_feedback ADD CONSTRAINT wl_partner_feedback_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_feedback ADD CONSTRAINT wl_partner_feedback_submitted_by_user_id_fkey FOREIGN KEY (submitted_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_feedback_escalations ADD CONSTRAINT wl_partner_feedback_escalations_escalated_by_fkey FOREIGN KEY (escalated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_feedback_escalations ADD CONSTRAINT wl_partner_feedback_escalations_linked_feedback_id_fkey FOREIGN KEY (linked_feedback_id) REFERENCES feedback(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_feedback_escalations ADD CONSTRAINT wl_partner_feedback_escalations_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_feedback_escalations ADD CONSTRAINT wl_partner_feedback_escalations_wl_feedback_id_fkey FOREIGN KEY (wl_feedback_id) REFERENCES wl_partner_feedback(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_feedback_messages ADD CONSTRAINT wl_partner_feedback_messages_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES wl_partner_feedback(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_handoff_documents ADD CONSTRAINT wl_partner_handoff_documents_handoff_id_fkey FOREIGN KEY (handoff_id) REFERENCES wl_partner_onboarding_handoffs(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_handoff_documents ADD CONSTRAINT wl_partner_handoff_documents_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_handoff_items ADD CONSTRAINT wl_partner_handoff_items_handoff_id_fkey FOREIGN KEY (handoff_id) REFERENCES wl_partner_onboarding_handoffs(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_handoff_items ADD CONSTRAINT wl_partner_handoff_items_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_handoff_requests ADD CONSTRAINT wl_partner_handoff_requests_handoff_id_fkey FOREIGN KEY (handoff_id) REFERENCES wl_partner_onboarding_handoffs(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_handoff_requests ADD CONSTRAINT wl_partner_handoff_requests_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES internal_fulfillment_intakes(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_handoff_requests ADD CONSTRAINT wl_partner_handoff_requests_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_leads ADD CONSTRAINT wl_partner_leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_leads ADD CONSTRAINT wl_partner_leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_leads ADD CONSTRAINT wl_partner_leads_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_members ADD CONSTRAINT wl_partner_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_members ADD CONSTRAINT wl_partner_members_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_members ADD CONSTRAINT wl_partner_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_onboarding_handoffs ADD CONSTRAINT wl_handoffs_current_intake_fk FOREIGN KEY (current_intake_id) REFERENCES internal_fulfillment_intakes(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_onboarding_handoffs ADD CONSTRAINT wl_partner_onboarding_handoffs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES wl_partner_leads(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_onboarding_handoffs ADD CONSTRAINT wl_partner_onboarding_handoffs_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_onboarding_handoffs ADD CONSTRAINT wl_partner_onboarding_handoffs_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES wl_partner_proposals(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_proposal_activity ADD CONSTRAINT wl_partner_proposal_activity_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_proposal_activity ADD CONSTRAINT wl_partner_proposal_activity_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES wl_partner_proposals(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_proposal_activity ADD CONSTRAINT wl_partner_proposal_activity_share_id_fkey FOREIGN KEY (share_id) REFERENCES wl_partner_proposal_shares(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_proposal_shares ADD CONSTRAINT wl_partner_proposal_shares_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_proposal_shares ADD CONSTRAINT wl_partner_proposal_shares_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES wl_partner_proposals(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_proposals ADD CONSTRAINT wl_partner_proposals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES wl_partner_leads(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_proposals ADD CONSTRAINT wl_partner_proposals_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_tasks ADD CONSTRAINT wl_partner_tasks_handoff_id_fkey FOREIGN KEY (handoff_id) REFERENCES wl_partner_onboarding_handoffs(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_tasks ADD CONSTRAINT wl_partner_tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES wl_partner_leads(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_tasks ADD CONSTRAINT wl_partner_tasks_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_partner_tasks ADD CONSTRAINT wl_partner_tasks_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES wl_partner_proposals(id) ON DELETE SET NULL;
ALTER TABLE public.wl_partner_usage_summary ADD CONSTRAINT wl_partner_usage_summary_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_seo_reports ADD CONSTRAINT wl_seo_reports_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_social_snippets ADD CONSTRAINT wl_social_snippets_blog_queue_id_fkey FOREIGN KEY (blog_queue_id) REFERENCES wl_blog_queue(id) ON DELETE CASCADE;
ALTER TABLE public.wl_social_snippets ADD CONSTRAINT wl_social_snippets_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_terms_agreements ADD CONSTRAINT wl_terms_agreements_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_ticket_forwards ADD CONSTRAINT wl_ticket_forwards_forwarded_by_fkey FOREIGN KEY (forwarded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.wl_ticket_forwards ADD CONSTRAINT wl_ticket_forwards_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_ticket_forwards ADD CONSTRAINT wl_ticket_forwards_support_ticket_id_fkey FOREIGN KEY (support_ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;
ALTER TABLE public.wl_ticket_forwards ADD CONSTRAINT wl_ticket_forwards_wl_client_ticket_id_fkey FOREIGN KEY (wl_client_ticket_id) REFERENCES wl_client_tickets(id) ON DELETE CASCADE;
ALTER TABLE public.wl_usage_records ADD CONSTRAINT wl_usage_records_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_usage_records ADD CONSTRAINT wl_usage_records_wl_client_id_fkey FOREIGN KEY (wl_client_id) REFERENCES white_label_clients(id) ON DELETE CASCADE;
ALTER TABLE public.wl_wholesale_pricing ADD CONSTRAINT wl_wholesale_pricing_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;
ALTER TABLE public.wl_wordpress_connections ADD CONSTRAINT wl_wordpress_connections_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES white_label_partners(id) ON DELETE CASCADE;

-- ============= INDEXES (non-constraint) =============
CREATE INDEX idx_addon_products_slug ON public.addon_products USING btree (slug);
CREATE INDEX idx_agent_performance_reviews_agent ON public.agent_performance_reviews USING btree (agent_id);
CREATE INDEX idx_ai_draft_log_user_time ON public.ai_draft_log USING btree (user_id, created_at DESC);
CREATE INDEX idx_approval_policies_active ON public.approval_policies USING btree (active, scope, deal_type);
CREATE INDEX idx_approval_policy_versions_policy ON public.approval_policy_versions USING btree (policy_id, version_no DESC);
CREATE INDEX idx_approval_requests_deal ON public.approval_requests USING btree (deal_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests USING btree (status);
CREATE UNIQUE INDEX uq_approval_requests_deal_policy_pending ON public.approval_requests USING btree (deal_id, policy_id, tier) WHERE (status = 'pending'::approval_request_status);
CREATE INDEX idx_audit_log_action ON public.audit_log USING btree (action);
CREATE INDEX idx_audit_log_actor_id ON public.audit_log USING btree (actor_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);
CREATE INDEX idx_audit_log_target ON public.audit_log USING btree (target_table, target_id);
CREATE INDEX idx_check_runs_ran_at ON public.automation_check_runs USING btree (ran_at DESC);
CREATE INDEX idx_autorec_domain ON public.automation_recommendations USING btree (domain, status);
CREATE INDEX idx_autorec_status_severity ON public.automation_recommendations USING btree (status, severity, last_detected_at DESC);
CREATE INDEX idx_billing_notes_lead_id ON public.billing_notes USING btree (lead_id);
CREATE INDEX idx_recep_cfg_dept ON public.call_flow_receptionist_configs USING btree (client_department_id);
CREATE INDEX idx_recep_cfg_tenant ON public.call_flow_receptionist_configs USING btree (tenant_kind, wl_partner_id, client_lead_id, wl_client_id);
CREATE INDEX idx_call_logs_call_date ON public.call_logs USING btree (call_date);
CREATE INDEX idx_call_logs_external_call_id ON public.call_logs USING btree (external_call_id);
CREATE INDEX campaign_audit_log_entity_idx ON public.campaign_audit_log USING btree (entity, entity_id, created_at DESC);
CREATE INDEX campaign_audit_log_tenant_idx ON public.campaign_audit_log USING btree (tenant_kind, wl_partner_id, client_lead_id, wl_client_id, created_at DESC);
CREATE INDEX idx_campaign_faqs_location ON public.campaign_faq_entries USING btree (client_location_id);
CREATE INDEX idx_campaign_field_groups_location ON public.campaign_field_groups USING btree (client_location_id);
CREATE UNIQUE INDEX campaign_fields_direct_key_uniq ON public.campaign_fields USING btree (client_lead_id, COALESCE((client_department_id)::text, ''::text), lower(field_key)) WHERE ((tenant_kind = 'direct_24h'::campaign_tenant_kind) AND (scope <> 'global'::text));
CREATE UNIQUE INDEX campaign_fields_global_key_uniq ON public.campaign_fields USING btree (lower(field_key)) WHERE (scope = 'global'::text);
CREATE UNIQUE INDEX campaign_fields_wl_key_uniq ON public.campaign_fields USING btree (wl_client_id, COALESCE((client_department_id)::text, ''::text), lower(field_key)) WHERE ((tenant_kind = 'wl_partner'::campaign_tenant_kind) AND (scope <> 'global'::text));
CREATE INDEX idx_campaign_fields_location ON public.campaign_fields USING btree (client_location_id);
CREATE INDEX campaign_knowledge_versions_entity_idx ON public.campaign_knowledge_versions USING btree (entity, entity_id, version DESC);
CREATE INDEX idx_campaign_policies_location ON public.campaign_policy_blocks USING btree (client_location_id);
CREATE INDEX idx_campaign_publish_versions_campaign_version ON public.campaign_publish_versions USING btree (campaign_id, version DESC);
CREATE INDEX idx_campaign_scenarios_campaign_sort ON public.campaign_scenarios USING btree (campaign_id, sort_order, created_at);
CREATE INDEX idx_campaign_scenarios_dept_status ON public.campaign_scenarios USING btree (client_department_id, status);
CREATE INDEX idx_csdv_document ON public.campaign_script_document_versions USING btree (document_id);
CREATE INDEX idx_csd_campaign ON public.campaign_script_documents USING btree (campaign_id);
CREATE INDEX idx_csd_client_lead ON public.campaign_script_documents USING btree (client_lead_id);
CREATE INDEX idx_csd_wl_client ON public.campaign_script_documents USING btree (wl_client_id);
CREATE INDEX idx_csd_wl_partner ON public.campaign_script_documents USING btree (wl_partner_id);
CREATE INDEX idx_campaign_templates_tenant ON public.campaign_templates USING btree (tenant_kind, wl_partner_id, client_lead_id, wl_client_id);
CREATE INDEX idx_ctc_agent ON public.campaign_training_completions USING btree (agent_id);
CREATE INDEX idx_ctc_campaign ON public.campaign_training_completions USING btree (campaign_id);
CREATE INDEX idx_ctc_module ON public.campaign_training_completions USING btree (module_id);
CREATE INDEX idx_ctl_module ON public.campaign_training_lessons USING btree (module_id, sort_order);
CREATE INDEX idx_ctm_campaign ON public.campaign_training_modules USING btree (campaign_id);
CREATE INDEX idx_ctm_status ON public.campaign_training_modules USING btree (status);
CREATE INDEX idx_ctm_tenant ON public.campaign_training_modules USING btree (tenant_kind, wl_partner_id, client_lead_id, wl_client_id);
CREATE INDEX idx_ctqa_agent ON public.campaign_training_quiz_attempts USING btree (agent_id, lesson_id, attempted_at DESC);
CREATE INDEX idx_ctqa_campaign ON public.campaign_training_quiz_attempts USING btree (campaign_id);
CREATE INDEX idx_ctqq_lesson ON public.campaign_training_quiz_questions USING btree (lesson_id, sort_order);
CREATE INDEX idx_cts_agent ON public.campaign_training_signoffs USING btree (agent_id);
CREATE INDEX idx_cts_campaign ON public.campaign_training_signoffs USING btree (campaign_id);
CREATE INDEX idx_cts_module ON public.campaign_training_signoffs USING btree (module_id);
CREATE INDEX idx_campaigns_status_updated ON public.campaigns USING btree (status, updated_at DESC);
CREATE INDEX idx_campaigns_tenant ON public.campaigns USING btree (tenant_kind, wl_partner_id, client_lead_id, wl_client_id);
CREATE INDEX idx_capacity_supply_scope_fn_date ON public.capacity_supply USING btree (scope, function, effective_date DESC);
CREATE INDEX idx_chat_activity_conversation ON public.chat_activity_log USING btree (conversation_id);
CREATE INDEX idx_chat_assignments_agent ON public.chat_assignments USING btree (agent_id);
CREATE INDEX idx_chat_assignments_conversation ON public.chat_assignments USING btree (conversation_id);
CREATE INDEX idx_chat_canned_responses_deployment ON public.chat_canned_responses USING btree (deployment_id);
CREATE INDEX idx_chat_conversations_assigned_agent ON public.chat_conversations USING btree (assigned_agent_id) WHERE (assigned_agent_id IS NOT NULL);
CREATE INDEX idx_chat_conversations_deployment ON public.chat_conversations USING btree (deployment_id);
CREATE INDEX idx_chat_conversations_direct_client ON public.chat_conversations USING btree (direct_client_id) WHERE (direct_client_id IS NOT NULL);
CREATE INDEX idx_chat_conversations_last_message ON public.chat_conversations USING btree (last_message_at DESC);
CREATE INDEX idx_chat_conversations_status ON public.chat_conversations USING btree (status);
CREATE INDEX idx_chat_conversations_wl_partner ON public.chat_conversations USING btree (wl_partner_id) WHERE (wl_partner_id IS NOT NULL);
CREATE INDEX idx_chat_deployments_direct_client ON public.chat_deployments USING btree (direct_client_id) WHERE (direct_client_id IS NOT NULL);
CREATE INDEX idx_chat_deployments_widget_token ON public.chat_deployments USING btree (widget_token);
CREATE INDEX idx_chat_deployments_wl_client ON public.chat_deployments USING btree (wl_client_id) WHERE (wl_client_id IS NOT NULL);
CREATE INDEX idx_chat_deployments_wl_partner ON public.chat_deployments USING btree (wl_partner_id) WHERE (wl_partner_id IS NOT NULL);
CREATE INDEX idx_chat_handoff_events_conversation ON public.chat_handoff_events USING btree (conversation_id);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages USING btree (conversation_id, created_at);
CREATE INDEX idx_chat_visitors_deployment ON public.chat_visitors USING btree (deployment_id);
CREATE INDEX idx_client_addons_is_active ON public.client_addons USING btree (is_active);
CREATE INDEX idx_client_addons_lead_id ON public.client_addons USING btree (lead_id);
CREATE INDEX idx_client_agent_assignments_agent ON public.client_agent_assignments USING btree (agent_id);
CREATE INDEX idx_client_agent_assignments_client ON public.client_agent_assignments USING btree (client_id);
CREATE UNIQUE INDEX client_contacts_direct_email_uniq ON public.client_contacts USING btree (client_lead_id, lower(email)) WHERE ((tenant_kind = 'direct_24h'::campaign_tenant_kind) AND (email IS NOT NULL));
CREATE UNIQUE INDEX client_contacts_wl_email_uniq ON public.client_contacts USING btree (wl_client_id, lower(email)) WHERE ((tenant_kind = 'wl_partner'::campaign_tenant_kind) AND (email IS NOT NULL));
CREATE UNIQUE INDEX client_departments_direct_name_uniq ON public.client_departments USING btree (client_lead_id, lower(department_name)) WHERE (tenant_kind = 'direct_24h'::campaign_tenant_kind);
CREATE UNIQUE INDEX client_departments_wl_name_uniq ON public.client_departments USING btree (wl_client_id, lower(department_name)) WHERE (tenant_kind = 'wl_partner'::campaign_tenant_kind);
CREATE INDEX idx_client_departments_location ON public.client_departments USING btree (client_location_id);
CREATE INDEX idx_client_docs_handoff ON public.client_handoff_documents USING btree (handoff_id);
CREATE INDEX idx_client_items_fillable ON public.client_handoff_items USING btree (handoff_id) WHERE (is_client_fillable = true);
CREATE INDEX idx_client_items_handoff ON public.client_handoff_items USING btree (handoff_id, sort_order);
CREATE INDEX idx_client_requests_handoff ON public.client_handoff_requests USING btree (handoff_id, status);
CREATE INDEX idx_client_locations_lead ON public.client_locations USING btree (client_lead_id);
CREATE INDEX idx_client_locations_partner ON public.client_locations USING btree (wl_partner_id);
CREATE INDEX idx_client_locations_wl_client ON public.client_locations USING btree (wl_client_id);
CREATE INDEX idx_client_activity_handoff ON public.client_onboarding_activity USING btree (handoff_id, created_at DESC);
CREATE INDEX idx_client_handoffs_intake ON public.client_onboarding_handoffs USING btree (current_intake_id);
CREATE INDEX idx_client_handoffs_lead ON public.client_onboarding_handoffs USING btree (client_lead_id);
CREATE INDEX idx_client_handoffs_status ON public.client_onboarding_handoffs USING btree (status);
CREATE INDEX idx_client_handoffs_user ON public.client_onboarding_handoffs USING btree (client_user_id);
CREATE INDEX idx_client_report_mappings_active ON public.client_report_mappings USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_client_report_mappings_lead ON public.client_report_mappings USING btree (lead_id);
CREATE INDEX idx_client_scripts_migrated_to_campaign ON public.client_scripts USING btree (migrated_to_campaign_id);
CREATE INDEX idx_comm_actions_deal ON public.communication_actions USING btree (deal_id);
CREATE INDEX idx_comm_actions_scope_target ON public.communication_actions USING btree (scope, target_id);
CREATE INDEX idx_comm_actions_status ON public.communication_actions USING btree (status);
CREATE UNIQUE INDEX uq_comm_actions_pending ON public.communication_actions USING btree (scope, target_id, template_id) WHERE (status = ANY (ARRAY['suggested'::text, 'approved'::text, 'queued'::text]));
CREATE INDEX idx_crm_activities_created_at ON public.crm_activities USING btree (created_at DESC);
CREATE INDEX idx_crm_activities_lead_id ON public.crm_activities USING btree (lead_id);
CREATE INDEX idx_crm_tasks_assigned_to ON public.crm_tasks USING btree (assigned_to);
CREATE INDEX idx_crm_tasks_due_date ON public.crm_tasks USING btree (due_date);
CREATE INDEX idx_crm_tasks_lead_id ON public.crm_tasks USING btree (lead_id);
CREATE INDEX idx_crm_tasks_status ON public.crm_tasks USING btree (status);
CREATE INDEX idx_custom_plans_lead_id ON public.custom_plans USING btree (lead_id);
CREATE INDEX dashboard_events_event_name_idx ON public.dashboard_events USING btree (event_name, occurred_at DESC);
CREATE INDEX dashboard_events_persona_idx ON public.dashboard_events USING btree (persona, occurred_at DESC);
CREATE INDEX dashboard_events_session_id_idx ON public.dashboard_events USING btree (session_id, occurred_at DESC);
CREATE INDEX dashboard_events_surface_idx ON public.dashboard_events USING btree (surface, occurred_at DESC);
CREATE INDEX dashboard_events_user_id_idx ON public.dashboard_events USING btree (user_id, occurred_at DESC);
CREATE INDEX idx_data_export_snapshots_partner ON public.data_export_snapshots USING btree (partner_id, generated_at DESC) WHERE (partner_id IS NOT NULL);
CREATE INDEX idx_data_export_snapshots_type_time ON public.data_export_snapshots USING btree (snapshot_type, generated_at DESC);
CREATE UNIQUE INDEX department_numbers_dnis_active_uniq ON public.department_numbers USING btree (dnis) WHERE ((active = true) AND (dnis IS NOT NULL));
CREATE INDEX idx_dsp_followup ON public.direct_success_plays USING btree (follow_up_date);
CREATE INDEX idx_dsp_lead ON public.direct_success_plays USING btree (lead_id);
CREATE INDEX idx_dsp_status ON public.direct_success_plays USING btree (status);
CREATE INDEX idx_disc_audiences_active ON public.disc_audiences USING btree (active);
CREATE INDEX idx_disc_faqs_set ON public.disc_faqs USING btree (faq_set_id);
CREATE INDEX idx_disc_generated_pages_hash ON public.disc_generated_pages USING btree (source_combination_hash);
CREATE INDEX idx_disc_pages_combo_hash ON public.disc_generated_pages USING btree (source_combination_hash);
CREATE INDEX idx_disc_pages_keyword ON public.disc_generated_pages USING btree (keyword_id);
CREATE INDEX idx_disc_pages_location ON public.disc_generated_pages USING btree (location_id);
CREATE INDEX idx_disc_pages_publish ON public.disc_generated_pages USING btree (publish_status);
CREATE INDEX idx_disc_pages_readiness ON public.disc_generated_pages USING btree (readiness_state);
CREATE INDEX idx_disc_pages_template ON public.disc_generated_pages USING btree (template_id);
CREATE UNIQUE INDEX uq_disc_generated_pages_hash ON public.disc_generated_pages USING btree (source_combination_hash);
CREATE INDEX idx_disc_link_items_set ON public.disc_internal_link_items USING btree (link_set_id);
CREATE INDEX idx_disc_keywords_active ON public.disc_keywords USING btree (active);
CREATE INDEX idx_disc_keywords_cluster ON public.disc_keywords USING btree (topic_cluster);
CREATE INDEX idx_disc_locations_active ON public.disc_locations USING btree (active);
CREATE INDEX idx_disc_locations_country ON public.disc_locations USING btree (country_slug);
CREATE INDEX idx_disc_locations_country_priority ON public.disc_locations USING btree (country, priority_score DESC);
CREATE INDEX idx_disc_locations_priority ON public.disc_locations USING btree (priority_score DESC);
CREATE INDEX idx_disc_publish_log_created ON public.disc_publish_log USING btree (created_at DESC);
CREATE INDEX idx_disc_publish_log_page ON public.disc_publish_log USING btree (generated_page_id);
CREATE INDEX idx_alloc_log_exp_time ON public.experiment_allocation_log USING btree (experiment_id, created_at DESC);
CREATE INDEX idx_feedback_metadata_partner ON public.feedback USING btree (((metadata ->> 'partner_id'::text)));
CREATE INDEX idx_feedback_source_dashboard ON public.feedback USING btree (source_dashboard);
CREATE INDEX idx_feedback_status ON public.feedback USING btree (status);
CREATE INDEX idx_feedback_user ON public.feedback USING btree (user_id);
CREATE INDEX feedback_handoffs_partner_idx ON public.feedback_handoffs USING btree (wl_partner_id);
CREATE INDEX feedback_handoffs_source_idx ON public.feedback_handoffs USING btree (source_table, source_id);
CREATE INDEX feedback_messages_feedback_id_created_idx ON public.feedback_messages USING btree (feedback_id, created_at);
CREATE INDEX idx_five9_drift_department ON public.five9_drift_snapshots USING btree (client_department_id, captured_at DESC);
CREATE UNIQUE INDEX five9_variable_mappings_dept_uniq ON public.five9_variable_mappings USING btree (COALESCE((client_department_id)::text, ''::text), lower(five9_variable_name));
CREATE INDEX idx_forecast_snapshots_generated_at ON public.forecast_snapshots USING btree (generated_at DESC);
CREATE INDEX idx_gtm_targets_period_scope ON public.gtm_targets USING btree (period, scope);
CREATE INDEX idx_intake_activity_intake ON public.internal_fulfillment_activity USING btree (intake_id, created_at DESC);
CREATE INDEX idx_intake_docs_intake ON public.internal_fulfillment_intake_documents USING btree (intake_id);
CREATE INDEX idx_intake_assigned ON public.internal_fulfillment_intakes USING btree (assigned_to);
CREATE INDEX idx_intake_partner ON public.internal_fulfillment_intakes USING btree (partner_id);
CREATE INDEX idx_intake_status ON public.internal_fulfillment_intakes USING btree (status, submitted_at DESC);
CREATE INDEX idx_intakes_client_lead_id ON public.internal_fulfillment_intakes USING btree (client_lead_id);
CREATE INDEX idx_intakes_source ON public.internal_fulfillment_intakes USING btree (source);
CREATE INDEX idx_intake_notes_intake ON public.internal_fulfillment_notes USING btree (intake_id, created_at DESC);
CREATE UNIQUE INDEX idx_leads_account_code ON public.leads USING btree (account_code) WHERE (account_code IS NOT NULL);
CREATE INDEX idx_leads_pipeline_stage ON public.leads USING btree (pipeline_stage);
CREATE INDEX idx_leads_user_id ON public.leads USING btree (user_id);
CREATE INDEX notifications_metadata_gin ON public.notifications USING gin (metadata);
CREATE UNIQUE INDEX notifications_user_event_key_uniq ON public.notifications USING btree (user_id, ((metadata ->> 'event_key'::text))) WHERE (metadata ? 'event_key'::text);
CREATE INDEX idx_offer_exposures_created ON public.offer_exposures USING btree (created_at);
CREATE INDEX idx_offer_exposures_experiment ON public.offer_exposures USING btree (experiment_id, variant_key);
CREATE INDEX idx_offer_exposures_offer ON public.offer_exposures USING btree (offer_id, event);
CREATE INDEX idx_offers_experiment ON public.offers USING btree (experiment_id, variant_key);
CREATE INDEX idx_offers_partner ON public.offers USING btree (partner_id);
CREATE INDEX idx_offers_surface_active ON public.offers USING btree (surface, active);
CREATE INDEX idx_outbound_call_requests_wl_client_id ON public.outbound_call_requests USING btree (wl_client_id);
CREATE INDEX idx_outline_progress_feature_id ON public.outline_progress USING btree (feature_id);
CREATE INDEX idx_psp_followup ON public.partner_success_plays USING btree (follow_up_date);
CREATE INDEX idx_psp_partner ON public.partner_success_plays USING btree (partner_id);
CREATE INDEX idx_psp_status ON public.partner_success_plays USING btree (status);
CREATE INDEX idx_payment_failures_lead_id ON public.payment_failures USING btree (lead_id);
CREATE INDEX idx_payment_failures_resolved ON public.payment_failures USING btree (resolved_at) WHERE (resolved_at IS NULL);
CREATE UNIQUE INDEX people_primary_email_unique ON public.people USING btree (primary_email);
CREATE UNIQUE INDEX play_suggestions_pending_dedupe ON public.play_suggestions USING btree (scope, target_id, template_id) WHERE (status = 'pending'::text);
CREATE INDEX play_suggestions_status_idx ON public.play_suggestions USING btree (status, created_at DESC);
CREATE INDEX idx_pea_experiment ON public.pricing_experiment_assignments USING btree (experiment_id);
CREATE INDEX idx_pea_lead ON public.pricing_experiment_assignments USING btree (lead_id);
CREATE INDEX idx_pea_variant ON public.pricing_experiment_assignments USING btree (experiment_id, variant_key);
CREATE INDEX idx_qa_release_gates_created_at ON public.qa_release_gates USING btree (created_at DESC);
CREATE INDEX idx_qa_release_gates_decision ON public.qa_release_gates USING btree (decision);
CREATE INDEX idx_red_renewal ON public.renewal_expansion_deals USING btree (related_renewal_workflow_id);
CREATE INDEX idx_red_stage ON public.renewal_expansion_deals USING btree (stage);
CREATE INDEX idx_red_status ON public.renewal_expansion_deals USING btree (status);
CREATE INDEX idx_red_target ON public.renewal_expansion_deals USING btree (scope, target_id);
CREATE UNIQUE INDEX uniq_red_open_per_renewal ON public.renewal_expansion_deals USING btree (related_renewal_workflow_id) WHERE ((status = 'open'::deal_status) AND (related_renewal_workflow_id IS NOT NULL));
CREATE INDEX idx_revops_snap_period ON public.revops_period_snapshots USING btree (period_start_date DESC);
CREATE INDEX idx_revops_snap_capacity_snap ON public.revops_snapshot_capacity USING btree (snapshot_id);
CREATE INDEX idx_revops_snap_pipeline_snap ON public.revops_snapshot_pipeline USING btree (snapshot_id);
CREATE INDEX idx_slack_messages_channel ON public.slack_messages USING btree (slack_channel_id);
CREATE UNIQUE INDEX idx_slack_messages_channel_ts ON public.slack_messages USING btree (slack_channel_id, slack_message_ts);
CREATE UNIQUE INDEX idx_slack_user_mappings_slack_user_id ON public.slack_user_mappings USING btree (slack_user_id);
CREATE UNIQUE INDEX idx_slack_user_mappings_user_id ON public.slack_user_mappings USING btree (user_id);
CREATE INDEX idx_supervisor_escalations_status ON public.supervisor_escalations USING btree (status);
CREATE INDEX idx_supervisor_assignments_supervisor ON public.supervisor_tenant_assignments USING btree (supervisor_user_id);
CREATE UNIQUE INDEX supervisor_assignment_unique_target ON public.supervisor_tenant_assignments USING btree (supervisor_user_id, COALESCE(client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX idx_support_requests_created_at ON public.support_requests USING btree (created_at DESC);
CREATE INDEX idx_support_requests_status ON public.support_requests USING btree (status);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to);
CREATE INDEX idx_support_tickets_category ON public.support_tickets USING btree (category);
CREATE INDEX idx_support_tickets_lead_id ON public.support_tickets USING btree (lead_id);
CREATE INDEX idx_support_tickets_linked_wl_client_ticket_id ON public.support_tickets USING btree (linked_wl_client_ticket_id) WHERE (linked_wl_client_ticket_id IS NOT NULL);
CREATE INDEX idx_support_tickets_source ON public.support_tickets USING btree (source);
CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);
CREATE INDEX idx_support_tickets_submitted_by ON public.support_tickets USING btree (submitted_by);
CREATE INDEX idx_support_tickets_work_queue ON public.support_tickets USING btree (work_queue);
CREATE INDEX idx_task_notes_created_at ON public.task_notes USING btree (created_at);
CREATE INDEX idx_task_notes_task_id ON public.task_notes USING btree (task_id);
CREATE INDEX idx_tech_issues_category ON public.tech_issues USING btree (category);
CREATE INDEX idx_tech_issues_status ON public.tech_issues USING btree (status);
CREATE UNIQUE INDEX tenant_brand_profiles_direct_uniq ON public.tenant_brand_profiles USING btree (client_lead_id) WHERE (tenant_kind = 'direct_24h'::campaign_tenant_kind);
CREATE UNIQUE INDEX tenant_brand_profiles_wl_uniq ON public.tenant_brand_profiles USING btree (wl_partner_id, wl_client_id) WHERE (tenant_kind = 'wl_partner'::campaign_tenant_kind);
CREATE INDEX idx_ticket_replies_ticket_id ON public.ticket_replies USING btree (ticket_id);
CREATE INDEX idx_usage_records_billed ON public.usage_records USING btree (billed);
CREATE INDEX idx_usage_records_billing_period ON public.usage_records USING btree (billing_period_start, billing_period_end);
CREATE INDEX idx_usage_records_lead_id ON public.usage_records USING btree (lead_id);
CREATE INDEX idx_wl_branding_custom_domain ON public.white_label_branding USING btree (custom_domain);
CREATE INDEX idx_wl_domain_aliases_hostname ON public.white_label_domain_aliases USING btree (alias_hostname);
CREATE UNIQUE INDEX white_label_partners_partner_slug_unique ON public.white_label_partners USING btree (partner_slug);
CREATE INDEX wizard_sessions_email_idx ON public.wizard_sessions USING btree (lower(email));
CREATE INDEX wizard_sessions_last_activity_idx ON public.wizard_sessions USING btree (last_activity_at DESC);
CREATE INDEX wizard_sessions_lead_id_idx ON public.wizard_sessions USING btree (lead_id);
CREATE INDEX wizard_sessions_user_id_idx ON public.wizard_sessions USING btree (user_id);
CREATE INDEX idx_wl_blog_queue_partner ON public.wl_blog_queue USING btree (partner_id);
CREATE INDEX idx_wl_blog_queue_status ON public.wl_blog_queue USING btree (status);
CREATE UNIQUE INDEX idx_wl_call_logs_external_call_id ON public.wl_call_logs USING btree (external_call_id) WHERE (external_call_id IS NOT NULL);
CREATE INDEX idx_wl_campaign_recipients_campaign ON public.wl_campaign_recipients USING btree (campaign_id);
CREATE INDEX idx_wl_campaign_recipients_client ON public.wl_campaign_recipients USING btree (wl_client_id);
CREATE INDEX idx_wl_campaign_recipients_status ON public.wl_campaign_recipients USING btree (status);
CREATE INDEX idx_wl_client_reviews_client ON public.wl_client_reviews USING btree (wl_client_id);
CREATE INDEX idx_wl_client_reviews_partner ON public.wl_client_reviews USING btree (partner_id);
CREATE INDEX idx_wl_client_scripts_migrated_to_campaign ON public.wl_client_scripts USING btree (migrated_to_campaign_id);
CREATE INDEX idx_wl_keyword_tracker_partner ON public.wl_keyword_tracker USING btree (partner_id);
CREATE INDEX idx_wl_portal_access_handoff ON public.wl_partner_client_portal_access USING btree (handoff_id, created_at DESC);
CREATE INDEX idx_wl_portal_access_partner ON public.wl_partner_client_portal_access USING btree (partner_id);
CREATE INDEX idx_wl_pf_partner_created ON public.wl_partner_feedback USING btree (partner_id, created_at DESC);
CREATE INDEX idx_wl_pf_partner_origin_status ON public.wl_partner_feedback USING btree (partner_id, origin, status);
CREATE INDEX idx_wl_pf_submitter ON public.wl_partner_feedback USING btree (submitted_by_user_id);
CREATE INDEX idx_wl_pfe_partner ON public.wl_partner_feedback_escalations USING btree (partner_id);
CREATE UNIQUE INDEX uq_wl_pfe_wl_feedback ON public.wl_partner_feedback_escalations USING btree (wl_feedback_id);
CREATE INDEX wl_pfm_feedback_id_idx ON public.wl_partner_feedback_messages USING btree (feedback_id);
CREATE INDEX wl_pfm_partner_id_idx ON public.wl_partner_feedback_messages USING btree (partner_id);
CREATE INDEX idx_wl_handoff_docs_handoff ON public.wl_partner_handoff_documents USING btree (handoff_id, status);
CREATE INDEX idx_wl_handoff_docs_partner ON public.wl_partner_handoff_documents USING btree (partner_id);
CREATE INDEX idx_wl_handoff_items_handoff ON public.wl_partner_handoff_items USING btree (handoff_id, sort_order);
CREATE INDEX idx_wl_handoff_items_partner ON public.wl_partner_handoff_items USING btree (partner_id);
CREATE INDEX idx_handoff_req_handoff ON public.wl_partner_handoff_requests USING btree (handoff_id, status);
CREATE INDEX idx_handoff_req_intake ON public.wl_partner_handoff_requests USING btree (intake_id);
CREATE INDEX idx_handoff_req_partner ON public.wl_partner_handoff_requests USING btree (partner_id);
CREATE INDEX wl_partner_leads_partner_created ON public.wl_partner_leads USING btree (partner_id, created_at DESC);
CREATE INDEX wl_partner_leads_partner_idx ON public.wl_partner_leads USING btree (partner_id);
CREATE INDEX wl_partner_leads_partner_stage_idx ON public.wl_partner_leads USING btree (partner_id, pipeline_stage);
CREATE INDEX wl_partner_members_partner_status_role_idx ON public.wl_partner_members USING btree (partner_id, status, role);
CREATE INDEX wl_partner_members_user_status_idx ON public.wl_partner_members USING btree (user_id, status);
CREATE INDEX idx_wl_handoffs_partner_status ON public.wl_partner_onboarding_handoffs USING btree (partner_id, status);
CREATE INDEX idx_wl_proposal_activity_partner ON public.wl_partner_proposal_activity USING btree (partner_id, created_at DESC);
CREATE INDEX idx_wl_proposal_activity_proposal ON public.wl_partner_proposal_activity USING btree (proposal_id, created_at DESC);
CREATE INDEX idx_wl_proposal_shares_partner ON public.wl_partner_proposal_shares USING btree (partner_id);
CREATE INDEX idx_wl_proposal_shares_proposal ON public.wl_partner_proposal_shares USING btree (proposal_id, created_at DESC);
CREATE INDEX idx_wl_partner_proposals_lead ON public.wl_partner_proposals USING btree (lead_id);
CREATE INDEX idx_wl_partner_proposals_partner ON public.wl_partner_proposals USING btree (partner_id);
CREATE INDEX idx_wl_partner_proposals_partner_created ON public.wl_partner_proposals USING btree (partner_id, created_at DESC);
CREATE UNIQUE INDEX idx_wl_partner_proposals_partner_number ON public.wl_partner_proposals USING btree (partner_id, proposal_number);
CREATE INDEX idx_wl_partner_proposals_partner_status ON public.wl_partner_proposals USING btree (partner_id, status);
CREATE INDEX idx_wl_tasks_handoff ON public.wl_partner_tasks USING btree (handoff_id);
CREATE INDEX idx_wl_tasks_partner_status_due ON public.wl_partner_tasks USING btree (partner_id, status, due_at);
CREATE INDEX idx_wl_tasks_proposal ON public.wl_partner_tasks USING btree (proposal_id);
CREATE INDEX idx_wl_ticket_forwards_partner ON public.wl_ticket_forwards USING btree (partner_id);
CREATE INDEX idx_wl_ticket_forwards_support_ticket ON public.wl_ticket_forwards USING btree (support_ticket_id);
CREATE INDEX idx_wl_ticket_forwards_wl_ticket ON public.wl_ticket_forwards USING btree (wl_client_ticket_id);
-- ============= PRIMARY KEYS / UNIQUE / CHECK CONSTRAINTS =============
ALTER TABLE public.addon_products ADD CONSTRAINT addon_products_slug_key UNIQUE (slug);
ALTER TABLE public.addon_products ADD CONSTRAINT addon_products_pkey PRIMARY KEY (id);
ALTER TABLE public.addon_products ADD CONSTRAINT addon_products_billing_type_check CHECK ((billing_type = ANY (ARRAY['one_time'::text, 'recurring'::text, 'usage_based'::text])));
ALTER TABLE public.admin_email_connections ADD CONSTRAINT admin_email_connections_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_email_contacts ADD CONSTRAINT admin_email_contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_email_sends ADD CONSTRAINT admin_email_sends_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_newsletter_drafts ADD CONSTRAINT admin_newsletter_drafts_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_seo_reports ADD CONSTRAINT admin_seo_reports_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_key_key UNIQUE (key);
ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_social_snippets ADD CONSTRAINT admin_social_snippets_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_wordpress_connection ADD CONSTRAINT admin_wordpress_connection_pkey PRIMARY KEY (id);
ALTER TABLE public.affiliate_marketing_assets ADD CONSTRAINT affiliate_marketing_assets_pkey PRIMARY KEY (id);
ALTER TABLE public.affiliate_payouts ADD CONSTRAINT affiliate_payouts_pkey PRIMARY KEY (id);
ALTER TABLE public.affiliate_referrals ADD CONSTRAINT affiliate_referrals_pkey PRIMARY KEY (id);
ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_affiliate_code_key UNIQUE (affiliate_code);
ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_pkey PRIMARY KEY (id);
ALTER TABLE public.agent_banking ADD CONSTRAINT agent_banking_agent_id_key UNIQUE (agent_id);
ALTER TABLE public.agent_banking ADD CONSTRAINT agent_banking_pkey PRIMARY KEY (id);
ALTER TABLE public.agent_configs ADD CONSTRAINT agent_configs_agent_name_key UNIQUE (agent_name);
ALTER TABLE public.agent_configs ADD CONSTRAINT agent_configs_pkey PRIMARY KEY (id);
ALTER TABLE public.agent_onboarding ADD CONSTRAINT agent_onboarding_pkey PRIMARY KEY (id);
ALTER TABLE public.agent_onboarding_log ADD CONSTRAINT agent_onboarding_log_pkey PRIMARY KEY (id);
ALTER TABLE public.agent_performance_reviews ADD CONSTRAINT agent_performance_reviews_pkey PRIMARY KEY (id);
ALTER TABLE public.agent_performance_reviews ADD CONSTRAINT agent_performance_reviews_attendance_score_check CHECK (((attendance_score >= 1) AND (attendance_score <= 5)));
ALTER TABLE public.agent_performance_reviews ADD CONSTRAINT agent_performance_reviews_communication_score_check CHECK (((communication_score >= 1) AND (communication_score <= 5)));
ALTER TABLE public.agent_performance_reviews ADD CONSTRAINT agent_performance_reviews_quality_score_check CHECK (((quality_score >= 1) AND (quality_score <= 5)));
ALTER TABLE public.agent_prompts ADD CONSTRAINT agent_prompts_pkey PRIMARY KEY (id);
ALTER TABLE public.agent_runs ADD CONSTRAINT agent_runs_pkey PRIMARY KEY (id);
ALTER TABLE public.agent_schedules ADD CONSTRAINT agent_schedules_pkey PRIMARY KEY (id);
ALTER TABLE public.agent_shift_breaks ADD CONSTRAINT agent_shift_breaks_pkey PRIMARY KEY (id);
ALTER TABLE public.agent_shifts ADD CONSTRAINT agent_shifts_pkey PRIMARY KEY (id);
ALTER TABLE public.agent_skills ADD CONSTRAINT agent_skills_agent_id_skill_name_key UNIQUE (agent_id, skill_name);
ALTER TABLE public.agent_skills ADD CONSTRAINT agent_skills_pkey PRIMARY KEY (id);
ALTER TABLE public.ai_draft_log ADD CONSTRAINT ai_draft_log_pkey PRIMARY KEY (id);
ALTER TABLE public.ai_draft_log ADD CONSTRAINT ai_draft_log_status_check CHECK ((status = ANY (ARRAY['ok'::text, 'error'::text, 'rate_limited'::text])));
ALTER TABLE public.approval_policies ADD CONSTRAINT approval_policies_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_policies ADD CONSTRAINT approval_policies_deal_type_check CHECK ((deal_type = ANY (ARRAY['renewal'::text, 'expansion'::text, 'downsell'::text, 'save'::text, 'any'::text])));
ALTER TABLE public.approval_policies ADD CONSTRAINT approval_policies_scope_check CHECK ((scope = ANY (ARRAY['direct'::text, 'partner'::text, 'both'::text])));
ALTER TABLE public.approval_policy_versions ADD CONSTRAINT approval_policy_versions_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_policy_versions ADD CONSTRAINT approval_policy_versions_action_check CHECK ((action = ANY (ARRAY['created'::text, 'updated'::text, 'activated'::text, 'deactivated'::text, 'deleted'::text])));
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.autoblog_queue ADD CONSTRAINT autoblog_queue_pkey PRIMARY KEY (id);
ALTER TABLE public.automation_check_runs ADD CONSTRAINT automation_check_runs_pkey PRIMARY KEY (id);
ALTER TABLE public.automation_check_runs ADD CONSTRAINT automation_check_runs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'failed'::text])));
ALTER TABLE public.automation_recommendations ADD CONSTRAINT automation_recommendations_dedupe_key_key UNIQUE (dedupe_key);
ALTER TABLE public.automation_recommendations ADD CONSTRAINT automation_recommendations_pkey PRIMARY KEY (id);
ALTER TABLE public.automation_recommendations ADD CONSTRAINT automation_recommendations_domain_check CHECK ((domain = ANY (ARRAY['growth'::text, 'revenue'::text, 'delivery'::text, 'voice'::text, 'wl'::text, 'system'::text])));
ALTER TABLE public.automation_recommendations ADD CONSTRAINT automation_recommendations_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'notice'::text, 'warn'::text, 'critical'::text])));
ALTER TABLE public.automation_recommendations ADD CONSTRAINT automation_recommendations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'dismissed'::text, 'resolved'::text])));
ALTER TABLE public.automation_recommendations ADD CONSTRAINT automation_recommendations_tier_check CHECK ((tier = ANY (ARRAY['detect'::text, 'recommend'::text, 'confirm'::text, 'auto_safe'::text])));
ALTER TABLE public.billing_notes ADD CONSTRAINT billing_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.billing_summaries ADD CONSTRAINT billing_summaries_pkey PRIMARY KEY (id);
ALTER TABLE public.blog_internal_links ADD CONSTRAINT blog_internal_links_pkey PRIMARY KEY (id);
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);
ALTER TABLE public.call_flow_receptionist_configs ADD CONSTRAINT call_flow_receptionist_configs_client_department_id_key UNIQUE (client_department_id);
ALTER TABLE public.call_flow_receptionist_configs ADD CONSTRAINT call_flow_receptionist_configs_pkey PRIMARY KEY (id);
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_call_type_check CHECK ((call_type = ANY (ARRAY['inbound'::text, 'outbound'::text])));
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_status_check CHECK ((status = ANY (ARRAY['completed'::text, 'missed'::text, 'voicemail'::text, 'transferred'::text])));
ALTER TABLE public.call_report_imports ADD CONSTRAINT call_report_imports_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_audit_log ADD CONSTRAINT campaign_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_department_type_defaults ADD CONSTRAINT campaign_department_type_defaults_pkey PRIMARY KEY (department_type);
ALTER TABLE public.campaign_faq_entries ADD CONSTRAINT campaign_faq_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_faq_entries ADD CONSTRAINT campaign_faq_entries_dept_chk CHECK (((scope <> 'department'::text) OR (client_department_id IS NOT NULL)));
ALTER TABLE public.campaign_faq_entries ADD CONSTRAINT campaign_faq_entries_scope_chk CHECK ((scope = ANY (ARRAY['global'::text, 'tenant'::text, 'client'::text, 'department'::text])));
ALTER TABLE public.campaign_faq_entries ADD CONSTRAINT campaign_faq_entries_status_chk CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'archived'::text])));
ALTER TABLE public.campaign_field_display_labels ADD CONSTRAINT campaign_field_display_labels_field_id_audience_key UNIQUE (field_id, audience);
ALTER TABLE public.campaign_field_display_labels ADD CONSTRAINT campaign_field_display_labels_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_field_display_labels ADD CONSTRAINT campaign_field_display_labels_audience_chk CHECK ((audience = ANY (ARRAY['agent'::text, 'supervisor'::text, 'client'::text, 'wl_partner'::text, 'wl_end_client'::text])));
ALTER TABLE public.campaign_field_groups ADD CONSTRAINT campaign_field_groups_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_field_groups ADD CONSTRAINT campaign_field_groups_scope_chk CHECK ((scope = ANY (ARRAY['global'::text, 'tenant'::text, 'client'::text, 'department'::text])));
ALTER TABLE public.campaign_field_options ADD CONSTRAINT campaign_field_options_field_id_value_key UNIQUE (field_id, value);
ALTER TABLE public.campaign_field_options ADD CONSTRAINT campaign_field_options_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_field_visibility_rules ADD CONSTRAINT campaign_field_visibility_rules_field_id_audience_key UNIQUE (field_id, audience);
ALTER TABLE public.campaign_field_visibility_rules ADD CONSTRAINT campaign_field_visibility_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_field_visibility_rules ADD CONSTRAINT campaign_field_visibility_audience_chk CHECK ((audience = ANY (ARRAY['agent'::text, 'supervisor'::text, 'client'::text, 'wl_partner'::text, 'wl_end_client'::text])));
ALTER TABLE public.campaign_fields ADD CONSTRAINT campaign_fields_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_fields ADD CONSTRAINT campaign_fields_scope_chk CHECK ((scope = ANY (ARRAY['global'::text, 'tenant'::text, 'client'::text, 'department'::text])));
ALTER TABLE public.campaign_fields ADD CONSTRAINT campaign_fields_status_chk CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])));
ALTER TABLE public.campaign_fields ADD CONSTRAINT campaign_fields_type_chk CHECK ((field_type = ANY (ARRAY['text'::text, 'long_text'::text, 'number'::text, 'boolean'::text, 'dropdown'::text, 'multi_select'::text, 'date'::text, 'datetime'::text, 'phone'::text, 'email'::text, 'currency'::text, 'rich_text'::text, 'hidden'::text])));
ALTER TABLE public.campaign_go_live_status_snapshots ADD CONSTRAINT campaign_go_live_status_snapshots_pkey PRIMARY KEY (campaign_id);
ALTER TABLE public.campaign_knowledge_versions ADD CONSTRAINT campaign_knowledge_versions_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_knowledge_versions ADD CONSTRAINT campaign_knowledge_versions_entity_chk CHECK ((entity = ANY (ARRAY['faq'::text, 'policy'::text])));
ALTER TABLE public.campaign_policy_blocks ADD CONSTRAINT campaign_policy_blocks_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_policy_blocks ADD CONSTRAINT campaign_policy_blocks_dept_chk CHECK (((scope <> 'department'::text) OR (client_department_id IS NOT NULL)));
ALTER TABLE public.campaign_policy_blocks ADD CONSTRAINT campaign_policy_blocks_kind_chk CHECK ((policy_kind = ANY (ARRAY['service_rule'::text, 'restricted_disclosure'::text, 'escalation_rule'::text, 'general_policy'::text])));
ALTER TABLE public.campaign_policy_blocks ADD CONSTRAINT campaign_policy_blocks_scope_chk CHECK ((scope = ANY (ARRAY['global'::text, 'tenant'::text, 'client'::text, 'department'::text])));
ALTER TABLE public.campaign_policy_blocks ADD CONSTRAINT campaign_policy_blocks_status_chk CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'archived'::text])));
ALTER TABLE public.campaign_publish_versions ADD CONSTRAINT campaign_publish_versions_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_scenarios ADD CONSTRAINT campaign_scenarios_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_scenarios ADD CONSTRAINT campaign_scenarios_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'archived'::text])));
ALTER TABLE public.campaign_script_document_versions ADD CONSTRAINT campaign_script_document_version_document_id_version_number_key UNIQUE (document_id, version_number);
ALTER TABLE public.campaign_script_document_versions ADD CONSTRAINT campaign_script_document_versions_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_script_documents ADD CONSTRAINT campaign_script_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_script_documents ADD CONSTRAINT campaign_script_documents_status_chk CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])));
ALTER TABLE public.campaign_templates ADD CONSTRAINT campaign_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_training_completions ADD CONSTRAINT campaign_training_completions_module_id_agent_id_key UNIQUE (module_id, agent_id);
ALTER TABLE public.campaign_training_completions ADD CONSTRAINT campaign_training_completions_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_training_lessons ADD CONSTRAINT campaign_training_lessons_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_training_lessons ADD CONSTRAINT campaign_training_lessons_kind_check CHECK ((kind = ANY (ARRAY['content'::text, 'acknowledgement'::text, 'quiz'::text])));
ALTER TABLE public.campaign_training_lessons ADD CONSTRAINT campaign_training_lessons_passing_score_check CHECK (((passing_score >= 0) AND (passing_score <= 100)));
ALTER TABLE public.campaign_training_modules ADD CONSTRAINT campaign_training_modules_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_training_modules ADD CONSTRAINT campaign_training_modules_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])));
ALTER TABLE public.campaign_training_quiz_attempts ADD CONSTRAINT campaign_training_quiz_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_training_quiz_questions ADD CONSTRAINT campaign_training_quiz_questions_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_training_retraining_events ADD CONSTRAINT campaign_training_retraining_events_pkey PRIMARY KEY (id);
ALTER TABLE public.campaign_training_retraining_events ADD CONSTRAINT campaign_training_retraining_events_trigger_kind_check CHECK ((trigger_kind = ANY (ARRAY['script_published'::text, 'faq_approved'::text, 'policy_approved'::text, 'manual'::text])));
ALTER TABLE public.campaign_training_signoffs ADD CONSTRAINT campaign_training_signoffs_completion_id_key UNIQUE (completion_id);
ALTER TABLE public.campaign_training_signoffs ADD CONSTRAINT campaign_training_signoffs_pkey PRIMARY KEY (id);
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_client_department_id_key UNIQUE (client_department_id);
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text])));
ALTER TABLE public.capacity_assumptions ADD CONSTRAINT capacity_assumptions_pkey PRIMARY KEY (scope);
ALTER TABLE public.capacity_assumptions ADD CONSTRAINT capacity_assumptions_arpu_assumption_check CHECK ((arpu_assumption > (0)::numeric));
ALTER TABLE public.capacity_assumptions ADD CONSTRAINT capacity_assumptions_csm_accounts_per_head_check CHECK ((csm_accounts_per_head > 0));
ALTER TABLE public.capacity_assumptions ADD CONSTRAINT capacity_assumptions_implementation_projects_per_speciali_check CHECK ((implementation_projects_per_specialist > 0));
ALTER TABLE public.capacity_assumptions ADD CONSTRAINT capacity_assumptions_new_projects_per_new_account_check CHECK ((new_projects_per_new_account >= (0)::numeric));
ALTER TABLE public.capacity_assumptions ADD CONSTRAINT capacity_assumptions_scope_check CHECK ((scope = ANY (ARRAY['direct'::text, 'wl'::text, 'both'::text])));
ALTER TABLE public.capacity_assumptions ADD CONSTRAINT capacity_assumptions_support_tickets_per_agent_per_month_check CHECK ((support_tickets_per_agent_per_month > 0));
ALTER TABLE public.capacity_assumptions ADD CONSTRAINT capacity_assumptions_tickets_per_account_per_month_check CHECK ((tickets_per_account_per_month >= (0)::numeric));
ALTER TABLE public.capacity_assumptions ADD CONSTRAINT capacity_assumptions_wl_rollout_per_ops_head_check CHECK ((wl_rollout_per_ops_head > 0));
ALTER TABLE public.capacity_supply ADD CONSTRAINT capacity_supply_scope_function_effective_date_key UNIQUE (scope, function, effective_date);
ALTER TABLE public.capacity_supply ADD CONSTRAINT capacity_supply_pkey PRIMARY KEY (id);
ALTER TABLE public.capacity_supply ADD CONSTRAINT capacity_supply_current_headcount_check CHECK ((current_headcount >= (0)::numeric));
ALTER TABLE public.capacity_supply ADD CONSTRAINT capacity_supply_function_check CHECK ((function = ANY (ARRAY['csm'::text, 'support'::text, 'implementation'::text, 'wl_ops'::text])));
ALTER TABLE public.capacity_supply ADD CONSTRAINT capacity_supply_planned_headcount_check CHECK (((planned_headcount IS NULL) OR (planned_headcount >= (0)::numeric)));
ALTER TABLE public.capacity_supply ADD CONSTRAINT capacity_supply_scope_check CHECK ((scope = ANY (ARRAY['direct'::text, 'wl'::text, 'both'::text])));
ALTER TABLE public.chat_activity_log ADD CONSTRAINT chat_activity_log_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_ai_configs ADD CONSTRAINT chat_ai_configs_deployment_id_key UNIQUE (deployment_id);
ALTER TABLE public.chat_ai_configs ADD CONSTRAINT chat_ai_configs_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_assignments ADD CONSTRAINT chat_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_brand_configs ADD CONSTRAINT chat_brand_configs_deployment_id_key UNIQUE (deployment_id);
ALTER TABLE public.chat_brand_configs ADD CONSTRAINT chat_brand_configs_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_canned_responses ADD CONSTRAINT chat_canned_responses_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_conversations ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_deployments ADD CONSTRAINT chat_deployments_widget_token_key UNIQUE (widget_token);
ALTER TABLE public.chat_deployments ADD CONSTRAINT chat_deployments_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_deployments ADD CONSTRAINT chat_deployments_ownership_check CHECK ((((ownership_mode = 'direct'::chat_ownership_mode) AND (direct_client_id IS NOT NULL) AND (wl_partner_id IS NULL) AND (wl_client_id IS NULL)) OR ((ownership_mode = 'wl'::chat_ownership_mode) AND (wl_partner_id IS NOT NULL) AND (wl_client_id IS NOT NULL) AND (direct_client_id IS NULL))));
ALTER TABLE public.chat_handoff_events ADD CONSTRAINT chat_handoff_events_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_visitors ADD CONSTRAINT chat_visitors_deployment_id_visitor_uid_key UNIQUE (deployment_id, visitor_uid);
ALTER TABLE public.chat_visitors ADD CONSTRAINT chat_visitors_pkey PRIMARY KEY (id);
ALTER TABLE public.client_addons ADD CONSTRAINT client_addons_pkey PRIMARY KEY (id);
ALTER TABLE public.client_addons ADD CONSTRAINT client_addons_billing_type_check CHECK ((billing_type = ANY (ARRAY['one_time'::text, 'recurring'::text, 'usage_based'::text])));
ALTER TABLE public.client_agent_assignments ADD CONSTRAINT client_agent_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.client_contacts ADD CONSTRAINT client_contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.client_contacts ADD CONSTRAINT client_contacts_role_chk CHECK ((role = ANY (ARRAY['primary'::text, 'billing'::text, 'escalation'::text, 'tech'::text, 'other'::text])));
ALTER TABLE public.client_departments ADD CONSTRAINT client_departments_pkey PRIMARY KEY (id);
ALTER TABLE public.client_departments ADD CONSTRAINT client_departments_owner_kind_check CHECK ((owner_kind = ANY (ARRAY['client'::text, 'location'::text])));
ALTER TABLE public.client_departments ADD CONSTRAINT client_departments_owner_location_chk CHECK (((owner_kind = 'location'::text) = (client_location_id IS NOT NULL)));
ALTER TABLE public.client_departments ADD CONSTRAINT client_departments_routing_entry_type_check CHECK ((routing_entry_type = ANY (ARRAY['direct'::text, 'ivr'::text, 'both'::text, 'logical'::text])));
ALTER TABLE public.client_handoff_documents ADD CONSTRAINT client_handoff_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.client_handoff_documents ADD CONSTRAINT client_handoff_documents_document_type_check CHECK ((document_type = ANY (ARRAY['script'::text, 'logo'::text, 'voicemail_audio'::text, 'policy'::text, 'id_verification'::text, 'signed_agreement'::text, 'other'::text])));
ALTER TABLE public.client_handoff_documents ADD CONSTRAINT client_handoff_documents_status_check CHECK ((status = ANY (ARRAY['active'::text, 'superseded'::text, 'removed'::text])));
ALTER TABLE public.client_handoff_items ADD CONSTRAINT client_handoff_items_handoff_id_item_key_key UNIQUE (handoff_id, item_key);
ALTER TABLE public.client_handoff_items ADD CONSTRAINT client_handoff_items_pkey PRIMARY KEY (id);
ALTER TABLE public.client_handoff_items ADD CONSTRAINT client_handoff_items_item_type_check CHECK ((item_type = ANY (ARRAY['text'::text, 'long_text'::text, 'number'::text, 'email'::text, 'phone'::text, 'select'::text, 'boolean'::text, 'date'::text])));
ALTER TABLE public.client_handoff_items ADD CONSTRAINT client_handoff_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'provided'::text, 'na'::text])));
ALTER TABLE public.client_handoff_requests ADD CONSTRAINT client_handoff_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.client_handoff_requests ADD CONSTRAINT client_handoff_requests_request_type_check CHECK ((request_type = ANY (ARRAY['missing_item'::text, 'missing_document'::text, 'clarification'::text, 'correction'::text])));
ALTER TABLE public.client_handoff_requests ADD CONSTRAINT client_handoff_requests_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text, 'cancelled'::text])));
ALTER TABLE public.client_locations ADD CONSTRAINT client_locations_pkey PRIMARY KEY (id);
ALTER TABLE public.client_locations ADD CONSTRAINT client_locations_identity_chk CHECK ((((tenant_kind = 'direct_24h'::campaign_tenant_kind) AND (client_lead_id IS NOT NULL) AND (wl_client_id IS NULL) AND (wl_partner_id IS NULL)) OR ((tenant_kind = 'wl_partner'::campaign_tenant_kind) AND (wl_client_id IS NOT NULL) AND (client_lead_id IS NULL) AND (wl_partner_id IS NOT NULL))));
ALTER TABLE public.client_locations ADD CONSTRAINT client_locations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'archived'::text])));
ALTER TABLE public.client_onboarding_activity ADD CONSTRAINT client_onboarding_activity_pkey PRIMARY KEY (id);
ALTER TABLE public.client_onboarding_handoffs ADD CONSTRAINT client_onboarding_handoffs_pkey PRIMARY KEY (id);
ALTER TABLE public.client_onboarding_handoffs ADD CONSTRAINT client_onboarding_handoffs_status_check CHECK ((status = ANY (ARRAY['collecting_info'::text, 'ready_for_submission'::text, 'submitted'::text, 'needs_more_info'::text, 'approved'::text, 'activation_in_progress'::text, 'activated'::text, 'closed'::text])));
ALTER TABLE public.client_quick_links ADD CONSTRAINT client_quick_links_token_key UNIQUE (token);
ALTER TABLE public.client_quick_links ADD CONSTRAINT client_quick_links_pkey PRIMARY KEY (id);
ALTER TABLE public.client_report_mappings ADD CONSTRAINT client_report_mappings_pkey PRIMARY KEY (id);
ALTER TABLE public.client_scripts ADD CONSTRAINT client_scripts_pkey PRIMARY KEY (id);
ALTER TABLE public.communication_actions ADD CONSTRAINT communication_actions_pkey PRIMARY KEY (id);
ALTER TABLE public.communication_actions ADD CONSTRAINT communication_actions_channel_check CHECK ((channel = ANY (ARRAY['in_app'::text, 'email'::text])));
ALTER TABLE public.communication_actions ADD CONSTRAINT communication_actions_scope_check CHECK ((scope = ANY (ARRAY['partner'::text, 'direct'::text])));
ALTER TABLE public.communication_actions ADD CONSTRAINT communication_actions_status_check CHECK ((status = ANY (ARRAY['suggested'::text, 'approved'::text, 'queued'::text, 'sent'::text, 'dismissed'::text, 'failed'::text, 'suppressed'::text])));
ALTER TABLE public.communication_templates ADD CONSTRAINT communication_templates_template_key_key UNIQUE (template_key);
ALTER TABLE public.communication_templates ADD CONSTRAINT communication_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.communication_templates ADD CONSTRAINT communication_templates_channel_check CHECK ((channel = ANY (ARRAY['in_app'::text, 'email'::text])));
ALTER TABLE public.communication_templates ADD CONSTRAINT communication_templates_play_type_check CHECK ((play_type = ANY (ARRAY['educate'::text, 'upsell'::text, 'save'::text, 'onboard'::text, 'reactivate'::text, 'renewal'::text])));
ALTER TABLE public.communication_templates ADD CONSTRAINT communication_templates_scope_check CHECK ((scope = ANY (ARRAY['partner'::text, 'direct'::text])));
ALTER TABLE public.contracts ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);
ALTER TABLE public.crm_activities ADD CONSTRAINT crm_activities_pkey PRIMARY KEY (id);
ALTER TABLE public.crm_tasks ADD CONSTRAINT crm_tasks_pkey PRIMARY KEY (id);
ALTER TABLE public.crm_tasks ADD CONSTRAINT crm_tasks_visibility_check CHECK ((visibility = ANY (ARRAY['self'::text, 'universal'::text])));
ALTER TABLE public.custom_plans ADD CONSTRAINT custom_plans_pkey PRIMARY KEY (id);
ALTER TABLE public.custom_plans ADD CONSTRAINT custom_plans_plan_type_check CHECK ((plan_type = ANY (ARRAY['per_minute'::text, 'fixed'::text, 'hybrid'::text])));
ALTER TABLE public.dashboard_events ADD CONSTRAINT dashboard_events_pkey PRIMARY KEY (id);
ALTER TABLE public.data_export_snapshots ADD CONSTRAINT data_export_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE public.data_export_snapshots ADD CONSTRAINT data_export_snapshots_scope_check CHECK ((scope = ANY (ARRAY['admin'::text, 'partner'::text])));
ALTER TABLE public.department_numbers ADD CONSTRAINT department_numbers_pkey PRIMARY KEY (id);
ALTER TABLE public.direct_success_plays ADD CONSTRAINT direct_success_plays_pkey PRIMARY KEY (id);
ALTER TABLE public.direct_success_plays ADD CONSTRAINT direct_success_plays_play_type_check CHECK ((play_type = ANY (ARRAY['educate'::text, 'upsell'::text, 'save'::text, 'onboard'::text, 'reactivate'::text])));
ALTER TABLE public.direct_success_plays ADD CONSTRAINT direct_success_plays_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'active'::text, 'completed'::text, 'dismissed'::text])));
ALTER TABLE public.disc_audiences ADD CONSTRAINT disc_audiences_audience_slug_key UNIQUE (audience_slug);
ALTER TABLE public.disc_audiences ADD CONSTRAINT disc_audiences_pkey PRIMARY KEY (id);
ALTER TABLE public.disc_faq_sets ADD CONSTRAINT disc_faq_sets_pkey PRIMARY KEY (id);
ALTER TABLE public.disc_faqs ADD CONSTRAINT disc_faqs_pkey PRIMARY KEY (id);
ALTER TABLE public.disc_generated_pages ADD CONSTRAINT disc_generated_pages_slug_key UNIQUE (slug);
ALTER TABLE public.disc_generated_pages ADD CONSTRAINT disc_generated_pages_pkey PRIMARY KEY (id);
ALTER TABLE public.disc_internal_link_items ADD CONSTRAINT disc_internal_link_items_pkey PRIMARY KEY (id);
ALTER TABLE public.disc_internal_link_sets ADD CONSTRAINT disc_internal_link_sets_pkey PRIMARY KEY (id);
ALTER TABLE public.disc_keywords ADD CONSTRAINT disc_keywords_keyword_slug_key UNIQUE (keyword_slug);
ALTER TABLE public.disc_keywords ADD CONSTRAINT disc_keywords_pkey PRIMARY KEY (id);
ALTER TABLE public.disc_locations ADD CONSTRAINT disc_locations_country_slug_state_or_province_slug_city_slu_key UNIQUE (country_slug, state_or_province_slug, city_slug);
ALTER TABLE public.disc_locations ADD CONSTRAINT disc_locations_pkey PRIMARY KEY (id);
ALTER TABLE public.disc_publish_log ADD CONSTRAINT disc_publish_log_pkey PRIMARY KEY (id);
ALTER TABLE public.disc_templates ADD CONSTRAINT disc_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.email_followups ADD CONSTRAINT email_followups_pkey PRIMARY KEY (id);
ALTER TABLE public.experiment_allocation_log ADD CONSTRAINT experiment_allocation_log_pkey PRIMARY KEY (id);
ALTER TABLE public.feature_launch_flags ADD CONSTRAINT feature_launch_flags_pkey PRIMARY KEY (feature_key);
ALTER TABLE public.feedback ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.feedback ADD CONSTRAINT feedback_mode_check CHECK ((mode = 'direct'::text));
ALTER TABLE public.feedback ADD CONSTRAINT feedback_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])));
ALTER TABLE public.feedback ADD CONSTRAINT feedback_source_dashboard_check CHECK ((source_dashboard = ANY (ARRAY['admin'::text, 'supervisor'::text, 'agent'::text, 'sales'::text, 'billing'::text, 'tech'::text, 'hr'::text, 'direct_client'::text, 'affiliate'::text, 'wl_partner_product'::text, 'wl_partner_escalation'::text])));
ALTER TABLE public.feedback ADD CONSTRAINT feedback_status_check CHECK ((status = ANY (ARRAY['new'::text, 'triaged'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])));
ALTER TABLE public.feedback_handoffs ADD CONSTRAINT feedback_handoffs_pkey PRIMARY KEY (id);
ALTER TABLE public.feedback_handoffs ADD CONSTRAINT feedback_handoffs_kind_check CHECK ((kind = ANY (ARRAY['engineering'::text, 'billing'::text, 'ops_task'::text, 'support_ticket'::text, 'external'::text])));
ALTER TABLE public.feedback_handoffs ADD CONSTRAINT feedback_handoffs_partner_consistency CHECK ((((tenant_kind = 'wl_partner'::text) AND (wl_partner_id IS NOT NULL)) OR ((tenant_kind = 'direct_24h'::text) AND (wl_partner_id IS NULL))));
ALTER TABLE public.feedback_handoffs ADD CONSTRAINT feedback_handoffs_source_table_check CHECK ((source_table = ANY (ARRAY['feedback'::text, 'wl_partner_feedback'::text])));
ALTER TABLE public.feedback_handoffs ADD CONSTRAINT feedback_handoffs_tenant_kind_check CHECK ((tenant_kind = ANY (ARRAY['direct_24h'::text, 'wl_partner'::text])));
ALTER TABLE public.feedback_messages ADD CONSTRAINT feedback_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.feedback_messages ADD CONSTRAINT feedback_messages_author_kind_check CHECK ((author_kind = ANY (ARRAY['admin'::text, 'submitter'::text])));
ALTER TABLE public.feedback_messages ADD CONSTRAINT feedback_messages_body_check CHECK ((length(btrim(body)) > 0));
ALTER TABLE public.five9_drift_snapshots ADD CONSTRAINT five9_drift_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE public.five9_drift_snapshots ADD CONSTRAINT five9_drift_snapshots_source_check CHECK ((source = ANY (ARRAY['manual_paste'::text, 'csv_upload'::text, 'scheduled'::text])));
ALTER TABLE public.five9_native_variables ADD CONSTRAINT five9_native_variables_pkey PRIMARY KEY (variable_name);
ALTER TABLE public.five9_native_variables ADD CONSTRAINT five9_native_variables_direction_check CHECK ((direction = ANY (ARRAY['in'::text, 'out'::text, 'both'::text])));
ALTER TABLE public.five9_variable_groups ADD CONSTRAINT five9_variable_groups_pkey PRIMARY KEY (id);
ALTER TABLE public.five9_variable_mappings ADD CONSTRAINT five9_variable_mappings_pkey PRIMARY KEY (id);
ALTER TABLE public.five9_variable_mappings ADD CONSTRAINT five9_variable_mappings_kind_chk CHECK ((five9_variable_kind = ANY (ARRAY['native'::text, 'custom'::text, 'campaign_profile'::text])));
ALTER TABLE public.five9_variable_mappings ADD CONSTRAINT five9_variable_mappings_type_chk CHECK ((data_type = ANY (ARRAY['text'::text, 'number'::text, 'boolean'::text, 'date'::text, 'datetime'::text, 'phone'::text, 'email'::text])));
ALTER TABLE public.forecast_assumptions ADD CONSTRAINT forecast_assumptions_pkey PRIMARY KEY (assumption_key);
ALTER TABLE public.forecast_assumptions ADD CONSTRAINT forecast_assumptions_horizon_months_check CHECK (((horizon_months >= 1) AND (horizon_months <= 24)));
ALTER TABLE public.forecast_snapshots ADD CONSTRAINT forecast_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE public.forecast_stage_probabilities ADD CONSTRAINT forecast_stage_probabilities_deal_type_stage_key UNIQUE (deal_type, stage);
ALTER TABLE public.forecast_stage_probabilities ADD CONSTRAINT forecast_stage_probabilities_pkey PRIMARY KEY (id);
ALTER TABLE public.forecast_stage_probabilities ADD CONSTRAINT forecast_stage_probabilities_probability_check CHECK (((probability >= (0)::numeric) AND (probability <= (1)::numeric)));
ALTER TABLE public.gtm_targets ADD CONSTRAINT gtm_targets_period_scope_key UNIQUE (period, scope);
ALTER TABLE public.gtm_targets ADD CONSTRAINT gtm_targets_pkey PRIMARY KEY (id);
ALTER TABLE public.gtm_targets ADD CONSTRAINT gtm_targets_scope_check CHECK ((scope = ANY (ARRAY['direct'::text, 'wl'::text, 'both'::text])));
ALTER TABLE public.gtm_targets ADD CONSTRAINT gtm_targets_target_nrr_check CHECK (((target_nrr IS NULL) OR ((target_nrr >= (0)::numeric) AND (target_nrr <= (3)::numeric))));
ALTER TABLE public.gtm_targets ADD CONSTRAINT gtm_targets_target_renewal_rate_check CHECK (((target_renewal_rate IS NULL) OR ((target_renewal_rate >= (0)::numeric) AND (target_renewal_rate <= (1)::numeric))));
ALTER TABLE public.hr_communications ADD CONSTRAINT hr_communications_pkey PRIMARY KEY (id);
ALTER TABLE public.internal_fulfillment_activity ADD CONSTRAINT internal_fulfillment_activity_pkey PRIMARY KEY (id);
ALTER TABLE public.internal_fulfillment_intake_documents ADD CONSTRAINT internal_fulfillment_intake_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.internal_fulfillment_intakes ADD CONSTRAINT internal_fulfillment_intakes_intake_number_key UNIQUE (intake_number);
ALTER TABLE public.internal_fulfillment_intakes ADD CONSTRAINT internal_fulfillment_intakes_pkey PRIMARY KEY (id);
ALTER TABLE public.internal_fulfillment_intakes ADD CONSTRAINT internal_fulfillment_intakes_source_check CHECK ((source = ANY (ARRAY['wl'::text, 'direct'::text])));
ALTER TABLE public.internal_fulfillment_intakes ADD CONSTRAINT internal_fulfillment_intakes_source_parents_check CHECK ((((source = 'wl'::text) AND (partner_id IS NOT NULL) AND (source_handoff_id IS NOT NULL) AND (proposal_id IS NOT NULL)) OR ((source = 'direct'::text) AND (client_lead_id IS NOT NULL))));
ALTER TABLE public.internal_fulfillment_notes ADD CONSTRAINT internal_fulfillment_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);
ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);
ALTER TABLE public.keyword_tracker ADD CONSTRAINT keyword_tracker_pkey PRIMARY KEY (id);
ALTER TABLE public.lead_conversions ADD CONSTRAINT lead_conversions_pkey PRIMARY KEY (id);
ALTER TABLE public.leads ADD CONSTRAINT leads_pkey PRIMARY KEY (id);
ALTER TABLE public.leads ADD CONSTRAINT leads_pipeline_stage_check CHECK ((pipeline_stage = ANY (ARRAY['new'::text, 'contacted'::text, 'qualified'::text, 'proposal'::text, 'sales'::text, 'onboarding'::text, 'ready_for_billing'::text, 'active'::text, 'won'::text, 'lost'::text, 'churned'::text])));
ALTER TABLE public.meetings ADD CONSTRAINT meetings_calendly_event_id_key UNIQUE (calendly_event_id);
ALTER TABLE public.meetings ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);
ALTER TABLE public.mission_control_events ADD CONSTRAINT mission_control_events_pkey PRIMARY KEY (id);
ALTER TABLE public.missions ADD CONSTRAINT missions_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.offboarding ADD CONSTRAINT offboarding_pkey PRIMARY KEY (id);
ALTER TABLE public.offboarding_templates ADD CONSTRAINT offboarding_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.offer_exposures ADD CONSTRAINT offer_exposures_pkey PRIMARY KEY (id);
ALTER TABLE public.offer_exposures ADD CONSTRAINT offer_exposures_event_check CHECK ((event = ANY (ARRAY['shown'::text, 'accepted'::text, 'completed'::text, 'rejected'::text])));
ALTER TABLE public.offers ADD CONSTRAINT offers_key_key UNIQUE (key);
ALTER TABLE public.offers ADD CONSTRAINT offers_pkey PRIMARY KEY (id);
ALTER TABLE public.offers ADD CONSTRAINT offers_audience_check CHECK ((audience = ANY (ARRAY['direct'::text, 'wl_end_client'::text, 'all'::text])));
ALTER TABLE public.offers ADD CONSTRAINT offers_surface_check CHECK ((surface = ANY (ARRAY['signup'::text, 'upgrade'::text, 'wl_partner'::text, 'in_app'::text])));
ALTER TABLE public.onboarding_templates ADD CONSTRAINT onboarding_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.open_shifts ADD CONSTRAINT open_shifts_pkey PRIMARY KEY (id);
ALTER TABLE public.outbound_call_attempts ADD CONSTRAINT outbound_call_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.outbound_call_requests ADD CONSTRAINT outbound_call_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.outline_progress ADD CONSTRAINT outline_progress_pkey PRIMARY KEY (feature_id);
ALTER TABLE public.partner_success_plays ADD CONSTRAINT partner_success_plays_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_success_plays ADD CONSTRAINT partner_success_plays_play_type_check CHECK ((play_type = ANY (ARRAY['educate'::text, 'upsell'::text, 'save'::text, 'onboard'::text, 'reactivate'::text])));
ALTER TABLE public.partner_success_plays ADD CONSTRAINT partner_success_plays_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'active'::text, 'completed'::text, 'dismissed'::text])));
ALTER TABLE public.payment_failures ADD CONSTRAINT payment_failures_pkey PRIMARY KEY (id);
ALTER TABLE public.people ADD CONSTRAINT people_pkey PRIMARY KEY (id);
ALTER TABLE public.people_external_ids ADD CONSTRAINT people_external_ids_pkey PRIMARY KEY (id);
ALTER TABLE public.platform_knowledge ADD CONSTRAINT platform_knowledge_pkey PRIMARY KEY (id);
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.play_suggestions ADD CONSTRAINT play_suggestions_pkey PRIMARY KEY (id);
ALTER TABLE public.play_suggestions ADD CONSTRAINT play_suggestions_scope_check CHECK ((scope = ANY (ARRAY['partner'::text, 'direct'::text])));
ALTER TABLE public.play_suggestions ADD CONSTRAINT play_suggestions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'dismissed'::text, 'auto_created'::text])));
ALTER TABLE public.playbook_templates ADD CONSTRAINT playbook_templates_scope_template_key_key UNIQUE (scope, template_key);
ALTER TABLE public.playbook_templates ADD CONSTRAINT playbook_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.playbook_templates ADD CONSTRAINT playbook_templates_play_type_check CHECK ((play_type = ANY (ARRAY['educate'::text, 'upsell'::text, 'save'::text, 'onboard'::text, 'reactivate'::text])));
ALTER TABLE public.playbook_templates ADD CONSTRAINT playbook_templates_scope_check CHECK ((scope = ANY (ARRAY['partner'::text, 'direct'::text])));
ALTER TABLE public.playbook_templates ADD CONSTRAINT playbook_templates_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['opportunity'::text, 'state_change'::text, 'metric_threshold'::text, 'time_since_event'::text, 'manual'::text])));
ALTER TABLE public.pricing_experiment_assignments ADD CONSTRAINT pricing_experiment_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.pricing_experiments ADD CONSTRAINT pricing_experiments_pkey PRIMARY KEY (id);
ALTER TABLE public.pricing_experiments ADD CONSTRAINT pricing_experiments_allocation_mode_check CHECK ((allocation_mode = ANY (ARRAY['fixed'::text, 'bandit'::text, 'sequential'::text])));
ALTER TABLE public.pricing_experiments ADD CONSTRAINT pricing_experiments_bandit_algorithm_check CHECK ((bandit_algorithm = ANY (ARRAY['thompson'::text, 'ucb1'::text])));
ALTER TABLE public.pricing_experiments ADD CONSTRAINT pricing_experiments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text, 'archived'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.qa_environment_flags ADD CONSTRAINT qa_environment_flags_pkey PRIMARY KEY (id);
ALTER TABLE public.qa_environment_flags ADD CONSTRAINT qa_environment_flags_singleton CHECK ((id = true));
ALTER TABLE public.qa_phase2_results ADD CONSTRAINT qa_phase2_results_pkey PRIMARY KEY (id);
ALTER TABLE public.qa_release_gates ADD CONSTRAINT qa_release_gates_release_label_key UNIQUE (release_label);
ALTER TABLE public.qa_release_gates ADD CONSTRAINT qa_release_gates_pkey PRIMARY KEY (id);
ALTER TABLE public.qa_release_gates ADD CONSTRAINT qa_release_gates_decision_check CHECK ((decision = ANY (ARRAY['pending'::text, 'go'::text, 'no_go'::text])));
ALTER TABLE public.referral_partners ADD CONSTRAINT referral_partners_pkey PRIMARY KEY (id);
ALTER TABLE public.renewal_expansion_deals ADD CONSTRAINT renewal_expansion_deals_pkey PRIMARY KEY (id);
ALTER TABLE public.renewal_workflows ADD CONSTRAINT renewal_workflows_scope_target_id_renewal_date_key UNIQUE (scope, target_id, renewal_date);
ALTER TABLE public.renewal_workflows ADD CONSTRAINT renewal_workflows_pkey PRIMARY KEY (id);
ALTER TABLE public.renewal_workflows ADD CONSTRAINT renewal_workflows_scope_check CHECK ((scope = ANY (ARRAY['partner'::text, 'direct'::text])));
ALTER TABLE public.renewal_workflows ADD CONSTRAINT renewal_workflows_stage_check CHECK ((stage = ANY (ARRAY['approaching'::text, 'outreach_started'::text, 'awaiting_response'::text, 'in_progress'::text, 'renewed'::text, 'downgraded'::text, 'churned'::text, 'lapsed'::text])));
ALTER TABLE public.revops_period_snapshots ADD CONSTRAINT revops_period_snapshots_label_uniq UNIQUE (label);
ALTER TABLE public.revops_period_snapshots ADD CONSTRAINT revops_period_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE public.revops_period_snapshots ADD CONSTRAINT revops_period_snapshots_period_chk CHECK ((period_end_date >= period_start_date));
ALTER TABLE public.revops_snapshot_capacity ADD CONSTRAINT revops_snapshot_capacity_pkey PRIMARY KEY (id);
ALTER TABLE public.revops_snapshot_metrics ADD CONSTRAINT revops_snapshot_metrics_pkey PRIMARY KEY (snapshot_id);
ALTER TABLE public.revops_snapshot_pipeline ADD CONSTRAINT revops_snapshot_pipeline_pkey PRIMARY KEY (id);
ALTER TABLE public.sales_commissions ADD CONSTRAINT sales_commissions_pkey PRIMARY KEY (id);
ALTER TABLE public.sales_proposals ADD CONSTRAINT sales_proposals_pkey PRIMARY KEY (id);
ALTER TABLE public.sales_targets ADD CONSTRAINT sales_targets_pkey PRIMARY KEY (id);
ALTER TABLE public.saved_scenarios ADD CONSTRAINT saved_scenarios_pkey PRIMARY KEY (id);
ALTER TABLE public.script_change_comments ADD CONSTRAINT script_change_comments_pkey PRIMARY KEY (id);
ALTER TABLE public.script_change_requests ADD CONSTRAINT script_change_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.shift_invoices ADD CONSTRAINT shift_invoices_agent_id_period_start_period_end_key UNIQUE (agent_id, period_start, period_end);
ALTER TABLE public.shift_invoices ADD CONSTRAINT shift_invoices_pkey PRIMARY KEY (id);
ALTER TABLE public.slack_channels ADD CONSTRAINT slack_channels_slack_channel_id_key UNIQUE (slack_channel_id);
ALTER TABLE public.slack_channels ADD CONSTRAINT slack_channels_pkey PRIMARY KEY (id);
ALTER TABLE public.slack_messages ADD CONSTRAINT slack_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.slack_user_mappings ADD CONSTRAINT slack_user_mappings_pkey PRIMARY KEY (id);
ALTER TABLE public.supervisor_escalations ADD CONSTRAINT supervisor_escalations_pkey PRIMARY KEY (id);
ALTER TABLE public.supervisor_tenant_assignments ADD CONSTRAINT supervisor_tenant_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.supervisor_tenant_assignments ADD CONSTRAINT supervisor_assignment_exactly_one_target CHECK ((((
CASE
    WHEN (client_lead_id IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN (wl_partner_id IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN (wl_client_id IS NOT NULL) THEN 1
    ELSE 0
END) = 1));
ALTER TABLE public.supervisor_tenant_assignments ADD CONSTRAINT supervisor_assignment_kind_matches CHECK ((((tenant_kind = 'direct_24h'::campaign_tenant_kind) AND (client_lead_id IS NOT NULL)) OR ((tenant_kind = 'wl_partner'::campaign_tenant_kind) AND ((wl_partner_id IS NOT NULL) OR (wl_client_id IS NOT NULL)))));
ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_tenant_kind_check CHECK ((tenant_kind = ANY (ARRAY['direct'::text, 'wl_forwarded'::text])));
ALTER TABLE public.task_notes ADD CONSTRAINT task_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.tech_issues ADD CONSTRAINT tech_issues_pkey PRIMARY KEY (id);
ALTER TABLE public.tenant_brand_profiles ADD CONSTRAINT tenant_brand_profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.ticket_replies ADD CONSTRAINT ticket_replies_pkey PRIMARY KEY (id);
ALTER TABLE public.ticket_views ADD CONSTRAINT ticket_views_user_context_key UNIQUE (user_id, ticket_id, view_context);
ALTER TABLE public.ticket_views ADD CONSTRAINT ticket_views_pkey PRIMARY KEY (id);
ALTER TABLE public.time_off_requests ADD CONSTRAINT time_off_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.training_templates ADD CONSTRAINT training_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.usage_records ADD CONSTRAINT usage_records_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.white_label_branding ADD CONSTRAINT white_label_branding_partner_id_key UNIQUE (partner_id);
ALTER TABLE public.white_label_branding ADD CONSTRAINT white_label_branding_pkey PRIMARY KEY (id);
ALTER TABLE public.white_label_clients ADD CONSTRAINT white_label_clients_user_id_key UNIQUE (user_id);
ALTER TABLE public.white_label_clients ADD CONSTRAINT white_label_clients_pkey PRIMARY KEY (id);
ALTER TABLE public.white_label_domain_aliases ADD CONSTRAINT white_label_domain_aliases_alias_hostname_key UNIQUE (alias_hostname);
ALTER TABLE public.white_label_domain_aliases ADD CONSTRAINT white_label_domain_aliases_pkey PRIMARY KEY (id);
ALTER TABLE public.white_label_partners ADD CONSTRAINT white_label_partners_pkey PRIMARY KEY (id);
ALTER TABLE public.wizard_sessions ADD CONSTRAINT wizard_sessions_session_token_key UNIQUE (session_token);
ALTER TABLE public.wizard_sessions ADD CONSTRAINT wizard_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_addon_pricing ADD CONSTRAINT wl_addon_pricing_partner_id_addon_product_id_key UNIQUE (partner_id, addon_product_id);
ALTER TABLE public.wl_addon_pricing ADD CONSTRAINT wl_addon_pricing_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_blog_queue ADD CONSTRAINT wl_blog_queue_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_call_logs ADD CONSTRAINT wl_call_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_campaign_recipients ADD CONSTRAINT wl_campaign_recipients_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_client_campaigns ADD CONSTRAINT wl_client_campaigns_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_client_reviews ADD CONSTRAINT wl_client_reviews_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_client_schedules ADD CONSTRAINT wl_client_schedules_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_client_schedules ADD CONSTRAINT wl_client_schedules_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
ALTER TABLE public.wl_client_scripts ADD CONSTRAINT wl_client_scripts_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_client_service_config ADD CONSTRAINT wl_client_service_config_wl_client_id_key UNIQUE (wl_client_id);
ALTER TABLE public.wl_client_service_config ADD CONSTRAINT wl_client_service_config_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_client_ticket_replies ADD CONSTRAINT wl_client_ticket_replies_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_client_tickets ADD CONSTRAINT wl_client_tickets_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_email_connections ADD CONSTRAINT wl_email_connections_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_email_contacts ADD CONSTRAINT wl_email_contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_email_sends ADD CONSTRAINT wl_email_sends_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_invoices ADD CONSTRAINT wl_invoices_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_keyword_tracker ADD CONSTRAINT wl_keyword_tracker_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_knowledge_base ADD CONSTRAINT wl_knowledge_base_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_newsletter_drafts ADD CONSTRAINT wl_newsletter_drafts_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_client_portal_access ADD CONSTRAINT wl_partner_client_portal_access_token_hash_key UNIQUE (token_hash);
ALTER TABLE public.wl_partner_client_portal_access ADD CONSTRAINT wl_partner_client_portal_access_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_feedback ADD CONSTRAINT wl_partner_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_feedback ADD CONSTRAINT wl_pf_origin_check CHECK ((origin = ANY (ARRAY['end_client'::text, 'partner_on_behalf'::text])));
ALTER TABLE public.wl_partner_feedback ADD CONSTRAINT wl_pf_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])));
ALTER TABLE public.wl_partner_feedback ADD CONSTRAINT wl_pf_source_check CHECK ((source_dashboard = ANY (ARRAY['wl_end_client'::text, 'wl_partner'::text])));
ALTER TABLE public.wl_partner_feedback ADD CONSTRAINT wl_pf_status_check CHECK ((status = ANY (ARRAY['new'::text, 'triaged'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text, 'escalated'::text])));
ALTER TABLE public.wl_partner_feedback ADD CONSTRAINT wl_pf_submitter_check CHECK ((submitted_by_type = ANY (ARRAY['wl_end_client'::text, 'wl_partner'::text])));
ALTER TABLE public.wl_partner_feedback ADD CONSTRAINT wl_pf_type_check CHECK ((type = ANY (ARRAY['bug'::text, 'help'::text, 'idea'::text, 'feedback'::text])));
ALTER TABLE public.wl_partner_feedback_escalations ADD CONSTRAINT wl_partner_feedback_escalations_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_feedback_escalations ADD CONSTRAINT wl_pfe_status_check CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text])));
ALTER TABLE public.wl_partner_feedback_messages ADD CONSTRAINT wl_partner_feedback_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_feedback_messages ADD CONSTRAINT wl_partner_feedback_messages_author_kind_check CHECK ((author_kind = ANY (ARRAY['partner'::text, 'submitter'::text])));
ALTER TABLE public.wl_partner_feedback_messages ADD CONSTRAINT wl_partner_feedback_messages_author_role_check CHECK ((author_role = ANY (ARRAY['partner_owner'::text, 'partner_manager'::text, 'partner_agent'::text, 'wl_end_client'::text, 'partner_internal'::text])));
ALTER TABLE public.wl_partner_feedback_messages ADD CONSTRAINT wl_partner_feedback_messages_body_check CHECK (((length(body) >= 1) AND (length(body) <= 8000)));
ALTER TABLE public.wl_partner_handoff_documents ADD CONSTRAINT wl_partner_handoff_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_handoff_items ADD CONSTRAINT wl_partner_handoff_items_handoff_id_item_key_key UNIQUE (handoff_id, item_key);
ALTER TABLE public.wl_partner_handoff_items ADD CONSTRAINT wl_partner_handoff_items_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_handoff_requests ADD CONSTRAINT wl_partner_handoff_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_leads ADD CONSTRAINT wl_partner_leads_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_leads ADD CONSTRAINT wl_partner_leads_pipeline_stage_check CHECK ((pipeline_stage = ANY (ARRAY['new'::text, 'contacted'::text, 'qualified'::text, 'proposal'::text, 'won'::text, 'lost'::text])));
ALTER TABLE public.wl_partner_leads ADD CONSTRAINT wl_partner_leads_temperature_check CHECK ((temperature = ANY (ARRAY['hot'::text, 'warm'::text, 'cold'::text])));
ALTER TABLE public.wl_partner_members ADD CONSTRAINT wl_partner_members_partner_id_user_id_key UNIQUE (partner_id, user_id);
ALTER TABLE public.wl_partner_members ADD CONSTRAINT wl_partner_members_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_members ADD CONSTRAINT wl_partner_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text, 'agent'::text])));
ALTER TABLE public.wl_partner_members ADD CONSTRAINT wl_partner_members_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'removed'::text])));
ALTER TABLE public.wl_partner_onboarding_handoffs ADD CONSTRAINT wl_handoff_unique_proposal UNIQUE (proposal_id);
ALTER TABLE public.wl_partner_onboarding_handoffs ADD CONSTRAINT wl_partner_onboarding_handoffs_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_proposal_activity ADD CONSTRAINT wl_partner_proposal_activity_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_proposal_shares ADD CONSTRAINT wl_partner_proposal_shares_token_hash_key UNIQUE (token_hash);
ALTER TABLE public.wl_partner_proposal_shares ADD CONSTRAINT wl_partner_proposal_shares_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_proposals ADD CONSTRAINT wl_partner_proposals_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_tasks ADD CONSTRAINT wl_partner_tasks_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_partner_usage_summary ADD CONSTRAINT wl_partner_usage_summary_partner_id_billing_period_start_key UNIQUE (partner_id, billing_period_start);
ALTER TABLE public.wl_partner_usage_summary ADD CONSTRAINT wl_partner_usage_summary_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_seo_reports ADD CONSTRAINT wl_seo_reports_partner_id_report_month_key UNIQUE (partner_id, report_month);
ALTER TABLE public.wl_seo_reports ADD CONSTRAINT wl_seo_reports_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_social_snippets ADD CONSTRAINT wl_social_snippets_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_social_snippets ADD CONSTRAINT wl_social_snippets_platform_check CHECK ((platform = ANY (ARRAY['linkedin'::text, 'facebook'::text, 'twitter'::text])));
ALTER TABLE public.wl_terms_agreements ADD CONSTRAINT wl_terms_agreements_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_ticket_forwards ADD CONSTRAINT wl_ticket_forwards_wl_client_ticket_id_support_ticket_id_key UNIQUE (wl_client_ticket_id, support_ticket_id);
ALTER TABLE public.wl_ticket_forwards ADD CONSTRAINT wl_ticket_forwards_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_usage_records ADD CONSTRAINT wl_usage_records_partner_id_wl_client_id_billing_period_sta_key UNIQUE (partner_id, wl_client_id, billing_period_start);
ALTER TABLE public.wl_usage_records ADD CONSTRAINT wl_usage_records_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_wholesale_pricing ADD CONSTRAINT wl_wholesale_pricing_partner_id_key UNIQUE (partner_id);
ALTER TABLE public.wl_wholesale_pricing ADD CONSTRAINT wl_wholesale_pricing_pkey PRIMARY KEY (id);
ALTER TABLE public.wl_wordpress_connections ADD CONSTRAINT wl_wordpress_connections_partner_id_key UNIQUE (partner_id);
ALTER TABLE public.wl_wordpress_connections ADD CONSTRAINT wl_wordpress_connections_pkey PRIMARY KEY (id);
