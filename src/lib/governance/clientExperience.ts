/**
 * Phase 12 — Partner & Client Experience Maturity
 *
 * Client-facing trend + nudges for the direct client dashboard
 * (/client-dashboard) and the WL portal end-client dashboard.
 *
 * Tenant safety:
 *  - Direct client: call_logs RLS already scopes to client_id = auth.uid().
 *  - WL end-client: wl_call_logs RLS already scopes to wl_client_id.
 * No admin internals or cross-tenant data are used.
 */
import { supabase } from "@/integrations/supabase/client";

export interface DailyCallPoint {
  day: string; // YYYY-MM-DD
  total: number;
  missed: number;
}

export interface ClientCallTrend {
  days: DailyCallPoint[];
  totalCalls: number;
  missedCalls: number;
  totalMinutes: number;
  afterHoursCalls: number;
  weekOverWeekDelta: number; // signed integer
}

interface RawCall {
  created_at: string;
  call_duration: number | null;
  status?: string | null;
}

const DAY_MS = 86_400_000;

function bucketByDay(rows: RawCall[], days: number): DailyCallPoint[] {
  const buckets = new Map<string, DailyCallPoint>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { day: key, total: 0, missed: 0 });
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    b.total += 1;
    if (r.status === "missed") b.missed += 1;
  }
  return Array.from(buckets.values());
}

function summarize(rows: RawCall[], series: DailyCallPoint[]): Omit<ClientCallTrend, "days"> {
  const totalCalls = rows.length;
  const missedCalls = rows.filter((r) => r.status === "missed").length;
  const totalMinutes = Math.round(
    rows.reduce((s, r) => s + (r.call_duration || 0), 0) / 60,
  );
  const afterHoursCalls = rows.filter((r) => {
    const h = new Date(r.created_at).getHours();
    return h < 8 || h >= 18;
  }).length;
  const last7 = series.slice(-7).reduce((s, p) => s + p.total, 0);
  const prev7 = series.slice(-14, -7).reduce((s, p) => s + p.total, 0);
  return {
    totalCalls,
    missedCalls,
    totalMinutes,
    afterHoursCalls,
    weekOverWeekDelta: last7 - prev7,
  };
}

export async function fetchClientCallTrend(opts: {
  scope: "direct" | "wl";
  clientId: string; // auth.uid for direct, wl_client_id for wl
  days?: number;
}): Promise<ClientCallTrend> {
  const days = opts.days ?? 30;
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const table = opts.scope === "wl" ? "wl_call_logs" : "call_logs";
  const idCol = opts.scope === "wl" ? "wl_client_id" : "client_id";
  const { data, error } = await (supabase as any)
    .from(table)
    .select("created_at, call_duration, status")
    .eq(idCol, opts.clientId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as RawCall[];
  const series = bucketByDay(rows, days);
  return { days: series, ...summarize(rows, series) };
}

// ── Nudges ───────────────────────────────────────────────────────

export type ClientNudgeTone = "info" | "action" | "ok";

export interface ClientNudge {
  id: string;
  tone: ClientNudgeTone;
  title: string;
  detail: string;
  drillRoute?: string;
}

export interface ClientNudgeInputs {
  hasActiveScript: boolean;
  receptionistLive: boolean;
  receptionistPending: boolean;
  serviceState: string | null; // not_started | collecting_info | in_review | live | null
  openTickets: number;
  trend: ClientCallTrend;
}

export function deriveClientNudges(input: ClientNudgeInputs): ClientNudge[] {
  const out: ClientNudge[] = [];
  if (input.serviceState && input.serviceState !== "live") {
    out.push({
      id: "client-activation",
      tone: "action",
      title: "Finish service activation",
      detail: "Your service is still in setup. Completing intake unlocks live call handling.",
      drillRoute: "/client-dashboard/settings",
    });
  }
  if (!input.hasActiveScript) {
    out.push({
      id: "client-script",
      tone: "action",
      title: "Publish a call script",
      detail: "Without a published script, calls cannot be answered on your behalf. Add or activate one.",
      drillRoute: "/client-dashboard/scripts",
    });
  }
  if (input.receptionistPending && !input.receptionistLive) {
    out.push({
      id: "client-receptionist",
      tone: "info",
      title: "AI receptionist in setup",
      detail: "Your AI receptionist is configured but not yet live. We will notify you when it goes live.",
    });
  }
  if (input.trend.afterHoursCalls > 0 && !input.receptionistLive) {
    out.push({
      id: "client-after-hours",
      tone: "info",
      title: `${input.trend.afterHoursCalls} after-hours calls in the last 30 days`,
      detail: "An AI receptionist or after-hours coverage could capture leads outside business hours.",
      drillRoute: "/client-dashboard/scripts",
    });
  }
  if (input.openTickets > 0) {
    out.push({
      id: "client-tickets",
      tone: "info",
      title: `${input.openTickets} open support ticket${input.openTickets === 1 ? "" : "s"}`,
      detail: "We are working on these. Reply in support to add context.",
      drillRoute: "/client-dashboard/support",
    });
  }
  if (out.length === 0) {
    out.push({
      id: "client-ok",
      tone: "ok",
      title: "Service is healthy",
      detail: "No action needed. Review your trend and recent calls below.",
    });
  }
  return out;
}
