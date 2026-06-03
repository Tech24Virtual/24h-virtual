/**
 * Phase 36 — Forecast Accuracy & Calibration
 *
 * Reads the forecast_snapshots table + v_forecast_vs_actuals /
 * v_forecast_stage_performance / v_forecast_assumption_performance views.
 * Provides typed helpers and pure suggestion logic. Suggestions are advisory:
 * humans apply changes via the existing assumption / probability editors.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ForecastSnapshot {
  id: string;
  generated_at: string;
  label: string | null;
  notes: string | null;
  horizon_start: string;
  horizon_end: string;
  parameters: any;
  payload: any;
  parameters_hash: string;
  created_by: string | null;
  source: string;
}

export interface ForecastVsActualRow {
  snapshot_id: string;
  snapshot_label: string | null;
  generated_at: string;
  period: string;
  month_start: string;
  month_index: number;
  forecast_new_business: number | null;
  forecast_churn: number | null;
  forecast_expansion: number | null;
  forecast_ending_mrr: number | null;
  actual_new_business: number;
  actual_churn: number;
  actual_net_expansion: number;
  variance_new_business: number;
  variance_churn: number;
  variance_expansion: number;
  pct_variance_new_business: number | null;
  pct_variance_churn: number | null;
  pct_variance_expansion: number | null;
}

export interface StagePerformanceRow {
  deal_type: string;
  avg_configured_probability: number;
  stage_count: number;
  sample_size: number;
  won_count: number;
  lost_count: number;
  realized_win_rate: number | null;
  calibration_delta: number | null;
}

export interface AssumptionPerformanceRow {
  assumption_key: string;
  configured_churn_rate: number;
  configured_expansion_rate: number;
  configured_new_biz_direct: number;
  configured_new_biz_wl: number;
  configured_new_biz_total: number;
  sample_months: number;
  realized_avg_new_biz: number | null;
  realized_avg_churn_amount: number | null;
  realized_avg_expansion_amount: number | null;
  realized_churn_rate: number | null;
  realized_expansion_rate: number | null;
  churn_calibration_delta: number | null;
  expansion_calibration_delta: number | null;
  new_biz_calibration_delta: number | null;
}

export interface CalibrationSuggestion {
  scope: "stage" | "assumption";
  target: string;
  configured: number;
  realized: number;
  suggested: number;
  rationale: string;
  confidence: "low" | "medium" | "high";
}

export async function fetchForecastSnapshots(): Promise<ForecastSnapshot[]> {
  const { data, error } = await (supabase as any)
    .from("forecast_snapshots")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(50);
  if (error) { console.warn("calibration: snapshots", error.message); return []; }
  return (data ?? []) as ForecastSnapshot[];
}

export async function captureForecastSnapshot(label?: string, notes?: string): Promise<string | null> {
  const { data, error } = await (supabase as any).rpc("capture_forecast_snapshot", {
    p_label: label ?? null, p_notes: notes ?? null,
  });
  if (error) { console.warn("calibration: capture", error.message); return null; }
  return data as string;
}

export async function fetchForecastVsActuals(snapshotId?: string): Promise<ForecastVsActualRow[]> {
  let q = (supabase as any).from("v_forecast_vs_actuals").select("*").order("month_start", { ascending: true });
  if (snapshotId) q = q.eq("snapshot_id", snapshotId);
  const { data, error } = await q;
  if (error) { console.warn("calibration: vs_actuals", error.message); return []; }
  return (data ?? []) as ForecastVsActualRow[];
}

export async function fetchStagePerformance(): Promise<StagePerformanceRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_forecast_stage_performance").select("*").order("deal_type", { ascending: true });
  if (error) { console.warn("calibration: stage perf", error.message); return []; }
  return (data ?? []) as StagePerformanceRow[];
}

export async function fetchAssumptionPerformance(): Promise<AssumptionPerformanceRow | null> {
  const { data, error } = await (supabase as any)
    .from("v_forecast_assumption_performance").select("*").maybeSingle();
  if (error) { console.warn("calibration: assumption perf", error.message); return null; }
  return data as AssumptionPerformanceRow | null;
}

/**
 * Generate human-readable suggestions. Conservative bias:
 *   - require sample_size >= 10 for high confidence on stage win-rate
 *   - require sample_months >= 3 for assumptions
 *   - suggested value = configured + 0.5 * delta (move halfway toward realized)
 *   - never auto-apply
 */
