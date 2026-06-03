/**
 * Ring buffer of recent fetch requests for QA capture.
 * Keeps the last N (method, url, status, timing, request/response headers).
 * Distinct from qaRecorder which only logs failures into the active segment.
 */

export interface NetworkLogEntry {
  id: number;
  startedAt: string; // ISO
  method: string;
  url: string;
  status?: number;
  ok?: boolean;
  durationMs: number;
  type: 'fetch';
  initiator?: string;
  requestHeaders: Record<string, string>;
  responseHeaders?: Record<string, string>;
  error?: string;
}

const MAX = 30;
const buffer: NetworkLogEntry[] = [];
let nextId = 1;
let installed = false;

function headersToObject(h: HeadersInit | Headers | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  if (h instanceof Headers) {
    h.forEach((v, k) => { out[k] = v; });
    return out;
  }
  if (Array.isArray(h)) {
    for (const [k, v] of h) out[k.toLowerCase()] = String(v);
    return out;
  }
  for (const [k, v] of Object.entries(h as Record<string, string>)) {
    out[k.toLowerCase()] = String(v);
  }
  return out;
}

function responseHeadersToObject(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  res.headers.forEach((v, k) => { out[k] = v; });
  return out;
}

function push(entry: NetworkLogEntry) {
  buffer.push(entry);
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
}

export function installNetworkLogger() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const id = nextId++;
    const startedAt = new Date().toISOString();
    const start = performance.now();
    const req = args[0];
    const init = args[1];
    const url =
      typeof req === 'string'
        ? req
        : req instanceof URL
        ? req.toString()
        : (req as Request).url;
    const method = (init?.method ??
      (typeof req !== 'string' && !(req instanceof URL) ? (req as Request).method : 'GET')
    ).toUpperCase();
    const requestHeaders =
      typeof req !== 'string' && !(req instanceof URL) && (req as Request).headers
        ? headersToObject((req as Request).headers)
        : headersToObject(init?.headers);
    try {
      const res = await origFetch(...args);
      push({
        id, startedAt, method, url,
        status: res.status,
        ok: res.ok,
        durationMs: Math.round(performance.now() - start),
        type: 'fetch',
        requestHeaders,
        responseHeaders: responseHeadersToObject(res),
      });
      return res;
    } catch (err) {
      push({
        id, startedAt, method, url,
        durationMs: Math.round(performance.now() - start),
        type: 'fetch',
        requestHeaders,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}

export function getRecentNetworkRequests(): NetworkLogEntry[] {
  return buffer.slice();
}
