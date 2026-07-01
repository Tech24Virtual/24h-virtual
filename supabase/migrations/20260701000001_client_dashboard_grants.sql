-- Fix: authenticated role is missing UPDATE privilege on profiles.
--
-- Settings.tsx and Schedule.tsx both call supabase.from('profiles').update(...)
-- but only GRANT SELECT was ever applied (migration 20260520220706). PostgREST
-- rejects UPDATE before RLS even fires, so every "Save Changes" click silently
-- fails — the toast.error fires but nothing persists.
--
-- RLS policies for users updating their own profile already exist; this GRANT
-- only restores the table-level privilege that should have been set at creation.

GRANT UPDATE ON public.profiles TO authenticated;
