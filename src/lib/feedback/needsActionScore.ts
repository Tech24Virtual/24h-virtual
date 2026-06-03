// Sort score for feedback queues. Higher = more urgent.
// Designed for client-side sorting of already-loaded rows.

import { firstResponseAgeRatio } from './sla';

interface ScoreInput {
  status: string;
  priority: string;
  type: string | null;
  source_dashboard?: string | null;
  created_at: string;
}

export function needsActionScore(row: ScoreInput, now: Date = new Date()): number {
  let score = 0;

  // WL escalations always pinned at the top of admin views.
  if (row.source_dashboard === 'wl_partner_escalation') score += 100;

  // Priority weight
  if (row.priority === 'urgent') score += 40;
  else if (row.priority === 'high') score += 20;
  else if (row.priority === 'low') score -= 5;

  // Bugs elevated, ideas demoted
  if (row.type === 'bug') score += 10;
  if (row.type === 'idea') score -= 5;

  // New + waiting > SLA contribution
  if (row.status === 'new') score += 5;
  const ratio = firstResponseAgeRatio(row.created_at, row.status, row.type ?? 'feedback', row.priority, now);
  if (ratio !== null) {
    if (ratio > 1) score += 15;
    else if (ratio >= 0.75) score += 8;
    else if (ratio >= 0.5) score += 4;
  }

  // Terminal states sink to the bottom (kept positive so age still tiebreaks among them)
  if (row.status === 'resolved' || row.status === 'closed') score -= 1000;

  return score;
}
