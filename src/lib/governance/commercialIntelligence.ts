/**
 * Phase 14 — Commercial Ops / Packaging / Pricing Intelligence
 *
 * Typed read wrappers over the canonical Phase 14 commercial views.
 *
 * Honesty contract:
 *   - Plan performance is computed from billing_summaries (per-period materialized facts).
 *     Unknown plan_name is preserved as 'unknown' — never inferred.
 *   - Revenue mix is a PROXY: direct stream is overage_amount only (we do not store
 *     canonical contract MRR locally); WL stream is wl_invoices.amount where status='paid'.
 *     Do not present this as ARR/LTV/financial truth.
 *   - Lifecycle signals (expansion / downgrade_risk / stalled / steady) are bounded
 *     heuristics over the latest 2 billing periods per client. Clients with <2 periods
 *     surface as 'insufficient_history'.
 *
 * All views are SECURITY INVOKER and rely on the existing admin/billing RLS on
 * billing_summaries, wl_invoices, and internal_fulfillment_intakes — only those
 * roles will see populated rows.
 */
import { supabase } from "@/integrations/supabase/client";

export type AcquisitionType = "direct" | "wl";

export type LifecycleSignal =
  | "expansion"
  | "downgrade_risk"
  | "stalled"
  | "steady"
  | "insufficient_history";

export interface PlanPerformanceRow {
  plan_name: string;
  billing_periods: number;
  distinct_clients: number;
  total_minutes: number;
  included_minutes: number;
  overage_minutes: number;
  overage_revenue_proxy: number;
  pct_periods_with_overage: number | null;
  avg_overage_pct_of_included: number | null;
  latest_period_end: string | null;
}

export interface DirectVsWlCommercialRow {
  acquisition_type: AcquisitionType;
  intakes: number;
  activations: number;
  activation_rate_pct: number | null;
  avg_days_to_activate: number | null;
  distinct_wl_partners: number;
}

export interface RevenueMixRow {
  stream: "direct" | "wl";
  metric_label: "overage_revenue_proxy" | "wl_invoice_paid";
  amount: number;
  records: number;
  latest_at: string | null;
}

export interface LifecycleSignalRow {
  client_id: string;
  plan_name: string;
  latest_period_end: string | null;
  latest_minutes: number | null;
  prior_minutes: number | null;
  signal: LifecycleSignal;
  observed_periods: number;
}

export interface LifecycleSummaryRow {
  signal: LifecycleSignal;
  clients: number;
}

async function safeSelect<T>(view: string): Promise<T[]> {
  const { data, error } = await (supabase as any).from(view).select("*");
  if (error) {
    console.warn(`commercialIntelligence: ${view}`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

export const fetchPlanPerformance = () =>
  safeSelect<PlanPerformanceRow>("v_commercial_plan_performance");

export const fetchDirectVsWlCommercial = () =>
  safeSelect<DirectVsWlCommercialRow>("v_commercial_direct_vs_wl");

export const fetchRevenueMix = () =>
  safeSelect<RevenueMixRow>("v_commercial_revenue_mix");

export const fetchLifecycleSummary = () =>
  safeSelect<LifecycleSummaryRow>("v_commercial_lifecycle_summary");

export const fetchLifecycleSignals = () =>
  safeSelect<LifecycleSignalRow>("v_commercial_lifecycle_signals");

export interface CommercialIntelligenceBundle {
  plans: PlanPerformanceRow[];
  directVsWl: DirectVsWlCommercialRow[];
  revenueMix: RevenueMixRow[];
  lifecycleSummary: LifecycleSummaryRow[];
  computed_at: string;
}

export async function fetchCommercialIntelligence(): Promise<CommercialIntelligenceBundle> {
  const [plans, directVsWl, revenueMix, lifecycleSummary] = await Promise.all([
    fetchPlanPerformance(),
    fetchDirectVsWlCommercial(),
    fetchRevenueMix(),
    fetchLifecycleSummary(),
  ]);
  return {
    plans,
    directVsWl,
    revenueMix,
    lifecycleSummary,
    computed_at: new Date().toISOString(),
  };
}

/** Stable display label for a lifecycle signal. */
export function lifecycleLabel(s: LifecycleSignal): string {
  const map: Record<LifecycleSignal, string> = {
    expansion: "Expansion",
    downgrade_risk: "Downgrade Risk",
    stalled: "Stalled",
    steady: "Steady",
    insufficient_history: "Insufficient History",
  };
  return map[s];
}

/** Stable display label for a revenue stream. */
export function streamLabel(s: RevenueMixRow["stream"]): string {
  return s === "direct" ? "Direct (Overage Proxy)" : "White Label (Paid Invoices)";
}

export function formatUsd(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Sort + cap plans for top-N display. Largest distinct_clients first. */
export function topPlans(rows: PlanPerformanceRow[], n = 8): PlanPerformanceRow[] {
  return [...rows].sort((a, b) => b.distinct_clients - a.distinct_clients).slice(0, n);
}
