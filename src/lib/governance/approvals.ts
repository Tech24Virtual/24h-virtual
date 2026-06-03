/**
 * Phase 34 — Commercial Approvals & Discount Governance
 * Thin helpers around approval_policies, approval_requests, and the
 * evaluate/decide RPCs. Admin-only surface; every decision is auditable
 * via decided_by / decided_at + audit_log triggers downstream.
 */
import { supabase } from "@/integrations/supabase/client";

export type ApprovalState = "not_required" | "pending" | "approved" | "rejected";
export type ApprovalRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type PolicyScope = "direct" | "partner" | "both";
export type PolicyDealType = "renewal" | "expansion" | "downsell" | "save" | "any";

export interface ApprovalPolicy {
  id: string;
  name: string;
  description: string | null;
  scope: PolicyScope;
  deal_type: PolicyDealType;
  min_discount_pct: number | null;
  triggers_on_non_standard_term: boolean;
  triggers_on_exception: boolean;
  triggers_on_unknown_discount: boolean;
  required_approver_role: string;
  tier: number;
  sla_hours: number;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpenApprovalRequest {
  id: string;
  deal_id: string;
  policy_id: string | null;
  policy_name: string | null;
  required_role: string;
  tier: number;
  reason: string | null;
  requested_at: string;
  hours_pending: number | null;
  scope: string;
  deal_type: string;
  target_id: string;
  stage: string;
  approval_state: ApprovalState;
  estimated_discount_pct: number | null;
  is_non_standard_term: boolean;
  is_exception: boolean;
  proposed_plan_key: string | null;
  proposed_term_months: number | null;
  proposed_price_summary: string | null;
}

export interface ApprovalRequestRow {
  id: string;
  deal_id: string;
  policy_id: string | null;
  required_role: string;
  tier: number;
  status: ApprovalRequestStatus;
  reason: string | null;
  decision_notes: string | null;
  decided_by: string | null;
  decided_at: string | null;
  requested_at: string;
  created_at: string;
  updated_at: string;
}

export async function fetchPolicies(): Promise<ApprovalPolicy[]> {
  const { data, error } = await (supabase as any)
    .from("approval_policies").select("*")
    .order("tier", { ascending: true })
    .order("name", { ascending: true });
  if (error) { console.warn("approvals: policies", error.message); return []; }
  return (data ?? []) as ApprovalPolicy[];
}

export async function fetchOpenApprovalRequests(): Promise<OpenApprovalRequest[]> {
  const { data, error } = await (supabase as any)
    .from("v_open_approval_requests").select("*").limit(500);
  if (error) { console.warn("approvals: open", error.message); return []; }
  return (data ?? []) as OpenApprovalRequest[];
}

export async function fetchDealApprovalHistory(dealId: string): Promise<ApprovalRequestRow[]> {
  const { data, error } = await (supabase as any)
    .from("approval_requests").select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });
  if (error) { console.warn("approvals: history", error.message); return []; }
  return (data ?? []) as ApprovalRequestRow[];
}

export interface DealApprovalTimelineRow {
  id: string;
  deal_id: string;
  policy_id: string | null;
  policy_name: string | null;
  required_role: string;
  tier: number;
  status: ApprovalRequestStatus;
  reason: string | null;
  decision_notes: string | null;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  requested_at: string;
  created_at: string;
  updated_at: string;
  sla_hours_snapshot: number | null;
  created_notified_at: string | null;
  sla_notified_at: string | null;
  estimated_discount_pct_snapshot: number | null;
  is_non_standard_term_snapshot: boolean | null;
  is_exception_snapshot: boolean | null;
  proposed_plan_key_snapshot: string | null;
  proposed_term_months_snapshot: number | null;
  hours_to_decision: number | null;
  hours_pending: number | null;
  is_sla_breached: boolean;
}

export async function fetchDealApprovalTimeline(dealId: string): Promise<DealApprovalTimelineRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_deal_approval_timeline")
    .select("*")
    .eq("deal_id", dealId)
    .order("requested_at", { ascending: true });
  if (error) { console.warn("approvals: timeline", error.message); return []; }
  return (data ?? []) as DealApprovalTimelineRow[];
}

export async function evaluateDealApprovals(dealId: string): Promise<any | null> {
  const { data, error } = await (supabase as any).rpc("evaluate_deal_approvals", {
    p_deal_id: dealId,
  });
  if (error) { console.warn("approvals: evaluate", error.message); return null; }
  return data;
}

export async function decideApprovalRequest(
  requestId: string,
  decision: "approved" | "rejected" | "cancelled",
  notes?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await (supabase as any).rpc("decide_approval_request", {
    p_request_id: requestId,
    p_decision: decision,
    p_notes: notes ?? null,
  });
  if (error) {
    console.warn("approvals: decide", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function upsertPolicy(p: Partial<ApprovalPolicy> & { name: string; scope: PolicyScope; deal_type: PolicyDealType }): Promise<boolean> {
  const payload: any = {
    name: p.name,
    description: p.description ?? null,
    scope: p.scope,
    deal_type: p.deal_type,
    min_discount_pct: p.min_discount_pct ?? null,
    triggers_on_non_standard_term: p.triggers_on_non_standard_term ?? false,
    triggers_on_exception: p.triggers_on_exception ?? false,
    triggers_on_unknown_discount: p.triggers_on_unknown_discount ?? false,
    required_approver_role: p.required_approver_role ?? "admin",
    tier: p.tier ?? 1,
    sla_hours: p.sla_hours ?? 24,
    active: p.active ?? true,
    notes: p.notes ?? null,
  };
  if (p.id) payload.id = p.id;
  const { error } = await (supabase as any).from("approval_policies").upsert(payload);
  if (error) { console.warn("approvals: upsert policy", error.message); return false; }
  return true;
}

export async function setPolicyActive(id: string, active: boolean): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("approval_policies").update({ active }).eq("id", id);
  if (error) { console.warn("approvals: toggle policy", error.message); return false; }
  return true;
}

export async function deletePolicy(id: string): Promise<boolean> {
  const { error } = await (supabase as any).from("approval_policies").delete().eq("id", id);
  if (error) { console.warn("approvals: delete policy", error.message); return false; }
  return true;
}

export interface ApprovalPolicyVersion {
  id: string;
  policy_id: string;
  version_no: number;
  action: "created" | "updated" | "activated" | "deactivated" | "deleted";
  changed_by: string | null;
  changed_at: string;
  diff: Record<string, { from: any; to: any }>;
  snapshot: Record<string, any>;
}

export async function fetchPolicyVersions(policyId: string): Promise<ApprovalPolicyVersion[]> {
  const { data, error } = await (supabase as any)
    .from("approval_policy_versions")
    .select("*")
    .eq("policy_id", policyId)
    .order("version_no", { ascending: false });
  if (error) { console.warn("approvals: versions", error.message); return []; }
  return (data ?? []) as ApprovalPolicyVersion[];
}

export async function updateDealGovernanceFields(
  dealId: string,
  fields: { estimated_discount_pct?: number | null; is_non_standard_term?: boolean; is_exception?: boolean },
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("renewal_expansion_deals").update(fields).eq("id", dealId);
  if (error) { console.warn("approvals: update deal flags", error.message); return false; }
  return true;
}

export const APPROVAL_STATE_LABEL: Record<ApprovalState, string> = {
  not_required: "Not required",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};
