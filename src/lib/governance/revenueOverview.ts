/**
 * Phase 3 — Typed wrappers over the Revenue reporting views.
 * These views are SECURITY INVOKER and rely on the caller's RLS context.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PipelineStage } from "@/lib/revenue/pipeline";

export interface RevenuePipelineRow {
  pipeline_stage: PipelineStage;
  lead_count: number;
  estimated_value_usd: number;
  unassigned_count: number;
  overdue_followups: number;
}

export async function fetchRevenuePipeline(): Promise<RevenuePipelineRow[]> {
  const { data, error } = await supabase
    .from("v_revenue_pipeline" as never)
    .select("*");
  if (error) throw error;
  return (data ?? []) as unknown as RevenuePipelineRow[];
}

export interface RevenueLead360Row {
  lead_id: string;
  name: string;
  email: string;
  company: string | null;
  source: string | null;
  pipeline_stage: PipelineStage;
  lead_temperature: string | null;
  assigned_sales_rep: string | null;
  qualified_at: string | null;
  won_at: string | null;
  lost_at: string | null;
  meetings_count: number;
  latest_meeting_at: string | null;
  proposals_count: number;
  latest_proposal_sent_at: string | null;
  has_affiliate_referral: boolean;
  converted: boolean;
}

export async function fetchRevenueLead360(leadId: string): Promise<RevenueLead360Row | null> {
  const { data, error } = await supabase
    .from("v_revenue_lead_360" as never)
    .select("*")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as RevenueLead360Row) ?? null;
}

/** Atomic Revenue→Delivery handoff. Idempotent server-side. */
export async function convertLeadToDelivery(leadId: string, notes?: string | null) {
  const { data, error } = await supabase.rpc(
    "convert_lead_to_delivery" as never,
    { _lead_id: leadId, _notes: notes ?? null } as never,
  );
  if (error) throw error;
  return data as { lead_id: string; conversion_id: string; intake_id: string; intake_number: string; idempotent?: boolean };
}
