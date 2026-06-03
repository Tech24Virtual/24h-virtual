-- Add invited_email column to wl_partner_members for pending invites
ALTER TABLE wl_partner_members
ADD COLUMN IF NOT EXISTS invited_email text;
