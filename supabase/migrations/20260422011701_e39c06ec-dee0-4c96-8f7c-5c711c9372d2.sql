-- Phase 3 Migration 2: Department-type defaults + Five9 native vars + auto-seed

-- ============================================================================
-- 1. Catalog table: campaign_department_type_defaults
-- ============================================================================
CREATE TABLE public.campaign_department_type_defaults (
  department_type public.department_type PRIMARY KEY,
  default_field_group_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_faqs_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_five9_mappings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.campaign_department_type_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "defaults_read_authenticated"
  ON public.campaign_department_type_defaults FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "defaults_admin_insert"
  ON public.campaign_department_type_defaults FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "defaults_admin_update"
  ON public.campaign_department_type_defaults FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "defaults_admin_delete"
  ON public.campaign_department_type_defaults FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_defaults_touch
  BEFORE UPDATE ON public.campaign_department_type_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. Reference table: five9_native_variables (Standard 12 seed)
-- ============================================================================
CREATE TABLE public.five9_native_variables (
  variable_name text PRIMARY KEY,
  display_label text NOT NULL,
  data_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in','out','both')),
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.five9_native_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "five9_native_read_authenticated"
  ON public.five9_native_variables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "five9_native_admin_insert"
  ON public.five9_native_variables FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "five9_native_admin_update"
  ON public.five9_native_variables FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "five9_native_admin_delete"
  ON public.five9_native_variables FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.five9_native_variables (variable_name, display_label, data_type, direction, description, sort_order) VALUES
  ('ANI', 'Caller Number (ANI)', 'string', 'in', 'Automatic Number Identification — calling party phone number.', 10),
  ('DNIS', 'Dialed Number (DNIS)', 'string', 'in', 'Dialed Number Identification Service — number the caller dialed.', 20),
  ('call_id', 'Call ID', 'string', 'in', 'Five9 unique call identifier.', 30),
  ('agent_id', 'Agent ID', 'string', 'in', 'Five9 agent identifier handling the call.', 40),
  ('campaign_name', 'Campaign Name', 'string', 'in', 'Five9 campaign the call was routed through.', 50),
  ('queue_name', 'Queue Name', 'string', 'in', 'Five9 skill / queue name.', 60),
  ('call_start', 'Call Start Time', 'timestamp', 'in', 'Timestamp when the call started.', 70),
  ('call_end', 'Call End Time', 'timestamp', 'in', 'Timestamp when the call ended.', 80),
  ('talk_time', 'Talk Time (sec)', 'number', 'in', 'Seconds the agent was on the call.', 90),
  ('hold_time', 'Hold Time (sec)', 'number', 'in', 'Seconds the caller spent on hold.', 100),
  ('disposition', 'Disposition', 'string', 'both', 'Call disposition selected by the agent.', 110),
  ('wrap_notes', 'Wrap-Up Notes', 'string', 'out', 'Free-text wrap-up notes captured after the call.', 120);

-- ============================================================================
-- 3. Backfill defaults for all 8 department_types
-- ============================================================================
INSERT INTO public.campaign_department_type_defaults (department_type, default_field_group_json, default_faqs_json, default_five9_mappings_json) VALUES
  ('sales',
   '{"name":"Sales Intake","description":"Default fields captured for sales inquiries.","fields":[{"field_key":"caller_name","display_label":"Caller Name","field_type":"text","is_required":true,"sort_order":10},{"field_key":"caller_phone","display_label":"Phone","field_type":"phone","is_required":true,"sort_order":20},{"field_key":"caller_email","display_label":"Email","field_type":"email","is_required":false,"sort_order":30},{"field_key":"interested_service","display_label":"Service Interested In","field_type":"text","is_required":false,"sort_order":40},{"field_key":"budget_range","display_label":"Budget Range","field_type":"text","is_required":false,"sort_order":50}]}'::jsonb,
   '[{"question":"What are your hours of operation?","answer_md":"We are available 24/7 to take your call."},{"question":"How quickly can you get back to me?","answer_md":"A representative will follow up within one business day."}]'::jsonb,
   '[{"five9_variable_name":"ANI","field_key":"caller_phone","data_type":"string","direction":["in"]},{"five9_variable_name":"campaign_name","field_key":null,"data_type":"string","direction":["in"]}]'::jsonb),
  ('billing',
   '{"name":"Billing Intake","description":"Default fields captured for billing calls.","fields":[{"field_key":"caller_name","display_label":"Caller Name","field_type":"text","is_required":true,"sort_order":10},{"field_key":"account_number","display_label":"Account Number","field_type":"text","is_required":true,"sort_order":20},{"field_key":"caller_email","display_label":"Email","field_type":"email","is_required":false,"sort_order":30},{"field_key":"reason","display_label":"Reason for Call","field_type":"text","is_required":true,"sort_order":40}]}'::jsonb,
   '[{"question":"How can I update my payment method?","answer_md":"We will collect the account number and transfer to billing."},{"question":"When is my invoice due?","answer_md":"Invoices are due on the date listed on the invoice. Please reference your account."}]'::jsonb,
   '[{"five9_variable_name":"ANI","field_key":"caller_phone","data_type":"string","direction":["in"]}]'::jsonb),
  ('customer_service',
   '{"name":"Customer Service Intake","description":"Default fields captured for support calls.","fields":[{"field_key":"caller_name","display_label":"Caller Name","field_type":"text","is_required":true,"sort_order":10},{"field_key":"caller_phone","display_label":"Phone","field_type":"phone","is_required":true,"sort_order":20},{"field_key":"caller_email","display_label":"Email","field_type":"email","is_required":false,"sort_order":30},{"field_key":"issue_summary","display_label":"Issue Summary","field_type":"text","is_required":true,"sort_order":40}]}'::jsonb,
   '[{"question":"How do I get help with my issue?","answer_md":"Provide details to the agent and we will route to the correct team."}]'::jsonb,
   '[{"five9_variable_name":"ANI","field_key":"caller_phone","data_type":"string","direction":["in"]}]'::jsonb),
  ('new_claim',
   '{"name":"New Claim Intake","description":"Default fields captured for first-notice-of-loss / new claim calls.","fields":[{"field_key":"caller_name","display_label":"Claimant Name","field_type":"text","is_required":true,"sort_order":10},{"field_key":"caller_phone","display_label":"Phone","field_type":"phone","is_required":true,"sort_order":20},{"field_key":"date_of_incident","display_label":"Date of Incident","field_type":"date","is_required":true,"sort_order":30},{"field_key":"incident_summary","display_label":"Incident Summary","field_type":"text","is_required":true,"sort_order":40},{"field_key":"policy_number","display_label":"Policy Number","field_type":"text","is_required":false,"sort_order":50}]}'::jsonb,
   '[{"question":"What information do I need to file a claim?","answer_md":"We will need your policy number, date of incident, and a brief description."}]'::jsonb,
   '[{"five9_variable_name":"ANI","field_key":"caller_phone","data_type":"string","direction":["in"]}]'::jsonb),
  ('other_requests',
   '{"name":"General Request Intake","description":"Default fields for miscellaneous requests.","fields":[{"field_key":"caller_name","display_label":"Caller Name","field_type":"text","is_required":true,"sort_order":10},{"field_key":"caller_phone","display_label":"Phone","field_type":"phone","is_required":true,"sort_order":20},{"field_key":"request_summary","display_label":"Request Summary","field_type":"text","is_required":true,"sort_order":30}]}'::jsonb,
   '[{"question":"Can you help me with this request?","answer_md":"Please describe your request and we will route accordingly."}]'::jsonb,
   '[{"five9_variable_name":"ANI","field_key":"caller_phone","data_type":"string","direction":["in"]}]'::jsonb),
  ('dealership',
   '{"name":"Dealership Intake","description":"Default fields for dealership calls.","fields":[{"field_key":"caller_name","display_label":"Caller Name","field_type":"text","is_required":true,"sort_order":10},{"field_key":"caller_phone","display_label":"Phone","field_type":"phone","is_required":true,"sort_order":20},{"field_key":"vehicle_of_interest","display_label":"Vehicle of Interest","field_type":"text","is_required":false,"sort_order":30},{"field_key":"appointment_requested","display_label":"Wants Appointment?","field_type":"boolean","is_required":false,"sort_order":40}]}'::jsonb,
   '[{"question":"Do you have this vehicle in stock?","answer_md":"Take caller details and route to the dealership sales floor."},{"question":"Can I schedule a test drive?","answer_md":"Capture preferred day/time and forward to the dealership."}]'::jsonb,
   '[{"five9_variable_name":"ANI","field_key":"caller_phone","data_type":"string","direction":["in"]}]'::jsonb),
  ('general_inquiry',
   '{"name":"General Inquiry Intake","description":"Default fields for general inbound inquiries.","fields":[{"field_key":"caller_name","display_label":"Caller Name","field_type":"text","is_required":true,"sort_order":10},{"field_key":"caller_phone","display_label":"Phone","field_type":"phone","is_required":true,"sort_order":20},{"field_key":"inquiry_summary","display_label":"Inquiry","field_type":"text","is_required":true,"sort_order":30}]}'::jsonb,
   '[{"question":"What services do you offer?","answer_md":"Briefly describe the client services and offer to take a message."}]'::jsonb,
   '[{"five9_variable_name":"ANI","field_key":"caller_phone","data_type":"string","direction":["in"]}]'::jsonb),
  ('custom',
   '{"name":"Custom Intake","description":"Empty starter group for custom department types.","fields":[]}'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb);

-- ============================================================================
-- 4. Trigger function: seed_department_defaults
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seed_department_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default record;
  v_group_id uuid;
  v_field jsonb;
  v_faq jsonb;
  v_mapping jsonb;
  v_field_key text;
  v_existing_field_id uuid;
BEGIN
  -- Idempotency: skip if any campaign_field_groups already exist for this dept
  IF EXISTS (
    SELECT 1 FROM public.campaign_field_groups
    WHERE client_department_id = NEW.id AND scope = 'department'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_default
  FROM public.campaign_department_type_defaults
  WHERE department_type = NEW.department_type;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- 1. Seed field group
  IF v_default.default_field_group_json ? 'name' THEN
    INSERT INTO public.campaign_field_groups (
      tenant_kind, wl_partner_id, wl_client_id, client_lead_id, client_department_id,
      scope, name, description, sort_order, created_by
    ) VALUES (
      NEW.tenant_kind, NEW.wl_partner_id, NEW.wl_client_id, NEW.client_lead_id, NEW.id,
      'department',
      v_default.default_field_group_json->>'name',
      v_default.default_field_group_json->>'description',
      0,
      NEW.created_by
    )
    RETURNING id INTO v_group_id;

    -- 2. Seed fields
    FOR v_field IN SELECT * FROM jsonb_array_elements(COALESCE(v_default.default_field_group_json->'fields', '[]'::jsonb))
    LOOP
      INSERT INTO public.campaign_fields (
        tenant_kind, wl_partner_id, wl_client_id, client_lead_id, client_department_id,
        scope, field_group_id, field_key, display_label, field_type,
        is_required, sort_order, status, created_by
      ) VALUES (
        NEW.tenant_kind, NEW.wl_partner_id, NEW.wl_client_id, NEW.client_lead_id, NEW.id,
        'department', v_group_id,
        v_field->>'field_key',
        v_field->>'display_label',
        v_field->>'field_type',
        COALESCE((v_field->>'is_required')::boolean, false),
        COALESCE((v_field->>'sort_order')::integer, 0),
        'approved',
        NEW.created_by
      );
    END LOOP;
  END IF;

  -- 3. Seed FAQs
  FOR v_faq IN SELECT * FROM jsonb_array_elements(COALESCE(v_default.default_faqs_json, '[]'::jsonb))
  LOOP
    INSERT INTO public.campaign_faq_entries (
      tenant_kind, wl_partner_id, wl_client_id, client_lead_id, client_department_id,
      scope, question, answer_md, status, created_by
    ) VALUES (
      NEW.tenant_kind, NEW.wl_partner_id, NEW.wl_client_id, NEW.client_lead_id, NEW.id,
      'department',
      v_faq->>'question',
      v_faq->>'answer_md',
      'approved',
      NEW.created_by
    );
  END LOOP;

  -- 4. Seed Five9 variable mappings
  FOR v_mapping IN SELECT * FROM jsonb_array_elements(COALESCE(v_default.default_five9_mappings_json, '[]'::jsonb))
  LOOP
    v_field_key := v_mapping->>'field_key';
    v_existing_field_id := NULL;

    IF v_field_key IS NOT NULL AND v_group_id IS NOT NULL THEN
      SELECT id INTO v_existing_field_id
      FROM public.campaign_fields
      WHERE client_department_id = NEW.id
        AND field_key = v_field_key
      LIMIT 1;
    END IF;

    INSERT INTO public.five9_variable_mappings (
      tenant_kind, wl_partner_id, wl_client_id, client_lead_id, client_department_id,
      field_id, five9_variable_name, five9_variable_kind, data_type, direction,
      is_active, created_by
    ) VALUES (
      NEW.tenant_kind, NEW.wl_partner_id, NEW.wl_client_id, NEW.client_lead_id, NEW.id,
      v_existing_field_id,
      v_mapping->>'five9_variable_name',
      'native',
      v_mapping->>'data_type',
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_mapping->'direction', '["in"]'::jsonb))),
      true,
      NEW.created_by
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_client_departments_seed_defaults
  AFTER INSERT ON public.client_departments
  FOR EACH ROW EXECUTE FUNCTION public.seed_department_defaults();