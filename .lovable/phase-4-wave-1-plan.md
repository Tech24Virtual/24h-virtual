# Phase 4 — Wave 1 Implementation Plan

**Status:** Approved planning document. No code, schema, or route changes in this pass.
**Canonical spec source:** `.lovable/phase-4-campaign-os-runtime.md`
**Scope:** Wave 1 only. Waves 2–4+ are out of scope.

---

## 1. Objective & boundary

Phase 4 Wave 1 wraps the existing `client_departments` row with a thin `campaigns` row and adds structured `campaign_scenarios`, then auto-generates the Build Packet PDF that today is hand-written.

- No runtime changes.
- No agent-facing changes.
- No Five9 changes.
- Legacy script surfaces (`/staff/agent/scripts`, `/client-dashboard/scripts`, `/portal/:slug/scripts`, `/staff/supervisor/script-reviews`, `client_scripts`, `wl_client_scripts`) remain frozen and untouched.
- Admin-only authoring. Supervisor read + draft-edit only. No new persona surfaces.

### Wave 1 deliverables (locked)
1. New tables: `campaigns`, `campaign_scenarios`, `campaign_publish_versions` (table created in Wave 1; first row written in Wave 2).
2. Admin Campaigns surface: list at `/admin/campaign-os/campaigns`, detail at `/admin/campaign-os/campaigns/:id`.
3. Admin Scenarios surface: tab inside the Campaign detail page (per-campaign authoring). No global scenarios page.
4. Build Packet PDF export: client-side via `jsPDF`, triggered from the campaign detail page.
5. Nav additions: one new in-page tab in `CampaignOsLayout`. No sidebar changes.

### Explicitly out of Wave 1
- Script Builder / blocks / branches.
- Publish / rollback flow (table exists, no writes yet).
- Training modules and lessons.
- Iframe runtime endpoint (`/run/campaign/:campaignId/script`).
- Edge functions (none new in Wave 1).
- Per-campaign cutover from legacy scripts.
- Supervisor scenario draft queue (uses existing Drafts Review pattern).
- Direct Client / WL Partner / WL End-Client surfaces.

---

## 2. Schema (matches existing Phase 2 patterns exactly)

### `campaigns` — one row per active department (1:1 wrap)
- **Identity columns:** `tenant_kind`, `wl_partner_id`, `client_lead_id`, `wl_client_id`.
- **Body:**
  - `id uuid pk default gen_random_uuid()`
  - `client_department_id uuid NOT NULL REFERENCES client_departments(id) ON DELETE CASCADE UNIQUE`
  - `display_name text NOT NULL`
  - `status text NOT NULL DEFAULT 'draft'` — values: `draft|active|paused|archived`
  - `published_version_id uuid NULL` — forward reference to Wave 2; nullable
  - `notes text`
  - `created_at`, `updated_at`, `created_by`
- **Triggers:** `enforce_campaign_tenant_identity` + `enforce_campaign_identity_immutable` + `campaign_touch_updated_at` (existing functions, reused).
- **Constraint:** `campaigns_status_chk CHECK (status IN ('draft','active','paused','archived'))`.

### `campaign_scenarios` — services / what-we-do rules, scoped to a campaign
- **Identity columns:** same four.
- **Body:**
  - `id uuid pk default gen_random_uuid()`
  - `campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE`
  - `client_department_id uuid` — denormalized for fast filter, set by trigger from campaign
  - `title text NOT NULL`
  - `trigger_md text NOT NULL` — "when caller says X / asks for Y"
  - `expected_outcome_md text NOT NULL`
  - `disposition text NULL`
  - `routing text NULL` — e.g. `transfer:billing`, `voicemail`, `book_appointment`
  - `tags text[] NOT NULL DEFAULT '{}'`
  - `status text NOT NULL DEFAULT 'draft'` — values: `draft|approved|archived`
  - `version int NOT NULL DEFAULT 1`
  - `sort_order int NOT NULL DEFAULT 100`
  - audit columns
- **Triggers:** same identity + immutable + touch.
- **Constraint:** `campaign_scenarios_status_chk CHECK (status IN ('draft','approved','archived'))`.

### `campaign_publish_versions` — created in Wave 1 but only written in Wave 2
- **Identity columns:** same four.
- **Body:**
  - `id uuid pk default gen_random_uuid()`
  - `campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE`
  - `version int NOT NULL`
  - `snapshot jsonb NOT NULL`
  - `published_at timestamptz NOT NULL DEFAULT now()`
  - `published_by uuid`
  - `note text`
- **Indexes:** `(campaign_id, version DESC)`.
- **Wave 1 leaves this table empty.** Wave 2 populates it.
- **Why ship now:** the `campaigns.published_version_id` FK target must exist; cleaner to ship the empty table than to add it later.

---

## 3. RLS (mirrors `campaign_faq_entries` exactly)

Same four policies on each new table:

| Policy | Effect |
|---|---|
| `<table>_admin_all` | `FOR ALL TO authenticated USING/WITH CHECK has_role(auth.uid(),'admin')` |
| `<table>_member_select` | `FOR SELECT TO authenticated USING is_tenant_member(...)` |
| `<table>_supervisor_update` | `FOR UPDATE TO authenticated USING/WITH CHECK has_role(auth.uid(),'supervisor') AND is_tenant_member(...)` |

No `_global_select` policy (no global-scope rows for campaigns/scenarios/versions).

### Role behavior in plain English
- **Admin** — full CRUD on all rows in all tenants.
- **Supervisor** — read all rows in their accessible tenants (per the documented P0-2 admin-equivalent lock); can UPDATE existing draft rows (drafts review pattern); cannot INSERT or DELETE. Wave 1 does not add a separate "supervisor scenario draft queue" — supervisor edits flow through the existing Drafts Review surface.
- **Agent** — no access (no agent-facing surface in Wave 1, no runtime bundle yet).
- **Direct Client / WL Partner / End-Client** — no access.

---

## 4. UI surfaces

### Sidebar (admin)
No changes. Campaigns is reachable via the existing Campaign OS in-page tab strip.

### `CampaignOsLayout.tsx` tab strip
One new tab inserted between **Departments** and **Fields**:
```ts
{ to: '/admin/campaign-os/campaigns', label: 'Campaigns', icon: Megaphone }
```

### New routes (admin-only)
Gated by existing `<ProtectedRoute requiredRole="admin">` parent.
- `/admin/campaign-os/campaigns` → `CampaignOsCampaigns.tsx` (list)
- `/admin/campaign-os/campaigns/:id` → `CampaignOsCampaignDetail.tsx` (detail with tabs)

### `CampaignOsCampaigns.tsx` (list)
- Two-section layout:
  1. **Active Campaigns** — rows in `campaigns`.
  2. **Departments without a campaign** — eligible `client_departments` rows whose lifecycle is `approved_for_go_live` or `live` and have no `campaigns` row.
- "Create campaign from department" button per eligible row → opens dialog → creates `campaigns` row inheriting tenant identity from the source department; `display_name` defaults to `department_name`.
- Edit/Archive actions per existing row.

### `CampaignOsCampaignDetail.tsx`
- **Header:** campaign name, status badge, source department name, tenant badge.
- **Action:** "Export Build Packet PDF" button (always enabled).
- **Tabs:**
  1. **Overview** — read-only summary pulling from the wrapped department + counts (FAQs approved, policies approved, fields, mappings, scenarios).
  2. **Scenarios** — full CRUD list for `campaign_scenarios` (Create / Edit / Approve / Archive), pattern copied from `CampaignOsFaqs.tsx`. Sort by `sort_order`.
  3. **Linked authoring** — read-only links/cards back to the existing FAQs / Policies / Fields / Five9 tabs filtered by this campaign's department (deep-link with `?departmentId=` query param).

No standalone global Scenarios page in Wave 1. Scenarios are intentionally per-campaign only.

---

## 5. Build Packet PDF

Client-side, generated via `jsPDF`, mirroring the pattern in `src/lib/wl/proposalPdf.ts` and `src/lib/pdfGenerator.ts`.

**New file:** `src/lib/campaign-os/buildPacketPdf.ts`
**Exported function:** `renderBuildPacketPdf({ campaign, department, contacts, numbers, fields, faqs, policies, scenarios, mappings, branding }): Promise<jsPDF>`

### Template sections (one per page or section break)
1. **Cover** — tenant brand (logo, primary color), campaign name, department type, generated-at timestamp, version label `Wave 1 Build Packet (no script, no training)`.
2. **Account & contacts** — client name, primary contact, billing contact, support email/phone.
3. **Department** — name, type, lifecycle, service type, owners, primary contact.
4. **Phone numbers** — table of `department_numbers` (DNIS, ANI, role, voicemail/callback flags).
5. **Intake fields** — grouped by `field_group_id`, with required/optional flag.
6. **Five9 mappings** — variable name, kind, data type, direction.
7. **FAQs** — approved only, grouped by precedence.
8. **Policies** — approved only, grouped by `policy_kind`.
9. **Scenarios** — title, trigger, expected outcome, disposition, routing.
10. **Footer on every page** — tenant footer + page number.

### Trigger
"Export Build Packet PDF" button on `CampaignOsCampaignDetail.tsx`.
- **Filename convention:** `build-packet_{slug(display_name)}_{YYYY-MM-DD}.pdf`
- **Branding source:** `useTenantBrand` for branding inputs; falls back to 24H Virtual brand for `direct_24h` campaigns.
- **No edge function. No server-side rendering. Pure client.**

---

## 6. New hooks

Under `src/hooks/campaign-os/`:
- **`useCampaigns.ts`** — `useCampaigns()` (list, tenant-scoped via `tenantWhere`), `useCampaign(id)`, `useEligibleDepartments()` (departments with no campaign).
- **`useCampaignScenarios.ts`** — `useCampaignScenarios(campaignId)`.
- **`useCampaignMutations.ts`** — extend existing file with `useCreateCampaign`, `useUpdateCampaign`, `useArchiveCampaign`, `useUpsertScenario`, `useApproveScenario`, `useArchiveScenario`.
- **`useBuildPacketData.ts`** — composite query returning the full bundle for the PDF renderer.