export function buildSuggestions(
  stages: StagePerformanceRow[],
  assumptions: AssumptionPerformanceRow | null,
): CalibrationSuggestion[] {
  const out: CalibrationSuggestion[] = [];

  for (const s of stages) {
    if (s.realized_win_rate == null || s.calibration_delta == null) continue;
    if (Math.abs(s.calibration_delta) < 0.05) continue; // ignore <5pp drift
    const conf: CalibrationSuggestion["confidence"] =
      s.sample_size >= 20 ? "high" : s.sample_size >= 10 ? "medium" : "low";
    const suggested = Number((s.avg_configured_probability + 0.5 * s.calibration_delta).toFixed(2));
    out.push({
      scope: "stage",
      target: `${s.deal_type} (avg across ${s.stage_count} stages)`,
      configured: Number(s.avg_configured_probability),
      realized: Number(s.realized_win_rate),
      suggested,
      confidence: conf,
      rationale:
        `Realized win rate over last 180 days = ${(s.realized_win_rate * 100).toFixed(0)}% ` +
        `(n=${s.sample_size}); configured average = ${(s.avg_configured_probability * 100).toFixed(0)}%. ` +
        `Consider moving halfway toward realized.`,
    });
  }

  if (assumptions && assumptions.sample_months >= 3) {
    if (assumptions.churn_calibration_delta != null && Math.abs(assumptions.churn_calibration_delta) >= 0.005) {
      const suggested = Number((assumptions.configured_churn_rate + 0.5 * assumptions.churn_calibration_delta).toFixed(4));
      out.push({
        scope: "assumption",
        target: "baseline_monthly_churn_rate",
        configured: assumptions.configured_churn_rate,
        realized: assumptions.realized_churn_rate ?? 0,
        suggested,
        confidence: assumptions.sample_months >= 6 ? "high" : "medium",
        rationale: `Realized monthly churn rate ≈ ${((assumptions.realized_churn_rate ?? 0) * 100).toFixed(2)}% over ${assumptions.sample_months} months vs configured ${(assumptions.configured_churn_rate * 100).toFixed(2)}%.`,
      });
    }
    if (assumptions.expansion_calibration_delta != null && Math.abs(assumptions.expansion_calibration_delta) >= 0.005) {
      const suggested = Number((assumptions.configured_expansion_rate + 0.5 * assumptions.expansion_calibration_delta).toFixed(4));
      out.push({
        scope: "assumption",
        target: "baseline_monthly_expansion_rate",
        configured: assumptions.configured_expansion_rate,
        realized: assumptions.realized_expansion_rate ?? 0,
        suggested,
        confidence: assumptions.sample_months >= 6 ? "high" : "medium",
        rationale: `Realized net expansion rate ≈ ${((assumptions.realized_expansion_rate ?? 0) * 100).toFixed(2)}% over ${assumptions.sample_months} months vs configured ${(assumptions.configured_expansion_rate * 100).toFixed(2)}%.`,
      });
    }
    if (assumptions.new_biz_calibration_delta != null && Math.abs(assumptions.new_biz_calibration_delta) >= 100) {
      const suggested = Number((assumptions.configured_new_biz_total + 0.5 * assumptions.new_biz_calibration_delta).toFixed(0));
      out.push({
        scope: "assumption",
        target: "new_business_mrr_total (direct + WL)",
        configured: assumptions.configured_new_biz_total,
        realized: assumptions.realized_avg_new_biz ?? 0,
        suggested,
        confidence: assumptions.sample_months >= 6 ? "high" : "medium",
        rationale: `Realized average new MRR ≈ $${Math.round(assumptions.realized_avg_new_biz ?? 0).toLocaleString()} / month over ${assumptions.sample_months} months vs configured $${Math.round(assumptions.configured_new_biz_total).toLocaleString()}.`,
      });
    }
  }

  return out;
}
