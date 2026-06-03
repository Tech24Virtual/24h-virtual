/**
 * Heuristic root-cause analysis for QA captures.
 * Inspects the active QAReport's events + recent network log and produces:
 *  - a single "likely root cause" hypothesis
 *  - a prioritized list of suggested fixes
 *
 * Pure pattern matching, no AI calls. Safe to run synchronously in the browser.
 */
import type { QAReport, QAEvent } from "./qaRecorder";
import type { NetworkLogEntry } from "./networkLog";

export interface AnalysisFinding {
  priority: "P0" | "P1" | "P2";
  title: string;
  detail: string;
}

export interface QAAnalysis {
  rootCause: string | null;
  findings: AnalysisFinding[];
}

interface Signals {
  has412: boolean;
  has401or403: boolean;
  has5xx: boolean;
  hasCors: boolean;
  hasNetworkAbort: boolean;
  has404: boolean;
  hasReactKey: boolean;
  hasReactHook: boolean;
  hasUndefinedRead: boolean;
  hasChunkLoad: boolean;
  hasRpcError: boolean;
  hasRlsError: boolean;
  failedHosts: Map<string, number>;
  topConsole?: string;
}

function collectSignals(events: QAEvent[], net: NetworkLogEntry[]): Signals {
  const s: Signals = {
    has412: false, has401or403: false, has5xx: false, hasCors: false,
    hasNetworkAbort: false, has404: false, hasReactKey: false,
    hasReactHook: false, hasUndefinedRead: false, hasChunkLoad: false,
    hasRpcError: false, hasRlsError: false, failedHosts: new Map(),
  };

  for (const e of events) {
    const msg = (e.message ?? "").toString();
    if (e.kind === "console" && e.level === "error" && !s.topConsole) s.topConsole = msg;
    if (/violates row-level security|new row violates|RLS/i.test(msg)) s.hasRlsError = true;
    if (/permission denied|not authorized/i.test(msg)) s.has401or403 = true;
    if (/Cannot read propert(y|ies) of (undefined|null)/i.test(msg)) s.hasUndefinedRead = true;
    if (/Each child in a list should have a unique "key"/.test(msg)) s.hasReactKey = true;
    if (/Invalid hook call|Rules of Hooks|Rendered fewer hooks/i.test(msg)) s.hasReactHook = true;
    if (/Loading chunk \d+ failed|ChunkLoadError|Failed to fetch dynamically imported/i.test(msg)) s.hasChunkLoad = true;
    if (/has been blocked by CORS policy|No 'Access-Control-Allow-Origin'/i.test(msg)) s.hasCors = true;
    if (/aborted|NetworkError when attempting to fetch/i.test(msg)) s.hasNetworkAbort = true;
  }

  for (const n of [...net, ...events.filter((e) => e.kind === "network").map((e) => ({
    method: e.method ?? "GET", url: e.url ?? "", status: e.status, error: e.message,
  } as Partial<NetworkLogEntry>))]) {
    const status = n.status;
    const url = n.url ?? "";
    if (!status && (n as NetworkLogEntry).error) s.hasNetworkAbort = true;
    if (status === 412) s.has412 = true;
    if (status === 401 || status === 403) s.has401or403 = true;
    if (status === 404) s.has404 = true;
    if (status && status >= 500) s.has5xx = true;
    if (/\/rest\/v1\/rpc\//.test(url) && status && status >= 400) s.hasRpcError = true;
    if (status && status >= 400) {
      try {
        const host = new URL(url, location.href).host;
        s.failedHosts.set(host, (s.failedHosts.get(host) ?? 0) + 1);
      } catch { /* ignore */ }
    }
  }
  return s;
}

export function analyzeCapture(
  report: QAReport | null,
  net: NetworkLogEntry[],
): QAAnalysis {
  const events = report?.events ?? [];
  if (events.length === 0 && net.length === 0) {
    return { rootCause: null, findings: [] };
  }
  const s = collectSignals(events, net);
  const findings: AnalysisFinding[] = [];
  let rootCause: string | null = null;

  if (s.has412) {
    rootCause = "Auth/session mismatch: backend returned HTTP 412 (precondition failed), typically a stale Supabase session inside the preview iframe.";
    findings.push({ priority: "P0", title: "Refresh session or re-authenticate",
      detail: "Use the Auth412Watcher banner to refresh the session, or sign out and back in to re-handshake cookies." });
  } else if (s.hasRlsError) {
    rootCause = "Row-Level Security blocked a write: the current role does not satisfy the table's RLS policy.";
    findings.push({ priority: "P0", title: "Audit RLS policy for the affected table",
      detail: "Verify the policy's USING/WITH CHECK matches the role making the request, then re-test." });
  } else if (s.has401or403) {
    rootCause = "Authorization failure: the request was authenticated but lacks the required role/scope.";
    findings.push({ priority: "P0", title: "Confirm user role assignment",
      detail: "Check user_roles for the test account; ensure the segment's expected role is granted." });
  } else if (s.has5xx) {
    rootCause = "Backend exception: an edge function or database call returned 5xx.";
    findings.push({ priority: "P0", title: "Inspect edge function / Postgres logs",
      detail: "Open the failing function's logs around the captured timestamp and trace the exception." });
  } else if (s.hasChunkLoad) {
    rootCause = "Stale build: the browser tried to load a code chunk that no longer exists (post-deploy cache).";
    findings.push({ priority: "P0", title: "Hard reload to fetch the new bundle",
      detail: "Bypass the SW/cache (Cmd+Shift+R). Long-term: add a chunk-load-error retry that triggers location.reload()." });
  } else if (s.hasReactHook) {
    rootCause = "React hook misuse: a hook was called conditionally or the hook order changed between renders.";
    findings.push({ priority: "P0", title: "Move hooks to top of component",
      detail: "Hooks must run unconditionally in the same order every render." });
  } else if (s.hasUndefinedRead) {
    rootCause = "Null/undefined access: code dereferenced a value before it was loaded.";
    findings.push({ priority: "P1", title: "Add a loading guard",
      detail: "Render a skeleton/null until the awaited data resolves; default optional fields." });
  } else if (s.hasCors) {
    rootCause = "CORS rejection: the target origin does not allow this preview's origin.";
    findings.push({ priority: "P0", title: "Allow the preview origin in CORS headers",
      detail: "Update the edge function or upstream service to include the Lovable preview hostname." });
  } else if (s.hasNetworkAbort) {
    rootCause = "Network instability or unreachable endpoint: requests were aborted or never resolved.";
    findings.push({ priority: "P1", title: "Verify endpoint availability",
      detail: "Check the failing host and add a retry with exponential backoff for transient failures." });
  } else if (s.has404) {
    rootCause = "Missing resource: a 404 was returned for a request the UI depends on.";
    findings.push({ priority: "P1", title: "Verify route or asset path",
      detail: "Confirm the URL exists in the router/storage and that any required ID is correctly substituted." });
  } else if (s.topConsole) {
    rootCause = `Console error observed: ${s.topConsole.slice(0, 180)}`;
  }

  // Secondary findings
  if (s.hasReactKey) {
    findings.push({ priority: "P2", title: "Add stable keys to list items",
      detail: "Replace index-based or missing keys with the row's id to prevent reconciliation churn." });
  }
  if (s.hasRpcError && rootCause && !/RLS|412|401|403/i.test(rootCause)) {
    findings.push({ priority: "P1", title: "Validate RPC arguments",
      detail: "Confirm parameter names/types match the SQL function signature." });
  }
  if (s.failedHosts.size > 0) {
    const list = [...s.failedHosts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h, n]) => `${h} (${n})`)
      .join(", ");
    findings.push({ priority: "P2", title: "Hosts with failing requests",
      detail: list });
  }

  return { rootCause, findings };
}

export function renderAnalysisMarkdown(a: QAAnalysis): string {
  if (!a.rootCause && a.findings.length === 0) return "";
  const lines: string[] = ["", "**Likely root cause**"];
  lines.push(a.rootCause ? `- ${a.rootCause}` : "- Inconclusive: no strong signals in the captured diagnostics.");
  if (a.findings.length) {
    lines.push("", "**Prioritized fixes**");
    for (const f of a.findings) {
      lines.push(`- \`${f.priority}\` ${f.title}: ${f.detail}`);
    }
  }
  return lines.join("\n");
}
