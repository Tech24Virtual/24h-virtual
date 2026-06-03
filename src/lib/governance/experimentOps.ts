/**
 * Phase 25 — Experimentation Operations / Decision Engine
 *
 * Admin-only governance helpers that turn Phase 23 from an analytics
 * surface into a decision engine. Pure composition layer over the
 * canonical v_experiment_decisions view (which itself composes Phase 17
 * subscription truth via v_pricing_experiment_results).
 *
 * Honesty contract:
 *   - Sample sufficiency is a first-class state.
 *   - Statistical labels only fire when a real two-proportion z-test
 *     can be computed against the control variant.
 *   - Recommendations are operator hints, not auto-actions.
 */
import { supabase } from "@/integrations/supabase/client";

export type ConfidenceLabel =
  | "insufficient_sample"
  | "directional_only"
  | "statistically_supported_winner"
  | "statistically_supported_loser"
  | "early_stop_winner"
  | "early_stop_futility"
  | "max_exposure_reached"
  | "killed"
  | "baseline";

export type Recommendation =
  | "keep_running"
  | "promote_winner"
  | "archive_loser"
  | "archive_inconclusive"
  | "no_action"
  | "baseline";

export interface ExperimentDecisionRow {
  experiment_id: string;
  experiment_name: string;
  experiment_status: string;
  allocation_mode: "fixed" | "bandit" | "sequential";
  bandit_algorithm: "thompson" | "ucb1";
  kill_switch_active: boolean;
  max_exposure_per_variant: number | null;
  variant_key: string | null;
  assignments: number;
  leads_assigned: number;
  leads_converted: number;
  active_subs: number;
  active_known_mrr_usd: number;
  avg_active_known_mrr_usd: number | null;
  min_sample_per_variant: number;
  conversion_rate: number | null;
  control_conversion_rate: number | null;
  z_score: number | null;
  sequential_z_critical: number | null;
  confidence_label: ConfidenceLabel;
  recommendation: Recommendation;
}

export async function fetchExperimentDecisions(): Promise<ExperimentDecisionRow[]> {
  const { data, error } = await (supabase as any).from("v_experiment_decisions").select("*");
  if (error) { console.warn("experimentOps: decisions", error.message); return []; }
  return (data ?? []) as ExperimentDecisionRow[];
}

export interface ExperimentLifecycleUpdate {
  primary_metric?: string;
  secondary_metrics?: string[];
  target_audience?: string;
  decision_rule?: string;
  scheduled_for?: string | null;
  min_sample_per_variant?: number;
  owner_user_id?: string | null;
}

export async function updateExperimentLifecycle(id: string, patch: ExperimentLifecycleUpdate): Promise<boolean> {
  const { error } = await (supabase as any).from("pricing_experiments").update(patch).eq("id", id);
  if (error) { console.warn("experimentOps: lifecycle", error.message); return false; }
  return true;
}

export async function pauseExperiment(id: string): Promise<boolean> {
  const { error } = await (supabase as any).from("pricing_experiments")
    .update({ status: "draft", paused_at: new Date().toISOString() }).eq("id", id);
  return !error;
}

export const CONFIDENCE_TONE: Record<ConfidenceLabel, "default" | "secondary" | "outline" | "destructive"> = {
  baseline: "outline",
  insufficient_sample: "outline",
  directional_only: "secondary",
  statistically_supported_winner: "default",
  statistically_supported_loser: "destructive",
  early_stop_winner: "default",
  early_stop_futility: "destructive",
  max_exposure_reached: "secondary",
  killed: "destructive",
};

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  keep_running: "Keep running",
  promote_winner: "Promote winner",
  archive_loser: "Archive — losing variant",
  archive_inconclusive: "Archive — inconclusive",
  no_action: "No action",
  baseline: "Baseline",
};

export function formatPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toFixed(1)}%`;
}
