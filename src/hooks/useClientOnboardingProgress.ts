import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Ordered checklist for direct clients. Mirrors directClientTemplate.ts and the
 * legacy lead.onboarding_checklist keys. The first item that is still false
 * becomes the "next step" the resume nudge sends the user to.
 */
const CLIENT_ONBOARDING_STEPS: Array<{
  key: string;
  label: string;
  href: string;
}> = [
  { key: "consultation_completed", label: "Book your free consultation", href: "/get-started?interest=onboarding-consult" },
  { key: "business_name",          label: "Finish your business setup",   href: "/client-dashboard/settings" },
  { key: "primary_contact_name",   label: "Add your primary contact",     href: "/client-dashboard/settings" },
  { key: "primary_contact_phone",  label: "Add your contact phone",       href: "/client-dashboard/settings" },
  { key: "business_hours",         label: "Set your business hours",      href: "/client-dashboard/settings" },
  { key: "time_zone",              label: "Confirm your time zone",       href: "/client-dashboard/settings" },
  { key: "escalation_contact",     label: "Set your escalation contact",  href: "/client-dashboard/settings" },
  { key: "greeting_preference",    label: "Add your preferred greeting",  href: "/client-dashboard/settings" },
  { key: "call_flows_created",     label: "Build your first call flow",   href: "/call-flow-builder" },
  { key: "scripts_written",        label: "Review your agent script",     href: "/client-dashboard/scripts" },
  { key: "dispositions_configured",   label: "Configure call dispositions",     href: "/client-dashboard/support" },
  { key: "post_call_flow_setup",      label: "Set up post-call notes flow",     href: "/client-dashboard/support" },
  { key: "forwarding_number_assigned",label: "Get your forwarding number",      href: "/client-dashboard/support" },
  { key: "test_call_completed",       label: "Run your go-live test call",      href: "/client-dashboard/support" },
];

export interface OnboardingProgress {
  loading: boolean;
  isComplete: boolean;
  completedSteps: number;
  totalSteps: number;
  percent: number;
  nextStep: { key: string; label: string; href: string } | null;
}

const EMPTY: OnboardingProgress = {
  loading: true,
  isComplete: false,
  completedSteps: 0,
  totalSteps: CLIENT_ONBOARDING_STEPS.length,
  percent: 0,
  nextStep: null,
};

/**
 * Reads leads.onboarding_checklist for the signed-in client and returns
 * progress + the deep-link to the first incomplete step. Safe to call from
 * any client-dashboard surface; returns `loading=true` until resolved and
 * `isComplete=true` (with nextStep=null) when no data is found, so the
 * caller never shows a nudge to non-clients or fully-onboarded users.
 */
export function useClientOnboardingProgress(): OnboardingProgress {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingProgress>(EMPTY);

  useEffect(() => {
    if (!user) {
      setState({ ...EMPTY, loading: false, isComplete: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("onboarding_checklist")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        // No lead row found → not a direct client OR not onboarded via leads.
        // Treat as complete so we never nudge admins/staff/WL users.
        setState({ ...EMPTY, loading: false, isComplete: true });
        return;
      }

      const raw = (data.onboarding_checklist ?? {}) as Record<string, unknown>;
      const checklist: Record<string, boolean> = {};
      for (const k of Object.keys(raw)) {
        checklist[k] = raw[k] === true;
      }

      const total = CLIENT_ONBOARDING_STEPS.length;
      let completed = 0;
      let nextStep: OnboardingProgress["nextStep"] = null;
      for (const step of CLIENT_ONBOARDING_STEPS) {
        if (checklist[step.key]) {
          completed += 1;
        } else if (!nextStep) {
          nextStep = step;
        }
      }
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      setState({
        loading: false,
        isComplete: nextStep === null,
        completedSteps: completed,
        totalSteps: total,
        percent,
        nextStep,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
