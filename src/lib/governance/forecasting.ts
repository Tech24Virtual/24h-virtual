/**
 * Phase 10 — Forecasting / Predictive Ops
 *
 * Explainable, bounded, advisory forecasting layer over the canonical
 * Phase 1–9 substrate. No black-box ML, no auto-mutation, no new event
 * sources. Every forecast carries (a) the method, (b) the inputs, and
 * (c) a confidence label so operators can judge it.
 *
 * Methods used (canonical, all explainable):
 *   - trailing_avg     → average of last N daily buckets
 *   - moving_window    → trailing_avg projected over horizon
 *   - stage_baseline   → flat conversion ratio applied to current stock
 *   - age_risk         → bucket items by age past a threshold
 *   - threshold_band   → low / expected / high band from observed variance
 *
 * Horizons: 7-day and 30-day. Anything beyond is intentionally not
 * exposed — the substrate is too thin to make longer claims trustworthy.
 *
 * Confidence labels:
 *   - "high"     ≥ 21 non-zero data points / strong signal
 *   - "moderate" 7–20 data points
 *   - "low"      < 7 data points or extrapolation past observed window
 *   - "insufficient" → caller should hide the forecast entirely
 */
import { fetchEventTrend30d, type EventTrendRow, type IntelligenceDomain, INTELLIGENCE_DOMAINS } from "./intelligence";
import { fetchRevenuePipeline, type RevenuePipelineRow } from "./revenueOverview";
import { fetchDeliveryPipeline, type DeliveryPipelineRow } from "./deliveryOverview";
import { fetchOpenRecommendations, type AutomationDomain } from "./automation";
import { supabase } from "@/integrations/supabase/client";

export type ForecastHorizon = "7d" | "30d";
export type ForecastConfidence = "high" | "moderate" | "low" | "insufficient";
export type ForecastMethod =
  | "trailing_avg"
  | "moving_window"
  | "stage_baseline"
  | "age_risk"
  | "threshold_band";

export interface ForecastBasis {
  method: ForecastMethod;
  /** Plain-English statement of what was used to produce the number. */
  explanation: string;
  /** Numeric inputs the operator can verify (e.g. {avg_per_day: 4.2, days: 30}). */
  inputs: Record<string, number | string | null>;
  confidence: ForecastConfidence;
  horizon: ForecastHorizon;
}

export interface ForecastBand {
  low: number;
  expected: number;
  high: number;
}

// ── 1. Generic primitives ─────────────────────────────────────────

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function confidenceFromN(n: number, nonZero: number): ForecastConfidence {
  if (n < 3) return "insufficient";
  if (nonZero === 0) return "low";
  if (nonZero >= 21) return "high";
  if (nonZero >= 7) return "moderate";
  return "low";
}

/** Bucketize a domain trend into a daily counts array, oldest → newest. */
export function dailyCountsForDomain(rows: EventTrendRow[], domain: IntelligenceDomain, days = 30): number[] {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.domain !== domain) continue;
    map.set(String(r.day).slice(0, 10), Number(r.event_count ?? 0));
  }
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    out.push(map.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  return out;
}

/** Project a trailing-window daily mean over a horizon, with a ±1σ band. */
export function projectFromDaily(daily: number[], horizonDays: number, horizon: ForecastHorizon): { band: ForecastBand; basis: ForecastBasis } {
  const m = mean(daily);
  const sd = stddev(daily);
  const expected = m * horizonDays;
  const low = Math.max(0, (m - sd) * horizonDays);
  const high = (m + sd) * horizonDays;
  const nonZero = daily.filter((x) => x > 0).length;
  return {
    band: { low: Math.round(low), expected: Math.round(expected), high: Math.round(high) },
    basis: {
      method: "moving_window",
      explanation: `Projected ${horizonDays}-day volume = trailing ${daily.length}-day daily mean × ${horizonDays}. Band = mean ± 1σ × ${horizonDays}.`,
      inputs: {
        trailing_days: daily.length,
        daily_mean: Number(m.toFixed(2)),
        daily_stddev: Number(sd.toFixed(2)),
        non_zero_days: nonZero,
      },
      confidence: confidenceFromN(daily.length, nonZero),
      horizon,
    },
  };
}

