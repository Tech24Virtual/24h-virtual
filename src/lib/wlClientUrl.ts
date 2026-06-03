import { is24HHost } from '@/lib/wlHostResolver';

/**
 * Build a WL client portal URL that respects hostname context.
 * On partner hostname: /{slug}[/{section}]
 * On 24H host: /portal/{slug}[/{section}]
 */
export function wlClientUrl(slug: string, section?: string): string {
  const isPartner = !is24HHost(window.location.hostname);
  const base = isPartner ? `/${slug}` : `/portal/${slug}`;
  if (!section) return base;
  return `${base}/${section}`;
}

/**
 * Build the login URL for a WL portal.
 * On partner hostname: /login
 * On 24H host: /portal/{slug}/login
 */
export function wlLoginUrl(slug: string): string {
  const isPartner = !is24HHost(window.location.hostname);
  return isPartner ? '/login' : `/portal/${slug}/login`;
}
