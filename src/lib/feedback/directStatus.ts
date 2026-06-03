// Direct-client friendly labels for 24H feedback statuses.
// Distinct from clientSafeStatusLabel (which masks WL escalations).

export type DirectStatus =
  | 'new' | 'triaged' | 'in_progress' | 'resolved' | 'closed' | string;

export function directStatusLabel(status: DirectStatus): string {
  switch (status) {
    case 'new': return 'Received';
    case 'triaged': return 'Reviewing';
    case 'in_progress': return 'In progress';
    case 'resolved': return 'Resolved';
    case 'closed': return 'Closed';
    default: return 'Received';
  }
}
