# 24H Virtual — Stabilization Backlog

**Status:** Canonical pre-Phase-4 cleanup queue.
**Source:** Derived from `.lovable/product-realignment.md` sections 6 + 7 and the current-state audit.
**Rule:** All P0 items must land before Phase 4 (Campaign OS script replacement) planning starts. P1 items run during Phase 4. P2 items are cleanup with no urgency.

Each item: title · persona impact · files touched · effort · dependency · acceptance.

---

## P0 — Block Phase 4

### P0-1. Hide three Campaign OS placeholder nav entries
- **Persona impact:** Agent · Direct Client · WL Partner.
- **Problem:** Sidebar entries lead to "Coming in Phase X" placeholder cards.
- **Files touched:**
  - `src/config/staffNav.ts` (remove agent Campaigns entry)
  - `src/components/dashboard/DashboardSidebar.tsx` (remove client Campaigns entry from `clientLinks`)
  - `src/config/whiteLabelNav.ts` (remove `Campaign OS` entry from Operations group)
- **Routes:** Keep `/staff/agent/campaigns`, `/client-dashboard/campaigns`, `/white-label-dashboard/campaign-os` registered for deep-link compatibility. Only nav changes.
- **Effort:** ~30 min.
- **Dependency:** none.
- **Acceptance:** None of the three placeholder pages reachable from any sidebar; deep links still resolve.

### P0-2. Lock supervisor Campaign OS visibility to admin-equivalent scope and document it explicitly
- **Persona impact:** Supervisor.
- **Problem:** Supervisor in Workspace → Campaigns mode sees ALL tenants' departments. `tenantWhere` short-circuits supervisor and admin alike, but this is implicit — looks like an oversight rather than an intentional decision.
- **Status:** **Implemented as documentation lock only — no behavior change.** A real per-supervisor scoping model requires a `supervisor_tenant_assignments` table (or equivalent) which does not exist in the schema today. Tracked separately as the P1 follow-up below.
- **Files touched:**
  - `src/lib/campaign-os/tenancy.ts` (file-header docblock + inline note in `tenantWhere`)
  - `.lovable/product-realignment.md` §5 (note on the lock)
- **Effort:** ~30 min (documentation only).
- **Dependency:** none.
- **Acceptance:** Supervisor Campaign OS visibility is explicitly documented as admin-equivalent for now, with no implied tenant scoping until a real supervisor-assignment model exists. The short-circuit in `tenantWhere` is annotated as deliberate, not accidental.

### P0-3. Fix `AgentClients` query
- **Persona impact:** Agent.
- **Problem:** `AgentClients.tsx` reads ALL `profiles`. Agents see staff, partners, and applicants in their "clients" list.
- **Files touched:**
  - `src/pages/staff/AgentClients.tsx`
  - (verify) `src/hooks/useAgentClients.ts` if it exists
- **Effort:** 1 h.
- **Dependency:** Confirm `client_agent_assignments` is the correct join table (it is per audit).
- **Acceptance:** Agent's My Clients page lists only `leads` joined through `client_agent_assignments` for the signed-in agent.

### P0-4. Fix `AdminOverview` "Total Clients" miscount
- **Persona impact:** Admin.
- **Problem:** Counts every `profiles` row (includes partners, staff, applicants).
- **Files touched:**
  - `src/pages/admin/AdminOverview.tsx`
- **Effort:** 30 min.
- **Dependency:** none.
- **Acceptance:** "Total Clients" KPI counts `leads` filtered by `pipeline_stage IN ('active','onboarding','ready_for_billing')`. Same query used wherever "active accounts" is shown.

### P0-5. Resolve WL "Campaigns" vs "Campaign OS" naming collision
- **Persona impact:** WL Partner.
- **Problem:** Two sibling nav entries indistinguishable to users.
- **Files touched:**
  - `src/config/whiteLabelNav.ts` (rename `Campaigns` label → `Outbound Campaigns`)
  - `src/pages/white-label-dashboard/Campaigns.tsx` (page heading + breadcrumbs → `Outbound Campaigns`)
  - Combined with P0-1 which removes the `Campaign OS` sibling entry.
- **Effort:** 30 min.
- **Dependency:** none.
- **Acceptance:** Partner sidebar shows only `Outbound Campaigns` under Operations; page heading + breadcrumbs match.

