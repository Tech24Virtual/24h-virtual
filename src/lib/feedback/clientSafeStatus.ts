// Client-safe status mapping. NEVER expose raw status enums to end-clients.
// Used today for partner mirror tab D; ready for any future end-client history view.

export type RawStatus =
  | 'new' | 'triaged' | 'in_progress' | 'resolved' | 'closed' | 'escalated' | string;

export type BridgeStatus = 'open' | 'acknowledged' | 'resolved' | string;

export function clientSafeStatusLabel(status: RawStatus): string {
  switch (status) {
    case 'new': return 'Received';
    case 'triaged':
    case 'in_progress': return 'In review';
    case 'escalated': return 'Forwarded to support team';
    case 'resolved': return 'Resolved';
    case 'closed': return 'Closed';
    default: return 'Received';
  }
}

export function bridgeStatusLabel(status: BridgeStatus): string {
  switch (status) {
    case 'open': return 'Forwarded to platform';
    case 'acknowledged': return 'Acknowledged';
    case 'resolved': return 'Resolved by platform';
    default: return 'Forwarded to platform';
  }
}
