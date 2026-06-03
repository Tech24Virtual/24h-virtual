/**
 * Phase 32 — Success Communications & Renewal Automation
 * Bounded, governed comms layer over Phase 31 plays + Phase 17 subscription truth.
 */
import { supabase } from "@/integrations/supabase/client";

export type CommScope = "partner" | "direct";
export type CommChannel = "in_app" | "email";
export type CommPlayType = "educate" | "upsell" | "save" | "onboard" | "reactivate" | "renewal";
export type CommActionStatus =
  | "suggested" | "approved" | "queued" | "sent" | "dismissed" | "failed" | "suppressed";
export type RenewalStage =
  | "approaching" | "outreach_started" | "awaiting_response" | "in_progress"
  | "renewed" | "downgraded" | "churned" | "lapsed";

export interface CommunicationTemplate {
  id: string;
  scope: CommScope;
  channel: CommChannel;
  play_type: CommPlayType;
  template_key: string;
  sequence_key: string | null;
  step_number: number;
  subject: string;
  body: string;
  allowed_tokens: string[];
  requires_approval: boolean;
  auto_send: boolean;
  suppression_hours: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunicationAction {
  id: string;
  scope: CommScope;
  target_id: string;
  template_id: string;
  play_id: string | null;
  channel: CommChannel;
  status: CommActionStatus;
  suppression_reason: string | null;
  rendered_subject: string | null;
  template_key?: string;
  template_subject?: string;
  sequence_key?: string | null;
  step_number?: number;
  play_type?: CommPlayType;
  requires_approval?: boolean;
  auto_send?: boolean;
  created_at: string;
  updated_at: string;
}

export interface RenewalWorkflow {
  id: string;
  scope: CommScope;
  target_id: string;
  subscription_id: string | null;
  renewal_date: string;
  stage: RenewalStage;
  outcome_notes: string | null;
  last_touch_at: string | null;
  days_to_renewal: number;
  created_at: string;
  updated_at: string;
}

// ── Templates ────────────────────────────────────────────────────────
export async function fetchCommunicationTemplates(): Promise<CommunicationTemplate[]> {
  const { data, error } = await (supabase as any)
    .from("communication_templates").select("*")
    .order("scope").order("play_type").order("step_number");
  if (error) { console.warn("comms: templates", error.message); return []; }
  return (data ?? []) as CommunicationTemplate[];
}

export async function updateCommunicationTemplate(
  id: string,
  patch: Partial<Pick<CommunicationTemplate,
    "subject"|"body"|"active"|"auto_send"|"requires_approval"|"suppression_hours"|"channel">>,
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("communication_templates").update(patch).eq("id", id);
  if (error) { console.warn("comms: update template", error.message); return false; }
  return true;
}

// ── Actions ──────────────────────────────────────────────────────────
export async function fetchOpenCommunicationActions(): Promise<CommunicationAction[]> {
  const { data, error } = await (supabase as any)
    .from("v_communication_actions_open").select("*")
    .order("created_at", { ascending: false }).limit(200);
  if (error) { console.warn("comms: open actions", error.message); return []; }
  return (data ?? []) as CommunicationAction[];
}

export async function generateCommunicationActions(): Promise<{
  inserted: number; suppressed: number; auto_sent: number;
} | null> {
  const { data, error } = await (supabase as any).rpc("generate_communication_actions");
  if (error) { console.warn("comms: generate", error.message); return null; }
  return data as any;
}

export async function approveCommunicationAction(id: string): Promise<boolean> {
  const { data, error } = await (supabase as any)
    .rpc("approve_communication_action", { p_action_id: id });
  if (error) { console.warn("comms: approve", error.message); return false; }
  return Boolean(data);
}

export async function dismissCommunicationAction(id: string): Promise<boolean> {
  const { data, error } = await (supabase as any)
    .rpc("dismiss_communication_action", { p_action_id: id });
  if (error) { console.warn("comms: dismiss", error.message); return false; }
  return Boolean(data);
}

export async function markCommunicationSent(id: string): Promise<boolean> {
  const { data, error } = await (supabase as any)
    .rpc("mark_communication_sent", { p_action_id: id });
  if (error) { console.warn("comms: sent", error.message); return false; }
  return Boolean(data);
}

// ── Renewal workflows ───────────────────────────────────────────────
export async function fetchRenewalPipeline(): Promise<RenewalWorkflow[]> {
  const { data, error } = await (supabase as any)
    .from("v_renewal_workflows_pipeline").select("*")
    .order("renewal_date", { ascending: true }).limit(500);
  if (error) { console.warn("comms: renewals", error.message); return []; }
  return (data ?? []) as RenewalWorkflow[];
}

export async function upsertRenewalWorkflow(
  scope: CommScope, target_id: string, renewal_date: string,
  stage: RenewalStage, notes?: string,
): Promise<string | null> {
  const { data, error } = await (supabase as any).rpc("upsert_renewal_workflow", {
    p_scope: scope, p_target_id: target_id, p_renewal_date: renewal_date,
    p_stage: stage, p_notes: notes ?? null,
  });
  if (error) { console.warn("comms: renewal upsert", error.message); return null; }
  return data as string;
}

export const STAGE_LABEL: Record<RenewalStage, string> = {
  approaching: "Approaching",
  outreach_started: "Outreach started",
  awaiting_response: "Awaiting response",
  in_progress: "In progress",
  renewed: "Renewed",
  downgraded: "Downgraded",
  churned: "Churned",
  lapsed: "Lapsed",
};

export const ACTION_STATUS_LABEL: Record<CommActionStatus, string> = {
  suggested: "Suggested",
  approved: "Approved",
  queued: "Queued",
  sent: "Sent",
  dismissed: "Dismissed",
  failed: "Failed",
  suppressed: "Suppressed",
};
