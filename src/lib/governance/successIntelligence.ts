/**
 * Phase 16 — Retention / Success Intelligence
 *
 * Typed read wrappers over the canonical Phase 16 success views.
 *
 * Honesty contract:
 *   - `health_band` is a RULE-BASED bucket (healthy / watch / intervention),
 *     not an ML risk score. Rules are documented in the migration and in
 *     `HEALTH_BAND_RULES` below for UI legends.
 *   - `lifecycle_signal` is inherited from Phase 14 commercial heuristics
 *     (expansion / downgrade_risk / stalled / steady / insufficient_history).
 *     It is a usage proxy, not a contract/cancellation fact.
 *   - `reasons` is the explicit list of triggers behind a band — every flag
 *     a user sees has a backing condition, no hidden inputs.
 *   - All views are SECURITY INVOKER; only roles with read on the underlying
 *     canonical sources (delivery, receptionist, billing, fulfillment) will
 *     see populated rows. Partner/client surfaces do NOT consume this layer.
 */
import { supabase } from "@/integrations/supabase/client";

export type HealthBand = "healthy" | "watch" | "intervention";
export type AcquisitionType = "direct" | "wl";
export type ReceptionistHealth = "healthy" | "partial" | "missing";
export type LifecycleSignal =
  | "expansion"
  | "downgrade_risk"
  | "stalled"
  | "steady"
  | "insufficient_history";

export interface SuccessAccountRow {
  lead_id: string;
  name: string | null;
  company: string | null;
  acquisition_type: AcquisitionType;
  partner_id: string | null;
  activated_at: string | null;
  days_live: number;
  days_since_activity: number;
  open_tickets_count: number;
  live_campaigns_count: number;
  total_campaigns_count: number;
  receptionist_flow_count: number;
  receptionist_live_count: number;
  receptionist_pending_count: number;
  receptionist_health: ReceptionistHealth;
  lifecycle_signal: LifecycleSignal;
  plan_name: string | null;
  latest_period_end: string | null;
  health_band: HealthBand;
  reasons: string[];
}

export interface SuccessHealthSummaryRow {
  health_band: HealthBand;
  accounts: number;
  direct_accounts: number;
  wl_accounts: number;
}

export interface SuccessRiskBucketRow {
  reason: string;
  accounts: number;
}

export interface SuccessExpansionRow {
  lead_id: string;
  name: string | null;
  company: string | null;
  acquisition_type: AcquisitionType;
  partner_id: string | null;
  plan_name: string | null;
  days_live: number;
  receptionist_health: ReceptionistHealth;
  open_tickets_count: number;
  lifecycle_signal: LifecycleSignal;
  latest_period_end: string | null;
}

export interface SuccessDirectVsWlRow {
  acquisition_type: AcquisitionType;
  accounts: number;
  healthy: number;
  watch: number;
  intervention: number;
  expansion_ready: number;
  no_live_receptionist: number;
  avg_days_live: number | null;
  avg_days_since_activity: number | null;
}

export interface SuccessIntelligenceBundle {
  accounts: SuccessAccountRow[];
  summary: SuccessHealthSummaryRow[];
  riskBuckets: SuccessRiskBucketRow[];
  expansion: SuccessExpansionRow[];
  directVsWl: SuccessDirectVsWlRow[];
}

async function safeSelect<T>(view: string): Promise<T[]> {
  const { data, error } = await (supabase as any).from(view).select("*");
  if (error) {
    console.warn(`successIntelligence: ${view}`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

export async function fetchSuccessIntelligence(): Promise<SuccessIntelligenceBundle> {
  const [accounts, summary, riskBuckets, expansion, directVsWl] = await Promise.all([
    safeSelect<SuccessAccountRow>("v_success_account_status"),
    safeSelect<SuccessHealthSummaryRow>("v_success_health_summary"),
    safeSelect<SuccessRiskBucketRow>("v_success_risk_buckets"),
    safeSelect<SuccessExpansionRow>("v_success_expansion_candidates"),
    safeSelect<SuccessDirectVsWlRow>("v_success_direct_vs_wl"),
  ]);
  return { accounts, summary, riskBuckets, expansion, directVsWl };
}

// ── UI helpers ──────────────────────────────────────────────────

export const HEALTH_BAND_RULES: Record<HealthBand, string> = {
  healthy:
    "Live receptionist, recent activity, no downgrade signal, fewer than 3 open tickets.",
  watch:
    "Stalled usage, partial receptionist coverage, 1–2 open tickets, or 14–29 days since last delivery event.",
  intervention:
    "No live receptionist, downgrade-risk signal, 3+ open tickets, or stalled and dormant 30+ days.",
};

export const REASON_LABELS: Record<string, string> = {
  no_live_receptionist: "No live receptionist",
  partial_receptionist: "Partial receptionist coverage",
  downgrade_risk_signal: "Downgrade-risk usage signal",
  stalled_usage: "Stalled usage trend",
  high_open_tickets: "3+ open tickets",
  open_tickets: "1–2 open tickets",
  dormant_30d: "Dormant 30+ days",
  low_activity_14d: "Low activity (14–29 days)",
  expansion_signal: "Expansion-ready signal",
};

export function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

export function bandLabel(band: HealthBand): string {
  return band === "intervention" ? "Intervention" : band === "watch" ? "Watch" : "Healthy";
}

export function bandTone(band: HealthBand): "default" | "secondary" | "destructive" {
  return band === "intervention" ? "destructive" : band === "watch" ? "secondary" : "default";
}

export function lifecycleLabel(s: LifecycleSignal): string {
  switch (s) {
    case "expansion": return "Expansion";
    case "downgrade_risk": return "Downgrade risk";
    case "stalled": return "Stalled";
    case "steady": return "Steady";
    case "insufficient_history": return "New / insufficient history";
  }
}

export function summaryByBand(rows: SuccessHealthSummaryRow[]): Record<HealthBand, SuccessHealthSummaryRow> {
  const empty: SuccessHealthSummaryRow = { health_band: "healthy", accounts: 0, direct_accounts: 0, wl_accounts: 0 };
  const out: Record<HealthBand, SuccessHealthSummaryRow> = {
    healthy: { ...empty, health_band: "healthy" },
    watch: { ...empty, health_band: "watch" },
    intervention: { ...empty, health_band: "intervention" },
  };
  for (const r of rows) out[r.health_band] = r;
  return out;
}