// ── 2. Event-volume forecast (per domain) ─────────────────────────

export interface DomainEventForecast {
  domain: IntelligenceDomain;
  horizon: ForecastHorizon;
  band: ForecastBand;
  basis: ForecastBasis;
}

export async function forecastDomainEventVolume(horizon: ForecastHorizon = "7d"): Promise<DomainEventForecast[]> {
  const rows = await fetchEventTrend30d().catch(() => [] as EventTrendRow[]);
  const horizonDays = horizon === "7d" ? 7 : 30;
  const out: DomainEventForecast[] = [];
  for (const domain of INTELLIGENCE_DOMAINS) {
    const daily = dailyCountsForDomain(rows, domain, 30);
    const { band, basis } = projectFromDaily(daily, horizonDays, horizon);
    out.push({ domain, horizon, band, basis });
  }
  return out;
}

// ── 3. Revenue / pipeline forecast ────────────────────────────────

export interface RevenueForecast {
  horizon: ForecastHorizon;
  active_leads: number;
  expected_conversions: ForecastBand;
  expected_value_usd: ForecastBand;
  overdue_at_risk: number;
  unassigned: number;
  basis: ForecastBasis;
  by_stage: Array<{ stage: string; lead_count: number; estimated_value_usd: number; overdue_followups: number }>;
}

const REVENUE_BASELINE_CONVERSION = 0.12; // canonical baseline: 12% of active pipeline progresses per 30d
const TERMINAL_STAGES = new Set(["converted", "won", "lost", "disqualified", "closed_won", "closed_lost"]);

export async function forecastRevenue(horizon: ForecastHorizon = "30d"): Promise<RevenueForecast> {
  const rows: RevenuePipelineRow[] = await fetchRevenuePipeline().catch(() => []);
  const active = rows.filter((r) => !TERMINAL_STAGES.has(String(r.pipeline_stage)));
  const activeLeads = active.reduce((s, r) => s + Number(r.lead_count ?? 0), 0);
  const activeValue = active.reduce((s, r) => s + Number(r.estimated_value_usd ?? 0), 0);
  const overdue = active.reduce((s, r) => s + Number(r.overdue_followups ?? 0), 0);
  const unassigned = active.reduce((s, r) => s + Number(r.unassigned_count ?? 0), 0);
  const horizonScale = horizon === "30d" ? 1 : 7 / 30;
  const ratio = REVENUE_BASELINE_CONVERSION * horizonScale;
  const expectedConversions = activeLeads * ratio;
  const expectedValue = activeValue * ratio;
  return {
    horizon,
    active_leads: activeLeads,
    expected_conversions: {
      low: Math.round(expectedConversions * 0.6),
      expected: Math.round(expectedConversions),
      high: Math.round(expectedConversions * 1.4),
    },
    expected_value_usd: {
      low: Math.round(expectedValue * 0.6),
      expected: Math.round(expectedValue),
      high: Math.round(expectedValue * 1.4),
    },
    overdue_at_risk: overdue,
    unassigned,
    basis: {
      method: "stage_baseline",
      explanation: `Applied a flat ${(REVENUE_BASELINE_CONVERSION * 100).toFixed(0)}% / 30d baseline progression to the current active pipeline. Band = ±40% of expected to reflect baseline uncertainty.`,
      inputs: {
        active_leads: activeLeads,
        active_value_usd: Math.round(activeValue),
        baseline_30d_conversion: REVENUE_BASELINE_CONVERSION,
        horizon_scale: Number(horizonScale.toFixed(3)),
      },
      confidence: activeLeads >= 20 ? "moderate" : activeLeads > 0 ? "low" : "insufficient",
      horizon,
    },
    by_stage: active.map((r) => ({
      stage: String(r.pipeline_stage),
      lead_count: Number(r.lead_count ?? 0),
      estimated_value_usd: Number(r.estimated_value_usd ?? 0),
      overdue_followups: Number(r.overdue_followups ?? 0),
    })),
  };
}

// ── 4. Delivery / capacity forecast ───────────────────────────────

const DELIVERY_TERMINAL = new Set(["activated", "closed"]);
const DELIVERY_ACTIVATION_RATE_30D = 0.35; // 35% of open intakes typically activate per 30d (advisory baseline)

