
-- Wave 2 Batch C + F: Publish/Rollback RPCs + Legacy Cutover columns

-- ─────────────────────────────────────────────────────────────────
-- Helper: check if user can mutate a campaign script document
-- (admin OR member of the document's tenant via the parent campaign)
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_mutate_script_document(p_document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.campaign_script_documents d
      JOIN public.campaigns c ON c.id = d.campaign_id
      WHERE d.id = p_document_id
    );
$$;

-- ─────────────────────────────────────────────────────────────────
-- RPC: publish_script_document
-- Snapshots the current draft tree as a new immutable version,
-- bumps the document's current_version_id pointer, and flips status.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.publish_script_document(
  p_document_id uuid,
  p_notes text DEFAULT NULL
)
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT can_mutate_script_document(p_document_id) THEN
    RAISE EXCEPTION 'Forbidden: cannot publish this script document';
  END IF;

  SELECT * INTO v_doc FROM public.campaign_script_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Script document not found';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
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
$$;

-- ─────────────────────────────────────────────────────────────────
-- RPC: rollback_script_document
-- Re-points current_version_id to a prior version. Non-destructive.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rollback_script_document(
  p_document_id uuid,
  p_version_id uuid
)
RETURNS public.campaign_script_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.campaign_script_documents%ROWTYPE;
  v_version_doc uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT can_mutate_script_document(p_document_id) THEN
    RAISE EXCEPTION 'Forbidden: cannot rollback this script document';
  END IF;

  SELECT document_id INTO v_version_doc
    FROM public.campaign_script_document_versions
   WHERE id = p_version_id;

  IF v_version_doc IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF v_version_doc <> p_document_id THEN
    RAISE EXCEPTION 'Version does not belong to this document';
  END IF;

  UPDATE public.campaign_script_documents
     SET current_version_id = p_version_id,
         status = 'published',
         updated_by = auth.uid(),
         updated_at = now()
   WHERE id = p_document_id
   RETURNING * INTO v_doc;

  RETURN v_doc;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_script_document(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_script_document(uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- Batch F: Legacy cutover pointers (additive, reversible)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.client_scripts
  ADD COLUMN IF NOT EXISTS migrated_to_campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migrated_at timestamptz;

ALTER TABLE public.wl_client_scripts
  ADD COLUMN IF NOT EXISTS migrated_to_campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migrated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_client_scripts_migrated_to_campaign
  ON public.client_scripts(migrated_to_campaign_id);
CREATE INDEX IF NOT EXISTS idx_wl_client_scripts_migrated_to_campaign
  ON public.wl_client_scripts(migrated_to_campaign_id);

-- Track cutover timestamp on the campaign row's metadata column if present.
-- We use a dedicated column for clarity.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS legacy_script_cutover_at timestamptz;

-- ─────────────────────────────────────────────────────────────────
-- RPC: cutover_legacy_scripts
-- Sets migrated_to_campaign_id pointers on legacy script rows.
-- Reversible via clear_legacy_script_cutover.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cutover_legacy_scripts(
  p_campaign_id uuid,
  p_client_script_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_wl_client_script_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_client_count int := 0;
  v_wl_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.campaigns WHERE id = p_campaign_id) THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF array_length(p_client_script_ids, 1) IS NOT NULL THEN
    UPDATE public.client_scripts
       SET migrated_to_campaign_id = p_campaign_id,
           migrated_at = v_now
     WHERE id = ANY(p_client_script_ids);
    GET DIAGNOSTICS v_client_count = ROW_COUNT;
  END IF;

  IF array_length(p_wl_client_script_ids, 1) IS NOT NULL THEN
    UPDATE public.wl_client_scripts
       SET migrated_to_campaign_id = p_campaign_id,
           migrated_at = v_now
     WHERE id = ANY(p_wl_client_script_ids);
    GET DIAGNOSTICS v_wl_count = ROW_COUNT;
  END IF;

  UPDATE public.campaigns
     SET legacy_script_cutover_at = v_now
   WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'cutover_at', v_now,
    'client_scripts_migrated', v_client_count,
    'wl_client_scripts_migrated', v_wl_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_legacy_script_cutover(
  p_campaign_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_count int := 0;
  v_wl_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  UPDATE public.client_scripts
     SET migrated_to_campaign_id = NULL,
         migrated_at = NULL
   WHERE migrated_to_campaign_id = p_campaign_id;
  GET DIAGNOSTICS v_client_count = ROW_COUNT;

  UPDATE public.wl_client_scripts
     SET migrated_to_campaign_id = NULL,
         migrated_at = NULL
   WHERE migrated_to_campaign_id = p_campaign_id;
  GET DIAGNOSTICS v_wl_count = ROW_COUNT;

  UPDATE public.campaigns
     SET legacy_script_cutover_at = NULL
   WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'cleared', true,
    'client_scripts_cleared', v_client_count,
    'wl_client_scripts_cleared', v_wl_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cutover_legacy_scripts(uuid, uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_legacy_script_cutover(uuid) TO authenticated;
