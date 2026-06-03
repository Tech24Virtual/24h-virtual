/**
 * Phase 18 — Executive Finance / Board Metrics Layer
 *
 * Thin, typed wrappers over admin/billing-only views layered on top of the
 * Phase 17 canonical subscription/MRR/churn substrate. No new MRR or churn
 * definitions; no fabricated CAC/LTV/ARR. Unknowns stay unknown; proxies
 * stay labeled proxies.
 *
 * Honesty contract:
 *   - MRR uses only canonical custom-plan values (Phase 17 inheritance).
 *   - Subscriptions with unknown MRR are excluded from MRR sums (not zeroed).
 *   - Expansion / contraction = 0 until a discrete movement event log exists,
 *     so GRR == NRR today and is labeled accordingly.
 *   - WL recurring is a labeled 90-day paid-invoice average proxy.
 *   - Retention rates are NULL when the starting denominator is 0.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ExecMrrSpineRow {
  month_start: string;
  ending_mrr_usd: number;
  ending_active_subs: number;
  starting_mrr_usd: number | null;
  starting_active_subs: number | null;
  net_new_mrr_usd: number;
}

export interface ExecMrrBridgeRow {
  month_start: string;
  starting_mrr_usd: number;
  new_mrr_usd: number;
  expansion_mrr_usd: number;
  contraction_mrr_usd: number;
  churned_mrr_usd: number;
  ending_mrr_usd: number;
  net_new_mrr_usd: number;
  basis: string;
}

export interface ExecRetentionRateRow {
  month_start: string;
  starting_mrr_usd: number | null;
  starting_active_subs: number | null;
  churned_mrr_usd: number;
  churned_subs: number;
  revenue_churn_rate: number | null;
  logo_churn_rate: number | null;
  gross_revenue_retention: number | null;
  net_revenue_retention: number | null;
  basis: string;
}

export interface ExecDirectVsWlSummaryRow {
  stream: "direct" | "wl";
  active_subs: number;
  canceled_subs: number;
  known_mrr_usd: number;
  wl_recurring_proxy_usd: number | null;
  new_subs_30d: number;
  churned_subs_30d: number;
  churned_mrr_30d: number;
  basis: string;
}

export interface ExecPlanContributionRow {
  plan_name: string | null;
  stream: "direct" | "wl";
  active_count: number;
  canceled_count: number;
  active_known_mrr_usd: number;
  share_of_known_mrr: number | null;
  avg_active_known_mrr_usd: number | null;
}

export interface ExecutiveFinanceBundle {
  spine: ExecMrrSpineRow[];
  bridge: ExecMrrBridgeRow[];
  retention: ExecRetentionRateRow[];
  directVsWl: ExecDirectVsWlSummaryRow[];
  planContribution: ExecPlanContributionRow[];
}

async function safeSelect<T>(view: string): Promise<T[]> {
  const { data, error } = await (supabase as any).from(view).select("*");
  if (error) {
    console.warn(`executiveFinance: ${view}`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

export const fetchMrrSpine = () => safeSelect<ExecMrrSpineRow>("v_exec_mrr_spine");
export const fetchMrrBridge = () => safeSelect<ExecMrrBridgeRow>("v_exec_mrr_bridge");
export const fetchRetentionRates = () => safeSelect<ExecRetentionRateRow>("v_exec_retention_rates");
export const fetchExecDirectVsWl = () => safeSelect<ExecDirectVsWlSummaryRow>("v_exec_direct_vs_wl_summary");
export const fetchPlanContribution = () => safeSelect<ExecPlanContributionRow>("v_exec_plan_contribution");

export async function fetchExecutiveFinanceBundle(): Promise<ExecutiveFinanceBundle> {
  const [spine, bridge, retention, directVsWl, planContribution] = await Promise.all([
    fetchMrrSpine(),
    fetchMrrBridge(),
    fetchRetentionRates(),
    fetchExecDirectVsWl(),
    fetchPlanContribution(),
  ]);
  return { spine, bridge, retention, directVsWl, planContribution };
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function latest<T extends { month_start: string }>(rows: T[]): T | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => (a.month_start < b.month_start ? 1 : -1))[0];
}
