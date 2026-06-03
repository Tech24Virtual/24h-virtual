/**
 * Phase 28 — Bandit & Sequential Allocation
 *
 * Small, explainable allocation layer that sits *on top of* Phase 23/25/27.
 * The hard truths:
 *
 *   • This file does not bypass price guardrails or WL constraints — those
 *     are still enforced in `selectOffer` (Phase 27).
 *   • Bandits are opt-in per experiment via `allocation_mode = 'bandit'`.
 *     Anything else falls back to fixed-split A/B.
 *   • Sequential testing only changes *decision boundaries* in
 *     `v_experiment_decisions`. It never changes who sees what; we still
 *     allocate variants according to the experiment's split.
 *   • If a kill switch is on, max-exposure is reached, or the bandit data
 *     is missing, we fall back to the experiment's fixed split (or to
 *     baseline) — never throw, never block checkout.
 *
 * Algorithm: Thompson Sampling over a Beta-Bernoulli reward (conversion).
 * Each variant has posterior Beta(1+conv, 1+failures) from the canonical
 * v_experiment_allocation view. We draw one sample per variant and pick
 * the argmax. Weights for the panel are estimated via N draws so operators
 * can see "what % of the time this variant wins right now".
 */
import { supabase } from "@/integrations/supabase/client";

export type AllocationMode = "fixed" | "bandit" | "sequential";
export type BanditAlgorithm = "thompson" | "ucb1";

export interface AllocationVariantStat {
  variant_key: string;
  leads_assigned: number;
  leads_converted: number;
  posterior_alpha: number;
  posterior_beta: number;
  posterior_mean: number | null;
  conversion_rate: number | null;
  max_exposure_reached: boolean;
}

export interface AllocationExperiment {
  experiment_id: string;
  experiment_name: string;
  experiment_status: string;
  allocation_mode: AllocationMode;
  bandit_algorithm: BanditAlgorithm;
  kill_switch_active: boolean;
  max_exposure_per_variant: number | null;
  min_sample_per_variant: number;
  variants: AllocationVariantStat[];
}

// ─────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────

export async function fetchExperimentAllocation(): Promise<AllocationExperiment[]> {
  const { data, error } = await (supabase as any)
    .from("v_experiment_allocation")
    .select("*");
  if (error) {
    console.warn("banditAllocation: fetch", error.message);
    return [];
  }
  const rows = (data ?? []) as any[];
  const grouped = new Map<string, AllocationExperiment>();
  for (const r of rows) {
    let exp = grouped.get(r.experiment_id);
    if (!exp) {
      exp = {
        experiment_id: r.experiment_id,
        experiment_name: r.experiment_name,
        experiment_status: r.experiment_status,
        allocation_mode: r.allocation_mode,
        bandit_algorithm: r.bandit_algorithm,
        kill_switch_active: r.kill_switch_active,
        max_exposure_per_variant: r.max_exposure_per_variant,
        min_sample_per_variant: r.min_sample_per_variant,
        variants: [],
      };
      grouped.set(r.experiment_id, exp);
    }
    exp.variants.push({
      variant_key: r.variant_key,
      leads_assigned: r.leads_assigned ?? 0,
      leads_converted: r.leads_converted ?? 0,
      posterior_alpha: Number(r.posterior_alpha ?? 1),
      posterior_beta: Number(r.posterior_beta ?? 1),
      posterior_mean: r.posterior_mean === null ? null : Number(r.posterior_mean),
      conversion_rate: r.conversion_rate === null ? null : Number(r.conversion_rate),
      max_exposure_reached: !!r.max_exposure_reached,
    });
  }
  return Array.from(grouped.values());
}

// ─────────────────────────────────────────────────────────────
// Math: Beta sampling via gamma sums.  Marsaglia & Tsang gamma.
// ─────────────────────────────────────────────────────────────

