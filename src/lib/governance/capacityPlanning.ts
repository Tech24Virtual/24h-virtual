/**
 * Phase 37 — GTM & Capacity Planning from Forecasts
 *
 * Thin readers + admin mutators around the capacity_* and gtm_targets tables
 * and v_capacity_* / v_gtm_target_variance views. All numbers here are
 * directional: they translate canonical forecast output (v_forecast_assembled)
 * into rough headcount demand using configurable ratios. They are NOT a
 * substitute for HR planning or detailed staffing models.
 */
import { supabase } from "@/integrations/supabase/client";

export type CapacityScope = "direct" | "wl" | "both";
export type CapacityFunction = "csm" | "support" | "implementation" | "wl_ops";

export interface CapacityAssumptions {
  scope: CapacityScope;
  csm_accounts_per_head: number;
  support_tickets_per_agent_per_month: number;
  implementation_projects_per_specialist: number;
  wl_rollout_per_ops_head: number;
  arpu_assumption: number;
  tickets_per_account_per_month: number;
  new_projects_per_new_account: number;
  active: boolean;
  notes: string | null;
  updated_at: string;
}

export interface CapacitySupplyRow {
  id: string;
  scope: CapacityScope;
  function: CapacityFunction;
  current_headcount: number;
  planned_headcount: number | null;
  effective_date: string;
  notes: string | null;
}

export interface CapacityDemandRow {
  period: string;
  period_label: string;
  month_index: number;
  scope: CapacityScope;
  projected_ending_mrr: number;
  new_business_mrr_direct: number;
  new_business_mrr_wl: number;
  forecasted_active_accounts: number;
  forecasted_new_accounts: number;
  needed_csm_heads: number;
  needed_support_heads: number;
  needed_implementation_heads: number;
  needed_wl_ops_heads: number;
  arpu_assumption: number;
}

export interface CapacityGapRow {
  period: string;
  month_index: number;
  scope: CapacityScope;
  function: CapacityFunction;
  demand: number;
  current_supply: number;
  planned_headcount: number | null;
  gap_now: number;
  gap_planned: number | null;
  over_under_pct: number | null;
}

export interface GtmTargetRow {
  id: string;
  period: string;
  scope: CapacityScope;
  target_new_business_mrr: number | null;
  target_nrr: number | null;
  target_renewal_rate: number | null;
  notes: string | null;
}

export interface GtmTargetVarianceRow {
  period: string;
  scope: CapacityScope;
  target_new_business_mrr: number | null;
  target_nrr: number | null;
  target_renewal_rate: number | null;
  forecast_new_business_mrr: number;
  new_business_variance_pct: number | null;
  projected_ending_mrr: number | null;
}

// ── Assumptions ────────────────────────────────────────────────
export async function fetchCapacityAssumptions(): Promise<CapacityAssumptions | null> {
  const { data, error } = await (supabase as any)
    .from("capacity_assumptions").select("*").eq("scope", "both").maybeSingle();
  if (error) { console.warn("capacity: assumptions", error.message); return null; }
  return data as CapacityAssumptions | null;
}

export async function updateCapacityAssumptions(
  patch: Partial<Omit<CapacityAssumptions, "scope" | "updated_at">>
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("capacity_assumptions").update(patch).eq("scope", "both");
  if (error) { console.warn("capacity: update assumptions", error.message); return false; }
  return true;
}

// ── Supply ─────────────────────────────────────────────────────
export async function fetchCapacitySupply(): Promise<CapacitySupplyRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_capacity_supply_current").select("*");
  if (error) { console.warn("capacity: supply current", error.message); return []; }
  return (data ?? []) as CapacitySupplyRow[];
}

export async function upsertCapacitySupply(row: {
  scope: CapacityScope;
  function: CapacityFunction;
  current_headcount: number;
  planned_headcount?: number | null;
  effective_date?: string;
  notes?: string | null;
}): Promise<boolean> {
  const payload = {
    scope: row.scope,
    function: row.function,
    current_headcount: row.current_headcount,
    planned_headcount: row.planned_headcount ?? null,
    effective_date: row.effective_date ?? new Date().toISOString().slice(0, 10),
    notes: row.notes ?? null,
  };
  const { error } = await (supabase as any)
    .from("capacity_supply")
    .upsert(payload, { onConflict: "scope,function,effective_date" });
  if (error) { console.warn("capacity: upsert supply", error.message); return false; }
  return true;
}

// ── Demand & Gaps ──────────────────────────────────────────────
export async function fetchCapacityDemand(): Promise<CapacityDemandRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_capacity_demand").select("*").order("month_index", { ascending: true });
  if (error) { console.warn("capacity: demand", error.message); return []; }
  return (data ?? []) as CapacityDemandRow[];
}

export async function fetchCapacityGaps(): Promise<CapacityGapRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_capacity_gaps").select("*").order("month_index", { ascending: true });
  if (error) { console.warn("capacity: gaps", error.message); return []; }
  return (data ?? []) as CapacityGapRow[];
}

// ── GTM Targets ────────────────────────────────────────────────
export async function fetchGtmTargets(): Promise<GtmTargetRow[]> {
  const { data, error } = await (supabase as any)
    .from("gtm_targets").select("*").order("period", { ascending: true });
  if (error) { console.warn("gtm: targets", error.message); return []; }
  return (data ?? []) as GtmTargetRow[];
}

export async function upsertGtmTarget(row: {
  period: string;
  scope: CapacityScope;
  target_new_business_mrr?: number | null;
  target_nrr?: number | null;
  target_renewal_rate?: number | null;
  notes?: string | null;
}): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("gtm_targets")
    .upsert({
      period: row.period,
      scope: row.scope,
      target_new_business_mrr: row.target_new_business_mrr ?? null,
      target_nrr: row.target_nrr ?? null,
      target_renewal_rate: row.target_renewal_rate ?? null,
      notes: row.notes ?? null,
    }, { onConflict: "period,scope" });
  if (error) { console.warn("gtm: upsert target", error.message); return false; }
  return true;
}

export async function deleteGtmTarget(id: string): Promise<boolean> {
  const { error } = await (supabase as any).from("gtm_targets").delete().eq("id", id);
  if (error) { console.warn("gtm: delete", error.message); return false; }
  return true;
}

export async function fetchGtmVariance(): Promise<GtmTargetVarianceRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_gtm_target_variance").select("*").order("period", { ascending: true });
  if (error) { console.warn("gtm: variance", error.message); return []; }
  return (data ?? []) as GtmTargetVarianceRow[];
}

export const CAPACITY_FUNCTIONS: { value: CapacityFunction; label: string }[] = [
  { value: "csm", label: "Customer Success" },
  { value: "support", label: "Support" },
  { value: "implementation", label: "Implementation" },
  { value: "wl_ops", label: "WL Ops" },
];

export const CAPACITY_SCOPES: { value: CapacityScope; label: string }[] = [
  { value: "both", label: "Both (Direct + WL)" },
  { value: "direct", label: "Direct" },
  { value: "wl", label: "White Label" },
];
