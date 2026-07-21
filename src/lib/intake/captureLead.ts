/**
 * Phase 1 — Public → Revenue canonical intake helper.
 *
 * Every public lead-entry surface (Get Started, Call Advisor, Cost Calculator,
 * Launch Estimator, Demo, GPT Advisor, Exit Intent, Blog Lead, Live Chat,
 * Coming-Soon page, future entrypoints) should use this helper instead of
 * calling `supabase.from('leads').insert(...)` directly so we have:
 *
 *   1. one normalized lead-source vocabulary,
 *   2. one default initial pipeline_stage,
 *   3. one consistent audit/event path (the DB triggers added in Phase 1
 *      already emit `lead.captured` + `lead.stage.changed` to
 *      `dashboard_events` and `audit_log` automatically — do not re-emit).
 *
 * Existing callers can adopt this opportunistically; the database triggers
 * unify observability whether or not the caller has migrated yet.
 */

import { supabase } from "@/integrations/supabase/client";

/** Canonical lead-source vocabulary. Keep this in sync with the
 *  `dashboard_events.surface` values used by Phase 1 triggers. */
export type LeadSource =
  | "onboarding_wizard"
  | "call_advisor"
  | "gpt_advisor"
  | "cost_calculator"
  | "launch_estimator"
  | "call_flow_builder"
  | "demo_consultation"
  | "exit_intent"
  | "blog_lead"
  | "chat_widget"
  | "partner_interest"
  | "coming_soon"
  | "contact_form"
  | "admin_manual"
  // Lead intake pipeline (supabase/functions/lead-intake) — website contact
  // forms and WL partner / affiliate / referral applications.
  | "website"
  | "wl_partner_request"
  | "affiliate_request"
  | "referral_request"
  | "manual"
  | "import"
  | "five9"
  | "zapier"
  | "api"
  | "sales_team"
  | "other";

export interface CaptureLeadInput {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  source: LeadSource;
  notes?: string | null;
  service_type?: string | null;
  plan_minutes?: number | null;
  billing_period?: "monthly" | "annual" | null;
  billing_currency?: string | null;
  country?: string | null;
  /** Anything surface-specific the funnel wants to remember. Stored on the
   *  lead's notes/metadata; do not leak PII keys here. */
  metadata?: Record<string, unknown>;
}

export interface CaptureLeadResult {
  id: string | null;
  duplicate: boolean;
  error?: string;
}

/**
 * Insert a new lead with normalized defaults. The DB-side
 * `validate_lead_before_insert` trigger handles email normalization and
 * dedup checks; `trg_leads_emit_capture` emits the `lead.captured` event.
 */
export async function captureLead(
  input: CaptureLeadInput,
): Promise<CaptureLeadResult> {
  try {
    const composedNotes = [
      input.notes ?? "",
      input.metadata && Object.keys(input.metadata).length
        ? `\n\n[funnel-metadata]\n${JSON.stringify(input.metadata, null, 2)}`
        : "",
    ]
      .join("")
      .trim();

    const { data, error } = await supabase
      .from("leads")
      .insert({
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        company: input.company ?? null,
        source: input.source,
        status: "new",
        pipeline_stage: "new",
        notes: composedNotes || null,
        service_type: input.service_type ?? null,
        plan_minutes: input.plan_minutes ?? null,
        billing_period: input.billing_period ?? "monthly",
        billing_currency: input.billing_currency ?? "usd",
        country: input.country ?? "US",
      })
      .select("id")
      .maybeSingle();

    if (error) {
      // Treat trigger-raised duplicate emails as a soft success.
      if (/duplicate|already.*exists/i.test(error.message)) {
        return { id: null, duplicate: true };
      }
      return { id: null, duplicate: false, error: error.message };
    }

    return { id: data?.id ?? null, duplicate: false };
  } catch (err) {
    return {
      id: null,
      duplicate: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}
