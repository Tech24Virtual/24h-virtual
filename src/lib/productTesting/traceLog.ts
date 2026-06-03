/**
 * Product Testing trace log.
 * Lightweight client-only persistence in localStorage. No server, no PII beyond
 * the current user's role (already known to that user). Capped at 50 entries.
 */

const TRACE_KEY = 'product-testing:trace';
const RECENT_KEY = 'product-testing:recent';
const HIDE_PUBLIC_BANNER_KEY = 'product-testing:hide-on-public';

const MAX_TRACE = 50;
const MAX_RECENT = 8;

export interface TraceEntry {
  segmentId: string;
  label: string;
  category: string;
  route: string;
  launchedAt: string; // ISO
  currentRole: string | null;
  expectedRole: string;
  pageName?: string;
  loadDurationMs?: number;
  redirectedFrom?: string;
  missingContext: string[];
  status: string;
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable, swallow
  }
}

export function appendTrace(entry: TraceEntry) {
  const all = safeRead<TraceEntry[]>(TRACE_KEY, []);
  const next = [entry, ...all].slice(0, MAX_TRACE);
  safeWrite(TRACE_KEY, next);

  // Update recent strip (most recent unique segments)
  const recent = safeRead<TraceEntry[]>(RECENT_KEY, []);
  const filtered = recent.filter((r) => r.segmentId !== entry.segmentId);
  const nextRecent = [entry, ...filtered].slice(0, MAX_RECENT);
  safeWrite(RECENT_KEY, nextRecent);
}

export function getTraceLog(): TraceEntry[] {
  return safeRead<TraceEntry[]>(TRACE_KEY, []);
}

export function getRecentLaunches(): TraceEntry[] {
  return safeRead<TraceEntry[]>(RECENT_KEY, []);
}

export function clearTraceLog() {
  safeWrite(TRACE_KEY, []);
  safeWrite(RECENT_KEY, []);
}

export function getHidePublicBannerPref(): boolean {
  return safeRead<boolean>(HIDE_PUBLIC_BANNER_KEY, false);
}

export function setHidePublicBannerPref(value: boolean) {
  safeWrite(HIDE_PUBLIC_BANNER_KEY, value);
}
