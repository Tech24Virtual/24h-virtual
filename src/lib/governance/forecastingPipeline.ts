/**
 * Phase 35 — Revenue Forecasting from Canonical Pipelines
 *
 * Thin readers + admin mutators around the forecast_* tables and v_forecast_*
 * views. Intentionally explainable: every number maps back to a canonical
 * input (current MRR, renewal_workflows, renewal_expansion_deals) plus a
 * tunable assumption row. No parallel MRR/churn math is introduced.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ForecastAssumptions {
  assumption_key: string;
  baseline_monthly_churn_rate: number;
  baseline_monthly_expansion_rate: number;
  new_business_mrr_direct: number;
  new_business_mrr_wl: number;
  horizon_months: number;
  notes: string | null;
  updated_at: string;
}

export interface StageProbability {
  id: string;
  deal_type: "renewal" | "expansion" | "downsell" | "save";
  stage: string;
  probability: number;
  notes: string | null;
}

export interface AssembledForecastRow {
  period: string;
  month_start: string;
  month_index: number;
  starting_mrr: number;
  projected_base_mrr: number;
  baseline_churn_amount: number;
  baseline_expansion_amount: number;
  new_business_mrr: number;
  new_business_mrr_direct: number;
  new_business_mrr_wl: number;
  projected_ending_mrr: number;
  renewals_due: number | null;
  weighted_expected_renewed_count: number | null;
  weighted_expected_lost_count: number | null;
  expansion_deals_open: number | null;
  weighted_expansion_count: number | null;
  downsell_deals_open: number | null;
  weighted_downsell_count: number | null;
  save_deals_open: number | null;
  weighted_save_count: number | null;
}

export async function fetchForecastAssumptions(): Promise<ForecastAssumptions | null> {
  const { data, error } = await (supabase as any)
    .from("forecast_assumptions").select("*").eq("assumption_key", "default").maybeSingle();
  if (error) { console.warn("forecast: assumptions", error.message); return null; }
  return data as ForecastAssumptions | null;
}

export async function updateForecastAssumptions(
  patch: Partial<Omit<ForecastAssumptions, "assumption_key" | "updated_at">>
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("forecast_assumptions").update(patch).eq("assumption_key", "default");
  if (error) { console.warn("forecast: update assumptions", error.message); return false; }
  return true;
}

export async function fetchStageProbabilities(): Promise<StageProbability[]> {
  const { data, error } = await (supabase as any)
    .from("forecast_stage_probabilities").select("*")
    .order("deal_type", { ascending: true })
    .order("stage", { ascending: true });
  if (error) { console.warn("forecast: probs", error.message); return []; }
  return (data ?? []) as StageProbability[];
}

export async function updateStageProbability(id: string, probability: number): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("forecast_stage_probabilities").update({ probability }).eq("id", id);
  if (error) { console.warn("forecast: update prob", error.message); return false; }
  return true;
}

export async function fetchAssembledForecast(horizonMonths?: number): Promise<AssembledForecastRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_forecast_assembled").select("*").order("month_index", { ascending: true });
  if (error) { console.warn("forecast: assembled", error.message); return []; }
  const rows = (data ?? []) as AssembledForecastRow[];
  return horizonMonths ? rows.filter((r) => r.month_index <= horizonMonths) : rows;
}

/** Renewal coverage ratio = weighted expected renewed count / renewals due. */
export function renewalCoverageRatio(row: AssembledForecastRow): number | null {
  if (!row.renewals_due || row.renewals_due === 0) return null;
  return Number(row.weighted_expected_renewed_count ?? 0) / row.renewals_due;
}
