import { describe, it, expect } from 'vitest';
import {
  assignmentMatchesTenant,
  supervisorCanAccess,
  type SupervisorAssignment,
  type TenantTarget,
} from '@/lib/supervisorScope';

const sup = 'sup-user-1';

const directAssignment: SupervisorAssignment = {
  id: 'a1',
  supervisor_user_id: sup,
  tenant_kind: 'direct_24h',
  client_lead_id: 'lead-1',
  wl_partner_id: null,
  wl_client_id: null,
};

const partnerWideAssignment: SupervisorAssignment = {
  id: 'a2',
  supervisor_user_id: sup,
  tenant_kind: 'wl_partner',
  client_lead_id: null,
  wl_partner_id: 'partner-1',
  wl_client_id: null,
};

const endClientAssignment: SupervisorAssignment = {
  id: 'a3',
  supervisor_user_id: sup,
  tenant_kind: 'wl_partner',
  client_lead_id: null,
  wl_partner_id: null,
  wl_client_id: 'wlc-9',
};

const directTarget: TenantTarget = {
  tenant_kind: 'direct_24h',
  wl_partner_id: null,
  client_lead_id: 'lead-1',
  wl_client_id: null,
};

const partnerScopedTarget: TenantTarget = {
  tenant_kind: 'wl_partner',
  wl_partner_id: 'partner-1',
  client_lead_id: null,
  wl_client_id: 'wlc-1',
};

describe('assignmentMatchesTenant', () => {
  it('matches a direct client assignment to the same lead', () => {
    expect(assignmentMatchesTenant(directAssignment, directTarget)).toBe(true);
  });

  it('rejects a direct client assignment for a different lead', () => {
    expect(
      assignmentMatchesTenant(directAssignment, { ...directTarget, client_lead_id: 'lead-2' }),
    ).toBe(false);
  });

  it('matches a partner-wide assignment for any client of that partner', () => {
    expect(assignmentMatchesTenant(partnerWideAssignment, partnerScopedTarget)).toBe(true);
    expect(
      assignmentMatchesTenant(partnerWideAssignment, { ...partnerScopedTarget, wl_client_id: 'wlc-2' }),
    ).toBe(true);
  });

  it('rejects a partner-wide assignment when the partner does not match', () => {
    expect(
      assignmentMatchesTenant(partnerWideAssignment, { ...partnerScopedTarget, wl_partner_id: 'partner-2' }),
    ).toBe(false);
  });

  it('matches a specific end-client assignment only for that wl_client', () => {
    expect(
      assignmentMatchesTenant(endClientAssignment, { ...partnerScopedTarget, wl_client_id: 'wlc-9' }),
    ).toBe(true);
    expect(
      assignmentMatchesTenant(endClientAssignment, { ...partnerScopedTarget, wl_client_id: 'wlc-1' }),
    ).toBe(false);
  });

  it('does not cross persona boundaries', () => {
    // A direct assignment cannot satisfy a WL target, and vice versa.
    expect(assignmentMatchesTenant(directAssignment, partnerScopedTarget)).toBe(false);
    expect(assignmentMatchesTenant(partnerWideAssignment, directTarget)).toBe(false);
    expect(assignmentMatchesTenant(endClientAssignment, directTarget)).toBe(false);
  });
});

describe('supervisorCanAccess', () => {
  it('returns false when no assignments are present', () => {
    expect(supervisorCanAccess([], directTarget)).toBe(false);
  });

  it('returns true when any assignment matches', () => {
    expect(
      supervisorCanAccess([endClientAssignment, directAssignment], directTarget),
    ).toBe(true);
  });

  it('returns false when no assignment matches', () => {
    expect(
      supervisorCanAccess([endClientAssignment], {
        tenant_kind: 'wl_partner',
        wl_partner_id: 'partner-2',
        client_lead_id: null,
        wl_client_id: 'wlc-2',
      }),
    ).toBe(false);
  });
});
