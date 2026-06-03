/**
 * QA Session Handoff
 * ------------------
 * Lets a superadmin export their live Supabase auth session into a one-time
 * URL so a *separate* browser context (headless QA, private window, another
 * device) can pick up the same login without re-typing credentials.
 *
 * Flow:
 *   1. On the launcher page, `buildHandoffUrl()` reads the current Supabase
 *      session from `supabase.auth.getSession()` and packs the access_token +
 *      refresh_token into the URL **hash** (#qa_session=...). Hash fragments
 *      are never sent to the server.
 *   2. The receiving browser loads any app URL containing that hash.
 *      `consumeHandoffFromUrl()` runs at app boot, calls
 *      `supabase.auth.setSession({...})`, then strips the hash from the URL.
 *   3. Supabase persists the session in localStorage as usual, so subsequent
 *      navigations behave like a normal logged-in user.
 *
 * Security:
 *   - Tokens are short-lived (Supabase access tokens default to 1h).
 *   - The handoff URL must be treated like a password — anyone with it gets
 *     the same access until the refresh token is revoked.
 *   - We add a `qa_exp` timestamp and reject handoffs older than 10 minutes.
 */

import { supabase } from '@/integrations/supabase/client';

const HASH_KEY = 'qa_session';
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

interface HandoffPayload {
  access_token: string;
  refresh_token: string;
  qa_exp: number; // ms epoch
}

function b64urlEncode(obj: unknown): string {
  const json = JSON.stringify(obj);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): unknown {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return JSON.parse(decodeURIComponent(escape(atob(b64))));
}

/**
 * Build a handoff URL for the current session. Returns null if not signed in.
 * The URL points at `targetPath` on the current origin and carries the session
 * tokens in the hash fragment.
 */
export async function buildHandoffUrl(targetPath: string = '/admin/settings/product-testing'): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token || !session?.refresh_token) return null;

  const payload: HandoffPayload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    qa_exp: Date.now() + MAX_AGE_MS,
  };
  const token = b64urlEncode(payload);
  const path = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  return `${window.location.origin}${path}#${HASH_KEY}=${token}`;
}

/**
 * Called once at app boot. If the URL hash contains a QA handoff token,
 * restore the session and strip the hash. Returns true if a handoff was
 * consumed (caller may want to wait for auth state to settle before rendering).
 */
export async function consumeHandoffFromUrl(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  if (!hash || !hash.includes(`${HASH_KEY}=`)) return false;

  // Hash may contain multiple `&`-separated params; pick ours.
  const raw = hash.replace(/^#/, '');
  const params = new URLSearchParams(raw);
  const token = params.get(HASH_KEY);
  if (!token) return false;

  // Strip the handoff param from the hash immediately so it can't leak via
  // history or copy-paste once consumed.
  params.delete(HASH_KEY);
  const remaining = params.toString();
  const newHash = remaining ? `#${remaining}` : '';
  window.history.replaceState(null, '', window.location.pathname + window.location.search + newHash);

  try {
    const payload = b64urlDecode(token) as HandoffPayload;
    if (!payload?.access_token || !payload?.refresh_token) return false;
    if (typeof payload.qa_exp === 'number' && Date.now() > payload.qa_exp) {
      console.warn('[qa-handoff] token expired');
      return false;
    }
    const { error } = await supabase.auth.setSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
    });
    if (error) {
      console.warn('[qa-handoff] setSession failed', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[qa-handoff] failed to parse token', e);
    return false;
  }
}
