/**
 * Lightweight analytics for dashboard CTAs, tabs, and quick actions.
 *
 * - Writes to `public.dashboard_events` (RLS: own user_id or anon).
 * - Silent-fail by design: instrumentation must never block UX.
 * - Browser-session id in localStorage (`dashboardEvents:sid`) for funnel joins.
 * - Persona is inferred per call when not provided.
 */
import { supabase } from "@/integrations/supabase/client";

const SID_KEY = "dashboardEvents:sid";

export type Persona =
  | "client"
  | "admin"
  | "sales"
  | "supervisor"
  | "agent"
  | "hr"
  | "wl_partner"
  | "wl_client"
  | "billing"
  | "tech"
  | "anonymous";

export interface TrackEventInput {
  /** Snake-case event name. Examples: cta_click, tab_view, quick_action, page_view. */
  name: string;
  /** Logical surface, e.g. client_dashboard, admin_overview, wl_portal_dashboard. */
  surface: string;
  /** The specific control or destination (e.g. request_outbound_call). */
  target?: string;
  /** Override persona inference. */
  persona?: Persona;
  /** Free-form extra context. */
  properties?: Record<string, unknown>;
}

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      const arr = new Uint8Array(8);
      (globalThis.crypto ?? window.crypto).getRandomValues(arr);
      sid =
        Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("") +
        Date.now().toString(36);
      localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "no-storage";
  }
}

let cachedUserId: string | null = null;
let cachedUserChecked = false;

async function resolveUserId(): Promise<string | null> {
  if (cachedUserChecked) return cachedUserId;
  try {
    const { data } = await supabase.auth.getUser();
    cachedUserId = data.user?.id ?? null;
  } catch {
    cachedUserId = null;
  }
  cachedUserChecked = true;
  return cachedUserId;
}

// Reset cache on auth changes.
supabase.auth.onAuthStateChange(() => {
  cachedUserChecked = false;
  cachedUserId = null;
});

/**
 * Fire-and-forget. Never throws. Returns void.
 */
export function trackEvent(input: TrackEventInput): void {
  // Never block — schedule via microtask
  void (async () => {
    try {
      const userId = await resolveUserId();
      const path =
        typeof window !== "undefined" ? window.location.pathname : null;

      await supabase.from("dashboard_events").insert({
        event_name: input.name,
        surface: input.surface,
        persona: input.persona ?? "anonymous",
        target: input.target ?? null,
        session_id: getSessionId(),
        path,
        user_id: userId,
        properties: (input.properties ?? {}) as never,
      });
    } catch {
      /* swallow — analytics must never break the UI */
    }
  })();
}

/** Convenience helpers so call sites stay terse. */
export const track = {
  cta: (surface: string, target: string, persona?: Persona, properties?: Record<string, unknown>) =>
    trackEvent({ name: "cta_click", surface, target, persona, properties }),
  tab: (surface: string, target: string, persona?: Persona, properties?: Record<string, unknown>) =>
    trackEvent({ name: "tab_view", surface, target, persona, properties }),
  quickAction: (surface: string, target: string, persona?: Persona, properties?: Record<string, unknown>) =>
    trackEvent({ name: "quick_action", surface, target, persona, properties }),
  page: (surface: string, persona?: Persona, properties?: Record<string, unknown>) =>
    trackEvent({ name: "page_view", surface, target: surface, persona, properties }),
};