### P0-6. Close Campaign OS authoring loop (update / approve / delete)
- **Persona impact:** Admin (publish), Supervisor (draft).
- **Problem:** Admin can create FAQs / Policies / Fields / Departments but cannot edit, approve, or delete from UI. Supervisor drafts have no destination → never published.
- **Files touched:**
  - `src/pages/admin/campaign-os/Faqs.tsx`, `Policies.tsx`, `Fields.tsx`, `Departments.tsx` (add update/approve/delete actions)
  - `src/hooks/campaign-os/useUpsertFaq.ts`, `useUpsertPolicy.ts`, `useUpsertField.ts`, `useUpsertDepartment.ts` (verify mutations cover update + delete; add `approve` mutation flipping status `draft` → `approved`)
  - **New page:** `src/pages/admin/campaign-os/Drafts.tsx` (Drafts Review queue listing draft FAQs + Policies across tenants)
  - `src/routes/AdminRoutes.tsx` (register `/admin/campaign-os/drafts`)
  - `src/config/adminNav.ts` (add `Drafts Review` under Campaign OS group)
  - **New page:** `src/pages/staff/SupervisorCampaignDrafts.tsx` (supervisor's own draft queue)
  - `src/routes/StaffRoutes.tsx` + `src/config/staffNav.ts` (register + add nav entry)
- **Effort:** 4–6 h.
- **Dependency:** P0-2 (supervisor scoping fix — drafts queue uses scoped reads).
- **Acceptance:** Admin can edit/delete/approve FAQ + Policy + Field + Department from UI. Supervisor draft submission lands in admin Drafts Review queue; approve action publishes; published rows surface in resolver.

---

## P1 — During Phase 4

### P1-6a. Implement true supervisor Campaign OS scoping (requires supervisor-assignment model)
- **Persona impact:** Supervisor.
- **Problem:** Supervisor visibility in Campaign OS is currently admin-equivalent (see P0-2). For real per-supervisor scoping, an assignment source must exist first.
- **Approach:**
  1. Add a `supervisor_tenant_assignments` table (mirror of `client_agent_assignments`): `supervisor_id`, `wl_partner_id` / `client_lead_id` / `wl_client_id`, RLS-mirrored policies.
  2. Add a server-side `is_tenant_supervisor_member` SQL function so RLS and client predicates stay in lockstep.
  3. Add a `tenant.is_supervisor` branch in `src/lib/campaign-os/tenancy.ts` `tenantWhere` that filters via the new assignment table.
  4. Remove the admin-equivalent short-circuit for supervisor and update the docblock.
- **Files touched:**
  - **New migration:** `supervisor_tenant_assignments` + RLS + helper SQL function.
  - `src/lib/campaign-os/tenancy.ts` (replace short-circuit with scoped branch).
  - Supervisor Campaign OS surfaces (verify behavior under scoped resolver).
- **Effort:** 4–6 h (schema + helper function + client branch + verification).
- **Dependency:** **Blocked on a supervisor-assignment schema decision.** Confirm whether assignments are by `wl_partner_id` only, or down to individual `client_lead_id` / `wl_client_id`.
- **Acceptance:** Supervisor signed in to Campaign OS reads only the tenants they are explicitly assigned to. Server-side RLS enforces the same scope.


### P1-7. `AdminWLConfigDiff` import `ALL_MODULES` from `wlModuleVisibility.ts`
- **Persona impact:** Admin.
- **Problem:** Local `ALL_MODULES` constant is missing `campaigns`; partner module diff is stale.
- **Files touched:**
  - `src/pages/admin/AdminWLConfigDiff.tsx`
  - (no change to `src/lib/wlModuleVisibility.ts` — already source of truth)
- **Effort:** 15 min.
- **Acceptance:** Diff view includes every module from `wlModuleVisibility`. Adding a new module never requires a second edit.

### P1-8. Remove orphan `WhiteLabelDashboard/Tasks.tsx` OR route it
- **Persona impact:** WL Partner.
- **Problem:** Component file exists; not registered in `WhiteLabelRoutes.tsx`.
- **Decision (recommended):** Remove. WL partner already uses `wl_partner_tasks` inside its existing surfaces.
- **Files touched:**
  - `src/pages/white-label-dashboard/Tasks.tsx` (delete)
- **Effort:** 5 min.
- **Acceptance:** No dead component file.

### P1-9. Remove bare `/admin/wl-preview` nav entry
- **Persona impact:** Admin.
- **Problem:** Sidebar entry has no `:partnerId`; bare path 404s.
- **Files touched:**
  - `src/config/adminNav.ts` (remove bare entry)
- **Effort:** 5 min.
- **Acceptance:** WL Preview reached via partner detail page only (`/admin/partners/:id` → "Preview"). Route `/admin/wl-preview/:partnerId` stays.

### P1-10. Split Admin Partners into WL Partners + Affiliates
- **Persona impact:** Admin.
- **Problem:** `/admin/partners` mixes WL partners + affiliates in one table.
- **Files touched:**
  - `src/pages/admin/AdminPartners.tsx` (remove affiliates section)
  - **New page:** `src/pages/admin/AdminAffiliates.tsx` (affiliate ops: list, payouts, referrals)
  - `src/routes/AdminRoutes.tsx` (register `/admin/affiliates`)
  - `src/config/adminNav.ts` (rename Partners → WL Partners; add Affiliates nav entry under Affiliates group)
- **Effort:** 3 h.
- **Dependency:** none.
- **Acceptance:** WL partners page shows only WL partners; Affiliates page handles affiliate program end-to-end.

### P1-11. Rename WL "Campaigns" page surface details
- **Persona impact:** WL Partner.
- **Note:** Nav label changed in P0-5; this item handles remaining in-page copy + breadcrumbs + page title attribute.
- **Files touched:**
  - `src/pages/white-label-dashboard/Campaigns.tsx` (heading, breadcrumb, document title)
- **Effort:** 15 min.
- **Acceptance:** All in-page references read "Outbound Campaigns".

### P1-12. Replace hardcoded trend deltas
- **Persona impact:** Direct Client + WL Partner.
- **Problem:** `+12% / +8% / -5% / "+2 this month"` are static strings.
- **Files touched:**
  - `src/pages/client-dashboard/Dashboard.tsx`
  - `src/pages/white-label-dashboard/WhiteLabelDashboard.tsx`
- **Decision:** Either back with prior-period query or remove the delta UI. Recommend remove unless a real comparator query is cheap.
- **Effort:** 1–2 h.
- **Acceptance:** No hardcoded percentage deltas in either dashboard.

---

## P2 — Cleanup (no urgency)

### P2-13. Domain naming pass (Lead vs Client) + `v_clients` view
- **Persona impact:** Admin (consistency).
- **Problem:** UI says "Client" everywhere; DB has only `leads`. Naming drift across pages.
- **Approach:**
  - Create `v_clients` view = `leads` filtered by active pipeline stages.
  - Update `AdminClients.tsx`, `AdminOverview.tsx`, agent + supervisor surfaces to read from `v_clients` where appropriate.
  - Standardize UI labels: "Lead" for pre-conversion, "Active Account" / "Client" for post-conversion.
- **Files touched:**
  - **New migration:** `v_clients` view + RLS-respecting policies.
  - `src/pages/admin/AdminClients.tsx` and consumers.
- **Effort:** 4–6 h (includes migration + label sweep).
- **Dependency:** P0-4 (same query semantics).

### P2-14. `AdminClients` "View Billing" dropdown destination fix
- **Persona impact:** Admin.
- **Problem:** Dropdown labeled "View Billing" routes to lead detail.
- **Files touched:**
  - `src/pages/admin/AdminClients.tsx` (route to `/admin/billing?clientId=…` or anchor to billing tab on lead detail)
- **Effort:** 30 min.

### P2-15. Document `HostnameRouter` behavior on `/admin` from partner host
- **Persona impact:** Admin staff (rare edge).
- **Problem:** Admin staff signing in on a partner hostname see admin routes branded as the partner. Not exploitable; misleading.
- **Approach:**
  - Document current behavior in `mem://architecture/wl-hostname-masking`.
  - Optionally add allowlist that forces `/admin` and `/staff` to canonical 24H hostname.
- **Files touched:**
  - `mem://architecture/wl-hostname-masking` (documentation)
  - `src/lib/wlHostResolver.ts` (optional enforcement)
- **Effort:** 1 h documentation, +2 h if enforcement is added.

---

## Summary

| Bucket | Items | Total effort estimate | Gate |
|---|---:|---|---|
| **P0** | 6 | ~10 h | **Required before Phase 4 planning** |
| **P1** | 6 | ~7 h | **During Phase 4** |
| **P2** | 3 | ~10 h | **No urgency** |

**Order of execution:**
1. P0-1 → P0-4 → P0-5 → P0-3 → P0-2 → P0-6 (smallest-impact / lowest-dependency first; P0-6 last because it depends on P0-2).
2. After all P0 lands and is verified: Phase 4 planning starts.
3. P1 items execute opportunistically during Phase 4 work.
4. P2 items batch-cleared between Phase 4 and Phase 5.

No item in this backlog is implementation-started by the documentation pass that produced it. Implementation is a separate approved pass.
