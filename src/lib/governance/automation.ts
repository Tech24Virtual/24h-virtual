/**
 * Phase 8 — Automation / Optimization Layer
 *
 * Typed wrappers around automation_recommendations + check runs.
 * All calls assume admin RLS context; UI must be admin-gated.
 *
 * Safety tiers (canonical):
 *   - detect      → surface-only signal, no action implied
 *   - recommend   → deterministic recommendation, operator drills in
 *   - confirm     → action available but requires explicit confirmation
 *   - auto_safe   → reversible, narrowly scoped automation (none yet)
 */
import { supabase } from "@/integrations/supabase/client";

export type AutomationDomain =
  | "growth"
  | "revenue"
  | "delivery"
  | "voice"
  | "wl"
  | "system";

export type AutomationTier = "detect" | "recommend" | "confirm" | "auto_safe";
export type AutomationSeverity = "info" | "notice" | "warn" | "critical";
export type AutomationStatus = "open" | "dismissed" | "resolved";

export interface AutomationRecommendation {
  id: string;
  domain: AutomationDomain;
  kind: string;
  tier: AutomationTier;
  severity: AutomationSeverity;
  title: string;
  detail: string | null;
  drill_route: string | null;
  dedupe_key: string;
  payload: Record<string, unknown>;
  status: AutomationStatus;
  resolved_reason: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  first_detected_at: string;
  last_detected_at: string;
}

export interface AutomationCheckRun {
  id: string;
  check_name: string;
  status: "success" | "failed";
  recs_created: number;
  recs_resolved: number;
  error_text: string | null;
  ran_at: string;
  triggered_by: string;
}

export async function fetchOpenRecommendations(opts?: {
  domain?: AutomationDomain;
  limit?: number;
}): Promise<AutomationRecommendation[]> {
  let q = (supabase as any)
    .from("v_open_recommendations")
    .select("*")
    .order("severity_rank", { ascending: false })
    .order("last_detected_at", { ascending: false })
    .limit(opts?.limit ?? 200);
  if (opts?.domain) q = q.eq("domain", opts.domain);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AutomationRecommendation[];
}

export async function fetchRecentCheckRuns(limit = 25): Promise<AutomationCheckRun[]> {
  const { data, error } = await (supabase as any)
    .from("automation_check_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AutomationCheckRun[];
}

/** Operator-confirmed manual run. Logs a check_run row + dashboard event. */
export async function runRecommendationChecksNow(): Promise<{
  seen: number;
  created: number;
  resolved: number;
}> {
  const { data, error } = await (supabase as any).rpc(
    "generate_automation_recommendations",
  );
  if (error) {
    await (supabase as any).rpc("record_automation_check_run", {
      p_check_name: "generate_automation_recommendations",
      p_status: "failed",
      p_recs_created: 0,
      p_recs_resolved: 0,
      p_error_text: error.message,
      p_triggered_by: "manual",
    });
    throw error;
  }
  const result = (data ?? {}) as { seen?: number; created?: number; resolved?: number };
  await (supabase as any).rpc("record_automation_check_run", {
    p_check_name: "generate_automation_recommendations",
    p_status: "success",
    p_recs_created: result.created ?? 0,
    p_recs_resolved: result.resolved ?? 0,
    p_error_text: null,
    p_triggered_by: "manual",
  });
  return {
    seen: result.seen ?? 0,
    created: result.created ?? 0,
    resolved: result.resolved ?? 0,
  };
}

export async function dismissRecommendation(
  id: string,
  reason?: string,
): Promise<AutomationRecommendation> {
  const { data, error } = await (supabase as any).rpc("dismiss_recommendation", {
    p_id: id,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data as AutomationRecommendation;
}

export async function resolveRecommendation(
  id: string,
  reason?: string,
): Promise<AutomationRecommendation> {
  const { data, error } = await (supabase as any).rpc("resolve_recommendation", {
    p_id: id,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data as AutomationRecommendation;
}

/**
 * Drift summary across canonical readiness vs actual state.
 * Currently a thin grouping over the recommendation set so we have a
 * single inspectable surface; not a separate compute path.
 */
export interface DriftSummary {
  domain: AutomationDomain;
  open_count: number;
  warn_count: number;
}

export async function fetchDriftSummary(): Promise<DriftSummary[]> {
  const recs = await fetchOpenRecommendations({ limit: 500 });
  const map = new Map<AutomationDomain, DriftSummary>();
  for (const r of recs) {
    const d = map.get(r.domain) ?? { domain: r.domain, open_count: 0, warn_count: 0 };
    d.open_count += 1;
    if (r.severity === "warn" || r.severity === "critical") d.warn_count += 1;
    map.set(r.domain, d);
  }
  return Array.from(map.values()).sort((a, b) => b.warn_count - a.warn_count);
}

export const AUTOMATION_TIER_INFO: Record<AutomationTier, { label: string; help: string }> = {
  detect: { label: "Detect", help: "Surface-only signal, no action implied." },
  recommend: { label: "Recommend", help: "Deterministic recommendation. Operator drills in." },
  confirm: { label: "Operator confirm", help: "Action available but requires explicit confirmation." },
  auto_safe: { label: "Auto-safe", help: "Reversible, narrowly scoped automation." },
};
