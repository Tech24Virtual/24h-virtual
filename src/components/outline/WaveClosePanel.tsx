import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBuildPhaseOverrides } from "@/hooks/useBuildPhaseOverrides";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  Lock,
  RotateCcw,
  ShieldCheck,
  Unlock,
  Zap,
} from "lucide-react";

/**
 * Wave 1 closeout checklist + diagnostic validator.
 *
 * Flow:
 *   1. Closeout panel is hidden until a staff user confirms signoff.
 *   2. Confirming signoff is itself gated by the Diagnostic Validator:
 *      the user must paste the 4 probe outputs from
 *      `/admin/launch-checklist` Wave 1 RLS card. Each probe is parsed
 *      against expected substrings; missing or red/fail outputs block
 *      the confirm button.
 *   3. Once confirmed, the explicit 5-step closeout checklist renders
 *      and each step is independently tickable + persisted.
 *
 * All state persisted in admin_settings under key
 * `wave_1_uat_signoff_confirmed` with shape:
 *   { confirmed, confirmed_at, confirmed_by, steps, probes, probes_valid_at }
 */

const STORAGE_KEY = "wave_1_uat_signoff_confirmed";

const CLOSEOUT_STEPS: { id: string; label: string; detail: string }[] = [
  {
    id: "flip-qa-gate",
    label: "Flip wave1Gates.qa to complete",
    detail: "in src/data/buildMap.ts: in-progress → complete",
  },
  {
    id: "unlock-wave-1",
    label: "Flip wave1Gates.locked to false",
    detail: "Wave 1 no longer gates Wave 2",
  },
  {
    id: "promote-wave-1",
    label: "Set Wave 1 phase status to built",
    detail: "active → built (effectiveStatus guard then renders Built)",
  },
  {
    id: "promote-wave-2",
    label: "Set Wave 2 phase status to active",
    detail: "deferred → active (now the active build, gates Wave 3)",
  },
  {
    id: "update-exit-criteria",
    label: "Reference the signoff artifact in Wave 1 exit criteria",
    detail: "Last bullet of wave1Contract.exitCriteria → .lovable/wave-1-uat-signoff.md",
  },
];

type ProbeKey =
  | "tenant_campaigns"
  | "tenant_scenarios"
  | "anon_campaigns"
  | "anon_scenarios";

interface ProbeSpec {
  key: ProbeKey;
  label: string;
  expected: string;
  /** Required substrings (case-insensitive) — at least one must be present. */
  okAny: string[];
  /** Hard-required substrings (case-insensitive) — all must be present. */
  okAll: string[];
}

const PROBES: ProbeSpec[] = [
  {
    key: "tenant_campaigns",
    label: "Tenant SELECT — campaigns",
    expected: "green / rows visible to current tenant only",
    okAny: ["green", "pass", "ok"],
    okAll: ["row"],
  },
  {
    key: "tenant_scenarios",
    label: "Tenant SELECT — scenarios",
    expected: "green / rows visible to current tenant only",
    okAny: ["green", "pass", "ok"],
    okAll: ["row"],
  },
  {
    key: "anon_campaigns",
    label: "Anonymous SELECT — campaigns",
    expected: "green / 0 rows",
    okAny: ["green", "pass", "ok"],
    okAll: ["0"],
  },
  {
    key: "anon_scenarios",
    label: "Anonymous SELECT — scenarios",
    expected: "green / 0 rows",
    okAny: ["green", "pass", "ok"],
    okAll: ["0"],
  },
];

const FAIL_TOKENS = ["red", "fail", "error", "amber", "denied"];

interface ProbeValidation {
  filled: boolean;
  passed: boolean;
  reason?: string;
}

