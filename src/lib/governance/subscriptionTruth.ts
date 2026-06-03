/**
 * Phase 17 — Canonical Subscription / MRR / Churn Model
 *
 * Typed read wrappers over the Phase 17 canonical subscription views.
 *
 * Honesty contract (mirrors the SQL migration):
 *   - "active" subscription = lead has stripe_subscription_id (or
 *     subscription_started_at) AND is not in pipeline_stage churned/lost
 *     AND status is not canceled/churned. No invented states.
 *   - mrr_usd is populated ONLY from documented sources:
 *       * custom_plans.minimum_monthly when present
 *       * else custom_plans.fixed_amount
 *     Otherwise mrr_usd is NULL and mrr_basis = 'unknown'. We never
 *     fabricate MRR from price tables to avoid finance theater.
 *   - WL recurring is a labeled PROXY (trailing 90-day paid invoice avg).
 *   - Overage and one-time charges are explicitly excluded from MRR.
 *   - Churn is an explicit transition into pipeline_stage churned/lost
 *     for a subscription that previously existed; never inactivity.
 *   - Movement series surfaces expansion/contraction = 0 until a discrete
 *     subscription movement event log exists; basis='derived'.
 *
 * All views are SECURITY INVOKER and inherit admin/billing-only visibility
 * from the underlying RLS on leads, custom_plans, wl_invoices, and
 * internal_fulfillment_intakes.
 */
import { supabase } from "@/integrations/supabase/client";

export type AcquisitionType = "direct" | "wl";
export type SubscriptionState =
  | "active"
  | "canceled"
  | "past_due"
  | "incomplete"
  | "unknown";
export type MrrBasis =
  | "custom_plan_minimum_monthly"
  | "custom_plan_fixed_amount"
  | "unknown";

export const SUBSCRIPTION_STATES: SubscriptionState[] = [
  "active",
  "past_due",
  "incomplete",
  "canceled",
  "unknown",
];

export const MRR_BASIS_LABEL: Record<MrrBasis, string> = {
  custom_plan_minimum_monthly: "Custom plan minimum",
  custom_plan_fixed_amount: "Custom plan fixed amount",
  unknown: "Unknown (no canonical contract value)",
};

export interface SubscriptionSnapshotRow {
  lead_id: string;
  name: string | null;
  company: string | null;
  acquisition_type: AcquisitionType;
  partner_id: string | null;
  service_type: string | null;
  plan_name: string | null;
  plan_minutes: number | null;
  billing_interval: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_started_at: string | null;
  last_payment_status: string | null;
  pipeline_stage: string | null;
  status: string | null;
  subscription_state: SubscriptionState;
  mrr_usd: number | null;
  mrr_basis: MrrBasis;
  effective_start_at: string | null;
  effective_end_at: string | null;
  last_state_change_at: string | null;
}

export interface MrrSummaryRow {
  acquisition_type: AcquisitionType;
  subscription_state: SubscriptionState;
  subscriptions: number;
  subscriptions_with_known_mrr: number;
  subscriptions_unknown_mrr: number;
  known_mrr_usd: number;
}

export interface PlanSummaryRow {
  plan_name: string;
  acquisition_type: AcquisitionType;
  subscriptions: number;
  active_count: number;
  canceled_count: number;
  past_due_count: number;
  subscriptions_with_known_mrr: number;
  active_known_mrr_usd: number;
  avg_active_known_mrr_usd: number | null;
}

export interface DirectVsWlRow {
  stream: AcquisitionType;
  active_subscriptions: number;
  canceled_subscriptions: number;
  known_mrr_usd: number | null;
  recurring_proxy_usd: number | null;
  basis: string;
}

export interface ChurnEventRow {
  lead_id: string;
  name: string | null;
  company: string | null;
  acquisition_type: AcquisitionType;
  partner_id: string | null;
  plan_name: string | null;
  lost_mrr_usd: number | null;
  mrr_basis: MrrBasis;
  effective_start_at: string | null;
  canceled_at: string | null;
  lifetime_days: number;
}

export interface MovementRow {
  month_start: string;
  new_subs: number;
  new_mrr_usd: number;
  churned_subs: number;
  churned_mrr_usd: number;
  expansion_subs: number;
  expansion_mrr_usd: number;
  contraction_subs: number;
  contraction_mrr_usd: number;
  basis: string;
}

export interface WlRecurringRow {
  partner_id: string;
  business_name: string | null;
  paid_invoices_90d: number;
  avg_monthly_recurring_usd: number;
  sum_recurring_90d_usd: number;
  latest_paid_period: string | null;
}

async function safeSelect<T>(view: string): Promise<T[]> {
  const { data, error } = await (supabase as any).from(view).select("*");
  if (error) {
    console.warn(`subscriptionTruth: ${view}`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

export const fetchSubscriptionSnapshot = () =>
  safeSelect<SubscriptionSnapshotRow>("v_subscription_snapshot");
export const fetchMrrSummary = () =>
  safeSelect<MrrSummaryRow>("v_subscription_mrr_summary");
export const fetchPlanSummary = () =>
  safeSelect<PlanSummaryRow>("v_subscription_plan_summary");
export const fetchDirectVsWlRecurring = () =>
  safeSelect<DirectVsWlRow>("v_subscription_direct_vs_wl");
export const fetchChurnEvents = () =>
  safeSelect<ChurnEventRow>("v_subscription_churn_events");
export const fetchMovements = () =>
  safeSelect<MovementRow>("v_subscription_movements");
export const fetchWlRecurring = () =>
  safeSelect<WlRecurringRow>("v_subscription_wl_recurring");

export interface SubscriptionTruthBundle {
  mrr: MrrSummaryRow[];
  directVsWl: DirectVsWlRow[];
  plans: PlanSummaryRow[];
  churn: ChurnEventRow[];
  movements: MovementRow[];
  wlRecurring: WlRecurringRow[];
}

export async function fetchSubscriptionTruthBundle(): Promise<SubscriptionTruthBundle> {
  const [mrr, directVsWl, plans, churn, movements, wlRecurring] = await Promise.all([
    fetchMrrSummary(),
    fetchDirectVsWlRecurring(),
    fetchPlanSummary(),
    fetchChurnEvents(),
    fetchMovements(),
    fetchWlRecurring(),
  ]);
  return { mrr, directVsWl, plans, churn, movements, wlRecurring };
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function totalActiveKnownMrr(rows: MrrSummaryRow[]): number {
  return rows
    .filter((r) => r.subscription_state === "active")
    .reduce((sum, r) => sum + (Number(r.known_mrr_usd) || 0), 0);
}

export function totalActiveSubs(rows: MrrSummaryRow[]): number {
  return rows
    .filter((r) => r.subscription_state === "active")
    .reduce((sum, r) => sum + (Number(r.subscriptions) || 0), 0);
}

export function totalUnknownMrrSubs(rows: MrrSummaryRow[]): number {
  return rows
    .filter((r) => r.subscription_state === "active")
    .reduce((sum, r) => sum + (Number(r.subscriptions_unknown_mrr) || 0), 0);
}
