-- Allow null user_id for pending invites (user not yet registered)
ALTER TABLE wl_partner_members
ALTER COLUMN user_id DROP NOT NULL;