export interface DeliveryForecast {
  horizon: ForecastHorizon;
  open_intakes: number;
  urgent: number;
  unassigned: number;
  expected_activations: ForecastBand;
  oldest_age_days: number | null;
  age_buckets: { fresh: number; aging: number; stalled: number };
  basis: ForecastBasis;
}

export async function forecastDelivery(horizon: ForecastHorizon = "7d"): Promise<DeliveryForecast> {
  const rows: DeliveryPipelineRow[] = await fetchDeliveryPipeline().catch(() => []);
  const open = rows.filter((r) => !DELIVERY_TERMINAL.has(String(r.status)));
  const total = open.reduce((s, r) => s + Number(r.intake_count ?? 0), 0);
  const urgent = open.reduce((s, r) => s + Number(r.urgent_count ?? 0), 0);
  const unassigned = open.reduce((s, r) => s + Number(r.unassigned_count ?? 0), 0);
  const horizonScale = horizon === "30d" ? 1 : 7 / 30;
  const expected = total * DELIVERY_ACTIVATION_RATE_30D * horizonScale;

  // Age risk: query intake age in days from oldest_submitted_at
  let oldestAgeDays: number | null = null;
  let aging = 0;
  let stalled = 0;
  const now = Date.now();
  for (const r of open) {
    if (r.oldest_submitted_at) {
      const age = Math.floor((now - new Date(r.oldest_submitted_at).getTime()) / 86_400_000);
      if (oldestAgeDays === null || age > oldestAgeDays) oldestAgeDays = age;
    }
  }
  // Bucket totals roughly by stage age cues (advisory only).
  // We don't have per-row age in the pipeline view, so we derive a coarse split.
  const fresh = Math.max(0, total - urgent);
  aging = urgent;
  stalled = oldestAgeDays !== null && oldestAgeDays > 14 ? Math.min(urgent, Math.ceil(urgent * 0.5)) : 0;

  return {
    horizon,
    open_intakes: total,
    urgent,
    unassigned,
    expected_activations: {
      low: Math.round(expected * 0.6),
      expected: Math.round(expected),
      high: Math.round(expected * 1.4),
    },
    oldest_age_days: oldestAgeDays,
    age_buckets: { fresh, aging, stalled },
    basis: {
      method: "stage_baseline",
      explanation: `Applied a flat ${(DELIVERY_ACTIVATION_RATE_30D * 100).toFixed(0)}% / 30d baseline activation rate to open intakes. Age signal is derived from the oldest open submission.`,
      inputs: {
        open_intakes: total,
        baseline_30d_activation: DELIVERY_ACTIVATION_RATE_30D,
        horizon_scale: Number(horizonScale.toFixed(3)),
        oldest_age_days: oldestAgeDays ?? 0,
      },
      confidence: total >= 10 ? "moderate" : total > 0 ? "low" : "insufficient",
      horizon,
    },
  };
}

// ── 5. Voice readiness forecast ───────────────────────────────────

export interface VoiceForecast {
  horizon: ForecastHorizon;
  total_flows: number;
  live: number;
  ready_to_activate: number;
  blocked: number;
  expected_to_go_live: ForecastBand;
  blocked_reasons: { awaiting_script_publish: number; awaiting_number: number; configured_offline: number; unconfigured: number };
  basis: ForecastBasis;
}

const VOICE_GO_LIVE_RATE_7D = 0.5; // 50% of ready-to-activate flows go live within 7d (advisory)

