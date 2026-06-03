import type { BuildPhase } from "@/data/buildMap";

/**
 * Wave 1 self-finish: runtime override layer.
 *
 * The canonical declarative spec lives in `src/data/buildMap.ts` and is
 * NEVER mutated for wave-status flips. Instead, this pure helper clones
 * the phase array at runtime and rewrites the two phases affected by a
 * Wave 1 closeout, keyed off persisted signoff state in `admin_settings`.
 *
 * Extension path for later waves:
 *   - Add a Wave 2 signoff key (e.g. wave_2_uat_signoff_confirmed) and
 *     mirror the wave-1 → built / wave-2 → built / wave-3 → active block.
 */

export interface PhaseOverridesInput {
  /** Wave 1 signoff confirmed in the validator. */
  signoffConfirmed: boolean;
  /** All 5 Wave 1 closeout steps are complete. */
  allStepsComplete: boolean;
}

export function applyPhaseOverrides(
  phases: BuildPhase[],
  { signoffConfirmed, allStepsComplete }: PhaseOverridesInput,
): BuildPhase[] {
  if (!signoffConfirmed || !allStepsComplete) return phases;

  // Phases that should be force-opened the moment Wave 1 closes.
  // Wave 2 is now Built (shipped via Batches A–H). Wave 3 becomes the
  // primary active build. Phase F/G/H gates remain open for parallel work.
  const BUILT_DOWNSTREAM = new Set(["wave-2"]);
  const ACTIVE_DOWNSTREAM = new Set([
    "wave-3",
    "phase-f",
    "phase-g",
    "phase-h",
  ]);

  return phases.map((p) => {
    if (p.id === "wave-1") {
      return {
        ...p,
        status: "built",
        gates: { ...p.gates, qa: "complete", locked: false },
      };
    }
    if (BUILT_DOWNSTREAM.has(p.id)) {
      return {
        ...p,
        status: "built",
        gates: { ...p.gates, locked: false },
      };
    }
    if (ACTIVE_DOWNSTREAM.has(p.id)) {
      return {
        ...p,
        status: "active",
        gates: { ...p.gates, locked: false },
      };
    }
    return p;
  });
}

export const WAVE_1_CLOSEOUT_STEP_IDS = [
  "flip-qa-gate",
  "unlock-wave-1",
  "promote-wave-1",
  "promote-wave-2",
  "update-exit-criteria",
] as const;

export type Wave1CloseoutStepId = (typeof WAVE_1_CLOSEOUT_STEP_IDS)[number];

export interface Wave1SignoffValue {
  confirmed: boolean;
  confirmed_at?: string;
  confirmed_by?: string;
  steps?: Record<string, boolean>;
  probes?: Record<string, string>;
  probes_valid_at?: string;
}

export function deriveOverrideFlags(
  signoff: Wave1SignoffValue | null | undefined,
): PhaseOverridesInput {
  const confirmed = !!signoff?.confirmed;
  const steps = signoff?.steps ?? {};
  const allStepsComplete =
    confirmed && WAVE_1_CLOSEOUT_STEP_IDS.every((id) => !!steps[id]);
  return { signoffConfirmed: confirmed, allStepsComplete };
}
