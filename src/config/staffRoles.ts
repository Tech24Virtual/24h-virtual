/**
 * Roles considered "staff" for HR-facing employee pickers (offboarding,
 * directory role filter, internal comms). Excludes client/partner-facing
 * roles (client, wl_client, white_label, referrer, affiliate) which share
 * the same `profiles` table but aren't employees.
 */
export const STAFF_ROLES = new Set([
  'agent',
  'supervisor',
  'sales',
  'hr',
  'billing',
  'tech',
  'admin',
]);
