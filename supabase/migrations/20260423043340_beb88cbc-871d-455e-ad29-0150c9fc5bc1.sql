-- Remove the broken cross-table assignment from publish_script_document.
-- campaigns.published_version_id references campaign_publish_versions(id),
-- not campaign_script_document_versions(id). The go-live checks view now
-- recognizes script readiness via campaign_script_documents.status='published'
-- directly, so this stray UPDATE is unnecessary and breaks publishing.
CREATE OR REPLACE FUNCTION public.publish_script_document(p_document_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS campaign_script_document_versions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  RETURN v_version;
END;
$function$;