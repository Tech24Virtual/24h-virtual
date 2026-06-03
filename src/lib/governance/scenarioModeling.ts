/**
 * Phase 21 — Scenario Modeling & Financial Planning
 *
 * Bounded admin-only scenario engine. Treats Phase 17/18 canonical metrics as
 * the baseline and projects 12 months under explicit user-controlled levers.
 *
 * Honesty contract:
 *   - Baseline ending MRR / churn / CAC come ONLY from canonical views
 *     (v_exec_mrr_spine, v_exec_retention_rates, v_unit_econ_direct_vs_wl).
 *   - Levers are applied as monthly multipliers; we do not rewrite the
 *     governed substrate or invent ARR / cash-flow / discount logic.
 *   - Expansion / contraction levers are exposed but warned: until a
 *     discrete movement event log exists, baseline assumes 0.
 *   - Outputs are explicitly labeled scenarios, not forecasts.
 */
import {
  fetchExecutiveFinanceBundle,
  type ExecutiveFinanceBundle,
  type ExecMrrSpineRow,
  type ExecRetentionRateRow,
} from "./executiveFinance";
import {
  fetchUnitEconomicsBundle,
  type UnitEconomicsBundle,
} from "./unitEconomics";

export type ScenarioKey = "base" | "upside" | "downside";

export interface ScenarioLevers {
  /** Multiplier applied to baseline new-MRR per month. 1.0 = unchanged. */
  newMrrGrowthMultiplier: number;
  /** Multiplier applied to baseline monthly revenue churn rate. 1.0 = unchanged. */
  churnRateMultiplier: number;
  /** Pricing uplift applied to ending MRR base each month. 0 = none, 0.05 = +5%. */
  pricingUpliftPct: number;
  /** Multiplier applied to CAC per channel. 1.0 = unchanged, 0.9 = 10% better. */
  cacEfficiencyMultiplier: number;
  /** Direct-vs-WL mix shift: positive = more direct, negative = more WL (-1..1). */
  wlMixShift: number;
  /** Optional monthly expansion MRR override (USD). Defaults to 0. */
  monthlyExpansionMrrUsd: number;
  /** Optional monthly contraction MRR override (USD, positive number). */
  monthlyContractionMrrUsd: number;
}

export const SCENARIO_PRESETS: Record<ScenarioKey, ScenarioLevers> = {
  base: {
    newMrrGrowthMultiplier: 1.0,
    churnRateMultiplier: 1.0,
    pricingUpliftPct: 0,
    cacEfficiencyMultiplier: 1.0,
    wlMixShift: 0,
    monthlyExpansionMrrUsd: 0,
    monthlyContractionMrrUsd: 0,
  },
  upside: {
    newMrrGrowthMultiplier: 1.25,
    churnRateMultiplier: 0.8,
    pricingUpliftPct: 0.05,
    cacEfficiencyMultiplier: 0.9,
    wlMixShift: 0,
    monthlyExpansionMrrUsd: 0,
    monthlyContractionMrrUsd: 0,
  },
  downside: {
    newMrrGrowthMultiplier: 0.75,
    churnRateMultiplier: 1.4,
    pricingUpliftPct: 0,
    cacEfficiencyMultiplier: 1.15,
    wlMixShift: 0,
    monthlyExpansionMrrUsd: 0,
    monthlyContractionMrrUsd: 0,
  },
};

export interface ScenarioBaseline {
  startingMrrUsd: number;
  avgNewMrrUsd: number;
  monthlyChurnRate: number | null;
  blendedCacUsd: number | null;
  blendedAvgMrrUsd: number | null;
  spine: ExecMrrSpineRow[];
  retention: ExecRetentionRateRow[];
}

export interface ScenarioMonth {
  monthIndex: number;
  startingMrr: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  endingMrr: number;
}

export interface ScenarioOutput {
  key: ScenarioKey | "custom";
  label: string;
  levers: ScenarioLevers;
  months: ScenarioMonth[];
  endingMrr12mo: number;
  netNewMrr12mo: number;
  projectedAnnualChurnRate: number | null;
  projectedCacUsd: number | null;
  projectedPaybackMonths: number | null;
  notes: string[];
}

