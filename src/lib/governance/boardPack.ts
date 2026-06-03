/**
 * Phase 22 — Board Pack / Investor-Ready Export
 *
 * Pure composition over canonical Phase 17/18/19/20 governed views and
 * Phase 21 scenario derivations. No re-aggregation of metrics; no
 * narrative synthesis. Each section maps directly to its source view(s).
 */
import {
  fetchExecutiveFinanceBundle,
  type ExecutiveFinanceBundle,
  latest as latestSpineRow,
} from "./executiveFinance";
import {
  fetchSubscriptionTruthBundle,
  type SubscriptionTruthBundle,
} from "./subscriptionTruth";
import {
  fetchUnitEconomicsBundle,
  type UnitEconomicsBundle,
} from "./unitEconomics";
import {
  fetchWlEconomicsBundle,
  type WlEconomicsBundle,
} from "./wlEconomics";
import {
  fetchScenarioBundle,
  type ScenarioBundle,
} from "./scenarioModeling";

export interface BoardPackSection {
  key: string;
  title: string;
  source: string;
  caveats: string[];
  data: any;
}

export interface BoardPack {
  generated_at: string;
  period_label: string;
  sections: BoardPackSection[];
  global_caveats: string[];
}

export async function fetchBoardPack(): Promise<BoardPack> {
  const [exec, subs, econ, wl, scenarios] = await Promise.all([
    fetchExecutiveFinanceBundle(),
    fetchSubscriptionTruthBundle(),
    fetchUnitEconomicsBundle(),
    fetchWlEconomicsBundle(),
    fetchScenarioBundle(),
  ]);
  return assembleBoardPack({ exec, subs, econ, wl, scenarios });
}

export function assembleBoardPack(input: {
  exec: ExecutiveFinanceBundle;
  subs: SubscriptionTruthBundle;
  econ: UnitEconomicsBundle;
  wl: WlEconomicsBundle;
  scenarios: ScenarioBundle;
}): BoardPack {
  const { exec, subs, econ, wl, scenarios } = input;
  const latestSpine = latestSpineRow(exec.spine);
  const period_label = latestSpine?.month_start
    ? new Date(latestSpine.month_start).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "current period";

  const sections: BoardPackSection[] = [
    {
      key: "mrr_spine",
      title: "MRR Spine (24 months)",
      source: "v_exec_mrr_spine",
      caveats: ["Excludes subscriptions with unknown MRR", "Custom-plan minimum or fixed amount only"],
      data: exec.spine,
    },
    {
      key: "mrr_bridge_latest",
      title: "MRR Bridge (latest month)",
      source: "v_exec_mrr_bridge",
      caveats: ["Expansion / contraction = 0 until movement event log exists"],
      data: exec.bridge.slice(-1)[0] ?? null,
    },
    {
      key: "retention",
      title: "Retention & Churn (12 months)",
      source: "v_exec_retention_rates",
      caveats: ["GRR = NRR today (no expansion log)", "NULL when starting denominator = 0"],
      data: exec.retention.slice(-12),
    },
    {
      key: "direct_vs_wl",
      title: "Direct vs White Label",
      source: "v_exec_direct_vs_wl_summary",
      caveats: ["WL recurring is a labeled 90d paid-invoice average proxy, not MRR"],
      data: exec.directVsWl,
    },
    {
      key: "plan_contribution",
      title: "Plan / Tier Contribution",
      source: "v_exec_plan_contribution",
      caveats: ["Shares computed over known active MRR only"],
      data: exec.planContribution,
    },
    {
      key: "unit_economics",
      title: "Unit Economics — CAC / LTV / Payback",
      source: "v_unit_econ_channel + v_unit_econ_direct_vs_wl",
      caveats: [
        "CAC inputs limited to approved/paid sales commissions",
        "WL CAC excludes partner-side spend",
        "LTV requires ≥3 churn events per segment",
      ],
      data: { channels: econ.channels, directVsWl: econ.directVsWl },
    },
    {
      key: "wl_partner_top",
      title: "WL Partner Profitability — Top 10",
      source: "v_wl_partner_profitability_ranking",
      caveats: ["Partial margin = recurring proxy − servicing proxy", "NULL when inputs missing"],
      data: wl.ranking.slice(0, 10),
    },
    {
      key: "scenarios",
      title: "Scenario Summary (12-month projection)",
      source: "Phase 21 scenarioModeling.ts",
      caveats: ["Operator-derived, not a forecast", "Levers explicit and labeled"],
      data: scenarios.scenarios.map((s) => ({
        key: s.key,
        endingMrr12mo: s.endingMrr12mo,
        netNewMrr12mo: s.netNewMrr12mo,
        projectedAnnualChurnRate: s.projectedAnnualChurnRate,
        projectedCacUsd: s.projectedCacUsd,
        projectedPaybackMonths: s.projectedPaybackMonths,
        levers: s.levers,
      })),
    },
    {
      key: "subscription_movements",
      title: "Subscription Movements (12 months)",
      source: "v_subscription_movements",
      caveats: ["Expansion / contraction stay 0 until movement log exists"],
      data: subs.movements,
    },
  ];

  const global_caveats = [
    "All metrics derive from canonical governed views; no UI-side re-aggregation.",
    "Unknown values are NULL, never zeroed.",
    "WL recurring is a labeled proxy; partner-side acquisition cost is excluded.",
    "Scenario outputs are operator guidance, not a financial forecast.",
  ];

  return {
    generated_at: new Date().toISOString(),
    period_label,
    sections,
    global_caveats,
  };
}

export function formatUsd(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}