function sampleGamma(shape: number): number {
  if (shape < 1) {
    // Boost — Gamma(shape) = Gamma(shape+1) * U^(1/shape)
    return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      // standard normal via Box-Muller
      const u1 = Math.random() || 1e-9;
      const u2 = Math.random();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

// ─────────────────────────────────────────────────────────────
// Thompson Sampling — pick best variant
// ─────────────────────────────────────────────────────────────

export interface BanditChoice {
  variant_key: string;
  reason:
    | "thompson_sampled"
    | "ucb1"
    | "fallback_kill_switch"
    | "fallback_max_exposure"
    | "fallback_no_eligible";
  weights?: Record<string, number>;
}

function eligibleVariants(exp: AllocationExperiment): AllocationVariantStat[] {
  return exp.variants.filter((v) => !v.max_exposure_reached);
}

export function chooseBanditVariant(exp: AllocationExperiment): BanditChoice {
  if (exp.kill_switch_active) {
    const control = exp.variants.find((v) => v.variant_key === "control");
    return { variant_key: control?.variant_key ?? exp.variants[0]?.variant_key ?? "control", reason: "fallback_kill_switch" };
  }
  const elig = eligibleVariants(exp);
  if (elig.length === 0) {
    const control = exp.variants.find((v) => v.variant_key === "control");
    return { variant_key: control?.variant_key ?? "control", reason: "fallback_max_exposure" };
  }

  if (exp.bandit_algorithm === "ucb1") {
    const totalN = elig.reduce((s, v) => s + v.leads_assigned, 0) || 1;
    let best = elig[0]; let bestScore = -Infinity;
    for (const v of elig) {
      const n = Math.max(v.leads_assigned, 1);
      const mean = v.conversion_rate ?? 0;
      const ucb = mean + Math.sqrt((2 * Math.log(totalN)) / n);
      if (ucb > bestScore) { bestScore = ucb; best = v; }
    }
    return { variant_key: best.variant_key, reason: "ucb1" };
  }

  // Thompson sampling (default)
  let best = elig[0]; let bestSample = -1;
  for (const v of elig) {
    const s = sampleBeta(v.posterior_alpha, v.posterior_beta);
    if (s > bestSample) { bestSample = s; best = v; }
  }
  return { variant_key: best.variant_key, reason: "thompson_sampled" };
}

/**
 * Estimate "win probability" weights via N draws. Used for operator UI only.
 * Returns map variant_key → fraction of draws where this variant won.
 */
export function estimateBanditWeights(
  exp: AllocationExperiment,
  draws = 1000,
): Record<string, number> {
  const elig = eligibleVariants(exp);
  if (elig.length === 0) return {};
  const wins: Record<string, number> = Object.fromEntries(elig.map((v) => [v.variant_key, 0]));
  for (let i = 0; i < draws; i++) {
    let best = elig[0]; let bestSample = -1;
    for (const v of elig) {
      const s = sampleBeta(v.posterior_alpha, v.posterior_beta);
      if (s > bestSample) { bestSample = s; best = v; }
    }
    wins[best.variant_key]++;
  }
  for (const k of Object.keys(wins)) wins[k] = wins[k] / draws;
  return wins;
}

// ─────────────────────────────────────────────────────────────
// Sequential testing — Pocock-style boundary lookup
// ─────────────────────────────────────────────────────────────

export const POCOCK_Z_BY_LOOKS: Record<number, number> = {
  1: 1.96, 2: 2.24, 3: 2.39, 4: 2.49, 5: 2.57,
  6: 2.64, 7: 2.69, 8: 2.74, 9: 2.78, 10: 2.81,
};

export function sequentialZCritical(looks: number): number {
  if (looks <= 0) return 1.96;
  return POCOCK_Z_BY_LOOKS[Math.min(looks, 10)] ?? 2.81;
}

// ─────────────────────────────────────────────────────────────
// Governance helpers
// ─────────────────────────────────────────────────────────────

export interface ExperimentMethodPatch {
  allocation_mode?: AllocationMode;
  bandit_algorithm?: BanditAlgorithm;
  max_exposure_per_variant?: number | null;
  kill_switch_active?: boolean;
  sequential_looks?: number;
  min_effect_size?: number | null;
  loss_threshold_pct?: number | null;
}

export async function updateExperimentMethod(
  experimentId: string,
  patch: ExperimentMethodPatch,
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("pricing_experiments")
    .update(patch)
    .eq("id", experimentId);
  if (error) { console.warn("banditAllocation: updateMethod", error.message); return false; }
  return true;
}

export async function setKillSwitch(experimentId: string, on: boolean): Promise<boolean> {
  return updateExperimentMethod(experimentId, { kill_switch_active: on });
}

export async function logAllocationDecision(input: {
  experiment_id: string;
  variant_key: string;
  algorithm: string;
  weight?: number;
  sample_size_at_decision?: number;
  reward_count_at_decision?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const { error } = await (supabase as any).from("experiment_allocation_log").insert(input);
  if (error) { console.warn("banditAllocation: log", error.message); return false; }
  return true;
}

export const ALLOCATION_MODE_LABEL: Record<AllocationMode, string> = {
  fixed: "Fixed split (A/B)",
  bandit: "Bandit allocation",
  sequential: "Sequential A/B",
};
