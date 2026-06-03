/**
 * Phase 6 — Fulfillment status maps.
 * Partner-facing labels are deliberately neutral (no "24H" / "internal" wording).
 */

export type WLSubmissionStatus =
  | 'draft'
  | 'collecting_info'
  | 'ready_for_submission'
  | 'submitted_to_fulfillment'
  | 'needs_more_info'
  | 'resubmitted'
  | 'approved_for_activation'
  | 'activation_in_progress'
  | 'activated';

export type IntakeStatus =
  | 'new_submission'
  | 'received'
  | 'under_review'
  | 'needs_partner_update'
  | 'approved'
  | 'activation_in_progress'
  | 'activated'
  | 'closed';

export type IntakePriority = 'low' | 'normal' | 'high' | 'urgent';

export const SUBMISSION_STATUS_LABEL: Record<WLSubmissionStatus, string> = {
  draft: 'Draft',
  collecting_info: 'Collecting info',
  ready_for_submission: 'Ready for submission',
  submitted_to_fulfillment: 'Submitted',
  needs_more_info: 'More information required',
  resubmitted: 'Resubmitted',
  approved_for_activation: 'Approved for activation',
  activation_in_progress: 'Activation in progress',
  activated: 'Activated',
};

export const SUBMISSION_STATUS_VARIANT: Record<
  WLSubmissionStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'outline',
  collecting_info: 'outline',
  ready_for_submission: 'secondary',
  submitted_to_fulfillment: 'default',
  needs_more_info: 'destructive',
  resubmitted: 'default',
  approved_for_activation: 'secondary',
  activation_in_progress: 'default',
  activated: 'secondary',
};

export const INTAKE_STATUS_LABEL: Record<IntakeStatus, string> = {
  new_submission: 'New submission',
  received: 'Received',
  under_review: 'Under review',
  needs_partner_update: 'Needs partner update',
  approved: 'Approved',
  activation_in_progress: 'Activation in progress',
  activated: 'Activated',
  closed: 'Closed',
};

export const INTAKE_STATUS_VARIANT: Record<
  IntakeStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  new_submission: 'default',
  received: 'secondary',
  under_review: 'default',
  needs_partner_update: 'destructive',
  approved: 'secondary',
  activation_in_progress: 'default',
  activated: 'secondary',
  closed: 'outline',
};

export const INTAKE_PRIORITY_LABEL: Record<IntakePriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

/** Allowed admin transitions for intake status. */
export function canTransitionIntake(from: IntakeStatus, to: IntakeStatus): boolean {
  if (from === to) return false;
  const map: Record<IntakeStatus, IntakeStatus[]> = {
    new_submission: ['received', 'under_review', 'needs_partner_update', 'closed'],
    received: ['under_review', 'needs_partner_update', 'closed'],
    under_review: ['needs_partner_update', 'approved', 'closed'],
    needs_partner_update: ['under_review', 'closed'],
    approved: ['activation_in_progress', 'closed'],
    activation_in_progress: ['activated', 'closed'],
    activated: ['closed'],
    closed: [],
  };
  return map[from]?.includes(to) ?? false;
}

/** Whether the partner is allowed to (re)submit. */
export function canSubmitOrResubmit(
  status: WLSubmissionStatus,
  hasOpenRequests: boolean,
): { canSubmit: boolean; isResubmit: boolean; reason?: string } {
  if (status === 'collecting_info' || status === 'draft' || status === 'ready_for_submission') {
    return { canSubmit: true, isResubmit: false };
  }
  if (status === 'needs_more_info') {
    if (hasOpenRequests) {
      return {
        canSubmit: false,
        isResubmit: true,
        reason: 'Resolve all open requests before resubmitting.',
      };
    }
    return { canSubmit: true, isResubmit: true };
  }
  return { canSubmit: false, isResubmit: false, reason: 'No action available right now.' };
}
