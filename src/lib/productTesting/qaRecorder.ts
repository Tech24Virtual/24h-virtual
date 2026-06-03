/**
 * QA Recorder
 * -----------
 * Captures per-segment QA evidence while a Product Testing segment is active:
 *   - console.error / console.warn messages (with stack when available)
 *   - window 'error' and 'unhandledrejection' events
 *   - fetch failures (network errors + HTTP >= 400)
 *   - route transitions (every pathname/search change)
 *
 * One recorder instance per app load. Segments are "opened" via
 * `startSegment(...)` from ProductTestingContext when ?testSegment changes,
 * and closed via `endSegment()` when it clears or another segment starts.
 *
 * Reports persist to localStorage (capped) so the launcher can list and export
 * them as a single JSON file. No PII beyond what's already on the page.
 */

const REPORTS_KEY = 'product-testing:qa-reports';
const MAX_REPORTS = 25;
const MAX_EVENTS_PER_REPORT = 500;

export interface QAEvent {
  t: number; // ms since report start
  kind: 'console' | 'window-error' | 'unhandled-rejection' | 'network' | 'route';
  level?: 'error' | 'warn' | 'info';
  message?: string;
  stack?: string;
  url?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  from?: string;
  to?: string;
}

export interface QAReport {
  id: string;
  segmentId: string;
  segmentLabel: string;
  category: string;
  startedAt: string; // ISO
  endedAt?: string;
  initialRoute: string;
  currentRole: string | null;
  expectedRole: string;
  userAgent: string;
  events: QAEvent[];
  counts: {
    consoleErrors: number;
    consoleWarnings: number;
    windowErrors: number;
    rejections: number;
    networkFailures: number; // status>=400 or thrown
    routeChanges: number;
  };
}

let active: QAReport | null = null;
let startMark = 0;
let installed = false;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => {
    try { fn(); } catch { /* ignore subscriber errors */ }
  });
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function safeWrite(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

function persist() {
  if (!active) return;
  const all = safeRead<QAReport[]>(REPORTS_KEY, []);
  const without = all.filter((r) => r.id !== active!.id);
  const next = [active, ...without].slice(0, MAX_REPORTS);
  safeWrite(REPORTS_KEY, next);
}

function pushEvent(ev: Omit<QAEvent, 't'>) {
  if (!active) return;
  if (active.events.length >= MAX_EVENTS_PER_REPORT) return;
  const full: QAEvent = { t: Math.round(performance.now() - startMark), ...ev };
  active.events.push(full);
  // Update counts
  if (full.kind === 'console' && full.level === 'error') active.counts.consoleErrors++;
  else if (full.kind === 'console' && full.level === 'warn') active.counts.consoleWarnings++;
  else if (full.kind === 'window-error') active.counts.windowErrors++;
  else if (full.kind === 'unhandled-rejection') active.counts.rejections++;
  else if (full.kind === 'network' && (full.status === undefined || full.status >= 400)) {
    active.counts.networkFailures++;
  } else if (full.kind === 'route') active.counts.routeChanges++;
  // Persist throttled? For simplicity, persist each event. Volumes are low.
  persist();
  notify();
}

function stringifyArg(a: unknown): string {
  if (a == null) return String(a);
  if (typeof a === 'string') return a;
  if (a instanceof Error) return a.message;
  try { return JSON.stringify(a); } catch { return String(a); }
}

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // Console wrapping
  (['error', 'warn'] as const).forEach((level) => {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      try {
        const message = args.map(stringifyArg).join(' ');
        const stack = args.find((a) => a instanceof Error) instanceof Error
          ? (args.find((a) => a instanceof Error) as Error).stack
          : undefined;
        pushEvent({ kind: 'console', level, message, stack });
      } catch { /* never break logging */ }
      orig(...args);
    };
  });

  // Window errors
  window.addEventListener('error', (e) => {
    pushEvent({
      kind: 'window-error',
      message: e.message,
      stack: e.error?.stack,
      url: e.filename,
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    pushEvent({
      kind: 'unhandled-rejection',
      message: reason instanceof Error ? reason.message : stringifyArg(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  // Fetch wrapping
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const start = performance.now();
    const req = args[0];
    const init = args[1];
    const url = typeof req === 'string' ? req : req instanceof URL ? req.toString() : (req as Request).url;
    const method = (init?.method ?? (typeof req !== 'string' && !(req instanceof URL) ? (req as Request).method : 'GET')).toUpperCase();
    try {
      const res = await origFetch(...args);
      if (res.status >= 400) {
        pushEvent({
          kind: 'network',
          method, url,
          status: res.status,
          durationMs: Math.round(performance.now() - start),
        });
      }
      return res;
    } catch (err) {
      pushEvent({
        kind: 'network',
        method, url,
        message: err instanceof Error ? err.message : String(err),
        durationMs: Math.round(performance.now() - start),
      });
      throw err;
    }
  };
}

export function startSegment(opts: {
  segmentId: string;
  segmentLabel: string;
  category: string;
  initialRoute: string;
  currentRole: string | null;
  expectedRole: string;
}) {
  install();
  // Close prior segment
  if (active) endSegment();
  startMark = performance.now();
  active = {
    id: `${opts.segmentId}-${Date.now()}`,
    segmentId: opts.segmentId,
    segmentLabel: opts.segmentLabel,
    category: opts.category,
    startedAt: new Date().toISOString(),
    initialRoute: opts.initialRoute,
    currentRole: opts.currentRole,
    expectedRole: opts.expectedRole,
    userAgent: navigator.userAgent,
    events: [],
    counts: {
      consoleErrors: 0, consoleWarnings: 0, windowErrors: 0,
      rejections: 0, networkFailures: 0, routeChanges: 0,
    },
  };
  persist();
  notify();
}

export function recordRouteChange(from: string, to: string) {
  if (!active) return;
  pushEvent({ kind: 'route', from, to });
}

export function endSegment() {
  if (!active) return;
  active.endedAt = new Date().toISOString();
  persist();
  active = null;
  notify();
}

export function getActiveReport(): QAReport | null {
  return active;
}

export function getAllReports(): QAReport[] {
  return safeRead<QAReport[]>(REPORTS_KEY, []);
}

export function clearReports() {
  safeWrite(REPORTS_KEY, []);
  notify();
}

export function deleteReport(id: string) {
  const all = getAllReports().filter((r) => r.id !== id);
  safeWrite(REPORTS_KEY, all);
  notify();
}

export function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function downloadReports(reports: QAReport[], filename = 'qa-report.json') {
  const blob = new Blob([JSON.stringify({
    exportedAt: new Date().toISOString(),
    count: reports.length,
    reports,
  }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
