/**
 * Phase G — Supervisor true scoping (P1-6a).
 *
 * Pure helper that decides whether a given supervisor assignment row matches a
 * Campaign OS row's tenant identity. Mirrors the SQL helper
 * `public.supervisor_can_access_tenant` so client and server stay in lockstep.
 */
import type { CampaignTenantKind } from '@/lib/campaign-os/types';

export interface SupervisorAssignment {
  id: string;
  supervisor_user_id: string;
  tenant_kind: CampaignTenantKind;
  client_lead_id: string | null;
  wl_partner_id: string | null;
  wl_client_id: string | null;
}

export interface TenantTarget {
  tenant_kind: CampaignTenantKind;
  wl_partner_id: string | null;
  client_lead_id: string | null;
  wl_client_id: string | null;
}

/** True iff the assignment grants access to the target tenant identity. */
export function assignmentMatchesTenant(
  assignment: SupervisorAssignment,
  target: TenantTarget,
): boolean {
  // Direct client match
  if (
    target.tenant_kind === 'direct_24h' &&
    target.client_lead_id != null &&
    assignment.client_lead_id === target.client_lead_id
  ) {
    return true;
  }

  // WL end-client direct grant (most specific)
  if (
    target.tenant_kind === 'wl_partner' &&
    target.wl_client_id != null &&
    assignment.wl_client_id === target.wl_client_id
  ) {
    return true;
  }

  // WL partner-wide grant covers all clients under the partner
  if (
    target.tenant_kind === 'wl_partner' &&
    target.wl_partner_id != null &&
    assignment.wl_partner_id === target.wl_partner_id &&
    assignment.wl_client_id == null
  ) {
    return true;
  }

  return false;
}

/** True iff any assignment in the list grants access to the target. */
export function supervisorCanAccess(
  assignments: SupervisorAssignment[],
  target: TenantTarget,
): boolean {
  return assignments.some((a) => assignmentMatchesTenant(a, target));
}
