/**
 * Phase 38 — Finance & RevOps Snapshotting / Period Close
 *
 * Thin readers + admin mutator around revops_period_snapshots and the
 * v_revops_snapshot_* views. Snapshots are immutable RevOps period records
 * derived from canonical governed views at capture time. They are NOT a
 * GAAP financial close and do not redefine actuals.
 */
import { supabase } from "@/integrations/supabase/client";

export interface RevopsPeriodSnapshot {
  id: string;
  label: string;
  period_start_date: string;
  period_end_date: string;
  captured_at: string;
  captured_by: string | null;
  linked_forecast_snapshot_id: string | null;
  linked_board_pack_ref: string | null;
  notes: string | null;
  extras: any;
  starting_mrr_usd: number | null;
  ending_mrr_usd: number | null;
  net_new_mrr_usd: number | null;
  new_mrr_usd: number | null;
  churned_mrr_usd: number | null;
  expansion_mrr_usd: number | null;
  contraction_mrr_usd: number | null;
  new_subs: number | null;
  churned_subs: number | null;
  ending_active_subs: number | null;
  nrr_pct: number | null;
  grr_pct: number | null;
  direct_mrr_usd: number | null;
  wl_recurring_proxy_usd: number | null;
}

export interface SnapshotPipelineRow {
  snapshot_id: string;
  snapshot_label: string;
  period_start_date: string;
  bucket: string;
  deal_type: string | null;
  stage: string | null;
  count: number;
  weighted_count: number | null;
}

export interface SnapshotCapacityRow {
  snapshot_id: string;
  snapshot_label: string;
  period_start_date: string;
  scope: string;
  function: string;
  demand: number | null;
  current_supply: number | null;
  gap_now: number | null;
  over_under_pct: number | null;
  gtm_target_new_mrr: number | null;
  gtm_forecast_new_mrr: number | null;
  gtm_variance_pct: number | null;
}

export interface SnapshotForecastVsActualRow {
  snapshot_id: string;
  snapshot_label: string;
  period_start_date: string;
  linked_forecast_snapshot_id: string | null;
  period: string | null;
  month_start: string | null;
  forecast_new_business: number | null;
  forecast_churn: number | null;
  forecast_expansion: number | null;
  forecast_ending_mrr: number | null;
  actual_new_business: number | null;
  actual_churn: number | null;
  actual_net_expansion: number | null;
  variance_new_business: number | null;
  variance_churn: number | null;
  variance_expansion: number | null;
  pct_variance_new_business: number | null;
  pct_variance_churn: number | null;
  pct_variance_expansion: number | null;
}

export async function listRevopsSnapshots(limit = 50): Promise<RevopsPeriodSnapshot[]> {
  const { data, error } = await (supabase as any)
    .from("v_revops_period_snapshots")
    .select("*")
    .order("period_start_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as RevopsPeriodSnapshot[];
}

export async function fetchSnapshotPipeline(snapshotId: string): Promise<SnapshotPipelineRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_revops_snapshot_pipeline_summary")
    .select("*")
    .eq("snapshot_id", snapshotId);
  if (error) throw error;
  return (data ?? []) as SnapshotPipelineRow[];
}

export async function fetchSnapshotCapacity(snapshotId: string): Promise<SnapshotCapacityRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_revops_snapshot_capacity_summary")
    .select("*")
    .eq("snapshot_id", snapshotId);
  if (error) throw error;
  return (data ?? []) as SnapshotCapacityRow[];
}

export async function fetchSnapshotForecastVsActuals(
  snapshotId: string,
): Promise<SnapshotForecastVsActualRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_revops_snapshot_forecast_vs_actuals")
    .select("*")
    .eq("snapshot_id", snapshotId);
  if (error) throw error;
  return (data ?? []) as SnapshotForecastVsActualRow[];
}

export interface CaptureSnapshotInput {
  period_start: string; // YYYY-MM-DD
  period_end: string;   // YYYY-MM-DD
  label?: string | null;
  notes?: string | null;
  forecast_snapshot_id?: string | null;
  board_pack_ref?: string | null;
  force?: boolean;
}

export async function captureRevopsSnapshot(input: CaptureSnapshotInput): Promise<string> {
  const { data, error } = await (supabase as any).rpc("capture_revops_snapshot", {
    p_period_start: input.period_start,
    p_period_end: input.period_end,
    p_label: input.label ?? null,
    p_notes: input.notes ?? null,
    p_forecast_snapshot_id: input.forecast_snapshot_id ?? null,
    p_board_pack_ref: input.board_pack_ref ?? null,
    p_force: input.force ?? false,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteRevopsSnapshot(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("revops_period_snapshots")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export function formatUsd(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(v));
}

export function formatPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return "—";
  return `${Number(v).toFixed(digits)}%`;
}

export function defaultPeriodForToday(): { start: string; end: string; label: string } {
  // Default to the most recent fully-completed month.
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  return { start: iso(start), end: iso(end), label };
}
