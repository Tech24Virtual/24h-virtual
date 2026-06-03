/**
 * Phase 11 — Export / External BI & Data Products
 *
 * Governed wrappers around snapshot RPCs + canonical reporting/forecasting
 * views. All exports leave traces in audit_log + dashboard_events via the
 * underlying SECURITY DEFINER RPCs. Tenant-safety is enforced server-side:
 *   - generate_executive_snapshot: admin only
 *   - generate_wl_partner_snapshot: admin OR owning partner
 *
 * Client-side helpers convert payloads into CSV blobs for download. We do
 * NOT build a parallel BI warehouse here; BI tools should consume the
 * v_bi_* views directly via Supabase, with their own RLS context.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Catalog ─────────────────────────────────────────────────────

export type ExportAudience = "admin" | "wl_partner";
export type ExportFormat = "csv" | "json";

export interface ExportProduct {
  key: string;
  label: string;
  audience: ExportAudience;
  description: string;
  source: string;
  formats: ExportFormat[];
  shareable: boolean;
}

export const EXPORT_CATALOG: ExportProduct[] = [
  {
    key: "executive_snapshot",
    label: "Executive KPI Snapshot",
    audience: "admin",
    description:
      "Cross-domain board-ready snapshot: KPIs, revenue/delivery/voice/WL pipelines, and open recommendations. Built from v_intelligence_executive_summary + canonical pipelines.",
    source: "generate_executive_snapshot()",
    formats: ["json", "csv"],
    shareable: false,
  },
  {
    key: "revenue_pipeline",
    label: "Revenue Pipeline (Now)",
    audience: "admin",
    description: "Current pipeline by stage with overdue follow-ups and unassigned counts. Source: v_revenue_pipeline.",
    source: "v_revenue_pipeline",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "delivery_pipeline",
    label: "Delivery / Activation Pipeline",
    audience: "admin",
    description: "Open and recently-activated intakes by stage. Source: v_delivery_pipeline.",
    source: "v_delivery_pipeline",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "voice_readiness",
    label: "AI Voice Readiness",
    audience: "admin",
    description: "Per-flow receptionist readiness with blocking reasons. Source: v_call_flow_receptionist_readiness.",
    source: "v_call_flow_receptionist_readiness",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "wl_partner_readiness",
    label: "WL Partner Readiness (All)",
    audience: "admin",
    description: "All partner readiness states + client/portal counts. Source: v_wl_partner_readiness.",
    source: "v_wl_partner_readiness",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "growth_channel_summary",
    label: "Growth — Channel Performance (365d)",
    audience: "admin",
    description:
      "Phase 13. Per-channel leads, conversions, conversion rate, avg days to convert, direct/WL split. Source: v_bi_growth_channel_summary.",
    source: "v_bi_growth_channel_summary",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "growth_cohort_lead_month",
    label: "Growth — Lead-Month Cohorts (12mo)",
    audience: "admin",
    description:
      "Phase 13. Lead-creation-month cohorts: leads, conversions, activations, conversion %, activation %. Source: v_bi_growth_cohort_summary.",
    source: "v_bi_growth_cohort_summary",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "growth_direct_vs_wl",
    label: "Growth — Direct vs White Label (365d)",
    audience: "admin",
    description:
      "Phase 13. Honest binary acquisition comparison. Source: v_bi_growth_direct_vs_wl.",
    source: "v_bi_growth_direct_vs_wl",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "commercial_plan_performance",
    label: "Commercial — Plan / Package Performance",
    audience: "admin",
    description:
      "Phase 14. Per-package billing periods, distinct clients, overage minutes & revenue proxy, capacity strain. Source: v_bi_commercial_plan_performance.",
    source: "v_bi_commercial_plan_performance",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "commercial_direct_vs_wl",
    label: "Commercial — Direct vs WL Throughput",
    audience: "admin",
    description:
      "Phase 14. Intake-to-activation throughput and speed by acquisition type. Source: v_bi_commercial_direct_vs_wl.",
    source: "v_bi_commercial_direct_vs_wl",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "commercial_revenue_mix",
    label: "Commercial — Revenue Mix (Proxy, 365d)",
    audience: "admin",
    description:
      "Phase 14 PROXY. Direct = overage_amount only; WL = paid invoices. Not a financial statement. Source: v_bi_commercial_revenue_mix.",
    source: "v_bi_commercial_revenue_mix",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "commercial_lifecycle_signals",
    label: "Commercial — Lifecycle Signals",
    audience: "admin",
    description:
      "Phase 14. Per-client expansion / downgrade-risk / stalled / steady heuristic over latest 2 billing periods. Source: v_bi_commercial_lifecycle_signals.",
    source: "v_bi_commercial_lifecycle_signals",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "success_account_status",
    label: "Success — Account Health Status",
    audience: "admin",
    description:
      "Phase 16. Per live-account success snapshot with rule-based health_band and explicit reasons. Source: v_bi_success_account_status.",
    source: "v_bi_success_account_status",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "success_health_summary",
    label: "Success — Health Band Summary",
    audience: "admin",
    description:
      "Phase 16. Counts of healthy / watch / intervention accounts split by acquisition type. Source: v_bi_success_health_summary.",
    source: "v_bi_success_health_summary",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "success_risk_buckets",
    label: "Success — Risk Buckets",
    audience: "admin",
    description:
      "Phase 16. Counts per explicit risk reason (no_live_receptionist, downgrade_risk, dormant_30d, etc.). Source: v_bi_success_risk_buckets.",
    source: "v_bi_success_risk_buckets",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "success_expansion_candidates",
    label: "Success — Expansion-Ready Accounts",
    audience: "admin",
    description:
      "Phase 16. Accounts flagged expansion-ready by Phase 14 lifecycle signal or sustained healthy live operation. Source: v_bi_success_expansion_candidates.",
    source: "v_bi_success_expansion_candidates",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "success_direct_vs_wl",
    label: "Success — Direct vs WL Portfolio Health",
    audience: "admin",
    description:
      "Phase 16. Direct vs WL post-go-live health comparison (band counts, expansion, no-live-receptionist, avg days live). Source: v_bi_success_direct_vs_wl.",
    source: "v_bi_success_direct_vs_wl",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "subscription_snapshot",
    label: "Subscriptions — Canonical Snapshot",
    audience: "admin",
    description:
      "Phase 17. One row per lead with a subscription. Normalized state and MRR derived only from documented sources (custom_plans). Source: v_bi_subscription_snapshot.",
    source: "v_bi_subscription_snapshot",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "subscription_mrr_summary",
    label: "Subscriptions — MRR Summary",
    audience: "admin",
    description:
      "Phase 17. Recurring totals by acquisition stream and subscription state. Source: v_bi_subscription_mrr_summary.",
    source: "v_bi_subscription_mrr_summary",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "subscription_plan_summary",
    label: "Subscriptions — Plan / Tier Recurring",
    audience: "admin",
    description:
      "Phase 17. Active / canceled / past_due counts and known active MRR per plan and stream. Source: v_bi_subscription_plan_summary.",
    source: "v_bi_subscription_plan_summary",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "subscription_direct_vs_wl",
    label: "Subscriptions — Direct vs WL Recurring",
    audience: "admin",
    description:
      "Phase 17. Direct known MRR vs WL recurring proxy (90d paid invoice avg). Source: v_bi_subscription_direct_vs_wl.",
    source: "v_bi_subscription_direct_vs_wl",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "subscription_churn_events",
    label: "Subscriptions — Churn Events",
    audience: "admin",
    description:
      "Phase 17. Explicit canceled subscriptions with lost MRR and lifetime in days. Source: v_bi_subscription_churn_events.",
    source: "v_bi_subscription_churn_events",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "subscription_movements",
    label: "Subscriptions — Movements (12mo)",
    audience: "admin",
    description:
      "Phase 17. Monthly new and churn series (expansion/contraction reported as 0 until a discrete movement log exists). Source: v_bi_subscription_movements.",
    source: "v_bi_subscription_movements",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "exec_mrr_spine",
    label: "Executive — MRR Spine (24mo)",
    audience: "admin",
    description:
      "Phase 18. 24-month ending MRR, ending active subs, starting MRR, and net new MRR derived from canonical subscription lifetimes. Source: v_bi_exec_mrr_spine.",
    source: "v_bi_exec_mrr_spine",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "exec_mrr_bridge",
    label: "Executive — MRR Bridge (per month)",
    audience: "admin",
    description:
      "Phase 18. Starting + new + expansion - contraction - churn = ending. Expansion/contraction stay zero until a movement event log exists. Source: v_bi_exec_mrr_bridge.",
    source: "v_bi_exec_mrr_bridge",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "exec_retention_rates",
    label: "Executive — Retention & Churn Rates",
    audience: "admin",
    description:
      "Phase 18. Per-month logo churn, revenue churn, GRR and NRR. NULL when starting denominator is 0 (no fabricated rates). Source: v_bi_exec_retention_rates.",
    source: "v_bi_exec_retention_rates",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "exec_direct_vs_wl_summary",
    label: "Executive — Direct vs WL Summary",
    audience: "admin",
    description:
      "Phase 18. Active subs, known MRR, 30d new/churn, and labeled WL recurring proxy per stream. Source: v_bi_exec_direct_vs_wl_summary.",
    source: "v_bi_exec_direct_vs_wl_summary",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "exec_plan_contribution",
    label: "Executive — Plan / Tier Contribution",
    audience: "admin",
    description:
      "Phase 18. Per-plan share of active known MRR with active/canceled counts and avg MRR per sub. Source: v_bi_exec_plan_contribution.",
    source: "v_bi_exec_plan_contribution",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "unit_econ_channel",
    label: "Unit Economics — By Channel",
    audience: "admin",
    description:
      "Phase 19. CAC, LTV, LTV:CAC, payback months per growth channel. CAC uses approved/paid sales commissions only; coverage_flag indicates trustworthiness. Source: v_bi_unit_econ_channel.",
    source: "v_bi_unit_econ_channel",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "unit_econ_direct_vs_wl",
    label: "Unit Economics — Direct vs WL",
    audience: "admin",
    description:
      "Phase 19. Direct vs White Label CAC/LTV/payback comparison. WL excludes partner-side acquisition cost. Source: v_bi_unit_econ_direct_vs_wl.",
    source: "v_bi_unit_econ_direct_vs_wl",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "unit_econ_cohort",
    label: "Unit Economics — Cohort CAC + Payback",
    audience: "admin",
    description:
      "Phase 19. Per lead-cohort-month CAC and payback months (LTV omitted at cohort grain). Source: v_bi_unit_econ_cohort.",
    source: "v_bi_unit_econ_cohort",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "wl_partner_economics",
    label: "WL — Partner Economics",
    audience: "admin",
    description:
      "Phase 20. Per-partner recurring proxy (90d paid-invoice avg), latest servicing cost (wholesale + campaign fees), known acquisition cost (approved/paid commissions), partial monthly margin proxy, and lifecycle health overlays. Partner-side CAC excluded. Source: v_bi_wl_partner_economics.",
    source: "v_bi_wl_partner_economics",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "wl_partner_cohort_economics",
    label: "WL — Partner Cohort Economics",
    audience: "admin",
    description:
      "Phase 20. Partner economics aggregated by partner onboard month. Recurring/servicing remain labeled proxies. Source: v_bi_wl_partner_cohort_economics.",
    source: "v_bi_wl_partner_cohort_economics",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "wl_partner_profitability_ranking",
    label: "WL — Partner Profitability Ranking",
    audience: "admin",
    description:
      "Phase 20. Partners ranked by partial margin proxy and recurring revenue. Partners with NULL margin rank last; do not interpret as zero. Source: v_bi_wl_partner_profitability_ranking.",
    source: "v_bi_wl_partner_profitability_ranking",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "wl_recurring_vs_internal_cost",
    label: "WL — Recurring vs Internal Cost (totals)",
    audience: "admin",
    description:
      "Phase 20. Single-row aggregate of WL recurring proxy, servicing cost, known acquisition cost, partial margin, and coverage breakdown. Source: v_bi_wl_recurring_vs_internal_cost.",
    source: "v_bi_wl_recurring_vs_internal_cost",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "automation_health",
    label: "Automation Recommendations",
    audience: "admin",
    description: "Open recommendations by domain and severity. Source: v_open_recommendations.",
    source: "v_open_recommendations",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "pricing_experiment_results",
    label: "Pricing — Experiment Results",
    audience: "admin",
    description:
      "Phase 23. Per experiment + variant: assignments, leads, conversions, active subs, known MRR. Composes Phase 17 subscription truth. Source: v_bi_pricing_experiment_results.",
    source: "v_bi_pricing_experiment_results",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "board_pack",
    label: "Board Pack — Composed Bundle",
    audience: "admin",
    description:
      "Phase 22 + Phase 26. Composed JSON bundle (MRR spine, bridge, retention, direct vs WL, plan contribution, unit economics, top WL partner profitability, scenarios, movements) plus a board-ready PDF rendered from the same bundle. Built from canonical Phase 17–21 views; no re-aggregation. Source: governance/boardPack.ts + governance/boardPackPdf.ts.",
    source: "boardPack.fetchBoardPack() + boardPackPdf.renderBoardPackPdf()",
    formats: ["json", "csv"],
    shareable: false,
  },
  {
    key: "experiment_decisions",
    label: "Experiment Decisions (Phase 25)",
    audience: "admin",
    description:
      "Phase 25. Per experiment + variant: sample sufficiency, conversion rate vs control, two-proportion z-score, confidence label, and operator recommendation. Composes Phase 23 results. Source: v_bi_experiment_decisions.",
    source: "v_bi_experiment_decisions",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "saved_scenarios",
    label: "Saved Scenarios (Phase 25)",
    audience: "admin",
    description:
      "Phase 25. Persisted scenario planning artifacts: label, scenario_key, archived flag, owner, timestamps. Full baseline/levers/output payloads stay in saved_scenarios. Source: v_bi_saved_scenarios.",
    source: "v_bi_saved_scenarios",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "offer_exposures",
    label: "Offer Exposures (Phase 27)",
    audience: "admin",
    description:
      "Phase 27. Per-event log of offer shown/accepted/completed/rejected with offer key, surface, audience, experiment+variant, plan_key and stripe_price_id. Reconciles what users saw with what they paid. Source: v_bi_offer_exposures.",
    source: "v_bi_offer_exposures",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "offer_exposure_summary",
    label: "Offer Exposure Summary (Phase 27)",
    audience: "admin",
    description:
      "Phase 27. Per-offer rollup: shown/accepted/completed/rejected counts, last exposure timestamp, plan/variant alignment. Source: v_offer_exposure_summary.",
    source: "v_offer_exposure_summary",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "experiment_allocation",
    label: "Experiment Allocation (Phase 28)",
    audience: "admin",
    description:
      "Phase 28. Per-variant cumulative reward (assignments, conversions, posterior Beta(α,β)) plus the experiment's allocation_mode, bandit_algorithm, kill_switch_active, max_exposure_per_variant, and max_exposure_reached flag. Powers the Experiment Ops bandit/sequential surface; Thompson win-probability weights are computed in the client. Source: v_bi_experiment_allocation.",
    source: "v_bi_experiment_allocation",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "partner_success_summary",
    label: "Partner Success Summary (Phase 29)",
    audience: "admin",
    description:
      "Phase 29. Per-partner success state (strategic_growth | nurture | stabilize | at_risk) plus explainable risk/expansion flags and portfolio health mix. Source: v_bi_partner_success_summary.",
    source: "v_bi_partner_success_summary",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "partner_success_opportunities",
    label: "Partner Success Opportunities (Phase 29)",
    audience: "admin",
    description:
      "Phase 29. Rule-based candidate plays per partner (save / educate / upsell / onboard / reactivate) with explicit reason codes. Source: v_bi_partner_success_opportunities.",
    source: "v_bi_partner_success_opportunities",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "partner_success_plays",
    label: "Partner Success Plays (Phase 29)",
    audience: "admin",
    description:
      "Phase 29. Active and historical partner success plays (type, status, follow-up date, notes). Lightweight tracking, not a full CRM. Source: v_bi_partner_success_plays.",
    source: "v_bi_partner_success_plays",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "direct_success_summary",
    label: "Direct Customer Success Summary (Phase 30)",
    audience: "admin",
    description:
      "Phase 30. Per direct-account success state (expansion_ready | nurture | stabilize | at_risk) plus explainable flags from health, lifecycle, subscription, and ticket signals. acquisition_type=direct only. Source: v_bi_direct_success_summary.",
    source: "v_bi_direct_success_summary",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "direct_success_opportunities",
    label: "Direct Customer Success Opportunities (Phase 30)",
    audience: "admin",
    description:
      "Phase 30. Rule-based candidate plays per direct account (save / educate / upsell / onboard / reactivate) with explicit reason codes. Source: v_bi_direct_success_opportunities.",
    source: "v_bi_direct_success_opportunities",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "direct_success_plays",
    label: "Direct Customer Success Plays (Phase 30)",
    audience: "admin",
    description:
      "Phase 30. Active and historical direct-account success plays (type, status, follow-up date, notes). Lightweight tracking, not a full CRM. Source: v_bi_direct_success_plays.",
    source: "v_bi_direct_success_plays",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "playbook_templates",
    label: "Playbook Templates (Phase 31)",
    audience: "admin",
    description:
      "Phase 31. Curated success play templates: scope (partner|direct), play_type, trigger_type, default follow-up cadence, auto_create flag, active flag. Source: v_bi_playbook_templates.",
    source: "v_bi_playbook_templates",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "play_suggestions",
    label: "Play Suggestions Log (Phase 31)",
    audience: "admin",
    description:
      "Phase 31. Per-suggestion log of triggered candidate plays: scope, target, template, opportunity type, reason, status (pending/accepted/dismissed/auto_created), and resulting play id. Time-to-action analyzable. Source: v_bi_play_suggestions.",
    source: "v_bi_play_suggestions",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "communication_templates",
    label: "Communication Templates (Phase 32)",
    audience: "admin",
    description:
      "Phase 32. Success/renewal communication templates: scope, channel, play_type, sequence, suppression hours, auto_send/approval flags. Source: v_bi_communication_templates.",
    source: "v_bi_communication_templates",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "communication_actions",
    label: "Communication Actions Log (Phase 32)",
    audience: "admin",
    description:
      "Phase 32. Suggested/approved/queued/sent/dismissed/suppressed communication actions, with template and play linkage. Source: v_bi_communication_actions.",
    source: "v_bi_communication_actions",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "renewal_workflows",
    label: "Renewal Workflows (Phase 32)",
    audience: "admin",
    description:
      "Phase 32. Renewal lifecycle: scope, target, renewal date, stage (approaching → renewed/downgraded/churned). Source: v_bi_renewal_workflows.",
    source: "v_bi_renewal_workflows",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "renewal_expansion_deals",
    label: "Renewal & Expansion Deals (Phase 33)",
    audience: "admin",
    description:
      "Phase 33. Internal commercial deal pipeline for renewals/expansions/downsells/saves: scope, type, proposed plan/term, stage, status, outcome, implemented_at. Descriptive only — billing truth remains authoritative. Source: v_bi_renewal_expansion_deals.",
    source: "v_bi_renewal_expansion_deals",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "approval_policies",
    label: "Approval Policies (Phase 34)",
    audience: "admin",
    description:
      "Phase 34. Configurable discount/term thresholds and required approver roles per scope/deal type. Source: approval_policies.",
    source: "approval_policies",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "approval_requests",
    label: "Approval Requests & Decisions (Phase 34)",
    audience: "admin",
    description:
      "Phase 34. Per-deal approval queue with policy match reason, decision, decided-by, hours-to-decision. Source: v_bi_approval_requests.",
    source: "v_bi_approval_requests",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "approval_cycle_time",
    label: "Approval Cycle Time (Phase 34)",
    audience: "admin",
    description:
      "Phase 34. Per-request cycle analytics: hours requested→decided, SLA breach flag, decision outcome, approver role/name, policy/tier, deal scope/type, snapshot discount/term flags. Source: v_bi_approval_cycle_time.",
    source: "v_bi_approval_cycle_time",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "approval_funnel",
    label: "Approval Funnel by Policy / Tier / Role (Phase 34)",
    audience: "admin",
    description:
      "Phase 34. Funnel + cycle-time stats grouped by policy, tier, required role, deal scope, deal type: total/pending/approved/rejected/cancelled, approval rate, SLA breach rate, avg/median/p90 hours-to-decision. Source: v_bi_approval_funnel.",
    source: "v_bi_approval_funnel",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "wl_partner_self_economics",
    label: "Your Portfolio Performance",
    audience: "wl_partner",
    description:
      "Phase 24. Partner-safe view of your own portfolio: recurring revenue proxy, paid invoices, lifecycle health overlay. Cross-partner data is never included. Source: v_wl_partner_self_economics.",
    source: "v_wl_partner_self_economics",
    formats: ["csv", "json"],
    shareable: true,
  },
  {
    key: "wl_partner_snapshot",
    label: "Partner Reporting Snapshot",
    audience: "wl_partner",
    description:
      "Tenant-safe snapshot of your readiness + your client directory aggregates. Cross-tenant data is never included.",
    source: "generate_wl_partner_snapshot(partner_id)",
    formats: ["csv", "json"],
    shareable: true,
  },
  {
    key: "forecast_assembled",
    label: "Revenue Forecast — Assembled (Phase 35)",
    audience: "admin",
    description:
      "Phase 35. Per-month assembled recurring revenue forecast: starting MRR, projected base MRR, baseline churn/expansion, new business (direct + WL), projected ending MRR, plus weighted renewal/expansion deal counts. Source: v_bi_forecast_assembled.",
    source: "v_bi_forecast_assembled",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "forecast_renewals",
    label: "Revenue Forecast — Renewals (Phase 35)",
    audience: "admin",
    description:
      "Phase 35. Per-month renewals due, weighted expected renewed/lost counts derived from linked renewal deal stage probabilities. Source: v_bi_forecast_renewals.",
    source: "v_bi_forecast_renewals",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "forecast_expansion_deals",
    label: "Revenue Forecast — Expansion Pipeline (Phase 35)",
    audience: "admin",
    description:
      "Phase 35. Per-month open expansion / downsell / save deals weighted by stage probability and bucketed by expected close date. Source: v_bi_forecast_expansion_deals.",
    source: "v_bi_forecast_expansion_deals",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "forecast_existing_base",
    label: "Revenue Forecast — Base MRR (Phase 35)",
    audience: "admin",
    description:
      "Phase 35. Carries current active MRR forward over the horizon using baseline churn and expansion assumptions. Source: v_bi_forecast_existing_base.",
    source: "v_bi_forecast_existing_base",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "forecast_stage_probabilities",
    label: "Revenue Forecast — Stage Probabilities (Phase 35)",
    audience: "admin",
    description:
      "Phase 35. Per (deal_type, stage) win probabilities used to weight renewal/expansion deals. Source: v_bi_forecast_stage_probabilities.",
    source: "v_bi_forecast_stage_probabilities",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "forecast_assumptions",
    label: "Revenue Forecast — Assumptions (Phase 35)",
    audience: "admin",
    description:
      "Phase 35. Singleton row of forecast assumptions: baseline churn / expansion rates, new business MRR (direct + WL), horizon months. Source: v_bi_forecast_assumptions.",
    source: "v_bi_forecast_assumptions",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "forecast_snapshots",
    label: "Forecast Snapshots",
    audience: "admin",
    description:
      "Phase 36. Point-in-time forecast snapshots (assumptions + probabilities + assembled trajectory) for backtesting. Source: v_bi_forecast_snapshots.",
    source: "v_bi_forecast_snapshots",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "forecast_vs_actuals",
    label: "Forecast vs Actuals",
    audience: "admin",
    description:
      "Phase 36. Per (snapshot, completed month) variance for new business / churn / expansion against canonical v_subscription_movements. Source: v_bi_forecast_vs_actuals.",
    source: "v_bi_forecast_vs_actuals",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "forecast_stage_performance",
    label: "Forecast Stage Performance",
    audience: "admin",
    description:
      "Phase 36. Configured average stage probability vs realized win rate per deal_type (last 180d). Source: v_bi_forecast_stage_performance.",
    source: "v_bi_forecast_stage_performance",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "forecast_assumption_performance",
    label: "Forecast Assumption Performance",
    audience: "admin",
    description:
      "Phase 36. Configured churn / expansion / new-biz vs realized averages from canonical movements (last 6 closed months). Source: v_bi_forecast_assumption_performance.",
    source: "v_bi_forecast_assumption_performance",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "capacity_assumptions",
    label: "Capacity Assumptions",
    audience: "admin",
    description: "Phase 37. Configurable ratios used to translate forecasted MRR into capacity demand: ARPU, accounts per CSM, tickets per agent, implementation projects per specialist, WL rollouts per ops head. Source: v_bi_capacity_assumptions.",
    source: "v_bi_capacity_assumptions",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "capacity_supply",
    label: "Capacity Supply",
    audience: "admin",
    description: "Phase 37. Admin-maintained current and planned headcount per scope × function. Source: v_bi_capacity_supply.",
    source: "v_bi_capacity_supply",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "capacity_demand",
    label: "Capacity Demand (Forecast-Derived)",
    audience: "admin",
    description: "Phase 37. Per-month directional demand for CSM, support, implementation, and WL ops heads, derived from v_forecast_assembled and capacity_assumptions. Source: v_bi_capacity_demand.",
    source: "v_bi_capacity_demand",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "capacity_gaps",
    label: "Capacity Gaps",
    audience: "admin",
    description: "Phase 37. Per-month demand vs current supply per function, with absolute gap and over/under percentage. Source: v_bi_capacity_gaps.",
    source: "v_bi_capacity_gaps",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "gtm_targets",
    label: "GTM Targets",
    audience: "admin",
    description: "Phase 37. Admin-set per-period × scope GTM targets: target new business MRR, target NRR, target renewal rate. Source: v_bi_gtm_targets.",
    source: "v_bi_gtm_targets",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "gtm_target_variance",
    label: "GTM Target vs Forecast Variance",
    audience: "admin",
    description: "Phase 37. Per-period × scope variance of forecasted new business MRR against GTM targets. Source: v_bi_gtm_target_variance.",
    source: "v_bi_gtm_target_variance",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "revops_period_snapshots",
    label: "RevOps Period Snapshots",
    audience: "admin",
    description: "Phase 38. Per-period RevOps snapshot header expanded with captured MRR/NRR/GRR/movement metrics, captured_at, captured_by, linked forecast snapshot id, and linked board-pack reference. Source: v_bi_revops_period_snapshots.",
    source: "v_bi_revops_period_snapshots",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "revops_snapshot_pipeline",
    label: "RevOps Snapshot Pipeline Summary",
    audience: "admin",
    description: "Phase 38. Per-snapshot pipeline buckets (open deals by deal_type × stage, renewal workflows by stage) with counts captured at snapshot time. Source: v_bi_revops_snapshot_pipeline_summary.",
    source: "v_bi_revops_snapshot_pipeline_summary",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "revops_snapshot_capacity",
    label: "RevOps Snapshot Capacity & GTM",
    audience: "admin",
    description: "Phase 38. Per-snapshot capacity gaps (scope × function: demand, supply, gap, over/under %) and GTM target vs forecast variance for the period. Source: v_bi_revops_snapshot_capacity_summary.",
    source: "v_bi_revops_snapshot_capacity_summary",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "revops_snapshot_forecast_vs_actuals",
    label: "RevOps Snapshot Forecast vs Actuals",
    audience: "admin",
    description: "Phase 38. Joins each RevOps period snapshot to its linked forecast snapshot's variance row for the same month, exposing forecast vs realized new business / churn / expansion / ending MRR. Source: v_bi_revops_snapshot_forecast_vs_actuals.",
    source: "v_bi_revops_snapshot_forecast_vs_actuals",
    formats: ["csv", "json"],
    shareable: false,
  },
  {
    key: "qa_release_gates",
    label: "QA Release Gates",
    audience: "admin",
    description: "Phase 39. Per-release QA gate with decision (pending/go/no_go), total/passed/failed check counts, scope summary, and decided_at timestamp. Source: v_bi_qa_release_gates.",
    source: "v_bi_qa_release_gates",
    formats: ["csv", "json"],
    shareable: false,
  },
];

// ── Snapshot RPCs ────────────────────────────────────────────────

export async function generateExecutiveSnapshot(): Promise<string> {
  const { data, error } = await (supabase as any).rpc("generate_executive_snapshot");
  if (error) throw error;
  return data as string;
}

export async function generateWLPartnerSnapshot(partnerId: string): Promise<string> {
  const { data, error } = await (supabase as any).rpc("generate_wl_partner_snapshot", {
    p_partner_id: partnerId,
  });
  if (error) throw error;
  return data as string;
}

export interface SnapshotRow {
  id: string;
  snapshot_type: string;
  scope: "admin" | "partner";
  partner_id: string | null;
  row_count: number;
  generated_by: string | null;
  generated_at: string;
  payload: any;
}

export async function listSnapshots(opts: {
  type?: string;
  partnerId?: string;
  limit?: number;
} = {}): Promise<SnapshotRow[]> {
  let q = (supabase as any)
    .from("data_export_snapshots")
    .select("id,snapshot_type,scope,partner_id,row_count,generated_by,generated_at,payload")
    .order("generated_at", { ascending: false })
    .limit(opts.limit ?? 25);
  if (opts.type) q = q.eq("snapshot_type", opts.type);
  if (opts.partnerId) q = q.eq("partner_id", opts.partnerId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SnapshotRow[];
}

// ── Direct view fetchers (admin-side) ────────────────────────────

export async function fetchBiView(view: string): Promise<any[]> {
  const { data, error } = await (supabase as any).from(view).select("*");
  if (error) throw error;
  return (data ?? []) as any[];
}

// ── Format helpers ───────────────────────────────────────────────

export function rowsToCsv(rows: any[]): string {
  if (!rows.length) return "";
  const cols = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r ?? {}).forEach((k) => acc.add(k));
      return acc;
    }, new Set())
  );
  const escape = (v: any): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => escape(r?.[c])).join(","));
  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/** Best-effort emit a UI-side dashboard_event for an export download. */
export async function logExportDownload(eventName: string, props: Record<string, any> = {}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    await (supabase as any).from("dashboard_events").insert({
      event_name: eventName,
      surface: "intelligence/exports",
      persona: "admin",
      user_id: u?.user?.id ?? null,
      properties: props,
    });
  } catch (e) {
    // best-effort
    console.warn("logExportDownload failed", e);
  }
}
