/**
 * Phase 4 — Typed wrappers over the Delivery reporting views and RPCs.
 * Views are SECURITY INVOKER and rely on the caller's RLS context.
 */
import { supabase } from "@/integrations/supabase/client";

export type IntakeStatus =
  | "new_submission"
  | "received"
  | "under_review"
  | "needs_partner_update"
  | "approved"
  | "activation_in_progress"
  | "activated"
  | "closed";

export const INTAKE_STATUSES: IntakeStatus[] = [
  "new_submission",
  "received",
  "under_review",
  "needs_partner_update",
  "approved",
  "activation_in_progress",
  "activated",
  "closed",
];

export interface DeliveryPipelineRow {
  status: IntakeStatus;
  intake_count: number;
  urgent_count: number;
  unassigned_count: number;
  wl_count: number;
  direct_count: number;
  oldest_submitted_at: string | null;
}

export async function fetchDeliveryPipeline(): Promise<DeliveryPipelineRow[]> {
  const { data, error } = await supabase
    .from("v_delivery_pipeline" as never)
    .select("*");
  if (error) throw error;
  return (data ?? []) as unknown as DeliveryPipelineRow[];
}

export interface AccountDelivery360Row {
  lead_id: string;
  name: string;
  company: string | null;
  pipeline_stage: string;
  intake_id: string | null;
  intake_number: string | null;
  intake_status: IntakeStatus | null;
  intake_priority: string | null;
  activated_at: string | null;
  handoff_id: string | null;
  handoff_status: string | null;
  checklist_template: string | null;
  campaigns_count: number;
  live_campaigns_count: number;
  open_tickets_count: number;
}

export async function fetchAccountDelivery360(
  leadId: string,
): Promise<AccountDelivery360Row | null> {
  const { data, error } = await supabase
    .from("v_account_delivery_360" as never)
    .select("*")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as AccountDelivery360Row) ?? null;
}

export interface ClientDeliveryStatusRow {
  lead_id: string;
  name: string;
  company: string | null;
  service_state:
    | "not_started"
    | "collecting_info"
    | "in_review"
    | "live"
    | string;
  onboarding_status: string | null;
  fulfillment_status: IntakeStatus | null;
  intake_number: string | null;
  activated_at: string | null;
  live_campaigns_count: number;
  total_campaigns_count: number;
  open_tickets_count: number;
  last_delivery_event_at: string | null;
}

/** Client-safe; returns the row(s) the authed client is permitted to see. */
export async function fetchMyDeliveryStatus(): Promise<ClientDeliveryStatusRow | null> {
  const { data, error } = await supabase
    .from("v_client_delivery_status" as never)
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ClientDeliveryStatusRow) ?? null;
}

/** Admin/supervisor only — moves an intake through the canonical 8-status vocab. */
export async function setIntakeStatus(
  intakeId: string,
  newStatus: IntakeStatus,
  note?: string | null,
) {
  const { data, error } = await supabase.rpc(
    "set_intake_status" as never,
    { _intake_id: intakeId, _new_status: newStatus, _note: note ?? null } as never,
  );
  if (error) throw error;
  return data as { intake_id: string; from: IntakeStatus; to: IntakeStatus };
}
