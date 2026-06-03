/**
 * Canonical website origin for edge functions.
 * Email addresses on @24hvirtual.com are intentionally preserved elsewhere.
 */
export const SITE_URL =
  (Deno.env.get("SITE_URL") || "https://24hv.io").replace(/\/$/, "");
