-- Add 'pending' to wl_partner_members status check constraint
ALTER TABLE wl_partner_members
DROP CONSTRAINT wl_partner_members_status_check;

ALTER TABLE wl_partner_members
ADD CONSTRAINT wl_partner_members_status_check
CHECK (status = ANY (ARRAY['active'::text, 'pending'::text, 'suspended'::text, 'removed'::text]));