### Types added to `src/lib/campaign-os/types.ts`
- `Campaign`
- `CampaignScenario`
- `CampaignPublishVersion` (forward declaration)

---

## 7. Acceptance tests (must all pass to call Wave 1 done)

### Schema & RLS
1. `campaigns`, `campaign_scenarios`, `campaign_publish_versions` exist with all four identity columns and the documented constraints/triggers.
2. RLS enabled on all three; Supabase linter reports no warnings on the new tables.
3. As an admin user, INSERT/SELECT/UPDATE/DELETE succeed on a `direct_24h` campaign.
4. As a non-admin user without tenant membership, SELECT on the campaign returns zero rows.
5. INSERT with `tenant_kind='wl_partner'` but no `wl_partner_id` is rejected by the identity trigger.
6. UPDATE that changes any identity column is rejected by the immutable trigger.
7. `campaign_id` UNIQUE-per-department: a second `campaigns` row pointing at the same `client_department_id` is rejected (`UNIQUE(client_department_id)`).

### UI — Campaigns list
8. `/admin/campaign-os/campaigns` renders for admin; redirects unauth to `/login`; shows `/unauthorized` for non-admin.
9. List shows two sections: existing campaigns and eligible departments without one.
10. Clicking "Create campaign from department" opens a dialog, persists a `campaigns` row inheriting the department's tenant identity, and routes to the detail page.
11. Edit/Archive actions update `display_name` and `status` respectively; archived campaigns stop appearing in the eligible/active grouping rules.

### UI — Campaign detail & scenarios
12. Detail page loads campaign + department + counts.
13. Scenarios tab supports Create / Edit / Approve / Archive with the same UX semantics as the FAQs page.
14. Approving a scenario flips `status='approved'` and surfaces it in the Build Packet PDF.
15. Archived scenarios are excluded from the Build Packet PDF.

### Build Packet PDF
16. Clicking "Export Build Packet PDF" produces a downloadable PDF with all 10 sections populated from real data.
17. PDF cover uses tenant brand for WL campaigns and 24H Virtual brand for `direct_24h`.
18. Empty sections render a single line `No data` rather than crashing or omitting the heading.
19. Filename matches the convention `build-packet_<slug>_<YYYY-MM-DD>.pdf`.
20. PDF generation works with no scenarios, no FAQs, no policies (smoke test on a brand-new campaign).

### Nav & guard
21. The Campaign OS in-page tab strip shows the new "Campaigns" tab between Departments and Fields.
22. No new sidebar entry for any persona; Agent / Direct Client / WL Partner / End-Client sidebars unchanged.

### Out-of-scope guards
23. No changes to `client_scripts`, `wl_client_scripts`, `/staff/agent/scripts`, `/client-dashboard/scripts`, `/portal/:slug/scripts`, `/staff/supervisor/script-reviews`.
24. No new edge functions deployed.
25. No iframe runtime endpoint exists yet.

### Highest-signal subset (must pass before Wave 1 is callable "done")
- **#3, #4, #6** — RLS isolation + identity immutability hold.
- **#10** — Creating a campaign from a department wires tenant identity correctly.
- **#13** — Scenarios CRUD works end-to-end with the same UX as FAQs.
- **#16** — Build Packet PDF renders all 10 sections from real data.
- **#23** — Zero changes to legacy script surfaces.

---

## 8. Dependencies & blockers
- P0 stabilization complete — confirmed.
- No P1 work required for Wave 1.
- P1-7 (`AdminWLConfigDiff` ALL_MODULES) recommended alongside but not blocking.
- No new env vars or secrets.
- No new edge functions.

---

## 9. Recommended Wave 1 batch order
1. **Batch A** — migration: three tables + triggers + RLS + indexes.
2. **Batch B** — types + hooks.
3. **Batch C** — Campaigns list + detail + scenarios CRUD UI + tab strip update.
4. **Batch D** — Build Packet PDF renderer + export action.
5. **Batch E** — Acceptance test pass + memory file updates.

Each batch is independently revertable. Batch A must merge first; Batches B–D may be sequenced or interleaved as long as they precede Batch E.

---

## 10. Memory updates after Wave 1 ships (not in this pass)
- Append to `mem://architecture/phase-4-campaign-os-runtime.md` that Wave 1 is complete with the three tables and Build Packet PDF.
- No `mem://index.md` change — still covered by the existing core rule.

---

## Summary

Wave 1 is the smallest possible Phase 4 increment: three new tables, one new admin tab, two new admin pages, one new PDF export, and zero changes to runtime, scripts, training, or any non-admin persona. It replaces the hand-written backend build doc with an auto-generated PDF backed by structured `campaign_scenarios`, while leaving every legacy surface frozen and untouched.
