/**
 * Phase 6 — White Label Scaling
 * Typed wrappers around the canonical WL views. Used by Governance,
 * the WL partner dashboard, and the WL end-client portal. RLS is enforced
 * by the underlying tables (white_label_partners.user_id /
 * white_label_clients.user_id) — these helpers do not bypass tenant safety.
 */
import { supabase } from "@/integrations/supabase/client";

export type WLPartnerReadinessState =
  | "pending"
  | "configured"
  | "branded"
  | "domain_pending"
  | "domain_ready"
  | "live";

export interface WLPartnerReadinessRow {
  partner_id: string;
  partner_slug: string;
  company_name: string;
  partner_status: string | null;
  tier: string | null;
  has_branding: boolean;
  has_custom_domain: boolean;
  cname_status: string;
  domain_verified: boolean;
  alias_count: number;
  total_clients: number;
  active_clients: number;
  clients_with_portal: number;
  readiness_state: WLPartnerReadinessState;
}

export interface WLClientDirectoryRow {
  wl_client_id: string;
  partner_id: string;
  client_name: string;
  contact_name: string | null;
  email: string;
  status: string;
  plan: string | null;
  service_type: string;
  client_portal_slug: string | null;
  portal_provisioned: boolean;
  created_at: string;
  total_campaigns: number;
  published_campaigns: number;
  live_receptionist_flows: number;
  pending_receptionist_flows: number;
  open_tickets: number;
}

export interface WLClientServiceStatusRow {
  wl_client_id: string;
  portal_user_id: string | null;
  partner_id: string;
  client_name: string;
  account_status: string;
  total_campaigns: number;
  published_campaigns: number;
  live_receptionist_flows: number;
  pending_receptionist_flows: number;
  any_receptionist_enabled: boolean;
  open_tickets: number;
  last_call_at: string | null;
}

export async function fetchPartnerReadiness(partnerId: string): Promise<WLPartnerReadinessRow | null> {
  const { data, error } = await (supabase as any)
    .from("v_wl_partner_readiness")
    .select("*")
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchPartnerClientDirectory(partnerId: string): Promise<WLClientDirectoryRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_wl_client_directory_for_partner")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as WLClientDirectoryRow[]) ?? [];
}

export async function fetchWLClientServiceStatus(wlClientId: string): Promise<WLClientServiceStatusRow | null> {
  const { data, error } = await (supabase as any)
    .from("v_wl_client_service_status")
    .select("*")
    .eq("wl_client_id", wlClientId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export function readinessLabel(state: WLPartnerReadinessState): string {
  switch (state) {
    case "pending": return "Awaiting Activation";
    case "configured": return "Configured, Add Branding";
    case "branded": return "Branded, Connect Domain";
    case "domain_pending": return "Domain Verifying";
    case "domain_ready": return "Domain Ready, Add Clients";
    case "live": return "Live";
  }
}
