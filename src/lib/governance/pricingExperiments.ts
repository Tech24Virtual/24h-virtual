/**
 * Phase 23 — Pricing Experimentation & Plan Analytics
 *
 * Admin-only governed wrappers for pricing experiments. We do not introduce
 * a parallel plan/billing system — variants are documented packaging tests,
 * results compose canonical Phase 17 subscription truth via
 * v_pricing_experiment_results.
 */
import { supabase } from "@/integrations/supabase/client";

export type PricingExperimentStatus = "draft" | "active" | "closed" | "archived";

export interface PricingVariant {
  key: string;
  label: string;
  price_usd?: number;
  packaging?: string;
  notes?: string;
}

export interface PricingExperiment {
  id: string;
  name: string;
  hypothesis: string | null;
  status: PricingExperimentStatus;
  variants: PricingVariant[];
  notes: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricingExperimentResultRow {
  experiment_id: string;
  experiment_name: string;
  experiment_status: PricingExperimentStatus;
  variant_key: string | null;
  assignments: number;
  leads_assigned: number;
  visitors_assigned: number;
  leads_converted: number;
  active_subs: number;
  active_known_mrr_usd: number;
  avg_active_known_mrr_usd: number | null;
}

export interface PricingExperimentAssignmentInput {
  experiment_id: string;
  variant_key: string;
  lead_id?: string | null;
  visitor_key?: string | null;
  surface_key?: string | null;
}

export async function fetchPricingExperiments(): Promise<PricingExperiment[]> {
  const { data, error } = await (supabase as any)
    .from("pricing_experiments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("pricingExperiments: list", error.message);
    return [];
  }
  return (data ?? []) as PricingExperiment[];
}

export async function fetchPricingExperimentResults(): Promise<PricingExperimentResultRow[]> {
  const { data, error } = await (supabase as any)
    .from("v_pricing_experiment_results")
    .select("*");
  if (error) {
    console.warn("pricingExperiments: results", error.message);
    return [];
  }
  return (data ?? []) as PricingExperimentResultRow[];
}

export async function createPricingExperiment(input: {
  name: string;
  hypothesis?: string;
  variants: PricingVariant[];
  notes?: string;
}): Promise<PricingExperiment | null> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from("pricing_experiments")
    .insert({
      name: input.name,
      hypothesis: input.hypothesis ?? null,
      variants: input.variants,
      notes: input.notes ?? null,
      created_by: u?.user?.id ?? null,
      status: "draft",
    })
    .select()
    .single();
  if (error) {
    console.warn("pricingExperiments: create", error.message);
    return null;
  }
  return data as PricingExperiment;
}

export async function setExperimentStatus(
  id: string,
  status: PricingExperimentStatus,
): Promise<boolean> {
  const patch: any = { status };
  if (status === "active") patch.started_at = new Date().toISOString();
  if (status === "closed" || status === "archived") patch.ended_at = new Date().toISOString();
  const { error } = await (supabase as any)
    .from("pricing_experiments")
    .update(patch)
    .eq("id", id);
  if (error) {
    console.warn("pricingExperiments: setStatus", error.message);
    return false;
  }
  return true;
}

export async function recordAssignment(
  input: PricingExperimentAssignmentInput,
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("pricing_experiment_assignments")
    .insert(input);
  if (error) {
    console.warn("pricingExperiments: assign", error.message);
    return false;
  }
  return true;
}

export function formatUsd(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

export function conversionRate(row: PricingExperimentResultRow): number | null {
  const denom = row.leads_assigned;
  if (!denom) return null;
  return row.leads_converted / denom;
}
