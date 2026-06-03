/**
 * Phase 13 — Attribution / Cohorts / Growth Intelligence
 *
 * Typed read wrappers over the canonical Phase 13 views.
 *
 * Attribution model (honest, first-touch only):
 *   channel             — normalized via SQL growth_normalize_channel(leads.source).
 *                         Buckets: organic, paid, referral, partner_wl, widget,
 *                         wizard, exit_intent, demo, direct, unknown, or the
 *                         literal source slug if it doesn't fit a bucket.
 *   acquisition_type    — 'wl' if a WL partner intake exists for the lead,
 *                         else 'direct'. Multi-touch is intentionally NOT modeled.
 *   wl_partner_id       — present only for wl acquisition.
 *
 * Cohort model:
 *   cohort_month = date_trunc('month', leads.created_at)
 *   converted    = lead_conversions row exists
 *   activated    = internal_fulfillment_intakes.activated_at present
 *
 * All views are SECURITY INVOKER and rely on existing leads RLS — only
 * admins/supervisors see populated rows. No partner-facing surface uses
 * these wrappers.
 */
import { supabase } from "@/integrations/supabase/client";

export type GrowthChannel =
  | "organic" | "paid" | "referral" | "partner_wl" | "widget"
  | "wizard" | "exit_intent" | "demo" | "direct" | "unknown" | string;

export type AcquisitionType = "direct" | "wl";

export interface ChannelSummaryRow {
  channel: GrowthChannel;
  leads: number;
  conversions: number;
  direct_leads: number;
  wl_leads: number;
  conversion_rate_pct: number;
  avg_days_to_convert: number | null;
  activations: number;
}

export interface CohortRow {
  cohort_month: string;
  leads: number;
  conversions: number;
  activations: number;
  direct_leads: number;
  wl_leads: number;
  conversion_rate_pct: number;
  activation_rate_pct: number;
}

export interface DirectVsWlRow {
  acquisition_type: AcquisitionType;
  leads: number;
  conversions: number;
  activations: number;
  conversion_rate_pct: number;
  activation_rate_pct: number;
  avg_days_to_convert: number | null;
}

async function safeSelect<T>(view: string): Promise<T[]> {
  const { data, error } = await (supabase as any).from(view).select("*");
  if (error) {
    console.warn(`growthIntelligence: ${view}`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

export const fetchChannelSummary = () =>
  safeSelect<ChannelSummaryRow>("v_growth_channel_summary");

export const fetchCohortByLeadMonth = () =>
  safeSelect<CohortRow>("v_growth_cohort_lead_month");

export const fetchDirectVsWl = () =>
  safeSelect<DirectVsWlRow>("v_growth_direct_vs_wl");

export interface GrowthIntelligenceBundle {
  channels: ChannelSummaryRow[];
  cohorts: CohortRow[];
  directVsWl: DirectVsWlRow[];
  computed_at: string;
}

export async function fetchGrowthIntelligence(): Promise<GrowthIntelligenceBundle> {
  const [channels, cohorts, directVsWl] = await Promise.all([
    fetchChannelSummary(),
    fetchCohortByLeadMonth(),
    fetchDirectVsWl(),
  ]);
  return { channels, cohorts, directVsWl, computed_at: new Date().toISOString() };
}

/** Sort + cap channels for top-N display. Stable, no fake precision. */
export function topChannels(rows: ChannelSummaryRow[], n = 6): ChannelSummaryRow[] {
  return [...rows].sort((a, b) => b.leads - a.leads).slice(0, n);
}

/** Pretty channel label (display-only). */
export function channelLabel(c: GrowthChannel): string {
  const map: Record<string, string> = {
    organic: "Organic / SEO",
    paid: "Paid Ads",
    referral: "Referral",
    partner_wl: "WL Partner",
    widget: "Chat Widget",
    wizard: "Onboarding Wizard",
    exit_intent: "Exit Intent",
    demo: "Demo / Consult",
    direct: "Direct",
    unknown: "Unknown",
  };
  return map[c] ?? c;
}
