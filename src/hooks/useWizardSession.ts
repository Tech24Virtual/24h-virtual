import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WizardData } from "@/pages/GetStarted";

const TOKEN_KEY = "wizardSession:token";
const ID_KEY = "wizardSession:id";

function genToken(): string {
  // 32 hex chars (~128 bits). Bearer secret for anonymous wizard sessions.
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface UseWizardSessionResult {
  sessionId: string | null;
  sessionToken: string | null;
  /** Persist current step + data without marking it complete. */
  saveStep: (step: number, data: WizardData) => Promise<void>;
  /** Mark a step as completed (adds to completed_steps[]). */
  completeStep: (step: number, data: WizardData) => Promise<void>;
  /** Mark the entire wizard as complete and link the lead row. */
  finalize: (data: WizardData, leadId?: string | null) => Promise<void>;
}

/**
 * Progressive CRM-style persistence for the Get Started wizard.
 *
 * Creates one wizard_sessions row on mount (anonymous, bearer token in
 * localStorage), then upserts after every step transition so each step
 * completion can drive personalized dashboard content.
 */
export function useWizardSession(): UseWizardSessionResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const initRef = useRef<Promise<void> | null>(null);

  const ensureSession = useCallback(async (): Promise<{ id: string; token: string } | null> => {
    if (sessionId && sessionToken) return { id: sessionId, token: sessionToken };

    if (!initRef.current) {
      initRef.current = (async () => {
        try {
          let token = localStorage.getItem(TOKEN_KEY);
          let id = localStorage.getItem(ID_KEY);

          if (token && id) {
            // Verify the row still exists (and is not finalized for too long).
            const { data: existing } = await supabase
              .from("wizard_sessions")
              .select("id, is_complete, completed_at")
              .eq("session_token", token)
              .maybeSingle();
            if (existing?.id) {
              setSessionId(existing.id);
              setSessionToken(token);
              return;
            }
          }

          // Create a fresh session
          token = genToken();
          const { data: { user } } = await supabase.auth.getUser();
          const { data: created, error } = await supabase
            .from("wizard_sessions")
            .insert({
              session_token: token,
              user_id: user?.id ?? null,
              email: user?.email ?? null,
              current_step: 1,
              completed_steps: [],
              data: {},
            })
            .select("id")
            .single();

          if (error || !created) {
            console.warn("wizard_sessions: failed to create", error);
            return;
          }

          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(ID_KEY, created.id);
          setSessionId(created.id);
          setSessionToken(token);
        } catch (e) {
          console.warn("wizard_sessions init error", e);
        }
      })();
    }
    await initRef.current;
    const t = localStorage.getItem(TOKEN_KEY);
    const i = localStorage.getItem(ID_KEY);
    return t && i ? { id: i, token: t } : null;
  }, [sessionId, sessionToken]);

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  const buildPatch = (step: number, data: WizardData) => ({
    current_step: step,
    data: data as unknown as never,
    service: data.service || null,
    industry: data.industry || null,
    country: data.country || null,
    billing_currency: data.billingCurrency || null,
    plan_minutes: data.minutes || null,
    billing_period: data.billingPeriod || null,
    email: data.email || null,
  });

  const saveStep = useCallback(async (step: number, data: WizardData) => {
    const s = await ensureSession();
    if (!s) return;
    const { error } = await supabase
      .from("wizard_sessions")
      .update(buildPatch(step, data))
      .eq("session_token", s.token);
    if (error) console.warn("wizard_sessions saveStep error", error);
  }, [ensureSession]);

  const completeStep = useCallback(async (step: number, data: WizardData) => {
    const s = await ensureSession();
    if (!s) return;
    // Read current completed_steps to merge
    const { data: row } = await supabase
      .from("wizard_sessions")
      .select("completed_steps")
      .eq("session_token", s.token)
      .maybeSingle();
    const prev = (row?.completed_steps as number[] | null) ?? [];
    const merged = Array.from(new Set([...prev, step])).sort((a, b) => a - b);
    const { error } = await supabase
      .from("wizard_sessions")
      .update({
        ...buildPatch(step, data),
        completed_steps: merged,
      })
      .eq("session_token", s.token);
    if (error) console.warn("wizard_sessions completeStep error", error);
  }, [ensureSession]);

  const finalize = useCallback(async (data: WizardData, leadId?: string | null) => {
    const s = await ensureSession();
    if (!s) return;
    const allSteps = [1, 2, 3, 4, 5, 6];
    const { error } = await supabase
      .from("wizard_sessions")
      .update({
        ...buildPatch(6, data),
        completed_steps: allSteps,
        is_complete: true,
        completed_at: new Date().toISOString(),
        ...(leadId ? { lead_id: leadId } : {}),
      })
      .eq("session_token", s.token);
    if (error) console.warn("wizard_sessions finalize error", error);
  }, [ensureSession]);

  return { sessionId, sessionToken, saveStep, completeStep, finalize };
}