function validateProbe(spec: ProbeSpec, raw: string): ProbeValidation {
  const value = raw.trim();
  if (!value) return { filled: false, passed: false, reason: "Empty" };
  const lower = value.toLowerCase();

  const failHit = FAIL_TOKENS.find((t) => lower.includes(t));
  if (failHit) {
    return { filled: true, passed: false, reason: `Contains "${failHit}"` };
  }

  const anyOk = spec.okAny.some((t) => lower.includes(t));
  if (!anyOk) {
    return {
      filled: true,
      passed: false,
      reason: `Missing one of: ${spec.okAny.join(", ")}`,
    };
  }

  const missingRequired = spec.okAll.find((t) => !lower.includes(t));
  if (missingRequired) {
    return {
      filled: true,
      passed: false,
      reason: `Missing required token "${missingRequired}"`,
    };
  }

  return { filled: true, passed: true };
}

interface SignoffValue {
  confirmed: boolean;
  confirmed_at?: string;
  confirmed_by?: string;
  steps?: Record<string, boolean>;
  probes?: Partial<Record<ProbeKey, string>>;
  probes_valid_at?: string;
}

interface AdminSettingRow {
  value: SignoffValue | null;
  updated_at: string | null;
}

const EMPTY_SIGNOFF: SignoffValue = { confirmed: false };

