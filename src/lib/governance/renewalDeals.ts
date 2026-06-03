/**
 * Phase 33 — Renewal & Expansion Deal Operations
 * Thin internal commercial deal layer over renewal workflows + plays + comms.
 * Billing/subscription truth remains authoritative.
 */
import { supabase } from "@/integrations/supabase/client";

export type DealScope = "direct" | "partner";
export type DealType = "renewal" | "expansion" | "downsell" | "save";
export type DealStage =
  | "identified" | "outreach_started" | "proposal_prepared" | "proposal_sent"
  | "negotiation" | "verbally_approved" | "implemented"
  | "closed_won" | "closed_lost" | "deferred";
export type DealStatus = "open" | "won" | "lost" | "deferred" | "stalled";

export interface RenewalExpansionDeal {
  id: string;
  scope: DealScope;
  target_id: string;
  deal_type: DealType;
  related_renewal_workflow_id: string | null;
  related_partner_play_id: string | null;
  related_direct_play_id: string | null;
  owner_user_id: string | null;
  current_plan_key: string | null;
  proposed_plan_key: string | null;
  proposed_offer_id: string | null;
  proposed_term_months: number | null;
  proposed_price_summary: string | null;
  stage: DealStage;
  status: DealStatus;
  outcome_reason: string | null;
  expected_close_date: string | null;
  implemented_at: string | null;
  notes: string | null;
  stage_changed_at: string;
  created_at: string;
  updated_at: string;
  days_to_expected_close?: number | null;
  days_in_stage?: number | null;
  comm_action_count?: number | null;
  renewal_date?: string | null;
  renewal_stage?: string | null;
}

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  identified: "Identified",
  outreach_started: "Outreach started",
  proposal_prepared: "Proposal prepared",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  verbally_approved: "Verbally approved",
  implemented: "Implemented",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
  deferred: "Deferred",
};

export const DEAL_STAGE_ORDER: DealStage[] = [
  "identified", "outreach_started", "proposal_prepared", "proposal_sent",
  "negotiation", "verbally_approved", "implemented", "closed_won", "closed_lost", "deferred",
];

export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  renewal: "Renewal",
  expansion: "Expansion",
  downsell: "Downsell",
  save: "Save",
};

export async function fetchOpenDeals(): Promise<RenewalExpansionDeal[]> {
  const { data, error } = await (supabase as any)
    .from("v_open_deals_pipeline").select("*")
    .order("stage_changed_at", { ascending: false }).limit(500);
  if (error) { console.warn("deals: open", error.message); return []; }
  return (data ?? []) as RenewalExpansionDeal[];
}

export async function fetchAllDeals(limit = 500): Promise<RenewalExpansionDeal[]> {
  const { data, error } = await (supabase as any)
    .from("renewal_expansion_deals").select("*")
    .order("created_at", { ascending: false }).limit(limit);
  if (error) { console.warn("deals: all", error.message); return []; }
  return (data ?? []) as RenewalExpansionDeal[];
}

export async function fetchStalledApprovedDeals(): Promise<RenewalExpansionDeal[]> {
  const { data, error } = await (supabase as any)
    .from("v_stalled_approved_deals").select("*")
    .order("stage_changed_at", { ascending: true }).limit(200);
  if (error) { console.warn("deals: stalled", error.message); return []; }
  return (data ?? []) as RenewalExpansionDeal[];
}

export interface CreateDealInput {
  scope: DealScope;
  target_id: string;
  deal_type: DealType;
  related_renewal_workflow_id?: string | null;
  related_partner_play_id?: string | null;
  related_direct_play_id?: string | null;
  proposed_plan_key?: string | null;
  proposed_offer_id?: string | null;
  proposed_term_months?: number | null;
  proposed_price_summary?: string | null;
  expected_close_date?: string | null;
  notes?: string | null;
}

export async function createDeal(input: CreateDealInput): Promise<string | null> {
  const { data, error } = await (supabase as any).rpc("create_renewal_expansion_deal", {
    p_scope: input.scope,
    p_target_id: input.target_id,
    p_deal_type: input.deal_type,
    p_related_renewal_workflow_id: input.related_renewal_workflow_id ?? null,
    p_related_partner_play_id: input.related_partner_play_id ?? null,
    p_related_direct_play_id: input.related_direct_play_id ?? null,
    p_proposed_plan_key: input.proposed_plan_key ?? null,
    p_proposed_offer_id: input.proposed_offer_id ?? null,
    p_proposed_term_months: input.proposed_term_months ?? null,
    p_proposed_price_summary: input.proposed_price_summary ?? null,
    p_expected_close_date: input.expected_close_date ?? null,
    p_notes: input.notes ?? null,
  });
  if (error) { console.warn("deals: create", error.message); return null; }
  return data as string;
}

export async function transitionDealStage(
  dealId: string, newStage: DealStage, outcomeReason?: string | null,
): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc("transition_deal_stage", {
    p_deal_id: dealId, p_new_stage: newStage, p_outcome_reason: outcomeReason ?? null,
  });
  if (error) { console.warn("deals: transition", error.message); return false; }
  return Boolean(data);
}

export async function linkCommActionToDeal(actionId: string, dealId: string): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc("link_comm_action_to_deal", {
    p_action_id: actionId, p_deal_id: dealId,
  });
  if (error) { console.warn("deals: link comm", error.message); return false; }
  return Boolean(data);
}

export async function reconcileDeals(): Promise<{ implemented: number; stalled: number } | null> {
  const { data, error } = await (supabase as any).rpc("reconcile_renewal_expansion_deals");
  if (error) { console.warn("deals: reconcile", error.message); return null; }
  return data as any;
}

export async function findDealForRenewalWorkflow(rwId: string): Promise<RenewalExpansionDeal | null> {
  const { data, error } = await (supabase as any)
    .from("renewal_expansion_deals").select("*")
    .eq("related_renewal_workflow_id", rwId)
    .eq("status", "open")
    .maybeSingle();
  if (error) { console.warn("deals: find for renewal", error.message); return null; }
  return (data ?? null) as RenewalExpansionDeal | null;
}