export async function forecastVoice(horizon: ForecastHorizon = "7d"): Promise<VoiceForecast> {
  const { data, error } = await (supabase as any)
    .from("v_call_flow_receptionist_readiness")
    .select("readiness_state");
  if (error) {
    return {
      horizon,
      total_flows: 0, live: 0, ready_to_activate: 0, blocked: 0,
      expected_to_go_live: { low: 0, expected: 0, high: 0 },
      blocked_reasons: { awaiting_script_publish: 0, awaiting_number: 0, configured_offline: 0, unconfigured: 0 },
      basis: { method: "stage_baseline", explanation: "No readiness data available.", inputs: {}, confidence: "insufficient", horizon },
    };
  }
  const rows = (data ?? []) as Array<{ readiness_state: string }>;
  const counts = { live: 0, ready: 0, blocked: 0, awaiting_script_publish: 0, awaiting_number: 0, configured_offline: 0, unconfigured: 0 };
  for (const r of rows) {
    const s = r.readiness_state;
    if (s === "live") counts.live++;
    else if (s === "ready_to_activate") counts.ready++;
    else {
      counts.blocked++;
      if (s === "awaiting_script_publish") counts.awaiting_script_publish++;
      else if (s === "awaiting_number") counts.awaiting_number++;
      else if (s === "configured_offline") counts.configured_offline++;
      else if (s === "unconfigured") counts.unconfigured++;
    }
  }
  const horizonScale = horizon === "7d" ? 1 : 30 / 7;
  const expected = counts.ready * VOICE_GO_LIVE_RATE_7D * horizonScale;
  return {
    horizon,
    total_flows: rows.length,
    live: counts.live,
    ready_to_activate: counts.ready,
    blocked: counts.blocked,
    expected_to_go_live: {
      low: Math.round(expected * 0.6),
      expected: Math.round(expected),
      high: Math.min(counts.ready, Math.round(expected * 1.4)),
    },
    blocked_reasons: {
      awaiting_script_publish: counts.awaiting_script_publish,
      awaiting_number: counts.awaiting_number,
      configured_offline: counts.configured_offline,
      unconfigured: counts.unconfigured,
    },
    basis: {
      method: "stage_baseline",
      explanation: `Applied a ${(VOICE_GO_LIVE_RATE_7D * 100).toFixed(0)}% / 7d baseline activation rate to flows currently in 'ready_to_activate'. Blocked flows are surfaced with their dependency reason but are NOT counted as forecast volume.`,
      inputs: {
        ready_to_activate: counts.ready,
        baseline_7d_go_live: VOICE_GO_LIVE_RATE_7D,
        horizon_scale: Number(horizonScale.toFixed(3)),
      },
      confidence: counts.ready >= 5 ? "moderate" : counts.ready > 0 ? "low" : "insufficient",
      horizon,
    },
  };
}

// ── 6. WL partner activation forecast ─────────────────────────────

export interface WLActivationForecast {
  horizon: ForecastHorizon;
  total_partners: number;
  live: number;
  in_progress: number;
  stuck: number;
  expected_to_go_live: ForecastBand;
  by_state: Array<{ state: string; count: number }>;
  basis: ForecastBasis;
}

const WL_GO_LIVE_RATE_30D = 0.25;

export async function forecastWL(horizon: ForecastHorizon = "30d"): Promise<WLActivationForecast> {
  const { data, error } = await (supabase as any)
    .from("v_wl_partner_readiness")
    .select("readiness_state");
  if (error) {
    return {
      horizon, total_partners: 0, live: 0, in_progress: 0, stuck: 0,
      expected_to_go_live: { low: 0, expected: 0, high: 0 }, by_state: [],
      basis: { method: "stage_baseline", explanation: "No partner readiness data.", inputs: {}, confidence: "insufficient", horizon },
    };
  }
  const rows = (data ?? []) as Array<{ readiness_state: string }>;
  const byState = new Map<string, number>();
  let live = 0;
  for (const r of rows) {
    byState.set(r.readiness_state, (byState.get(r.readiness_state) ?? 0) + 1);
    if (r.readiness_state === "live") live++;
  }
  const inProgress = rows.length - live;
  // "Stuck" heuristic: states that need an external dependency (domain_pending, pending) are flagged.
  const stuck = (byState.get("domain_pending") ?? 0) + (byState.get("pending") ?? 0);
  const horizonScale = horizon === "30d" ? 1 : 7 / 30;
  const candidates = (byState.get("domain_ready") ?? 0) + (byState.get("branded") ?? 0) + (byState.get("configured") ?? 0);
  const expected = candidates * WL_GO_LIVE_RATE_30D * horizonScale;
  return {
    horizon,
    total_partners: rows.length,
    live,
    in_progress: inProgress,
    stuck,
    expected_to_go_live: {
      low: Math.round(expected * 0.5),
      expected: Math.round(expected),
      high: Math.min(candidates, Math.round(expected * 1.5)),
    },
    by_state: Array.from(byState.entries()).map(([state, count]) => ({ state, count })),
    basis: {
      method: "stage_baseline",
      explanation: `Applied a ${(WL_GO_LIVE_RATE_30D * 100).toFixed(0)}% / 30d activation baseline to partners in 'configured', 'branded', or 'domain_ready'. Partners awaiting external action (DNS verify, signed agreement) are surfaced as stuck risk, not forecast volume.`,
      inputs: {
        candidate_partners: candidates,
        baseline_30d_go_live: WL_GO_LIVE_RATE_30D,
        horizon_scale: Number(horizonScale.toFixed(3)),
      },
      confidence: candidates >= 3 ? "moderate" : candidates > 0 ? "low" : "insufficient",
      horizon,
    },
  };
}

