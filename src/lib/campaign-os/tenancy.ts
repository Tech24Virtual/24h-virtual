/**
 * Campaign OS — Centralized tenancy resolver. SINGLE SOURCE OF TRUTH.
 *
 * EVERY Phase 3+ hook MUST consume `resolveTenant` and `tenantWhere` from this
 * module. Hand-rolled tenant predicates in feature hooks are FORBIDDEN — the
 * single resolver is what guarantees consistency with the database-side
 * `is_tenant_member` function.
 *
 * Global-scope rule (locked in Phase 1 + 2 acceptance):
 *   A row is "global" when `scope='global'` AND all four identity columns
 *   (`tenant_kind`, `wl_partner_id`, `client_lead_id`, `wl_client_id`) are
 *   NULL. Global rows must NEVER be filtered by tenant identity. They are
 *   merged last (lowest precedence). RLS: SELECT open to any authenticated
 *   user; write admin-only.
 *
 * ---------------------------------------------------------------------------
 * P0-2 — SUPERVISOR SCOPE DECISION LOCK (admin-equivalent, by design)
 * ---------------------------------------------------------------------------
 *
 * Supervisor Campaign OS visibility is **locked to admin-equivalent scope**.
 * No tenant scoping is implied or enforced for the supervisor role today.
 *
 * Why this is admin-equivalent and not narrower:
 *   - There is no `supervisor_tenant_assignments` table (or equivalent
 *     supervisor↔tenant assignment source) in the schema today.
 *   - Without an assignment source, any narrower scoping would either be
 *     fabricated (incorrect) or empty (locks supervisors out entirely).
 *   - The product realignment spec (.lovable/product-realignment.md §5)
 *     records this as a deliberate, intentional decision — not an oversight.
 *
 * What this means in practice:
 *   - `tenantWhere` returns the unfiltered query for `is_supervisor` users,
 *     same as `is_admin`. Supervisors see every tenant's Campaign OS rows.
 *   - This is consistent with current observable behavior. P0-2 changed
 *     **documentation only**; no behavior change was made.
 *
 * Path to a real fix (tracked separately in the stabilization backlog as a
 * P1 follow-up: "Implement true supervisor Campaign OS scoping"):
 *   1. Introduce a `supervisor_tenant_assignments` table (or equivalent),
 *      with RLS policies mirroring `client_agent_assignments`.
 *   2. Add a `tenant.is_supervisor` branch in `tenantWhere` that filters
 *      `wl_partner_id` / `client_lead_id` / `wl_client_id` via that join.
 *   3. Add a corresponding server-side `is_tenant_supervisor_member` SQL
 *      function so RLS and client predicates stay in lockstep.
 *
 * Until that work lands, the short-circuit below is the **intended**
 * behavior. Do not narrow it without first introducing the assignment model.
 */

import { supabase } from '@/integrations/supabase/client';
import type { CampaignTenantKind, TenantIdentity } from './types';

export interface ResolvedTenant extends TenantIdentity {
  user_id: string;
  // Convenience flags for UI branching
  is_admin: boolean;
  is_supervisor: boolean;
  is_wl_partner_user: boolean;
  is_wl_end_client_user: boolean;
  is_direct_client_user: boolean;
}

/**
 * Resolves the current user's tenant identity. Returns null when unauthenticated
 * or when the user has no tenant scope (e.g. internal staff with no membership).
 */
export async function resolveTenant(opts: { userId?: string | null } = {}): Promise<ResolvedTenant | null> {
  let userId = opts.userId ?? null;
  if (!userId) {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  }
  if (!userId) return null;

  // Fetch role + tenant identity links in parallel
  const [rolesRes, partnerRes, wlClientRes, leadRes] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase.from('white_label_partners').select('id').eq('user_id', userId).maybeSingle(),
    supabase.from('white_label_clients').select('id, partner_id').eq('user_id', userId).maybeSingle(),
    supabase.from('leads').select('id').eq('user_id', userId).maybeSingle(),
  ]);

  const roles = (rolesRes.data ?? []).map(r => r.role as string);
  const is_admin = roles.includes('admin');
  const is_supervisor = roles.includes('supervisor');

  const wlPartner = partnerRes.data;
  const wlClient = wlClientRes.data;
  const directLead = leadRes.data;

  // Precedence for primary identity assignment:
  // 1. WL partner ownership → wl_partner tenant
  // 2. WL end-client ownership → wl_partner tenant (with partner inferred)
  // 3. Direct lead ownership → direct_24h tenant
  // 4. Internal staff (admin/supervisor) → no fixed identity (null tuple)
  let tenant_kind: CampaignTenantKind = 'direct_24h';
  let wl_partner_id: string | null = null;
  let client_lead_id: string | null = null;
  let wl_client_id: string | null = null;

  if (wlPartner) {
    tenant_kind = 'wl_partner';
    wl_partner_id = wlPartner.id;
  } else if (wlClient) {
    tenant_kind = 'wl_partner';
    wl_partner_id = wlClient.partner_id ?? null;
    wl_client_id = wlClient.id;
  } else if (directLead) {
    tenant_kind = 'direct_24h';
    client_lead_id = directLead.id;
  }

  return {
    user_id: userId,
    tenant_kind,
    wl_partner_id,
    client_lead_id,
    wl_client_id,
    is_admin,
    is_supervisor,
    is_wl_partner_user: !!wlPartner,
    is_wl_end_client_user: !!wlClient,
    is_direct_client_user: !!directLead,
  };
}

/**
 * Applies the tenancy predicate to a PostgREST query builder. Mirrors the
 * server-side `is_tenant_member` function so client queries return the same
 * row-set the policies would allow. Admins/supervisors get unfiltered queries.
 *
 * Usage:
 *   let q = supabase.from('client_departments').select('*');
 *   q = tenantWhere(q, tenant);
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tenantWhere<T extends { eq: (col: string, val: any) => T; or: (filter: string) => T }>(
  query: T,
  tenant: ResolvedTenant | null,
): T {
  if (!tenant) return query;
  // P0-2: supervisor is admin-equivalent by design. See file header for the
  // rationale and the path to a real per-supervisor scoping model.
  if (tenant.is_admin || tenant.is_supervisor) return query;

  if (tenant.tenant_kind === 'wl_partner' && tenant.wl_partner_id) {
    if (tenant.wl_client_id) {
      return query.eq('wl_client_id', tenant.wl_client_id);
    }
    return query.eq('wl_partner_id', tenant.wl_partner_id);
  }
  if (tenant.tenant_kind === 'direct_24h' && tenant.client_lead_id) {
    return query.eq('client_lead_id', tenant.client_lead_id);
  }
  // No tenant scope → no rows
  return query.eq('id', '00000000-0000-0000-0000-000000000000');
}