/** Build a 12-month baseline from canonical views without making up data. */
export function buildScenarioBaseline(
  exec: ExecutiveFinanceBundle,
  econ: UnitEconomicsBundle,
): ScenarioBaseline {
  const sortedSpine = [...exec.spine].sort((a, b) =>
    a.month_start < b.month_start ? -1 : 1,
  );
  const last = sortedSpine[sortedSpine.length - 1];
  const startingMrr = Number(last?.ending_mrr_usd ?? 0);

  const last3 = sortedSpine.slice(-3);
  const avgNewMrr =
    last3.length > 0
      ? last3.reduce((s, r) => s + Math.max(0, Number(r.net_new_mrr_usd ?? 0)), 0) /
        last3.length
      : 0;

  const sortedRet = [...exec.retention].sort((a, b) =>
    a.month_start < b.month_start ? -1 : 1,
  );
  const recentRet = sortedRet.slice(-3).filter((r) => r.revenue_churn_rate !== null);
  const monthlyChurnRate =
    recentRet.length > 0
      ? recentRet.reduce((s, r) => s + Number(r.revenue_churn_rate ?? 0), 0) /
        recentRet.length
      : null;

  const dvw = econ.directVsWl;
  const totalKnownCost = dvw.reduce((s, r) => s + Number(r.total_known_cost_usd ?? 0), 0);
  const totalConvWithCost = dvw.reduce(
    (s, r) => s + Number(r.conversions_with_known_cost ?? 0),
    0,
  );
  const blendedCac =
    totalConvWithCost > 0 ? totalKnownCost / totalConvWithCost : null;
  const subsKnown = dvw.reduce((s, r) => s + Number(r.subs_with_known_mrr ?? 0), 0);
  const blendedAvgMrr =
    subsKnown > 0
      ? dvw.reduce(
          (s, r) =>
            s + Number(r.avg_known_mrr_usd ?? 0) * Number(r.subs_with_known_mrr ?? 0),
          0,
        ) / subsKnown
      : null;

  return {
    startingMrrUsd: startingMrr,
    avgNewMrrUsd: avgNewMrr,
    monthlyChurnRate,
    blendedCacUsd: blendedCac,
    blendedAvgMrrUsd: blendedAvgMrr,
    spine: sortedSpine,
    retention: sortedRet,
  };
}

export function projectScenario(
  baseline: ScenarioBaseline,
  levers: ScenarioLevers,
  key: ScenarioKey | "custom" = "custom",
  label?: string,
): ScenarioOutput {
  const months: ScenarioMonth[] = [];
  let mrr = baseline.startingMrrUsd;
  const baseChurn = baseline.monthlyChurnRate ?? 0;
  const churnRate = Math.max(0, Math.min(1, baseChurn * levers.churnRateMultiplier));
  const newMrrBase = baseline.avgNewMrrUsd * levers.newMrrGrowthMultiplier;
  const upliftMonthly = levers.pricingUpliftPct;

  for (let i = 1; i <= 12; i++) {
    const startingMrr = mrr;
    const upliftDelta = i === 1 ? startingMrr * upliftMonthly : 0;
    const newMrr = newMrrBase;
    const expansion = Math.max(0, levers.monthlyExpansionMrrUsd);
    const contraction = Math.max(0, levers.monthlyContractionMrrUsd);
    const churned = (startingMrr + upliftDelta) * churnRate;
    const ending =
      startingMrr + upliftDelta + newMrr + expansion - contraction - churned;
    months.push({
      monthIndex: i,
      startingMrr,
      newMrr,
      expansionMrr: expansion + (i === 1 ? upliftDelta : 0),
      contractionMrr: contraction,
      churnedMrr: churned,
      endingMrr: Math.max(0, ending),
    });
    mrr = Math.max(0, ending);
  }

  const endingMrr12mo = months[months.length - 1].endingMrr;
  const netNewMrr12mo = endingMrr12mo - baseline.startingMrrUsd;
  const projectedAnnualChurnRate =
    baseline.monthlyChurnRate === null ? null : 1 - Math.pow(1 - churnRate, 12);

  const projectedCacUsd =
    baseline.blendedCacUsd === null
      ? null
      : baseline.blendedCacUsd * levers.cacEfficiencyMultiplier;
  const projectedPayback =
    projectedCacUsd === null || baseline.blendedAvgMrrUsd === null || baseline.blendedAvgMrrUsd === 0
      ? null
      : projectedCacUsd / (baseline.blendedAvgMrrUsd * (1 + upliftMonthly));

  const notes: string[] = [];
  if (baseline.monthlyChurnRate === null)
    notes.push("Baseline churn unavailable — projection assumes 0% churn.");
  if (baseline.blendedCacUsd === null)
    notes.push("Baseline CAC unavailable — payback projection skipped.");
  if (levers.monthlyExpansionMrrUsd > 0 || levers.monthlyContractionMrrUsd > 0)
    notes.push(
      "Expansion / contraction levers are operator overrides; canonical movements remain 0 until a movement event log exists.",
    );
  if (levers.wlMixShift !== 0)
    notes.push("WL mix shift is informational only; not applied to MRR projection in v1.");

  return {
    key,
    label: label ?? key,
    levers,
    months,
    endingMrr12mo,
    netNewMrr12mo,
    projectedAnnualChurnRate,
    projectedCacUsd,
    projectedPaybackMonths: projectedPayback,
    notes,
  };
}

export interface ScenarioBundle {
  baseline: ScenarioBaseline;
  scenarios: ScenarioOutput[];
}

export async function fetchScenarioBundle(): Promise<ScenarioBundle> {
  const [exec, econ] = await Promise.all([
    fetchExecutiveFinanceBundle(),
    fetchUnitEconomicsBundle(),
  ]);
  const baseline = buildScenarioBaseline(exec, econ);
  const scenarios: ScenarioOutput[] = (Object.keys(SCENARIO_PRESETS) as ScenarioKey[]).map(
    (k) => projectScenario(baseline, SCENARIO_PRESETS[k], k, k),
  );
  return { baseline, scenarios };
}

export function formatUsd(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}
export function formatPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toFixed(1)}%`;
}
