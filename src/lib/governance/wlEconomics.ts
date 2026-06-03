/**
 * Phase 20 — WL Economics & Partner Profitability
 *
 * Typed wrappers over the canonical WL economics views. Honesty contract:
 *   - recurring_value_proxy_usd is a 90-day paid-invoice average from
 *     v_subscription_wl_recurring. It is NOT canonical MRR. Always present
 *     as a proxy in UI.
 *   - known_acq_cost_usd is the sum of approved/paid sales_commissions on
 *     leads attributed to the partner (v_growth_attribution_lead.wl_partner_id).
 *     Partner-side acquisition cost (what the partner spends on their own
 *     sales/marketing) is NOT modeled and remains excluded.
 *   - servicing_cost_proxy_usd = latest wl_partner_usage_summary
 *     (total_wholesale_cost + total_campaign_fees). NULL when no usage row
 *     exists; we do not interpolate.
 *   - partial_margin_proxy_usd = recurring_value_proxy_usd - servicing_cost_proxy_usd
 *     when both are present. NULL otherwise. Acquisition cost is reported
 *     separately and is NOT amortized into the monthly margin.
 *   - Health overlays from v_commercial_lifecycle_signals; we never redefine
 *     bands here.
 *   - All views are admin-only via inherited RLS on the underlying tables.
 *     Never expose to partner-facing surfaces.
 */
import { supabase } from "@/integrations/supabase/client";

export type WlEconCoverageFlag =
  | "partial_ok"
  | "recurring_unknown"
  | "servicing_cost_unknown"
  | "no_data";

export interface WlPartnerEconomicsRow {
  partner_id: string;
  partner_slug: string;
  company_name: string;
  tier: string | null;
  partner_status: string | null;
  cohort_month: string | null;
  created_at: string;
  total_clients: number;
  active_clients: number;
  recurring_value_proxy_usd: number | null;
  sum_recurring_90d_usd: number | null;
  paid_invoices_90d: number | null;
  latest_paid_period: string | null;
  known_acq_cost_usd: number;
  commission_events: number;
  servicing_cost_proxy_usd: number | null;
  servicing_period_start: string | null;
  servicing_period_end: string | null;
  partial_margin_proxy_usd: number | null;
  partial_margin_pct: number | null;
  clients_expansion: number;
  clients_contraction: number;
  clients_stable: number;
  clients_with_signal: number;
  coverage_flag: WlEconCoverageFlag;
}

export interface WlPartnerCohortEconomicsRow {
  cohort_month: string | null;
  partners_in_cohort: number;
  active_partners: number;
  total_clients: number;
  active_clients: number;
  avg_active_clients_per_partner: number | null;
  avg_recurring_value_proxy_usd: number | null;
  sum_recurring_value_proxy_usd: number | null;
  sum_known_acq_cost_usd: number | null;
  avg_servicing_cost_proxy_usd: number | null;
  avg_partial_margin_pct: number | null;
  partners_with_full_coverage: number;
}

export interface WlPartnerProfitabilityRankingRow {
  partner_id: string;
  partner_slug: string;
  company_name: string;
  tier: string | null;
  partner_status: string | null;
  active_clients: number;
  recurring_value_proxy_usd: number | null;
  servicing_cost_proxy_usd: number | null;
  partial_margin_proxy_usd: number | null;
  partial_margin_pct: number | null;
  known_acq_cost_usd: number;
  coverage_flag: WlEconCoverageFlag;
  margin_rank: number;
  revenue_rank: number;
}

export interface WlRecurringVsInternalCostRow {
  partners_total: number;
  partners_active: number;
  active_clients_total: number;
  sum_recurring_value_proxy_usd: number | null;
  sum_servicing_cost_proxy_usd: number | null;
  sum_known_acq_cost_usd: number | null;
  sum_partial_margin_proxy_usd: number | null;
  partners_with_full_coverage: number;
  partners_recurring_unknown: number;
  partners_servicing_cost_unknown: number;
  partners_no_data: number;
}

export interface WlEconomicsBundle {
  partners: WlPartnerEconomicsRow[];
  cohorts: WlPartnerCohortEconomicsRow[];
  ranking: WlPartnerProfitabilityRankingRow[];
  totals: WlRecurringVsInternalCostRow | null;
}

async function safeSelect<T>(view: string): Promise<T[]> {
  const { data, error } = await (supabase as any).from(view).select("*");
  if (error) {
    console.warn(`wlEconomics: ${view}`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

export const fetchWlPartnerEconomics = () =>
  safeSelect<WlPartnerEconomicsRow>("v_wl_partner_economics");
export const fetchWlPartnerCohortEconomics = () =>
  safeSelect<WlPartnerCohortEconomicsRow>("v_wl_partner_cohort_economics");
export const fetchWlPartnerProfitabilityRanking = () =>
  safeSelect<WlPartnerProfitabilityRankingRow>("v_wl_partner_profitability_ranking");

export async function fetchWlRecurringVsInternalCost(): Promise<WlRecurringVsInternalCostRow | null> {
  const rows = await safeSelect<WlRecurringVsInternalCostRow>("v_wl_recurring_vs_internal_cost");
  return rows[0] ?? null;
}

export async function fetchWlEconomicsBundle(): Promise<WlEconomicsBundle> {
  const [partners, cohorts, ranking, totals] = await Promise.all([
    fetchWlPartnerEconomics(),
    fetchWlPartnerCohortEconomics(),
    fetchWlPartnerProfitabilityRanking(),
    fetchWlRecurringVsInternalCost(),
  ]);
  return { partners, cohorts, ranking, totals };
}

export function wlCoverageLabel(flag: WlEconCoverageFlag): string {
  switch (flag) {
    case "partial_ok": return "Recurring + servicing known";
    case "recurring_unknown": return "No recurring proxy yet";
    case "servicing_cost_unknown": return "No servicing cost recorded";
    case "no_data": return "No economics data";
  }
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
}
