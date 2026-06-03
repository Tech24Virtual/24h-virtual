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
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.campaign_field_groups
    WHERE client_department_id = NEW.id AND scope = 'department'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_default
  FROM public.campaign_department_type_defaults
  WHERE department_type = NEW.department_type;

  IF NOT FOUND THEN RETURN NEW; END IF;

  IF v_default.default_field_group_json ? 'name' THEN
    INSERT INTO public.campaign_field_groups (
      tenant_kind, wl_partner_id, wl_client_id, client_lead_id, client_department_id,
      scope, name, description, sort_order, created_by
    ) VALUES (
      NEW.tenant_kind, NEW.wl_partner_id, NEW.wl_client_id, NEW.client_lead_id, NEW.id,
      'department',
      v_default.default_field_group_json->>'name',
      v_default.default_field_group_json->>'description',
      0, NEW.created_by
    ) RETURNING id INTO v_group_id;

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
        'active',
        NEW.created_by
      );
    END LOOP;
  END IF;

  FOR v_faq IN SELECT * FROM jsonb_array_elements(COALESCE(v_default.default_faqs_json, '[]'::jsonb))
  LOOP
    INSERT INTO public.campaign_faq_entries (
      tenant_kind, wl_partner_id, wl_client_id, client_lead_id, client_department_id,
      scope, question, answer_md, status, created_by
    ) VALUES (
      NEW.tenant_kind, NEW.wl_partner_id, NEW.wl_client_id, NEW.client_lead_id, NEW.id,
      'department',
      v_faq->>'question', v_faq->>'answer_md',
      'draft', NEW.created_by
    );
  END LOOP;

  RETURN NEW;
END;
$$;