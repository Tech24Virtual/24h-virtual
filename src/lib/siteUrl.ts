/**
 * Single source of truth for the canonical website origin.
 *
 * IMPORTANT: This is the WEBSITE domain only. Email addresses
 * (hello@, support@, noreply@, privacy@, legal@, security@, trust@24hvirtual.com)
 * are intentionally NOT migrated and remain on @24hvirtual.com.
 */
export const SITE_URL: string =
  (import.meta.env?.VITE_SITE_URL as string | undefined) || "https://24hv.io";

export function absoluteUrl(path: string = "/"): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
