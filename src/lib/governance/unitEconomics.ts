/**
 * Phase 19 — CAC / LTV / Payback Modeling
 *
 * Typed wrappers over the canonical unit-economics views. Honesty contract:
 *   - CAC inputs are drawn ONLY from approved/paid sales_commissions. Channels
 *     with no recorded commissions return cac_usd = null and coverage_flag =
 *     'cost_unknown'. We do not fabricate ad spend.
 *   - LTV = avg_known_mrr_usd * avg_lifetime_months, where avg_lifetime_months
 *     comes from observed churn events only. Requires >= 3 churn events in
 *     scope; otherwise NULL ('lifetime_insufficient').
 *   - Payback months = CAC / avg_known_mrr_usd. Null when either is null.
 *   - WL CAC excludes partner-side acquisition cost.
 *   - Outputs are operator guidance, not accounting.
 */
import { supabase } from "@/integrations/supabase/client";

export type UnitEconCoverageFlag =
  | "ok"
  | "cost_unknown"
  | "mrr_unknown"
  | "lifetime_insufficient";

export interface UnitEconChannelRow {
  channel: string;
  conversions_total: number;
  conversions_with_known_cost: number;
  total_known_cost_usd: number;
  cac_usd: number | null;
  avg_known_mrr_usd: number | null;
  subs_with_known_mrr: number;
  avg_lifetime_months: number | null;
  churn_events: number;
  ltv_usd: number | null;
  payback_months: number | null;
  coverage_flag: UnitEconCoverageFlag;
}

export interface UnitEconDirectVsWlRow {
  acquisition_type: "direct" | "wl";
  conversions_total: number;
  conversions_with_known_cost: number;
  total_known_cost_usd: number;
  cac_usd: number | null;
  avg_known_mrr_usd: number | null;
  subs_with_known_mrr: number;
  avg_lifetime_months: number | null;
  churn_events: number;
  ltv_usd: number | null;
  payback_months: number | null;
  coverage_flag: UnitEconCoverageFlag;
  note: string;
}

export interface UnitEconCohortRow {
  cohort_month: string;
  conversions_total: number;
  conversions_with_known_cost: number;
  total_known_cost_usd: number;
  cac_usd: number | null;
  avg_known_mrr_usd: number | null;
  payback_months: number | null;
}

export interface UnitEconomicsBundle {
  channels: UnitEconChannelRow[];
  directVsWl: UnitEconDirectVsWlRow[];
  cohorts: UnitEconCohortRow[];
}

async function safeSelect<T>(view: string): Promise<T[]> {
  const { data, error } = await (supabase as any).from(view).select("*");
  if (error) {
    console.warn(`unitEconomics: ${view}`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

export const fetchUnitEconChannels = () =>
  safeSelect<UnitEconChannelRow>("v_unit_econ_channel");
export const fetchUnitEconDirectVsWl = () =>
  safeSelect<UnitEconDirectVsWlRow>("v_unit_econ_direct_vs_wl");
export const fetchUnitEconCohorts = () =>
  safeSelect<UnitEconCohortRow>("v_unit_econ_cohort");

export async function fetchUnitEconomicsBundle(): Promise<UnitEconomicsBundle> {
  const [channels, directVsWl, cohorts] = await Promise.all([
    fetchUnitEconChannels(),
    fetchUnitEconDirectVsWl(),
    fetchUnitEconCohorts(),
  ]);
  return { channels, directVsWl, cohorts };
}

export function ltvCacRatio(row: { ltv_usd: number | null; cac_usd: number | null }): number | null {
  if (row.ltv_usd === null || row.cac_usd === null || row.cac_usd === 0) return null;
  return row.ltv_usd / row.cac_usd;
}

export function coverageLabel(flag: UnitEconCoverageFlag): string {
  switch (flag) {
    case "ok": return "Sufficient coverage";
    case "cost_unknown": return "No recorded acquisition cost";
    case "mrr_unknown": return "No known MRR for subscribers";
    case "lifetime_insufficient": return "Too few churn events for LTV";
  }
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(value);
}

export function formatMonths(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)} mo`;
}

export function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)}×`;
}
