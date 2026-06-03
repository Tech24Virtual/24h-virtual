/**
 * Phase 31 — Success Playbook Automation
 *
 * Lightweight, governed automation around partner + direct success plays.
 * Templates, suggestions, and reminders. Not a CRM, not a workflow engine.
 *
 * Trust contract:
 *   - All triggers are rule-based and traceable to existing opportunity views
 *     (v_partner_success_opportunities, v_direct_success_opportunities).
 *   - "Suggest, then approve" is the default. auto_create=true is opt-in per
 *     template.
 *   - All automation is internal-facing. No outbound comms here.
 */
import { supabase } from "@/integrations/supabase/client";

export type PlaybookScope = "partner" | "direct";
export type PlaybookPlayType = "educate" | "upsell" | "save" | "onboard" | "reactivate";
export type PlaybookTriggerType =
  | "opportunity"
  | "state_change"
  | "metric_threshold"
  | "time_since_event"
  | "manual";

export interface PlaybookTemplate {
  id: string;
  scope: PlaybookScope;
  play_type: PlaybookPlayType;
  template_key: string;
  title: string;
  description: string | null;
  trigger_type: PlaybookTriggerType;
  trigger_definition: Record<string, unknown>;
  default_steps: unknown[];
  default_followup_days: number;
  auto_create: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaySuggestion {
  id: string;
  scope: PlaybookScope;
  target_id: string;
  template_id: string;
  opportunity_type: PlaybookPlayType;
  reason: string;
  status: "pending" | "accepted" | "dismissed" | "auto_created";
  created_at: string;
  template_title: string;
  template_play_type: PlaybookPlayType;
  default_followup_days: number;
  auto_create: boolean;
  target_label: string | null;
}

export interface OverduePartnerPlay {
  id: string;
  partner_id: string;
  company_name: string | null;
  play_type: PlaybookPlayType;
  status: string;
  due_date: string;
  last_touch_at: string | null;
  notes: string | null;
  template_id: string | null;
  template_title: string | null;
  days_overdue: number;
}

export interface OverdueDirectPlay {
  id: string;
  lead_id: string;
  name: string | null;
  company: string | null;
  play_type: PlaybookPlayType;
  status: string;
  due_date: string;
  last_touch_at: string | null;
  notes: string | null;
  template_id: string | null;
  template_title: string | null;
  days_overdue: number;
}

// ── Templates ─────────────────────────────────────────────────────────────
export async function fetchPlaybookTemplates(): Promise<PlaybookTemplate[]> {
  const { data, error } = await (supabase as any)
    .from("playbook_templates")
    .select("*")
    .order("scope")
    .order("play_type");
  if (error) {
    console.warn("playbookAutomation: templates", error.message);
    return [];
  }
  return (data ?? []) as PlaybookTemplate[];
}

export async function updatePlaybookTemplate(
  id: string,
  patch: Partial<Pick<PlaybookTemplate, "title" | "description" | "default_followup_days" | "auto_create" | "active" | "trigger_definition">>,
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("playbook_templates")
    .update(patch)
    .eq("id", id);
  if (error) {
    console.warn("playbookAutomation: update template", error.message);
    return false;
  }
  return true;
}

// ── Suggestions ───────────────────────────────────────────────────────────
export async function fetchOpenSuggestions(): Promise<PlaySuggestion[]> {
  const { data, error } = await (supabase as any)
    .from("v_play_suggestions_open")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("playbookAutomation: suggestions", error.message);
    return [];
  }
  return (data ?? []) as PlaySuggestion[];
}

export async function generateSuggestions(): Promise<{
  pending_inserted: number;
  auto_created: number;
} | null> {
  const { data, error } = await (supabase as any).rpc("generate_playbook_suggestions");
  if (error) {
    console.warn("playbookAutomation: generate", error.message);
    return null;
  }
  return data as any;
}

export async function acceptSuggestion(id: string, notes?: string): Promise<string | null> {
  const { data, error } = await (supabase as any).rpc("accept_play_suggestion", {
    p_suggestion_id: id,
    p_notes: notes ?? null,
  });
  if (error) {
    console.warn("playbookAutomation: accept", error.message);
    return null;
  }
  return data as string;
}

export async function dismissSuggestion(id: string): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc("dismiss_play_suggestion", {
    p_suggestion_id: id,
  });
  if (error) {
    console.warn("playbookAutomation: dismiss", error.message);
    return false;
  }
  return Boolean(data);
}

// ── Reminders / overdue ───────────────────────────────────────────────────
export async function fetchOverduePartnerPlays(): Promise<OverduePartnerPlay[]> {
  const { data, error } = await (supabase as any)
    .from("v_partner_overdue_plays")
    .select("*")
    .order("days_overdue", { ascending: false });
  if (error) {
    console.warn("playbookAutomation: partner overdue", error.message);
    return [];
  }
  return (data ?? []) as OverduePartnerPlay[];
}

export async function fetchOverdueDirectPlays(): Promise<OverdueDirectPlay[]> {
  const { data, error } = await (supabase as any)
    .from("v_direct_overdue_plays")
    .select("*")
    .order("days_overdue", { ascending: false });
  if (error) {
    console.warn("playbookAutomation: direct overdue", error.message);
    return [];
  }
  return (data ?? []) as OverdueDirectPlay[];
}

export async function touchPlay(
  scope: PlaybookScope,
  id: string,
): Promise<boolean> {
  const table = scope === "partner" ? "partner_success_plays" : "direct_success_plays";
  const { error } = await (supabase as any)
    .from(table)
    .update({ last_touch_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.warn("playbookAutomation: touch", error.message);
    return false;
  }
  return true;
}

export const TRIGGER_TYPE_LABEL: Record<PlaybookTriggerType, string> = {
  opportunity: "Opportunity rule",
  state_change: "State change",
  metric_threshold: "Metric threshold",
  time_since_event: "Time since event",
  manual: "Manual",
};
