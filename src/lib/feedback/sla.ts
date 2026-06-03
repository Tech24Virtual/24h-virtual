// Internal operator SLA targets for the unified feedback system.
//
// V1 RULES (locked):
//   - These are INTERNAL sort/aging signals only.
//   - Not customer-facing commitments.
//   - No automated breach actions, no timers.
//   - Only first-response targets are surfaced visually in V1.
//   - Resolution targets exist in code for future use.

export type FeedbackType = 'bug' | 'help' | 'idea' | 'feedback' | string;
export type FeedbackPriority = 'low' | 'normal' | 'high' | 'urgent' | string;

interface Targets {
  firstResponseHours: number;
  resolutionHours: number; // V1: not displayed
}

// Hours. Business hours not modeled in V1; treated as wall-clock for sorting only.
const TABLE: Record<string, Record<string, Targets>> = {
  bug: {
    urgent: { firstResponseHours: 1, resolutionHours: 8 },
    high: { firstResponseHours: 4, resolutionHours: 24 },
    normal: { firstResponseHours: 24, resolutionHours: 72 },
    low: { firstResponseHours: 72, resolutionHours: 168 },
  },
  help: {
    urgent: { firstResponseHours: 2, resolutionHours: 24 },
    high: { firstResponseHours: 8, resolutionHours: 48 },
    normal: { firstResponseHours: 24, resolutionHours: 72 },
    low: { firstResponseHours: 72, resolutionHours: 168 },
  },
  idea: {
    urgent: { firstResponseHours: 24, resolutionHours: 240 },
    high: { firstResponseHours: 48, resolutionHours: 240 },
    normal: { firstResponseHours: 120, resolutionHours: 720 },
    low: { firstResponseHours: 240, resolutionHours: 720 },
  },
  feedback: {
    urgent: { firstResponseHours: 24, resolutionHours: 240 },
    high: { firstResponseHours: 48, resolutionHours: 240 },
    normal: { firstResponseHours: 120, resolutionHours: 720 },
    low: { firstResponseHours: 240, resolutionHours: 720 },
  },
};

export function getSlaTargets(type: FeedbackType, priority: FeedbackPriority): Targets {
  const t = TABLE[type] ?? TABLE.feedback;
  return t[priority] ?? t.normal;
}

/**
 * Returns ratio of elapsed time to first-response target.
 *  < 0.5  → "fresh"
 *  0.5..1 → "approaching"
 *  > 1    → "over"
 * Returns null when status indicates work has begun (first-response satisfied).
 */
export function firstResponseAgeRatio(
  createdAt: string,
  status: string,
  type: FeedbackType,
  priority: FeedbackPriority,
  now: Date = new Date(),
): number | null {
  if (status !== 'new') return null;
  const { firstResponseHours } = getSlaTargets(type, priority);
  const elapsedH = (now.getTime() - new Date(createdAt).getTime()) / 3_600_000;
  return elapsedH / firstResponseHours;
}

export type AgeBand = 'fresh' | 'approaching' | 'over' | 'inactive';

export function ageBand(ratio: number | null): AgeBand {
  if (ratio === null) return 'inactive';
  if (ratio > 1) return 'over';
  if (ratio >= 0.5) return 'approaching';
  return 'fresh';
}
