-- 1. Add partner_slug to white_label_partners
ALTER TABLE public.white_label_partners
  ADD COLUMN IF NOT EXISTS partner_slug text;

-- 2. Add default_enabled_modules to white_label_partners
ALTER TABLE public.white_label_partners
  ADD COLUMN IF NOT EXISTS default_enabled_modules jsonb
  DEFAULT '["dashboard","calls","scripts","schedule","billing","support","settings","outbound-requests"]'::jsonb;

-- 3. Backfill partner_slug from company_name (or fallback to id)
UPDATE public.white_label_partners p
SET partner_slug = sub.computed_slug
FROM (
  SELECT
    wlp.id,
    COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(lower(COALESCE(wlb.company_name, wlp.company_name, wlp.id::text)), '[^a-z0-9]+', '-', 'g'),
          '(^-|-$)', '', 'g'
        ),
        ''
      ),
      'partner-' || substr(wlp.id::text, 1, 8)
    ) AS computed_slug
  FROM public.white_label_partners wlp
  LEFT JOIN public.white_label_branding wlb ON wlb.partner_id = wlp.id
) sub
WHERE p.id = sub.id
  AND (p.partner_slug IS NULL OR p.partner_slug = '');

-- 4. Deduplicate slugs by appending short id suffix
WITH dupes AS (
  SELECT id, partner_slug,
         row_number() OVER (PARTITION BY partner_slug ORDER BY created_at) AS rn
  FROM public.white_label_partners
  WHERE partner_slug IS NOT NULL
)
UPDATE public.white_label_partners p
SET partner_slug = p.partner_slug || '-' || substr(p.id::text, 1, 6)
FROM dupes d
WHERE d.id = p.id AND d.rn > 1;

-- 5. Enforce NOT NULL + unique
ALTER TABLE public.white_label_partners
  ALTER COLUMN partner_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS white_label_partners_partner_slug_unique
  ON public.white_label_partners(partner_slug);

-- 6. Add enabled_modules to white_label_clients
ALTER TABLE public.white_label_clients
  ADD COLUMN IF NOT EXISTS enabled_modules jsonb
  DEFAULT '["dashboard","calls","scripts","schedule","billing","support","settings","outbound-requests"]'::jsonb;

-- 7. Trigger: new WL clients inherit partner's default_enabled_modules
CREATE OR REPLACE FUNCTION public.set_wl_client_default_modules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_defaults jsonb;
BEGIN
  IF NEW.enabled_modules IS NULL THEN
    SELECT default_enabled_modules INTO v_defaults
    FROM public.white_label_partners
    WHERE id = NEW.partner_id;

    NEW.enabled_modules := COALESCE(
      v_defaults,
      '["dashboard","calls","scripts","schedule","billing","support","settings","outbound-requests"]'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_wl_client_default_modules ON public.white_label_clients;
CREATE TRIGGER trg_set_wl_client_default_modules
  BEFORE INSERT ON public.white_label_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_wl_client_default_modules();

-- 8. Helper function to get a client's enabled modules
CREATE OR REPLACE FUNCTION public.get_wl_client_enabled_modules(_client_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(enabled_modules, '[]'::jsonb)
  FROM public.white_label_clients
  WHERE id = _client_id
$$;

-- 9. Helper to resolve partner_id from slug (used by hostname/portal routing)
CREATE OR REPLACE FUNCTION public.get_partner_id_by_slug(_slug text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.white_label_partners WHERE partner_slug = _slug LIMIT 1
$$;