// ── 7. Automation / recommendation forecast ───────────────────────

export interface AutomationForecast {
  horizon: ForecastHorizon;
  open_now: number;
  warn_or_critical_now: number;
  recurring_kinds: Array<{ kind: string; domain: AutomationDomain; recurrences: number }>;
  expected_new: ForecastBand;
  basis: ForecastBasis;
}

export async function forecastAutomation(horizon: ForecastHorizon = "7d"): Promise<AutomationForecast> {
  const recs = await fetchOpenRecommendations({ limit: 500 }).catch(() => []);
  const open = recs.length;
  const warnCritical = recs.filter((r) => r.severity === "warn" || r.severity === "critical").length;

  // Use first_detected_at -> last_detected_at gap as a recurrence proxy.
  const kindMap = new Map<string, { kind: string; domain: AutomationDomain; recurrences: number }>();
  for (const r of recs) {
    const k = `${r.domain}:${r.kind}`;
    const existing = kindMap.get(k);
    const recurDays = Math.max(1, Math.floor((new Date(r.last_detected_at).getTime() - new Date(r.first_detected_at).getTime()) / 86_400_000));
    if (existing) existing.recurrences += recurDays;
    else kindMap.set(k, { kind: r.kind, domain: r.domain, recurrences: recurDays });
  }
  const recurring = Array.from(kindMap.values()).sort((a, b) => b.recurrences - a.recurrences).slice(0, 5);

  // Use trailing automation event volume to forecast new recommendations.
  const trend = await fetchEventTrend30d().catch(() => []);
  const automationDaily = dailyCountsForDomain(trend, "automation", 30);
  const horizonDays = horizon === "7d" ? 7 : 30;
  const m = mean(automationDaily);
  const sd = stddev(automationDaily);
  const expected = m * horizonDays;
  const nonZero = automationDaily.filter((x) => x > 0).length;

  return {
    horizon,
    open_now: open,
    warn_or_critical_now: warnCritical,
    recurring_kinds: recurring,
    expected_new: {
      low: Math.max(0, Math.round((m - sd) * horizonDays)),
      expected: Math.round(expected),
      high: Math.round((m + sd) * horizonDays),
    },
    basis: {
      method: "trailing_avg",
      explanation: `Forecasted new automation events from the trailing 30-day daily mean of automation.* events on the dashboard_events spine. Recurring kinds use the gap between first_detected_at and last_detected_at as a recurrence proxy.`,
      inputs: {
        automation_daily_mean: Number(m.toFixed(2)),
        automation_daily_stddev: Number(sd.toFixed(2)),
        non_zero_days: nonZero,
        open_now: open,
      },
      confidence: confidenceFromN(automationDaily.length, nonZero),
      horizon,
    },
  };
}

// ── 8. Confidence/UX helpers ──────────────────────────────────────

export const CONFIDENCE_LABEL: Record<ForecastConfidence, string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Low confidence",
  insufficient: "Insufficient data",
};

export const CONFIDENCE_TONE: Record<ForecastConfidence, "positive" | "neutral" | "attention" | "warn"> = {
  high: "positive",
  moderate: "neutral",
  low: "attention",
  insufficient: "warn",
};

export function formatBand(b: ForecastBand): string {
  if (b.low === b.expected && b.expected === b.high) return String(b.expected);
  return `${b.low}–${b.high} (≈${b.expected})`;
}