export function WaveClosePanel({ canEdit }: { canEdit: boolean }) {
  const { user } = useAuth();
  const [signoff, setSignoff] = useState<SignoffValue>(EMPTY_SIGNOFF);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Local-only validator drafts (not persisted until "Lock probes" is clicked)
  const [probeDrafts, setProbeDrafts] = useState<Record<ProbeKey, string>>({
    tenant_campaigns: "",
    tenant_scenarios: "",
    anon_campaigns: "",
    anon_scenarios: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value, updated_at")
        .eq("key", STORAGE_KEY)
        .maybeSingle<AdminSettingRow>();
      if (!mounted) return;
      const v = (data?.value as SignoffValue | null) ?? EMPTY_SIGNOFF;
      setSignoff(v);
      setUpdatedAt(data?.updated_at ?? null);
      // Hydrate drafts from persisted probes so the validator survives reload
      if (v.probes) {
        setProbeDrafts((prev) => ({
          tenant_campaigns: v.probes?.tenant_campaigns ?? prev.tenant_campaigns,
          tenant_scenarios: v.probes?.tenant_scenarios ?? prev.tenant_scenarios,
          anon_campaigns: v.probes?.anon_campaigns ?? prev.anon_campaigns,
          anon_scenarios: v.probes?.anon_scenarios ?? prev.anon_scenarios,
        }));
      }
      setLoading(false);
    })();

    // Sync local state from realtime updates (e.g. Undo from another tab)
    const channel = supabase
      .channel("wave_close_panel_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_settings",
          filter: `key=eq.${STORAGE_KEY}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setSignoff(EMPTY_SIGNOFF);
            return;
          }
          const next = ((payload.new as { value?: SignoffValue | null })?.value ??
            EMPTY_SIGNOFF) as SignoffValue;
          setSignoff(next);
          setUpdatedAt(new Date().toISOString());
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Live validation against the in-progress drafts
  const validations = useMemo(() => {
    const out: Record<ProbeKey, ProbeValidation> = {} as Record<
      ProbeKey,
      ProbeValidation
    >;
    PROBES.forEach((p) => {
      out[p.key] = validateProbe(p, probeDrafts[p.key]);
    });
    return out;
  }, [probeDrafts]);

  const allProbesPass = PROBES.every((p) => validations[p.key].passed);
  const anyFilled = PROBES.some((p) => validations[p.key].filled);

  const persist = async (next: SignoffValue) => {
    if (!user) return;
    setSaving(true);
    setSignoff(next);
    const { error } = await supabase.from("admin_settings").upsert(
      [
        {
          key: STORAGE_KEY,
          value: next as unknown as import("@/integrations/supabase/types").Json,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", STORAGE_KEY)
        .maybeSingle<{ value: SignoffValue | null }>();
      setSignoff((data?.value as SignoffValue | null) ?? EMPTY_SIGNOFF);
    } else {
      setUpdatedAt(new Date().toISOString());
    }
  };

  const confirmSignoff = () => {
    if (!allProbesPass) return; // Hard guard
    persist({
      confirmed: true,
      confirmed_at: new Date().toISOString(),
      confirmed_by: user?.id,
      steps: {},
      probes: { ...probeDrafts },
      probes_valid_at: new Date().toISOString(),
    });
  };

  /**
   * Undo closeout: mechanically revert the entire signoff (confirmed=false,
   * all 5 step toggles cleared, probes wiped). Realtime propagation will
   * disengage the override layer and /outline reverts immediately.
   */
  const undoCloseout = () => {
    void persist({ confirmed: false });
    toast("Wave 1 closeout reverted.", {
      description: "Gates restored, Wave 2 demoted to Deferred.",
    });
  };

  const toggleStep = (stepId: string) => {
    const steps = { ...(signoff.steps ?? {}) };
    steps[stepId] = !steps[stepId];
    persist({ ...signoff, steps });
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-background/40 p-4 text-xs text-muted-foreground">
        Loading closeout state…
      </div>
    );
  }

  // ─── State 1: NOT yet confirmed → show validator + gated confirm ──
  if (!signoff.confirmed) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-background/40 p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">Phase Closeout Checklist</div>
            <p className="text-xs text-muted-foreground mt-1">
              The explicit closeout steps appear once a staff user confirms{" "}
              <span className="font-mono text-foreground">
                "Wave 1 UAT signed off, all green."
              </span>{" "}
              Until then, the Wave 1 QA gate stays{" "}
              <span className="font-medium text-amber-700">In Progress</span>.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Procedure:{" "}
              <span className="font-mono">.lovable/wave-1-rls-checklist.md</span>. Record:{" "}
              <span className="font-mono">.lovable/wave-1-uat-signoff.md</span>.
            </p>

            {canEdit ? (
              <div className="mt-4 space-y-3 rounded-md border border-border/60 bg-background/60 p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-foreground" />
                  <div className="text-xs font-semibold text-foreground">
                    Diagnostic Validator
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      allProbesPass
                        ? "ml-auto bg-green-500/10 text-green-700 border-green-500/30"
                        : anyFilled
                          ? "ml-auto bg-amber-500/15 text-amber-700 border-amber-500/40"
                          : "ml-auto bg-muted text-muted-foreground"
                    }
                  >
                    {allProbesPass
                      ? "All 4 probes valid"
                      : anyFilled
                        ? `${PROBES.filter((p) => validations[p.key].passed).length} of 4 valid`
                        : "Not started"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Open <span className="font-mono">/admin/launch-checklist</span>, run the
                  Wave 1 Campaigns RLS card, then paste each probe's verbatim output
                  below. Inputs containing{" "}
                  <span className="font-mono">red / fail / error / amber / denied</span>{" "}
                  are rejected. Confirm is disabled until all 4 are valid.
                </p>

                <div className="space-y-2.5">
                  {PROBES.map((probe) => {
                    const v = validations[probe.key];
                    const draft = probeDrafts[probe.key];
                    return (
                      <div key={probe.key} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor={`probe-${probe.key}`}
                            className="text-[11px] font-medium text-foreground"
                          >
                            {probe.label}
                          </label>
                          <span
                            className={`text-[10px] font-mono ${
                              !v.filled
                                ? "text-muted-foreground"
                                : v.passed
                                  ? "text-green-700"
                                  : "text-destructive"
                            }`}
                          >
                            {!v.filled
                              ? "empty"
                              : v.passed
                                ? "✓ valid"
                                : `✗ ${v.reason}`}
                          </span>
                        </div>
                        <Textarea
                          id={`probe-${probe.key}`}
                          value={draft}
                          onChange={(e) =>
                            setProbeDrafts((prev) => ({
                              ...prev,
                              [probe.key]: e.target.value,
                            }))
                          }
                          placeholder={`Expected: ${probe.expected}`}
                          rows={2}
                          className={`text-xs font-mono ${
                            v.filled && !v.passed
                              ? "border-destructive/60 focus-visible:ring-destructive/40"
                              : v.passed
                                ? "border-green-500/40"
                                : ""
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {!allProbesPass && anyFilled && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-2">
                    <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                    <p className="text-[11px] text-destructive">
                      One or more probes are missing or invalid. Fix or re-run the
                      diagnostic before confirming signoff.
                    </p>
                  </div>
                )}

                <Button
                  size="sm"
                  variant={allProbesPass ? "default" : "outline"}
                  className="mt-1 w-full"
                  onClick={confirmSignoff}
                  disabled={saving || !allProbesPass}
                >
                  <FileSignature className="w-3.5 h-3.5 mr-1.5" />
                  {allProbesPass
                    ? 'Confirm "Wave 1 UAT signed off, all green"'
                    : "Confirm disabled until all 4 probes are valid"}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Sign in as staff to run the validator and confirm signoff.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── State 2: Confirmed → show explicit checklist ───────────────
  const steps = signoff.steps ?? {};
  const completed = CLOSEOUT_STEPS.filter((s) => steps[s.id]).length;
  const allDone = completed === CLOSEOUT_STEPS.length;

  return (
    <div className="rounded-lg border-2 border-green-500/30 bg-green-500/5 p-4">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-green-700" />
          <div>
            <div className="text-sm font-semibold text-foreground">Phase Closeout Checklist</div>
            <p className="text-xs text-muted-foreground">
              Signoff confirmed
              {signoff.confirmed_at
                ? ` on ${new Date(signoff.confirmed_at).toLocaleString()}`
                : ""}
              . Walk these steps to flip the gates and promote Wave 2.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            allDone
              ? "bg-green-500/10 text-green-700 border-green-500/30"
              : "bg-amber-500/15 text-amber-700 border-amber-500/40"
          }
        >
          {completed} of {CLOSEOUT_STEPS.length} done
        </Badge>
      </div>

      <ol className="space-y-1.5">
        {CLOSEOUT_STEPS.map((step, idx) => {
          const checked = !!steps[step.id];
          return (
            <li
              key={step.id}
              className="flex items-start gap-3 px-3 py-2 rounded-md bg-background/60"
            >
              <Checkbox
                checked={checked}
                disabled={!canEdit || saving}
                onCheckedChange={() => toggleStep(step.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground">
                  <span className="font-mono text-xs text-muted-foreground mr-2">{idx + 1}.</span>
                  {step.label}
                </div>
                <div className="text-xs text-muted-foreground ml-6">{step.detail}</div>
              </div>
              {checked && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />}
            </li>
          );
        })}
      </ol>

      {signoff.probes && (
        <details className="mt-3 rounded-md border border-border/60 bg-background/60 p-2">
          <summary className="text-xs font-medium text-foreground cursor-pointer">
            Validated probe outputs (audit record)
          </summary>
          <div className="mt-2 space-y-2">
            {PROBES.map((probe) => (
              <div key={probe.key} className="text-[11px]">
                <div className="font-medium text-muted-foreground">{probe.label}</div>
                <pre className="mt-0.5 p-1.5 rounded bg-muted/50 text-foreground whitespace-pre-wrap break-words font-mono text-[10px]">
                  {signoff.probes?.[probe.key] || "—"}
                </pre>
              </div>
            ))}
            {signoff.probes_valid_at && (
              <div className="text-[10px] text-muted-foreground">
                Validated {new Date(signoff.probes_valid_at).toLocaleString()}
              </div>
            )}
          </div>
        </details>
      )}

      <ClosureFollowUp
        allDone={allDone}
        canEdit={canEdit}
        saving={saving}
        onUndo={undoCloseout}
        updatedAt={updatedAt}
      />
    </div>
  );
}

/**
 * Verification strip + Undo closeout button.
 * Reads phases from the same override hook /outline uses, so what the
 * user sees here is what /outline sees, in the same paint frame.
 * Fires a one-shot toast on the 0→5 transition.
 */
function ClosureFollowUp({
  allDone,
  canEdit,
  saving,
  onUndo,
  updatedAt,
}: {
  allDone: boolean;
  canEdit: boolean;
  saving: boolean;
  onUndo: () => void;
  updatedAt: string | null;
}) {
  const { phases, isOverridden } = useBuildPhaseOverrides();
  const wave1 = phases.find((p) => p.id === "wave-1");
  const wave2 = phases.find((p) => p.id === "wave-2");

  // Initialize to current override state so a hard refresh on an
  // already-flipped page does NOT re-fire the closeout toast.
  // Only true 0→1 transitions within the live session trigger it.
  const flippedRef = useRef(isOverridden);
  useEffect(() => {
    if (isOverridden && !flippedRef.current) {
      flippedRef.current = true;
      toast.success("Wave 1 closed. Gates flipped, Wave 2 promoted.", {
        description: "Wave 1 is now Built. Wave 2 is the new Active Build.",
      });
    }
    if (!isOverridden) {
      // Re-arm so a future re-flip in the same session also fires the toast.
      flippedRef.current = false;
    }
  }, [isOverridden]);

  const verifications: { label: string; ok: boolean; detail: string }[] = [
    {
      label: "Wave 1 status",
      ok: wave1?.status === "built",
      detail: wave1?.status === "built" ? "Built" : `Currently ${wave1?.status ?? "unknown"}`,
    },
    {
      label: "Wave 1 QA gate",
      ok: wave1?.gates.qa === "complete",
      detail: wave1?.gates.qa === "complete" ? "Complete" : `Currently ${wave1?.gates.qa ?? "unknown"}`,
    },
    {
      label: "Wave 1 lock",
      ok: wave1?.gates.locked === false,
      detail: wave1?.gates.locked === false ? "Unlocked" : "Locked",
    },
    {
      label: "Wave 2 status",
      ok: wave2?.status === "active",
      detail: wave2?.status === "active" ? "Active Build" : `Currently ${wave2?.status ?? "unknown"}`,
    },
  ];

  return (
    <>
      {isOverridden && (
        <div className="mt-4 rounded-md border border-green-500/40 bg-green-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-green-700" />
            <div className="text-xs font-semibold text-foreground">
              Override Verification
            </div>
            <Badge
              variant="outline"
              className="ml-auto bg-green-500/10 text-green-700 border-green-500/30"
            >
              Live from /outline
            </Badge>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {verifications.map((v) => (
              <li
                key={v.label}
                className="flex items-center gap-2 text-xs text-foreground"
              >
                {v.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                )}
                <span className="font-medium">{v.label}:</span>
                <span className={v.ok ? "text-foreground" : "text-destructive"}>
                  {v.detail}
                </span>
                {v.label === "Wave 1 lock" &&
                  (v.ok ? (
                    <Unlock className="w-3 h-3 text-green-600 ml-auto" />
                  ) : (
                    <Lock className="w-3 h-3 text-destructive ml-auto" />
                  ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {allDone
            ? "All 5 closeout steps complete. Override is live: /outline now renders Wave 1 as Built and Wave 2 as Active."
            : "Tick each step. The override engages automatically on the 5th."}
        </p>
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={onUndo}
            disabled={saving}
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Undo closeout
          </Button>
        )}
      </div>
      {updatedAt && (
        <p className="text-[10px] text-muted-foreground mt-2">
          State synced {new Date(updatedAt).toLocaleString()}
        </p>
      )}
    </>
  );
}
