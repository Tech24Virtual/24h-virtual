/**
 * Outline status model.
 *
 * Five user-visible statuses that drive the new /outline console:
 *   complete    — the feature is genuinely shipped and meets its outcome.
 *   in_progress — actively being built right now.
 *   blocked     — waiting on something else (a dependency, a decision, a fix).
 *   planned     — next up but not started yet.
 *   later       — backlog. Useful but not in the active arc.
 *
 * Status is derived from buildMap.ts + the active phase + an admin-editable
 * override layer stored in admin_settings under key `outline_status_overrides`.
 * Overrides always win, so the founder can manually correct anything that
 * doesn't match reality.
 */

import type {
  BuildMapItem,
  BuildPhase,
  BuildPhaseStatus,
} from "@/data/buildMap";

export type OutlineStatus =
  | "complete"
  | "in_progress"
  | "blocked"
  | "planned"
  | "later";

export interface OutlineStatusOverride {
  status: OutlineStatus;
  note?: string;
  updated_at?: string;
  updated_by?: string | null;
}

export type OutlineStatusOverrideMap = Record<string, OutlineStatusOverride>;

export const OUTLINE_STATUS_LABEL: Record<OutlineStatus, string> = {
  complete: "Complete",
  in_progress: "In Progress",
  blocked: "Blocked",
  planned: "Planned",
  later: "Later",
};

export const OUTLINE_STATUS_DESCRIPTION: Record<OutlineStatus, string> = {
  complete: "Shipped and meets its outcome.",
  in_progress: "Actively being built right now.",
  blocked: "Waiting on something to unblock it.",
  planned: "Next up, not started yet.",
  later: "Backlog. Not in the active arc.",
};

/**
 * Derive a per-item OutlineStatus from the buildMap state, the parent phase,
 * and an optional explicit override.
 */
export function deriveOutlineStatus(
  item: BuildMapItem,
  phase: BuildPhase | null,
  override?: OutlineStatusOverride | null,
): OutlineStatus {
  if (override?.status) return override.status;

  if (item.status === "done") return "complete";

  if (item.status === "in-progress") return "in_progress";

  // Item is "planned" — let phase status break the tie.
  const eff: BuildPhaseStatus | undefined = phase?.status;
  if (eff === "deferred") return "later";
  return "planned";
}

export interface ResolvedOutlineItem {
  item: BuildMapItem;
  phase: BuildPhase;
  status: OutlineStatus;
  override: OutlineStatusOverride | null;
  /** True if the parent phase is the currently active one. */
  inActivePhase: boolean;
}

/**
 * Walk every phase × item, attach derived status, and return one flat list.
 */
export function resolveOutlineItems(
  phases: BuildPhase[],
  overrides: OutlineStatusOverrideMap,
): ResolvedOutlineItem[] {
  const out: ResolvedOutlineItem[] = [];
  for (const phase of phases) {
    const inActive = phase.status === "active";
    for (const item of phase.items) {
      const override = overrides[item.id] ?? null;
      out.push({
        item,
        phase,
        status: deriveOutlineStatus(item, phase, override),
        override,
        inActivePhase: inActive,
      });
    }
  }
  return out;
}

/**
 * Pick the next things the founder should actually build.
 * Priority:
 *   1. Items already In Progress (finish what's started).
 *   2. Planned items in the active phase.
 *   3. Planned items in the next non-deferred, non-active phase.
 * Blocked items are excluded (they appear in their own section).
 */
export function pickBuildNext(
  resolved: ResolvedOutlineItem[],
  limit = 6,
): ResolvedOutlineItem[] {
  const inProgress = resolved.filter((r) => r.status === "in_progress");
  const plannedActive = resolved.filter(
    (r) => r.status === "planned" && r.inActivePhase,
  );

  // Find the next phase by phase.order that is not active, not deferred,
  // not fully complete.
  const remainingPhases = Array.from(
    new Set(
      resolved
        .filter((r) => !r.inActivePhase && r.phase.status !== "deferred")
        .map((r) => r.phase),
    ),
  ).sort((a, b) => a.order - b.order);

  const nextPhase = remainingPhases.find((p) =>
    resolved.some(
      (r) =>
        r.phase.id === p.id &&
        (r.status === "planned" || r.status === "in_progress"),
    ),
  );
  const plannedNext = nextPhase
    ? resolved.filter(
        (r) => r.phase.id === nextPhase.id && r.status === "planned",
      )
    : [];

  return [...inProgress, ...plannedActive, ...plannedNext].slice(0, limit);
}

/**
 * Counts for the top summary bar.
 */
export interface OutlineSummary {
  total: number;
  complete: number;
  in_progress: number;
  blocked: number;
  planned: number;
  later: number;
}

export function summarize(resolved: ResolvedOutlineItem[]): OutlineSummary {
  const s: OutlineSummary = {
    total: resolved.length,
    complete: 0,
    in_progress: 0,
    blocked: 0,
    planned: 0,
    later: 0,
  };
  for (const r of resolved) s[r.status] += 1;
  return s;
}
