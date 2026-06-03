/**
 * Phase 29 — Partner Success & Expansion Operations
 *
 * Admin-side helpers for the partner success pipeline (state, drill-downs,
 * opportunities, and lightweight play tracking) plus a small partner-safe
 * helper used by the WL partner dashboard.
 *
 * - Cross-partner data is admin-only (RLS via security_invoker views).
 * - Partner-facing helper (`fetchSelfSuccess`) reads `v_partner_self_success`
 *   which filters to `auth.uid()` and exposes only safe boolean hints.
 */
import { supabase } from "@/integrations/supabase/client";

export type PartnerState =
  | "strategic_growth"
  | "nurture"
  | "stabilize"
  | "at_risk";

export type PlayType = "educate" | "upsell" | "save" | "onboard" | "reactivate";
export type PlayStatus = "not_started" | "active" | "completed" | "dismissed";

export interface PartnerSuccessSummaryRow {
  partner_id: string;
  partner_slug: string;
  company_name: string;
  tier: string | null;
  partner_status: string | null;
  cohort_month: string | null;
  total_clients: number;
  active_clients: number;
  recurring_value_proxy_usd: number | null;
  partial_margin_proxy_usd: number | null;
  partial_margin_pct: number | null;
  clients_expansion: number;
  clients_contraction: number;
  account_count: number;
  healthy_count: number;
  watch_count: number;
  intervention_count: number;
  healthy_share: number | null;
  intervention_share: number | null;
  flag_partner_inactive: boolean;
  flag_high_intervention: boolean;
  flag_net_contraction: boolean;
  flag_low_margin: boolean;
  flag_expansion_ready: boolean;
  flag_strategic: boolean;
  partner_state: PartnerState;
}

export interface PartnerSuccessAccountRow {
  partner_id: string;
  lead_id: string;
  name: string | null;
  company: string | null;
  health_band: "healthy" | "watch" | "intervention" | string;
  lifecycle_signal: string;
  receptionist_health: string;
  days_live: number;
  days_since_activity: number;
  open_tickets_count: number;
  live_campaigns_count: number;
  total_campaigns_count: number;
}

export interface PartnerSuccessOpportunityRow {
  partner_id: string;
  partner_slug: string;
  company_name: string;
  partner_state: PartnerState;
  opportunity_type: PlayType;
  priority: number;
  reason: string;
}

export interface PartnerPlayRow {
  id: string;
  partner_id: string;
  play_type: PlayType;
  status: PlayStatus;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerSelfSuccess {
  partner_id: string;
  account_count: number;
  healthy_count: number;
  watch_count: number;
  intervention_count: number;
  clients_expansion: number;
  clients_contraction: number;
  active_clients: number;
  hint_expansion_ready: boolean;
  hint_attention_needed: boolean;
  hint_strong_portfolio: boolean;
}

// ── Admin readers ──────────────────────────────────────────────────────────
export async function fetchPartnerSuccessSummary(): Promise<PartnerSuccessSummaryRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_partner_success_summary")
    .select("*");
  if (error) {
    console.warn("partnerSuccess: summary", error.message);
    return [];
  }
  return (data ?? []) as PartnerSuccessSummaryRow[];
}

export async function fetchPartnerSuccessAccounts(
  partnerId: string,
): Promise<PartnerSuccessAccountRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_partner_success_accounts")
    .select("*")
    .eq("partner_id", partnerId);
  if (error) {
    console.warn("partnerSuccess: accounts", error.message);
    return [];
  }
  return (data ?? []) as PartnerSuccessAccountRow[];
}

export async function fetchPartnerSuccessOpportunities(): Promise<PartnerSuccessOpportunityRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_partner_success_opportunities")
    .select("*")
    .order("priority", { ascending: true });
  if (error) {
    console.warn("partnerSuccess: opportunities", error.message);
    return [];
  }
  return (data ?? []) as PartnerSuccessOpportunityRow[];
}

export async function fetchPartnerPlays(
  partnerId?: string,
): Promise<PartnerPlayRow[]> {
  let q = (supabase as any).from("partner_success_plays").select("*");
  if (partnerId) q = q.eq("partner_id", partnerId);
  const { data, error } = await q.order("updated_at", { ascending: false });
  if (error) {
    console.warn("partnerSuccess: plays", error.message);
    return [];
  }
  return (data ?? []) as PartnerPlayRow[];
}

export async function createPartnerPlay(input: {
  partner_id: string;
  play_type: PlayType;
  notes?: string;
  follow_up_date?: string | null;
}): Promise<PartnerPlayRow | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from("partner_success_plays")
    .insert({
      partner_id: input.partner_id,
      play_type: input.play_type,
      notes: input.notes ?? null,
      follow_up_date: input.follow_up_date ?? null,
      created_by: userRes?.user?.id ?? null,
      status: "not_started",
    })
    .select()
    .maybeSingle();
  if (error) {
    console.warn("partnerSuccess: create play", error.message);
    return null;
  }
  return (data ?? null) as PartnerPlayRow | null;
}

export async function updatePartnerPlay(
  id: string,
  patch: Partial<Pick<PartnerPlayRow, "status" | "notes" | "follow_up_date">>,
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("partner_success_plays")
    .update(patch)
    .eq("id", id);
  if (error) {
    console.warn("partnerSuccess: update play", error.message);
    return false;
  }
  return true;
}

// ── Partner-safe reader ────────────────────────────────────────────────────
export async function fetchSelfSuccess(): Promise<PartnerSelfSuccess | null> {
  const { data, error } = await (supabase as any)
    .from("v_partner_self_success")
    .select("*")
    .maybeSingle();
  if (error) {
    console.warn("partnerSuccess: self", error.message);
    return null;
  }
  return (data ?? null) as PartnerSelfSuccess | null;
}

// ── Display helpers ────────────────────────────────────────────────────────
export const STATE_LABEL: Record<PartnerState, string> = {
  strategic_growth: "Strategic Growth",
  nurture: "Nurture",
  stabilize: "Stabilize",
  at_risk: "At Risk",
};

export function stateBadgeVariant(
  state: PartnerState,
): "default" | "secondary" | "outline" | "destructive" {
  switch (state) {
    case "strategic_growth": return "default";
    case "nurture":          return "secondary";
    case "stabilize":        return "outline";
    case "at_risk":          return "destructive";
  }
}

export const PLAY_LABEL: Record<PlayType, string> = {
  educate: "Educate",
  upsell: "Upsell",
  save: "Save",
  onboard: "Onboard",
  reactivate: "Reactivate",
};
