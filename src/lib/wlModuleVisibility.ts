/**
 * White Label module visibility helpers.
 *
 * Module slugs are the canonical identifiers used in:
 * - white_label_clients.enabled_modules (per-client overrides)
 * - white_label_partners.default_enabled_modules (partner-wide defaults)
 * - WL portal sidebar links and route guards (Phase 2)
 */

export type WLModuleSlug =
  | 'dashboard'
  | 'calls'
  | 'scripts'
  | 'schedule'
  | 'billing'
  | 'support'
  | 'settings'
  | 'outbound-requests'
  | 'activity'
  | 'leads'
  | 'reviews'
  | 'campaigns';

export const ALL_WL_MODULES: WLModuleSlug[] = [
  'dashboard',
  'calls',
  'scripts',
  'schedule',
  'billing',
  'support',
  'settings',
  'outbound-requests',
  'activity',
  'leads',
  'reviews',
  'campaigns',
];

export const DEFAULT_ENABLED_MODULES: WLModuleSlug[] = [
  'dashboard',
  'calls',
  'scripts',
  'schedule',
  'billing',
  'support',
  'settings',
  'outbound-requests',
];

export const WL_MODULE_LABELS: Record<WLModuleSlug, string> = {
  dashboard: 'Dashboard',
  calls: 'Call Logs',
  scripts: 'Scripts',
  schedule: 'Schedule',
  billing: 'Billing',
  support: 'Support',
  settings: 'Settings',
  'outbound-requests': 'Outbound Requests',
  activity: 'Activity Feed',
  leads: 'Lead Summaries',
  reviews: 'Reviews',
  campaigns: 'Campaigns',
};

/** Normalize an enabled_modules jsonb value into a typed slug list. */
export function parseEnabledModules(raw: unknown): WLModuleSlug[] {
  if (!Array.isArray(raw)) return [...DEFAULT_ENABLED_MODULES];
  const valid = new Set<string>(ALL_WL_MODULES);
  return raw.filter((m): m is WLModuleSlug => typeof m === 'string' && valid.has(m));
}

/** Check whether a module is enabled for a client given their enabled_modules list. */
export function isModuleEnabled(
  enabledModules: WLModuleSlug[] | null | undefined,
  module: WLModuleSlug
): boolean {
  // Dashboard is always implicitly accessible — it's the portal landing page
  if (module === 'dashboard') return true;
  if (!enabledModules) return false;
  return enabledModules.includes(module);
}
