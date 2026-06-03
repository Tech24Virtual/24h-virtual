/**
 * Phase 5 — AI Voice / Hybrid Receptionist governance wrappers.
 *
 * Reads the canonical receptionist views and exposes a tight typed surface
 * for admin, supervisor, and client surfaces. No parallel routing engine.
 */
import { supabase } from "@/integrations/supabase/client";

export type ReceptionistMode = "ai_only" | "hybrid" | "human_only";
export type AfterHoursBehavior = "voicemail" | "forward" | "overflow" | "message_only" | "closed";
export type EscalationStrategy =
  | "none"
  | "transfer_human"
  | "callback_request"
  | "supervisor"
  | "overflow_number";

export type ReadinessState =
  | "unconfigured"
  | "configured_offline"
  | "awaiting_script_publish"
  | "awaiting_number"
  | "ready_to_activate"
  | "live";

export interface ReceptionistConfig {
  id: string;
  client_department_id: string;
  tenant_kind: "direct_24h" | "wl_partner";
  wl_partner_id: string | null;
  client_lead_id: string | null;
  wl_client_id: string | null;
  mode: ReceptionistMode;
  greeting: string | null;
  after_hours: AfterHoursBehavior;
  escalation: EscalationStrategy;
  primary_contact_id: string | null;
  overflow_department_id: string | null;
  overflow_number: string | null;
  voicemail_email: string | null;
  business_hours: Record<string, unknown>;
  ground_in_campaign: boolean;
  knowledge_notes: string | null;
  enabled: boolean;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadinessRow {
  client_department_id: string;
  flow_name: string;
  client_location_id: string | null;
  config_id: string | null;
  mode: ReceptionistMode | null;
  after_hours: AfterHoursBehavior | null;
  escalation: EscalationStrategy | null;
  receptionist_enabled: boolean | null;
  campaign_id: string | null;
  campaign_status: string | null;
  has_published_script: boolean;
  has_active_number: boolean;
  readiness_state: ReadinessState;
  last_validated_at: string | null;
}

export interface ClientReceptionistSummary {
  lead_id: string;
  flow_count: number;
  live_count: number;
  pending_count: number;
  any_enabled: boolean | null;
  last_validated_at: string | null;
}

export async function fetchReceptionistConfig(callFlowId: string): Promise<ReceptionistConfig | null> {
  const { data, error } = await (supabase as any)
    .from("call_flow_receptionist_configs")
    .select("*")
    .eq("client_department_id", callFlowId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertReceptionistConfig(
  input: Partial<ReceptionistConfig> & { client_department_id: string },
): Promise<ReceptionistConfig> {
  const { data, error } = await (supabase as any)
    .from("call_flow_receptionist_configs")
    .upsert(input, { onConflict: "client_department_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchReadinessForFlow(callFlowId: string): Promise<ReadinessRow | null> {
  const { data, error } = await (supabase as any)
    .from("v_call_flow_receptionist_readiness")
    .select("*")
    .eq("client_department_id", callFlowId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchAccountReceptionistStatus(opts: { client_lead_id?: string; wl_client_id?: string }) {
  let q = (supabase as any).from("v_account_receptionist_status").select("*");
  if (opts.client_lead_id) q = q.eq("client_lead_id", opts.client_lead_id);
  if (opts.wl_client_id) q = q.eq("wl_client_id", opts.wl_client_id);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMyReceptionistSummary(): Promise<ClientReceptionistSummary | null> {
  const { data, error } = await (supabase as any)
    .from("v_client_receptionist_summary")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function setReceptionistEnabled(configId: string, enabled: boolean, reason?: string) {
  const { data, error } = await (supabase as any).rpc("set_receptionist_enabled", {
    _config_id: configId,
    _enabled: enabled,
    _reason: reason ?? null,
  });
  if (error) throw error;
  return data as ReceptionistConfig;
}

export const READINESS_LABEL: Record<ReadinessState, string> = {
  unconfigured: "Not Configured",
  configured_offline: "Configured, Offline",
  awaiting_script_publish: "Awaiting Script Publish",
  awaiting_number: "Awaiting Phone Number",
  ready_to_activate: "Ready To Activate",
  live: "Live",
};
