/**
 * Phase 7 — Canonical fulfillment lifecycle and audience projection.
 *
 * One workflow, four projections (admin / supervisor / partner / client).
 * Internal labels never leak to partner or client surfaces.
 */
import type { IntakeStatus, WLSubmissionStatus } from './fulfillmentStatus';

export type Phase =
  | 'proposal_accepted'
  | 'onboarding_started'
  | 'package_ready'
  | 'submitted'
  | 'received'
  | 'under_review'
  | 'needs_more_info'
  | 'resubmitted'
  | 'approved'
  | 'activation_in_progress'
  | 'activated'
  | 'closed';

export type Audience = 'admin' | 'supervisor' | 'partner' | 'client';

/** Map an internal intake status to its canonical phase. */
export function phaseFromIntake(s: IntakeStatus): Phase {
  switch (s) {
    case 'new_submission':
      return 'submitted';
    case 'received':
      return 'received';
    case 'under_review':
      return 'under_review';
    case 'needs_partner_update':
      return 'needs_more_info';
    case 'approved':
      return 'approved';
    case 'activation_in_progress':
      return 'activation_in_progress';
    case 'activated':
      return 'activated';
    case 'closed':
      return 'closed';
  }
}

/** Map a partner-side submission status to its canonical phase. */
export function phaseFromHandoff(s: WLSubmissionStatus): Phase {
  switch (s) {
    case 'draft':
    case 'collecting_info':
      return 'onboarding_started';
    case 'ready_for_submission':
      return 'package_ready';
    case 'submitted_to_fulfillment':
      return 'submitted';
    case 'needs_more_info':
      return 'needs_more_info';
    case 'resubmitted':
      return 'resubmitted';
    case 'approved_for_activation':
      return 'approved';
    case 'activation_in_progress':
      return 'activation_in_progress';
    case 'activated':
      return 'activated';
  }
}

/** Direct-client onboarding handoff statuses (mirrors public.client_onboarding_handoffs.status check). */
export type ClientHandoffStatus =
  | 'collecting_info'
  | 'ready_for_submission'
  | 'submitted'
  | 'needs_more_info'
  | 'approved'
  | 'activation_in_progress'
  | 'activated'
  | 'closed';

/** Map a direct-client handoff status to its canonical phase. */
export function phaseFromClientHandoff(s: ClientHandoffStatus): Phase {
  switch (s) {
    case 'collecting_info':
      return 'onboarding_started';
    case 'ready_for_submission':
      return 'package_ready';
    case 'submitted':
      return 'submitted';
    case 'needs_more_info':
      return 'needs_more_info';
    case 'approved':
      return 'approved';
    case 'activation_in_progress':
      return 'activation_in_progress';
    case 'activated':
      return 'activated';
    case 'closed':
      return 'closed';
  }
}

const LABELS: Record<Phase, Record<Audience, string>> = {
  proposal_accepted: {
    admin: 'Proposal accepted',
    supervisor: 'Proposal accepted',
    partner: 'Proposal accepted',
    client: 'Proposal accepted',
  },
  onboarding_started: {
    admin: 'Onboarding started',
    supervisor: 'Onboarding started',
    partner: 'Onboarding in progress',
    client: "We're getting started",
  },
  package_ready: {
    admin: 'Package ready',
    supervisor: 'Package ready',
    partner: 'Ready to submit',
    client: "We're preparing your setup",
  },
  submitted: {
    admin: 'New submission',
    supervisor: 'New submission',
    partner: 'Submitted',
    client: "We're preparing your setup",
  },
  received: {
    admin: 'Received',
    supervisor: 'Received',
    partner: 'Received by team',
    client: "We're preparing your setup",
  },
  under_review: {
    admin: 'Under review',
    supervisor: 'Under review',
    partner: 'Under review',
    client: "We're preparing your setup",
  },
  needs_more_info: {
    admin: 'Needs partner update',
    supervisor: 'Needs partner update',
    partner: 'More information required',
    client: 'Action needed from your provider',
  },
  resubmitted: {
    admin: 'Resubmitted',
    supervisor: 'Resubmitted',
    partner: 'Resubmitted',
    client: "We're preparing your setup",
  },
  approved: {
    admin: 'Approved',
    supervisor: 'Approved',
    partner: 'Approved for activation',
    client: 'Almost ready',
  },
  activation_in_progress: {
    admin: 'Activation in progress',
    supervisor: 'Activation in progress',
    partner: 'Activation in progress',
    client: 'Setting up your service',
  },
  activated: {
    admin: 'Activated',
    supervisor: 'Activated',
    partner: 'Activated',
    client: 'Service active',
  },
  closed: {
    admin: 'Closed',
    supervisor: 'Closed',
    partner: 'Closed',
    client: '',
  },
};

export function audienceLabel(phase: Phase, audience: Audience): string {
  return LABELS[phase][audience];
}

/**
 * Whitelisted partner-side activity event types that are safe to project to the
 * end-client timeline. Any other event is suppressed on the public client view.
 */
export const CLIENT_TIMELINE_ALLOWLIST: ReadonlyArray<string> = [
  'proposal_accepted',
  'client_portal_viewed',
  'client_portal_acknowledged',
  'handoff_started',
  'handoff_completed',
];

/** Aging thresholds for dashboard pulse / overdue detection. */
export const AGING_THRESHOLDS = {
  under_review_hours: 48,
  needs_partner_update_hours: 24,
} as const;

/**
 * Ordered phases used by the client-facing timeline. Closed/internal-only
 * phases are intentionally excluded.
 */
export const CLIENT_TIMELINE_PHASES: ReadonlyArray<Phase> = [
  'proposal_accepted',
  'submitted',
  'under_review',
  'approved',
  'activation_in_progress',
  'activated',
];
