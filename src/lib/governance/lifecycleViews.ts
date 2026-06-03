/**
 * Phase 1 — Cross-domain reporting spine.
 *
 * Thin typed wrappers over the two SQL views introduced in Phase 1:
 *
 *   - public.v_lifecycle_overview  (one row per lead, marketing→billing)
 *   - public.v_intake_pipeline     (one row per fulfillment intake)
 *
 * Both views are SECURITY INVOKER and rely on existing RLS, so admins and
 * supervisors will see all rows while other roles will see nothing. There
 * is no separate guard at the API layer.
 */

import { supabase } from "@/integrations/supabase/client";

export interface LifecycleRow {
  lead_id: string;
  name: string;
  email: string;
  company: string | null;
  source: string;
  pipeline_stage: string | null;
  lead_temperature: string | null;
  score: number | null;
  assigned_sales_rep: string | null;
  assigned_onboarding_rep: string | null;
  country: string | null;
  billing_currency: string | null;
  service_type: string | null;
  lead_created_at: string;
  converted: boolean;
  converted_at: string | null;
  intake_status: string | null;
  intake_id: string | null;
  campaigns_count: number;
  active_campaigns: number;
  last_call_at: string | null;
  last_payment_status: string | null;
  payment_failure_count: number | null;
}

export interface IntakeRow {
  id: string;
  intake_number: string;
  source: "wl" | "direct";
  status: string;
  priority: string;
  partner_id: string | null;
  client_lead_id: string | null;
  submitted_by: string | null;
  submitted_at: string;
  received_at: string | null;
  approved_at: string | null;
  activated_at: string | null;
  closed_at: string | null;
  assigned_to: string | null;
  age_hours: number;
  lead_name: string | null;
  lead_email: string | null;
  partner_name: string | null;
}

export async function fetchLifecycleOverview(limit = 200): Promise<LifecycleRow[]> {
  const { data, error } = await supabase
    .from("v_lifecycle_overview" as never)
    .select("*")
    .order("lead_created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as LifecycleRow[];
}

export async function fetchIntakePipeline(limit = 200): Promise<IntakeRow[]> {
  const { data, error } = await supabase
    .from("v_intake_pipeline" as never)
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as IntakeRow[];
}
