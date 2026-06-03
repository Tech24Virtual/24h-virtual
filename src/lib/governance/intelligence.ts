/**
 * Phase 9 — Reporting / Intelligence Layer
 *
 * Single typed surface for analytics over the canonical Phase 1–8 substrate.
 *
 * Distinct from missionControl.ts:
 *   - Mission Control = real-time operational readiness + actions
 *   - Intelligence    = time-aware trends, executive roll-ups, decision support
 *
 * No new event sources, no parallel BI warehouse — only views over canonical
 * tables/views and the dashboard_events spine. Admin-gated at the UI layer;
 * underlying tables enforce their own RLS.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchOpenRecommendations, type AutomationDomain } from "./automation";

// ── Executive summary ────────────────────────────────────────────

export interface ExecutiveSummary {
  active_leads: number;
  leads_won_30d: number;
  leads_new_30d: number;
  intakes_open: number;
  intakes_activated_30d: number;
  receptionists_live: number;
  receptionists_blocked: number;
  wl_partners_live: number;
  wl_partners_total: number;
  blog_published_30d: number;
  recs_open: number;
  recs_warn_or_critical: number;
  recs_resolved_30d: number;
  computed_at: string;
}

export async function fetchExecutiveSummary(): Promise<ExecutiveSummary | null> {
  const { data, error } = await (supabase as any)
    .from("v_intelligence_executive_summary")
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("fetchExecutiveSummary", error);
    return null;
  }
  return (data as ExecutiveSummary) ?? null;
}

// ── Event trend (last 30 days) ───────────────────────────────────

export type IntelligenceDomain =
  | "growth"
  | "revenue"
  | "delivery"
  | "voice"
  | "wl"
  | "automation"
  | "system";

export const INTELLIGENCE_DOMAINS: IntelligenceDomain[] = [
  "growth",
  "revenue",
  "delivery",
  "voice",
  "wl",
  "automation",
];

export const DOMAIN_LABEL: Record<IntelligenceDomain, string> = {
  growth: "Growth",
  revenue: "Revenue",
  delivery: "Delivery",
  voice: "AI Voice",
  wl: "White Label",
  automation: "Automation",
  system: "System",
};

export interface EventTrendRow {
  day: string; // YYYY-MM-DD
  domain: IntelligenceDomain;
  event_count: number;
}

export async function fetchEventTrend30d(): Promise<EventTrendRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_intelligence_event_trend_30d")
    .select("*");
  if (error) {
    console.error("fetchEventTrend30d", error);
    return [];
  }
  return (data ?? []) as EventTrendRow[];
}

/**
 * Pivots the trend into a chart-friendly array of {day, growth, revenue, ...}
 * with zero-filled gaps so the line chart stays continuous.
 */
export function pivotEventTrend(rows: EventTrendRow[], days = 30): Array<Record<string, number | string>> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const buckets: Record<string, Record<string, number | string>> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { day: key, growth: 0, revenue: 0, delivery: 0, voice: 0, wl: 0, automation: 0, system: 0 };
  }
  for (const r of rows) {
    const key = String(r.day).slice(0, 10);
    if (buckets[key]) {
      buckets[key][r.domain] = (Number(buckets[key][r.domain]) || 0) + Number(r.event_count ?? 0);
    }
  }
  return Object.values(buckets);
}

// ── Recommendation trend (drift over time) ───────────────────────

export interface RecommendationTrendBucket {
  domain: AutomationDomain;
  open: number;
  warn_or_critical: number;
  oldest_open_at: string | null;
}

export async function fetchRecommendationTrend(): Promise<RecommendationTrendBucket[]> {
  const recs = await fetchOpenRecommendations({ limit: 500 }).catch(() => []);
  const map = new Map<AutomationDomain, RecommendationTrendBucket>();
  for (const r of recs) {
    const b = map.get(r.domain) ?? {
      domain: r.domain,
      open: 0,
      warn_or_critical: 0,
      oldest_open_at: null,
    };
    b.open += 1;
    if (r.severity === "warn" || r.severity === "critical") b.warn_or_critical += 1;
    if (!b.oldest_open_at || r.first_detected_at < b.oldest_open_at) {
      b.oldest_open_at = r.first_detected_at;
    }
    map.set(r.domain, b);
  }
  return Array.from(map.values()).sort((a, b) => b.warn_or_critical - a.warn_or_critical);
}

// ── KPI assembly for the executive header ────────────────────────

export interface KpiTile {
  key: string;
  label: string;
  value: string | number;
  sublabel: string;
  drillRoute: string;
  tone: "neutral" | "positive" | "attention" | "warn";
}

export function buildExecutiveKpis(s: ExecutiveSummary | null): KpiTile[] {
  if (!s) return [];
  return [
    {
      key: "revenue",
      label: "Active Leads",
      value: s.active_leads,
      sublabel: `${s.leads_new_30d} new · ${s.leads_won_30d} won (30d)`,
      drillRoute: "/admin/leads",
      tone: s.leads_won_30d > 0 ? "positive" : "neutral",
    },
    {
      key: "delivery",
      label: "Intakes Open",
      value: s.intakes_open,
      sublabel: `${s.intakes_activated_30d} activated (30d)`,
      drillRoute: "/admin/fulfillment-intake",
      tone: s.intakes_open > 10 ? "attention" : "neutral",
    },
    {
      key: "voice",
      label: "Receptionists Live",
      value: s.receptionists_live,
      sublabel: `${s.receptionists_blocked} blocked`,
      drillRoute: "/admin/campaign-os/call-flows",
      tone: s.receptionists_blocked > 0 ? "attention" : "positive",
    },
    {
      key: "wl",
      label: "WL Partners Live",
      value: `${s.wl_partners_live}/${s.wl_partners_total}`,
      sublabel: `${Math.max(s.wl_partners_total - s.wl_partners_live, 0)} in onboarding`,
      drillRoute: "/admin/partners",
      tone: s.wl_partners_live > 0 ? "positive" : "neutral",
    },
    {
      key: "growth",
      label: "Blog Published (30d)",
      value: s.blog_published_30d,
      sublabel: "Last 30 days",
      drillRoute: "/admin/blog",
      tone: "neutral",
    },
    {
      key: "automation",
      label: "Open Recommendations",
      value: s.recs_open,
      sublabel: `${s.recs_warn_or_critical} warn/critical · ${s.recs_resolved_30d} resolved (30d)`,
      drillRoute: "/admin/mission-control",
      tone: s.recs_warn_or_critical > 0 ? "warn" : s.recs_open > 0 ? "attention" : "positive",
    },
  ];
}
