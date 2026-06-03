export type WLProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired';

/**
 * Single source of truth for allowed forward transitions.
 * Admin role bypasses these checks at the hook layer.
 */
export const WL_PROPOSAL_TRANSITIONS: Record<WLProposalStatus, WLProposalStatus[]> = {
  draft: ['sent', 'expired'],
  sent: ['draft', 'viewed', 'accepted', 'declined', 'expired'],
  viewed: ['accepted', 'declined', 'expired'],
  accepted: [],
  declined: [],
  expired: ['draft', 'sent'],
};

/**
 * Editable core fields per status.
 * 'all' = every core field is editable.
 * 'locked' = nothing is editable.
 * string[] = only the listed fields are editable.
 *
 * Status field itself is governed by WL_PROPOSAL_TRANSITIONS.
 */
export const WL_PROPOSAL_EDITABLE_FIELDS: Record<
  WLProposalStatus,
  'all' | 'locked' | string[]
> = {
  draft: 'all',
  sent: ['notes', 'valid_until'],
  viewed: ['notes'],
  accepted: 'locked',
  declined: 'locked',
  expired: ['notes'],
};

export const WL_PROPOSAL_DELETABLE: Record<WLProposalStatus, boolean> = {
  draft: true,
  sent: false,
  viewed: false,
  accepted: false,
  declined: false,
  expired: true,
};

export function canTransition(
  from: WLProposalStatus,
  to: WLProposalStatus,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (from === to) return true;
  return WL_PROPOSAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canEditField(
  status: WLProposalStatus,
  field: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  const rule = WL_PROPOSAL_EDITABLE_FIELDS[status];
  if (rule === 'all') return true;
  if (rule === 'locked') return false;
  return rule.includes(field);
}

export function canDelete(status: WLProposalStatus, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return WL_PROPOSAL_DELETABLE[status];
}

/**
 * Derived expiry: status is sent/viewed AND valid_until is in the past.
 * Stored status does NOT auto-flip in Phase 2 (no scheduled job yet).
 */
export function isDerivedExpired(
  status: WLProposalStatus,
  validUntil: string | null,
): boolean {
  if (status !== 'sent' && status !== 'viewed') return false;
  if (!validUntil) return false;
  return new Date(validUntil).getTime() < Date.now();
}
