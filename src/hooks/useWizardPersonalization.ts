import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface WizardPersonalization {
  loading: boolean;
  hasSession: boolean;
  isComplete: boolean;
  service: string | null;
  industry: string | null;
  planMinutes: number | null;
  billingPeriod: string | null;
  country: string | null;
  currentStep: number;
  completedSteps: number[];
  totalSteps: number;
  /** Where to send the user to keep going. */
  resumeHref: string;
  /** Updated wizard data payload (raw). */
  data: Record<string, unknown> | null;
  /** True when an admin converted this user via ConvertLeadToAccountDialog (no wizard run). */
  convertedViaAdmin: boolean;
}

const TOTAL_STEPS = 6;

const EMPTY: WizardPersonalization = {
  loading: true,
  hasSession: false,
  isComplete: false,
  service: null,
  industry: null,
  planMinutes: null,
  billingPeriod: null,
  country: null,
  currentStep: 1,
  completedSteps: [],
  totalSteps: TOTAL_STEPS,
  resumeHref: "/get-started",
  data: null,
  convertedViaAdmin: false,
};

/**
 * Reads the most recent wizard_sessions row for the signed-in user (matched by
 * user_id or email) so dashboard surfaces can show step-aware, service-aware,
 * industry-aware content right after each step is completed.
 *
 * Also detects the "admin converted lead" path: if no wizard session exists
 * but a client_onboarding_handoffs row from the direct_client_default template
 * is present, sets `convertedViaAdmin = true` so the hero can render the
 * "your account is live" variant.
 */
export function useWizardPersonalization(): WizardPersonalization {
  const { user } = useAuth();
  const [state, setState] = useState<WizardPersonalization>(EMPTY);

  useEffect(() => {
    if (!user) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      const email = user.email?.toLowerCase() ?? "";
      // Try by user_id first; fall back to email.
      const byUser = await supabase
        .from("wizard_sessions")
        .select("service, industry, plan_minutes, billing_period, country, current_step, completed_steps, is_complete, data")
        .eq("user_id", user.id)
        .order("last_activity_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let row = byUser.data;
      if (!row && email) {
        const byEmail = await supabase
          .from("wizard_sessions")
          .select("service, industry, plan_minutes, billing_period, country, current_step, completed_steps, is_complete, data")
          .ilike("email", email)
          .order("last_activity_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        row = byEmail.data;
      }

      if (cancelled) return;

      if (row) {
        const completed = (row.completed_steps as number[] | null) ?? [];
        const current = row.current_step ?? 1;
        const resumeStep = row.is_complete ? TOTAL_STEPS : Math.max(current, 1);
        setState({
          loading: false,
          hasSession: true,
          isComplete: !!row.is_complete,
          service: (row.service as string | null) ?? null,
          industry: (row.industry as string | null) ?? null,
          planMinutes: (row.plan_minutes as number | null) ?? null,
          billingPeriod: (row.billing_period as string | null) ?? null,
          country: (row.country as string | null) ?? null,
          currentStep: current,
          completedSteps: completed,
          totalSteps: TOTAL_STEPS,
          resumeHref: row.is_complete ? "/client-dashboard/settings" : `/get-started?step=${resumeStep}`,
          data: (row.data as Record<string, unknown> | null) ?? null,
          convertedViaAdmin: false,
        });
        return;
      }

      // No wizard session — check for admin-converted handoff.
      const { data: handoff } = await supabase
        .from("client_onboarding_handoffs")
        .select("id, checklist_template")
        .eq("client_user_id", user.id)
        .eq("checklist_template", "direct_client_default")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      setState({
        ...EMPTY,
        loading: false,
        convertedViaAdmin: !!handoff,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
