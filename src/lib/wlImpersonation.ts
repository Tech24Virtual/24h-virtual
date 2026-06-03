/**
 * WL Portal impersonation session helper (D-4, Computer QA 2026-05-10).
 *
 * Stores the active admin → WL portal impersonation in sessionStorage so a
 * persistent banner can render across portal route changes and the user can
 * cleanly exit back to /admin. Audit log entries are written via lib/audit
 * on entry and exit; this module only manages the local session marker.
 */

const KEY = "wl_impersonation";

export interface WLImpersonationSession {
  partnerId: string;
  slug: string;
  partnerName: string;
  /** Admin route to return to on Exit. Defaults to /admin. */
  returnTo: string;
  startedAt: string;
}

export function getWLImpersonation(): WLImpersonationSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WLImpersonationSession;
  } catch {
    return null;
  }
}

export function setWLImpersonation(s: Omit<WLImpersonationSession, "startedAt">) {
  const full: WLImpersonationSession = { ...s, startedAt: new Date().toISOString() };
  sessionStorage.setItem(KEY, JSON.stringify(full));
}

export function clearWLImpersonation() {
  sessionStorage.removeItem(KEY);
}
