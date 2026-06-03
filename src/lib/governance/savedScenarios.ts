/**
 * Phase 25 — Saved scenarios (admin-only)
 *
 * Persists scenario planning artifacts. Reuses Phase 21 baseline + lever
 * shapes; output is stored as a snapshot of the projection at save time so
 * comparisons are stable. Scenarios are explicitly planning inputs, not
 * forecasts.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ScenarioLevers, ScenarioOutput } from "./scenarioModeling";

export interface SavedScenarioRow {
  id: string;
  label: string;
  notes: string | null;
  baseline: any;
  levers: ScenarioLevers;
  output: ScenarioOutput | null;
  scenario_key: string | null;
  archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchSavedScenarios(includeArchived = false): Promise<SavedScenarioRow[]> {
  let q = (supabase as any).from("saved_scenarios").select("*").order("created_at", { ascending: false });
  if (!includeArchived) q = q.eq("archived", false);
  const { data, error } = await q;
  if (error) { console.warn("savedScenarios:list", error.message); return []; }
  return (data ?? []) as SavedScenarioRow[];
}

export async function saveScenario(input: {
  label: string;
  notes?: string;
  baseline: any;
  levers: ScenarioLevers;
  output: ScenarioOutput;
  scenario_key?: string;
}): Promise<SavedScenarioRow | null> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from("saved_scenarios")
    .insert({
      label: input.label,
      notes: input.notes ?? null,
      baseline: input.baseline,
      levers: input.levers,
      output: input.output,
      scenario_key: input.scenario_key ?? null,
      created_by: u?.user?.id ?? null,
    })
    .select()
    .single();
  if (error) { console.warn("savedScenarios:save", error.message); return null; }
  return data as SavedScenarioRow;
}

export async function archiveScenario(id: string, archived = true): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("saved_scenarios").update({ archived }).eq("id", id);
  if (error) { console.warn("savedScenarios:archive", error.message); return false; }
  return true;
}

export async function duplicateScenario(id: string, newLabel: string): Promise<SavedScenarioRow | null> {
  const { data: src, error: e1 } = await (supabase as any)
    .from("saved_scenarios").select("*").eq("id", id).maybeSingle();
  if (e1 || !src) return null;
  return saveScenario({
    label: newLabel,
    notes: src.notes ?? undefined,
    baseline: src.baseline,
    levers: src.levers,
    output: src.output,
    scenario_key: src.scenario_key ?? undefined,
  });
}
