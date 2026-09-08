-- Fix: Admin Users page showed a raw user ID instead of an email for accounts
-- whose profiles.email was never populated. auth.users already has the real
-- email and the on_auth_user_email_updated trigger keeps profiles.email in
-- sync going forward — this is a one-time backfill for rows that predate it
-- or were seeded without going through that path.

UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE au.id = p.id
  AND (p.email IS NULL OR p.email = '')
  AND au.email IS NOT NULL;
