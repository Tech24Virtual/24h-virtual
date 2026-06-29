-- ============================================================
-- Admin Accounts fixes — 2026-06-29
-- Fix 1: Add email to profiles, sync from auth.users
-- Fix 2: agent_banking + agent_skills grants
-- Fix 3: custom_plans + client_addons grants (IF EXISTS)
-- Fix 4: admin_settings grant (IF EXISTS)
-- Fix 6: support_requests grant (IF EXISTS)
-- ============================================================

-- ── Fix 1: email column on profiles ──────────────────────────────────────
-- auth.users.email is not queryable from the client; sync it here instead.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill emails for every existing user
UPDATE public.profiles p
SET    email = u.email
FROM   auth.users u
WHERE  p.id = u.id
  AND  p.email IS NULL;

-- Keep profiles.email in sync whenever auth.users.email changes
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET    email = NEW.email
  WHERE  id    = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
CREATE TRIGGER on_auth_user_email_change
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

-- ── Fix 2: agent_banking + agent_skills ───────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON public.agent_banking TO authenticated;
GRANT SELECT            ON public.agent_skills   TO authenticated;

-- ── Fix 3: Billing tables (guard with IF EXISTS — may not be on all envs) ─

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE  table_schema = 'public' AND table_name = 'custom_plans'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.custom_plans TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE  table_schema = 'public' AND table_name = 'client_addons'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.client_addons TO authenticated';
  END IF;
END $$;

-- ── Fix 4: admin_settings ─────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE  table_schema = 'public' AND table_name = 'admin_settings'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated';
  END IF;
END $$;

-- ── Fix 6: support_requests ───────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE  table_schema = 'public' AND table_name = 'support_requests'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.support_requests TO authenticated';
  END IF;
END $$;
