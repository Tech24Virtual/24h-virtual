-- Patch publish_script_document to also set campaigns.published_version_id
CREATE OR REPLACE FUNCTION public.publish_script_document(p_document_id uuid, p_notes text DEFAULT NULL)
RETURNS public.campaign_script_document_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.campaign_script_documents%ROWTYPE;
  v_next_version int;
  v_version public.campaign_script_document_versions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT can_mutate_script_document(p_document_id) THEN
    RAISE EXCEPTION 'Forbidden: cannot publish this script document';
  END IF;

  SELECT * INTO v_doc FROM public.campaign_script_documents WHERE id = p_document_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Script document not found'; END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
    FROM public.campaign_script_document_versions
   WHERE document_id = p_document_id;

  INSERT INTO public.campaign_script_document_versions
    (document_id, version_number, tree, notes, published_by, published_at)
  VALUES
    (p_document_id, v_next_version, v_doc.tree, p_notes, auth.uid(), now())
  RETURNING * INTO v_version;

  UPDATE public.campaign_script_documents
     SET current_version_id = v_version.id,
         status = 'published',
         updated_by = auth.uid(),
         updated_at = now()
   WHERE id = p_document_id;

  -- Also flip the campaign's published_version_id so go-live checks see it
  IF v_doc.campaign_id IS NOT NULL THEN
    UPDATE public.campaigns
       SET published_version_id = v_version.id,
           updated_at = now()
     WHERE id = v_doc.campaign_id;
  END IF;

  RETURN v_version;
END;
$$;

-- Harden the activation guard against NULL v_check rows
CREATE OR REPLACE FUNCTION public.enforce_go_live_checks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check RECORD;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  IF NEW.status <> 'active' OR OLD.status = 'active' THEN
    RETURN NEW;
  END IF;
  IF NEW.go_live_override_at IS NOT NULL
     AND (OLD.go_live_override_at IS NULL OR NEW.go_live_override_at > OLD.go_live_override_at) THEN
    RETURN NEW;
  END IF;

  SELECT script_published, faqs_ok, policies_ok, training_ok, all_ok
  INTO v_check
  FROM public.campaign_go_live_checks
  WHERE campaign_id = NEW.id;

  IF NOT FOUND OR v_check IS NULL OR NOT COALESCE(v_check.all_ok, false) THEN
    IF v_check IS NULL OR NOT COALESCE(v_check.script_published, false) THEN v_missing := array_append(v_missing, 'published script'); END IF;
    IF v_check IS NULL OR NOT COALESCE(v_check.faqs_ok, false)         THEN v_missing := array_append(v_missing, 'approved FAQ'); END IF;
    IF v_check IS NULL OR NOT COALESCE(v_check.policies_ok, false)     THEN v_missing := array_append(v_missing, 'approved policy'); END IF;
    IF v_check IS NULL OR NOT COALESCE(v_check.training_ok, false)     THEN v_missing := array_append(v_missing, 'training signoffs'); END IF;
    RAISE EXCEPTION 'Campaign is not ready to go live. Missing: %. Use Force activate to override.', array_to_string(v_missing, ', ')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;