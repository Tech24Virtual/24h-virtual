/**
 * Phase 30 — Customer Success for Direct Accounts
 *
 * Admin readers + a single client-safe self reader, modeled on the Phase 29
 * partner success layer but built around per-account (lead_id) state for
 * non-WL direct accounts.
 *
 * Honesty contract:
 *   - All states are rule-based and trace back to existing Phase 16 health,
 *     Phase 17 subscription truth, and ticket/activation signals.
 *   - No opaque scores, no ML.
 *   - The self view (`v_direct_self_success`) filters by auth.uid() and
 *     exposes only safe boolean hints (no internal economics, no labels).
 */
import { supabase } from "@/integrations/supabase/client";

export type DirectSuccessState =
  | "expansion_ready"
  | "nurture"
  | "stabilize"
  | "at_risk";

export type DirectPlayType =
  | "educate"
  | "upsell"
  | "save"
  | "onboard"
  | "reactivate";
export type DirectPlayStatus =
  | "not_started"
  | "active"
  | "completed"
  | "dismissed";

export interface DirectSuccessSummaryRow {
  lead_id: string;
  name: string | null;
  company: string | null;
  plan_name: string | null;
  activated_at: string | null;
  days_live: number;
  days_since_activity: number;
  open_tickets_count: number;
  live_campaigns_count: number;
  total_campaigns_count: number;
  receptionist_health: string;
  lifecycle_signal: string;
  health_band: string;
  reasons: string[] | null;
  subscription_state: string | null;
  last_payment_status: string | null;
  mrr_usd: number | null;
  mrr_basis: string | null;
  flag_payment_risk: boolean;
  flag_canceled: boolean;
  flag_intervention: boolean;
  flag_downgrade_risk: boolean;
  flag_expansion_signal: boolean;
  flag_no_receptionist: boolean;
  flag_support_friction: boolean;
  flag_inactive: boolean;
  flag_expansion_ready: boolean;
  flag_new_account: boolean;
  success_state: DirectSuccessState;
}

export interface DirectSuccessOpportunityRow {
  lead_id: string;
  name: string | null;
  company: string | null;
  success_state: DirectSuccessState;
  opportunity_type: DirectPlayType;
  priority: number;
  reason: string;
}

export interface DirectPlayRow {
  id: string;
  lead_id: string;
  play_type: DirectPlayType;
  status: DirectPlayStatus;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectSelfSuccess {
  lead_id: string;
  hint_healthy: boolean;
  hint_setup_incomplete: boolean;
  hint_support_attention: boolean;
  hint_expansion_ready: boolean;
  hint_new_account: boolean;
  days_live: number;
  live_campaigns_count: number;
  open_tickets_count: number;
}

// ── Admin readers ──────────────────────────────────────────────────────────
export async function fetchDirectSuccessSummary(): Promise<DirectSuccessSummaryRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_direct_success_summary")
    .select("*");
  if (error) {
    console.warn("directSuccess: summary", error.message);
    return [];
  }
  return (data ?? []) as DirectSuccessSummaryRow[];
}

export async function fetchDirectSuccessOpportunities(): Promise<DirectSuccessOpportunityRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_direct_success_opportunities")
    .select("*")
    .order("priority", { ascending: true });
  if (error) {
    console.warn("directSuccess: opportunities", error.message);
    return [];
  }
  return (data ?? []) as DirectSuccessOpportunityRow[];
}

export async function fetchDirectPlays(leadId?: string): Promise<DirectPlayRow[]> {
  let q = (supabase as any).from("direct_success_plays").select("*");
  if (leadId) q = q.eq("lead_id", leadId);
  const { data, error } = await q.order("updated_at", { ascending: false });
  if (error) {
    console.warn("directSuccess: plays", error.message);
    return [];
  }
  return (data ?? []) as DirectPlayRow[];
}

export async function createDirectPlay(input: {
  lead_id: string;
  play_type: DirectPlayType;
  notes?: string;
  follow_up_date?: string | null;
}): Promise<DirectPlayRow | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from("direct_success_plays")
    .insert({
      lead_id: input.lead_id,
      play_type: input.play_type,
      notes: input.notes ?? null,
      follow_up_date: input.follow_up_date ?? null,
      created_by: userRes?.user?.id ?? null,
      status: "not_started",
    })
    .select()
    .maybeSingle();
  if (error) {
    console.warn("directSuccess: create play", error.message);
    return null;
  }
  return (data ?? null) as DirectPlayRow | null;
}

export async function updateDirectPlay(
  id: string,
  patch: Partial<Pick<DirectPlayRow, "status" | "notes" | "follow_up_date">>,
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("direct_success_plays")
    .update(patch)
    .eq("id", id);
  if (error) {
    console.warn("directSuccess: update play", error.message);
    return false;
  }
  return true;
}

// ── Client-safe reader ─────────────────────────────────────────────────────
export async function fetchDirectSelfSuccess(): Promise<DirectSelfSuccess | null> {
  const { data, error } = await (supabase as any)
    .from("v_direct_self_success")
    .select("*")
    .maybeSingle();
  if (error) {
    console.warn("directSuccess: self", error.message);
    return null;
  }
  return (data ?? null) as DirectSelfSuccess | null;
}

// ── Display helpers ────────────────────────────────────────────────────────
export const DIRECT_STATE_LABEL: Record<DirectSuccessState, string> = {
  expansion_ready: "Expansion Ready",
  nurture: "Nurture",
  stabilize: "Stabilize",
  at_risk: "At Risk",
};

export function directStateBadgeVariant(
  state: DirectSuccessState,
): "default" | "secondary" | "outline" | "destructive" {
  switch (state) {
    case "expansion_ready": return "default";
    case "nurture":         return "secondary";
    case "stabilize":       return "outline";
    case "at_risk":         return "destructive";
  }
}

export const DIRECT_PLAY_LABEL: Record<DirectPlayType, string> = {
  educate: "Educate",
  upsell: "Upsell",
  save: "Save",
  onboard: "Onboard",
  reactivate: "Reactivate",
};

export const DIRECT_STATE_ORDER: DirectSuccessState[] = [
  "at_risk",
  "stabilize",
  "nurture",
  "expansion_ready",
];
