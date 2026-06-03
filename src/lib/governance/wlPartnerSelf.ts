/**
 * Phase 24 — Partner-Facing Finance & Performance (partner-safe wrappers)
 *
 * Tightly bounded subset of WL economics safe to expose to a partner about
 * their OWN portfolio only. Admin-only fields (servicing cost, partner-side
 * CAC, partial margin) are NOT projected by the underlying view.
 *
 * Tenant safety: views filter on white_label_partners.user_id = auth.uid().
 * Never exposes cross-partner data.
 */
import { supabase } from "@/integrations/supabase/client";

export interface WLPartnerSelfEconomics {
  partner_id: string;
  partner_slug: string;
  company_name: string;
  tier: string | null;
  partner_status: string | null;
  cohort_month: string | null;
  created_at: string;
  total_clients: number;
  active_clients: number;
  recurring_value_proxy_usd: number | null;
  sum_recurring_90d_usd: number | null;
  paid_invoices_90d: number | null;
  latest_paid_period: string | null;
  clients_expansion: number;
  clients_contraction: number;
  clients_stable: number;
  clients_with_signal: number;
  coverage_flag: "recurring_known" | "recurring_unknown";
}

export interface WLPartnerSelfPortfolioHealthRow {
  partner_id: string;
  health_band: string;
  client_count: number;
}

export async function fetchWLPartnerSelfEconomics(): Promise<WLPartnerSelfEconomics | null> {
  const { data, error } = await (supabase as any)
    .from("v_wl_partner_self_economics")
    .select("*")
    .maybeSingle();
  if (error) {
    console.warn("wlPartnerSelf: economics", error.message);
    return null;
  }
  return (data ?? null) as WLPartnerSelfEconomics | null;
}

export async function fetchWLPartnerSelfPortfolioHealth(): Promise<WLPartnerSelfPortfolioHealthRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_wl_partner_self_portfolio_health")
    .select("*");
  if (error) {
    console.warn("wlPartnerSelf: portfolio health", error.message);
    return [];
  }
  return (data ?? []) as WLPartnerSelfPortfolioHealthRow[];
}

export function formatUsd(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}
