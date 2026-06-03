import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, LogIn, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

/**
 * Auth412Watcher
 * --------------
 * Watches for HTTP 412 responses (and adjacent auth-failure signals) coming
 * from the app — both from Supabase REST/Edge calls AND from the Lovable
 * preview iframe shell when it serves "HTTP ERROR 412" instead of the app.
 *
 * Why 412 happens here:
 *   - The Lovable preview iframe requires a preview session cookie. When the
 *     parent tab and the iframe disagree (different browser context, expired
 *     cookie, separate headless session), the preview shell short-circuits
 *     with a 412 Precondition Failed instead of rendering the React app.
 *   - Supabase REST/Storage can also return 412 when an `If-Match` /
 *     `If-Unmodified-Since` precondition fails, often after a token rotation.
 *
 * What we do:
 *   1. Wrap `window.fetch` once and watch for 412s.
 *   2. When seen, show a fixed bottom-right card explaining the mismatch in
 *     plain language and offering: "Refresh session" (silent token refresh)
 *     and "Re-authenticate" (deep-link to /login with a return path).
 *   3. The card is dismissible per page.
 */

let installed = false;
const listeners = new Set<() => void>();

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await orig(...args);
    if (res.status === 412) {
      // Notify on next tick so React can render outside the fetch caller.
      queueMicrotask(() => listeners.forEach((fn) => fn()));
    }
    return res;
  };
}

export function Auth412Watcher() {
  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    install();
    const onHit = () => setVisible(true);
    listeners.add(onHit);
    return () => {
      listeners.delete(onHit);
    };
  }, []);

  if (!visible) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        setVisible(false);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleReauth = () => {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // Top-level navigation so any iframe wrapper (preview shell) is exited
    // and the cookie / session can be re-established cleanly.
    if (window.top && window.top !== window.self) {
      try {
        window.top.location.href = `${window.location.origin}/login?next=${next}`;
        return;
      } catch {
        /* cross-origin top, fall through to self-nav */
      }
    }
    window.location.href = `/login?next=${next}`;
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-500/40 bg-zinc-950/95 backdrop-blur shadow-2xl text-zinc-100 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm mb-1">Session mismatch (HTTP 412)</div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            The preview or backend rejected a request because your auth session is missing,
            stale, or split between browser contexts. This usually means cookies in this tab
            do not match the logged-in account, or the preview shell needs a fresh handshake.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-7 text-xs bg-transparent border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh session
            </Button>
            <Button
              size="sm"
              onClick={handleReauth}
              className="h-7 text-xs bg-primary hover:bg-primary/90"
            >
              <LogIn className="h-3 w-3 mr-1.5" />
              Re-authenticate
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-zinc-500 hover:text-zinc-200 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
