export type BuildStatus = "done" | "in-progress" | "planned";

export interface BuildMapItem {
  id: string;
  name: string;
  description: string;
  status: BuildStatus;
}

export interface BuildMapCategory {
  id: string;
  title: string;
  subtitle: string;
  items: BuildMapItem[];
}

export type BuildPhaseStatus = "built" | "stabilized" | "active" | "deferred";

export type GateStatus = "complete" | "in-progress" | "pending" | "blocked";

export interface PhaseGates {
  build: GateStatus;
  test: GateStatus;
  qa: GateStatus;
  locked: boolean;
}

export interface PhaseContract {
  scope: string;
  buildItems: string[];
  engineeringTests: string[];
  qaUat: string[];
  exitCriteria: string[];
  exclusions?: string[];
}

export interface BuildPhase {
  id: string;
  order: number;
  code: string;
  title: string;
  oneLiner: string;
  status: BuildPhaseStatus;
  gates: PhaseGates;
  contract: PhaseContract;
  items: BuildMapItem[];
}

export interface RequiredSecret {
  name: string;
  service: string;
  description: string;
  isPublic: boolean;
}

// ═══════════════════════════════════════════════════════════════
// EXECUTION MAP (canonical phase order, source of build truth)
// ═══════════════════════════════════════════════════════════════

// ── Phase 0: Master Canonical Blueprint (active, architecture-only) ───
// Architecture / planning only. NO production code, schema, RLS, or UI
// changes are permitted under this phase. Items mirror the canonical
// blueprint at .lovable/plan.md (sections A–O). Downstream phases are
// locked until every section is approved by the user.
const phaseZeroItems: BuildMapItem[] = [
  { id: "phase-0-executive-architecture", name: "A. Executive Architecture", description: "Five-domain, two-tenancy-plane, one-governance-spine model documented and approved", status: "in-progress" },
  { id: "phase-0-canonical-foundations", name: "B. Canonical Foundations", description: "Eight foundational spines (identity, tenancy, Campaign OS, workforce+telephony, content, billing, observability, AI) listed with canonical primitives", status: "in-progress" },
  { id: "phase-0-preserve-extend-isolate", name: "C. Preserve / Extend / Isolate Matrix", description: "Every major existing subsystem classified preserve / extend / isolate / rationalize / deprecate with reasons", status: "in-progress" },
  { id: "phase-0-domain-ownership", name: "D. Domain Ownership Map", description: "Marketing, Revenue, Delivery, White-Label, Governance domain ownership of tables, routes, edge fns, and dashboards", status: "in-progress" },
  { id: "phase-0-system-flow", name: "E. Final System Flow", description: "Canonical 14-stage end-to-end loop from public acquisition through governance", status: "in-progress" },
  { id: "phase-0-dashboard-hierarchy", name: "F. Dashboard Hierarchy", description: "All 11 persona shells mapped with files, roots, and visibility rules", status: "in-progress" },
  { id: "phase-0-wl-blueprint", name: "G. White-Label Blueprint", description: "Two physically separate WL surfaces sharing one data model and branding system; shared vs isolated matrix", status: "in-progress" },
  { id: "phase-0-growth-campaign-delivery-blueprints", name: "H+I+J. Growth, Campaign OS, Delivery+Ops Blueprints", description: "How the existing Growth engine, Campaign OS canonical engine, and Delivery+Ops stack fit into the unified platform", status: "in-progress" },
  { id: "phase-0-governance-blueprint", name: "K. Governance Blueprint", description: "Final role of Overview, Mission Control, Launch Controls, Outline, Product Testing, Audit, Architecture, diagnostics, executive reporting", status: "in-progress" },
  { id: "phase-0-gap-closure-plan", name: "L. Gap Closure Plan", description: "Structural gaps (Public→Revenue, Revenue→Delivery, Delivery→Client visibility, cron, role lifecycle, observability, cross-domain reporting, AI voice) sequenced into phases", status: "in-progress" },
  { id: "phase-0-phased-build-order", name: "M. Phased Build Order", description: "Phase 1 Structural Unification → 2 Growth Completion → 3 Revenue Unification → 4 Delivery Unification → 5 AI Voice → 6 WL Scaling → 7 SuperAdmin Command Center", status: "in-progress" },
  { id: "phase-0-final-recommendation", name: "O. Final Recommendation", description: "Decisive recommendation: foundational vs phased vs never-duplicated vs unified target", status: "in-progress" },
];

// ── Phase A: Product Coherence (stabilized) ────────────────────
const phaseAItems: BuildMapItem[] = [
  { id: "p0-1-realignment-doc", name: "P0-1 Product Realignment Doc", description: "Canonical IA, nav, and persona flow spec at .lovable/product-realignment.md", status: "done" },
  { id: "p0-2-supervisor-lock", name: "P0-2 Supervisor Documentation Lock", description: "Supervisor scope locked as admin-equivalent (documentation only). True supervisor scoping deferred to P1-6a.", status: "done" },
  { id: "p0-3-nav-cleanup", name: "P0-3 Persona Nav Cleanup", description: "Removed orphan and placeholder nav entries across all six personas", status: "done" },
  { id: "p0-4-agent-clients-scope", name: "P0-4 AgentClients Tenant Scoping", description: "Fixed AgentClients to scope by assigned-clients only, not the global lead set", status: "done" },
  { id: "p0-5-admin-overview-totals", name: "P0-5 AdminOverview Totals Fix", description: "Corrected total clients metric on AdminOverview to match canonical lead count", status: "done" },
  { id: "p0-6-naming-cleanup", name: "P0-6 Naming Consistency Cleanup", description: "Aligned nav labels and page titles with canonical IA naming", status: "done" },
];

// ── Phase B: Campaigns Foundation Hardening (built) ──────────
const phaseBItems: BuildMapItem[] = [
  { id: "tenant-identity-helpers", name: "Tenant Identity & Helpers", description: "Four-column tenant identity model plus tenancy helpers (tenantWhere, is_tenant_member, has_role)", status: "done" },
  { id: "tenant-brand-profiles", name: "Tenant Brand Profiles", description: "Per-tenant brand profile rows for WL theming inheritance", status: "done" },
  { id: "client-contacts-table", name: "Client Contacts", description: "Client contacts table with role and lifecycle metadata", status: "done" },
  { id: "client-departments-table", name: "Client Departments", description: "Departments per client with lifecycle states (draft, approved, live)", status: "done" },
  { id: "department-numbers", name: "Department Numbers", description: "Phone numbers (DNIS, ANI, transfer display) scoped to a department", status: "done" },
  { id: "campaign-audit-log", name: "Campaign Audit Log", description: "Append-only audit log foundation for Campaigns mutations", status: "done" },
  { id: "faq-entries-resolver", name: "FAQ Entries + Resolver", description: "campaign_faq_entries table plus effective-FAQ resolver view (precedence-aware)", status: "done" },
  { id: "policy-blocks-resolver", name: "Policy Blocks + Resolver", description: "campaign_policy_blocks table plus effective-policy resolver view", status: "done" },
  { id: "knowledge-versions", name: "Knowledge Version Snapshots", description: "campaign_knowledge_versions for FAQ and policy version snapshots", status: "done" },
  { id: "field-groups-fields-options", name: "Field Groups, Fields, Options", description: "Structured intake field schema with grouping and option sets", status: "done" },
  { id: "field-visibility-rules", name: "Field Visibility Rules", description: "Per-audience visibility rules controlling which fields render where", status: "done" },
  { id: "field-display-labels", name: "Field Display Label Overrides", description: "Per-audience label override layer for client, WL, and end-client framing", status: "done" },
  { id: "resolve-fields-audience", name: "resolveFieldsForAudience Projection", description: "Projection helper that returns audience-scoped fields with labels and visibility applied", status: "done" },
  { id: "five9-variable-mappings", name: "Five9 Variable Groups + Mappings", description: "Tables and UI for mapping campaign fields to Five9 variables (kind, type, direction)", status: "done" },
  { id: "campaign-os-hooks", name: "Campaigns TS Hooks", description: "useTenantWhere plus per-table hooks (useCampaignFaqs, useCampaignFields, etc.)", status: "done" },
  { id: "admin-departments-ui", name: "Admin Departments UI", description: "Departments authoring at /admin/campaign-os/departments", status: "done" },
  { id: "admin-fields-ui", name: "Admin Fields UI", description: "Fields authoring with groups, options, visibility rules, and display labels", status: "done" },
  { id: "admin-faqs-ui", name: "Admin FAQs UI", description: "FAQ authoring with draft, approve, archive lifecycle", status: "done" },
  { id: "admin-policies-ui", name: "Admin Policies UI", description: "Policy block authoring with draft, approve, archive lifecycle", status: "done" },
  { id: "admin-five9-mappings-ui", name: "Admin Five9 Mappings UI", description: "Five9 variable group and mapping authoring scoped per tenant", status: "done" },
  { id: "drafts-review-ui", name: "Drafts Review Queue", description: "Centralized review at /admin/campaign-os/drafts for pending FAQ, policy, and field drafts", status: "done" },
  { id: "campaign-os-route-guards", name: "Campaigns Route Guards", description: "Admin-only ProtectedRoute wrappers on every /admin/campaign-os/* surface", status: "done" },
];

// ── Phase 4 Wave 1: Campaigns + Scenarios + Build Packet (active) ──
const wave1Items: BuildMapItem[] = [
  { id: "wave-1-batch-a", name: "Batch A: Schema + RLS", description: "campaigns, campaign_scenarios, and campaign_publish_versions (placeholder/storage only) tables with tenant identity triggers and RLS", status: "done" },
  { id: "wave-1-batch-b", name: "Batch B: Hooks, Types, Mutations", description: "Campaigns TypeScript hooks, types, and CRUD mutations for the new Wave 1 tables", status: "done" },
  { id: "wave-1-batch-c", name: "Batch C: Admin Campaigns UI", description: "Admin Campaigns list, detail (10 tabs), and scenarios CRUD UI under /admin/campaign-os/campaigns", status: "done" },
  { id: "wave-1-batch-d", name: "Batch D: Build Packet PDF Export", description: "Build Packet PDF export from structured campaign data (filename hardened with slug + date)", status: "done" },
  { id: "wave-1-polish", name: "Wave 1 Polish", description: "Empty states, disabled actions on archived campaigns, RLS diagnostic card, and 12-point manual RLS checklist", status: "done" },
];

// ── Phase 4 Wave 2: Script Builder + Runtime + Publish/Rollback (deferred) ──
const wave2Items: BuildMapItem[] = [
  { id: "wave-2-script-schema", name: "Script Document Schema", description: "campaign_script_documents, campaign_script_blocks, campaign_script_branches tables with RLS", status: "done" },
  { id: "wave-2-script-builder-ui", name: "Script Builder UI", description: "Three-pane authoring: block tree, block editor, branch editor with linked FAQs, policies, fields, and Five9 mappings", status: "done" },
  { id: "wave-2-publish-rollback", name: "Publish + Rollback Model", description: "Publish RPC writing real campaign_publish_versions snapshots; rollback re-points published_version_id without destructive rewrites", status: "done" },
  { id: "wave-2-runtime-bundle", name: "Runtime Bundle Edge Function", description: "get-campaign-runtime-bundle returns the published snapshot (or admin draft preview) as JSON", status: "done" },
  { id: "wave-2-runtime-iframe", name: "Runtime Iframe Target", description: "/run/campaign/:campaignId/script iframe-safe page consumed by Five9 (always published unless admin overrides)", status: "done" },
  { id: "wave-2-legacy-cutover", name: "Per-Campaign Legacy Cutover", description: "Reversible freeze of legacy client_scripts and wl_client_scripts rows with pointer to migrated campaign", status: "done" },
];

// ── Phase 4 Wave 3: Training + Go-Live Gates (deferred) ────────
const wave3Items: BuildMapItem[] = [
  { id: "wave-3-training-modules", name: "Training Modules + Lessons + Signoffs", description: "Per-campaign training content with agent signoff tracking", status: "done" },
  { id: "wave-3-readiness-gates", name: "Go-Live Readiness Gating", description: "Block publish unless required artifacts (script, FAQs, policies, training) are present and signed off", status: "done" },
  { id: "wave-3-cutover-tooling", name: "Per-Campaign Cutover Tooling", description: "Admin tooling to cut a campaign over from legacy surfaces with rollback safety", status: "done" },
];

// ── Phase F: Phase 4 Post-MVP (built) ──────────────────────────
const phaseFItems: BuildMapItem[] = [
  { id: "phase-f-quizzes", name: "Quizzes", description: "Inline knowledge checks within training modules with passing-score gating", status: "done" },
  { id: "phase-f-retraining-expiry", name: "Retraining Auto-Expiry", description: "Time-based retraining triggers and needs_refresh signals when campaign content changes materially", status: "done" },
  { id: "phase-f-version-diff", name: "Version Diff Viewer", description: "Structured client-side diff between two published campaign versions", status: "done" },
  { id: "phase-f-ai-script-drafting", name: "AI Script Drafting", description: "AI-assisted draft generation for new script blocks via Lovable AI Gateway, admin-only, rate-limited", status: "done" },
  { id: "phase-f-template-marketplace", name: "Template Marketplace (Same-Tenant MVP)", description: "Save-as-template and clone-into-department within the same tenant. Cross-tenant deferred to Phase H.", status: "done" },
];

// ── Phase G: Persona Expansion (built) ─────────────────────────
const phaseGItems: BuildMapItem[] = [
  { id: "phase-g-direct-client-co", name: "Direct Client Campaigns Surface", description: "Read-only Direct Client view at /client-dashboard/campaigns + /campaigns/:id with audience-filtered FAQs/policies and Request a Change CTA", status: "done" },
  { id: "phase-g-wl-partner-co", name: "WL Partner Campaigns Surface", description: "Partner-admin read view at /portal/:slug/admin/campaigns across their full client book, branded via WLPortalContext, with Request edit from 24H flow", status: "done" },
  { id: "phase-g-wl-end-client-co", name: "WL End-Client Campaigns Surface", description: "Branded end-client read view at /portal/:slug/script scoped via wl_client_id with audience-filtered artifacts", status: "done" },
  { id: "supervisor-true-scoping", name: "Supervisor True Scoping (P1-6a)", description: "supervisor_tenant_assignments table + supervisor_can_access_tenant + is_tenant_member short-circuit gated by admin_settings.supervisor_scope_enforced. Admin UI at /admin/users/supervisor-scope.", status: "done" },
];

// ── Phase H: Operational Intelligence / Scale (built) ─────────
const phaseHItems: BuildMapItem[] = [
  { id: "phase-h-cross-campaign-reporting", name: "Cross-Campaign Reporting", description: "v_campaign_call_attribution + v_campaign_rollup_30d power /admin/campaign-os/reporting and the AdminOverview Top 5 card", status: "done" },
  { id: "phase-h-scenario-effectiveness", name: "Scenario Effectiveness", description: "v_scenario_outcome_rollup + disposition_bucket helper drive the Effectiveness tab on the campaign detail page", status: "done" },
  { id: "phase-h-five9-drift-detection", name: "Five9 Drift Detection", description: "five9_drift_snapshots + detect-five9-drift edge function diff manual Five9 variable snapshots against published mappings", status: "done" },
];

// ── Phase I: Growth Engine System Audit (active, audit-only) ───
// Audit-only phase. NO code changes are introduced here. The items
// below are checklist deliverables documented in the Growth Engine
// audit report. They preserve what already exists before any merge
// with the broader 24H Virtual SuperAdmin blueprint.
const phaseIItems: BuildMapItem[] = [
  { id: "phase-i-routes-audit", name: "Routes Audit", description: "Inventory every /admin/growth-hub*, /admin/blog*, /admin/keywords, /admin/discoverability* route and confirm component bindings", status: "in-progress" },
  { id: "phase-i-components-audit", name: "Components Audit", description: "Catalog AdminGrowthHub*, AdminBlog*, AdminKeywords, discoverability/* pages, and shared blog/* components with state and external calls", status: "in-progress" },
  { id: "phase-i-schema-audit", name: "Schema Audit", description: "Document every blog_*, keyword_*, autoblog_*, admin_*, disc_*, wl_* growth table with columns, row counts, and ownership", status: "in-progress" },
  { id: "phase-i-sync-audit", name: "Sync Audit", description: "Map mrunsox-sync (inbound), publish-to-wordpress, import-wordpress-posts, generate-blog-sitemap, and AI generation edge functions to their callers", status: "in-progress" },
  { id: "phase-i-live-vs-placeholder-audit", name: "Live vs Placeholder Audit", description: "Classify each Growth surface as fully operational, partially operational, UI only, integrated read-only, or deprecated", status: "in-progress" },
  { id: "phase-i-compatibility-recommendations", name: "Compatibility Recommendations", description: "Document how the existing Growth engine should plug into the future SuperAdmin blueprint, what to reuse, and what must stay separate", status: "in-progress" },
];

// ── Per-phase contracts (gates + scope + tests + exit criteria) ─
const phaseAGates: PhaseGates = { build: "complete", test: "complete", qa: "complete", locked: false };
const phaseAContract: PhaseContract = {
  scope: "Information architecture, navigation, persona scoping, and naming locked across all six personas so downstream Campaigns work has a stable foundation.",
  buildItems: phaseAItems.map((i) => i.name),
  engineeringTests: [
    "Nav route inventory matches the canonical realignment doc",
    "AgentClients query is scoped to the assigned-clients set, not global leads",
    "AdminOverview totals reconcile with the canonical leads count",
  ],
  qaUat: [
    "Six-persona nav walkthrough has no orphan or placeholder entries",
    "Admin overview metrics reconcile against a manual leads query",
    "Supervisor scope behaves as documented admin-equivalent",
  ],
  exitCriteria: [
    "All P0-1 to P0-6 items shipped",
    "P0-2 documented as a scope lock with P1-6a deferred to Phase G",
    "No orphan nav entries on any persona",
  ],
};

const phaseBGates: PhaseGates = { build: "complete", test: "complete", qa: "complete", locked: false };
const phaseBContract: PhaseContract = {
  scope: "Tenant identity, knowledge tables (FAQs, policies, knowledge versions), field projection, Five9 mappings, and the admin authoring shell with Drafts Review.",
  buildItems: phaseBItems.map((i) => i.name),
  engineeringTests: [
    "Tenant identity triggers reject cross-tenant writes on every Campaigns table",
    "Effective FAQ and policy resolver views return precedence-correct rows",
    "resolveFieldsForAudience returns audience-scoped labels and visibility",
    "Admin Campaigns route guards reject non-admin sessions",
  ],
  qaUat: [
    "Admin authors and approves a FAQ, a policy, a field, and a Five9 mapping end to end",
    "Drafts Review Queue surfaces every draft kind across tenants",
  ],
  exitCriteria: [
    "All 22 foundation build items shipped",
    "Route guards in place on every /admin/campaign-os/* surface",
    "Tenant identity helpers consumed by every Campaigns hook",
  ],
};

// Wave 1 was previously closed via the runtime override layer
// (`src/data/buildMapOverrides.ts` + `useBuildPhaseOverrides`) keyed off
// `admin_settings.wave_1_uat_signoff_confirmed`. The baseline below now
// reflects the shipped state directly. The override layer is intentionally
// left in place (no behavior change) and can be simplified in a follow-up.
const wave1Gates: PhaseGates = { build: "complete", test: "complete", qa: "complete", locked: false };
const wave1Contract: PhaseContract = {
  scope: "Campaigns and campaign_scenarios authoring plus Build Packet PDF export. campaign_publish_versions exists as placeholder storage only.",
  buildItems: wave1Items.map((i) => i.name),
  engineeringTests: [
    "Schema migration applied for campaigns, campaign_scenarios, and campaign_publish_versions",
    "RLS denies cross-tenant SELECT, INSERT, and UPDATE on campaigns and campaign_scenarios",
    "One-campaign-per-department UNIQUE constraint enforced",
    "Build Packet renders an empty-state warning when sections are empty",
    "PDF filename follows build-packet_<slug>[_<shortId>]_<YYYY-MM-DD>.pdf",
  ],
  qaUat: [
    "12-point manual RLS checklist at .lovable/wave-1-rls-checklist.md walked end to end",
    "Wave 1 RLS diagnostic card on /admin/launch-checklist is all green",
    "Admin walks a campaign from create to scenarios to Build Packet export",
  ],
  exitCriteria: [
    "Batches A through D shipped",
    "Wave 1 polish (empty states, archive disable, RLS diagnostic) shipped",
    "RLS diagnostic card all green",
    "UAT signoff recorded before Wave 2 unlock",
  ],
  exclusions: [
    "Script Builder",
    "Runtime iframe and published script bundle",
    "Real publish and rollback flow",
    "Training and certification",
    "SMS sequences",
    "Persona expansion",
    "Operational intelligence",
  ],
};

const wave2Gates: PhaseGates = { build: "complete", test: "complete", qa: "in-progress", locked: false };
const wave2Contract: PhaseContract = {
  scope: "Structured script documents with a three-pane builder, real publish and rollback snapshots, the Five9 iframe runtime, and per-campaign legacy cutover.",
  buildItems: wave2Items.map((i) => i.name),
  engineeringTests: [
    "Migration creates campaign_script_documents, campaign_script_blocks, campaign_script_branches with RLS",
    "Publish RPC writes an immutable snapshot to campaign_publish_versions",
    "Rollback re-points published_version_id without rewriting historical rows",
    "Runtime bundle returns published-only payloads for non-admin sessions",
    "Iframe route is dashboard-prefixed with no public chrome",
  ],
  qaUat: [
    "Admin authors a draft, branches by scenario, publishes, then rolls back",
    "Five9 iframe renders the published bundle for an agent session",
    "Legacy script remains readable post-cutover and the cutover is reversible",
  ],
  exitCriteria: [
    "All 6 Wave 2 build items shipped",
    "Runtime bundle covered by Vitest",
    "Wave 2 RLS diagnostic card all green",
    "Wave 1 has not regressed",
  ],
};

const wave3Gates: PhaseGates = { build: "complete", test: "complete", qa: "complete", locked: false };
const wave3Contract: PhaseContract = {
  scope: "Training modules, lessons, and signoffs; go-live readiness gating; and per-campaign cutover tooling for legacy surfaces.",
  buildItems: wave3Items.map((i) => i.name),
  engineeringTests: [
    "Signoff coverage query returns per-campaign training completeness",
    "Gate function blocks publish when required artifacts are missing",
  ],
  qaUat: [
    "Admin completes a training pass and a supervisor signs off",
    "Agent sees only the modules assigned to their campaigns",
  ],
  exitCriteria: [
    "All 3 Wave 3 build items shipped",
    "Gate function denies publish on any missing artifact",
    "Cutover tooling exercised on at least one staging campaign",
  ],
};

const phaseFGates: PhaseGates = { build: "complete", test: "complete", qa: "complete", locked: false };
const phaseFContract: PhaseContract = {
  scope: "Post-MVP enhancements: quizzes with passing-score gating, retraining auto-expiry signals, structured version diff viewer, admin-only AI script drafting, and same-tenant template clone MVP.",
  buildItems: phaseFItems.map((i) => i.name),
  engineeringTests: [
    "Quiz attempt scoring is deterministic (Vitest)",
    "Version snapshot diff returns added/removed/changed entries (Vitest)",
    "ai-draft-script-block rejects non-admin sessions and returns 429 past 30/hour",
    "Go-live gate query honors needs_refresh = false on signoffs",
    "save_campaign_as_template + clone_template_into_department RPCs round-trip a campaign",
    "run_go_live_self_test() returns 11/11 green including new quiz + expiry steps",
  ],
  qaUat: [
    "Admin authors a quiz, agent passes it, and signoff completes the gate",
    "Bumping a published version flips affected signoffs to Needs refresh",
    "Comparing two real versions in /campaigns/:id/versions shows added/removed/changed",
    "Draft with AI returns a usable block in <5s; 31st request in an hour returns 429",
    "Save as template then Clone into another department creates a working draft campaign",
  ],
  exitCriteria: [
    "All 5 Phase F build items shipped",
    "Self-test 11/11 green",
    "Phase G unlocked as the next active phase",
  ],
  exclusions: [
    "Cross-tenant template marketplace deferred to Phase H",
    "Per-question quiz analytics deferred",
    "Retraining email/SMS notifications deferred to Phase H Operational Intelligence",
    "AI auto-publish of drafted blocks (admin must review and save)",
  ],
};

const phaseGGates: PhaseGates = { build: "complete", test: "complete", qa: "complete", locked: false };
const phaseGContract: PhaseContract = {
  scope: "Direct Client, WL Partner, and WL End-Client Campaigns read surfaces plus true supervisor scoping (P1-6a) backed by a supervisor-assignment model that replaces the admin-equivalent lock.",
  buildItems: phaseGItems.map((i) => i.name),
  engineeringTests: [
    "supervisorScope.assignmentMatchesTenant covers direct_24h, wl_partner-wide, and wl_client-specific grants plus the unassigned-deny case (Vitest)",
    "supervisor_tenant_assignments table has RLS denying non-admin reads/writes",
    "is_tenant_member short-circuits supervisors through supervisor_can_access_tenant when admin_settings.supervisor_scope_enforced = true",
    "useClientCampaigns/useClientCampaign return only campaigns whose client_lead_id maps to the signed-in client",
    "usePartnerCampaigns groups by wl_client_id and rejects rows from other partners",
    "WLPortalCampaignScript / WLPortalAdminCampaignDetail render no internal_only fields and no unapproved drafts",
  ],
  qaUat: [
    "Direct client signs in, opens /client-dashboard/campaigns, sees only their approved campaign artifacts",
    "WL Partner opens /portal/:slug/admin/campaigns, sees every campaign across their book grouped by client, branded with their portal theme",
    "WL End-Client opens /portal/:slug/script and sees only the campaign artifacts scoped to their wl_client_id",
    "Admin grants a supervisor scope to one direct client and one WL partner; that supervisor can read those tenants' Campaigns rows and is denied on others",
    "Removing an assignment removes that supervisor's access on the next request",
  ],
  exitCriteria: [
    "All 4 Phase G build items shipped",
    "supervisor_tenant_assignments live with admin-only management UI at /admin/users/supervisor-scope",
    "is_tenant_member supervisor short-circuit honors the assignment table when the feature flag is on",
    "Phase H unlocked as the next active phase",
  ],
  exclusions: [
    "Cross-tenant write surfaces (deferred to Phase H)",
    "Full WL Partner Campaigns authoring (read-only this loop)",
    "Supervisor SQL-side editing of every Campaigns table (deferred)",
  ],
};

const phaseHGates: PhaseGates = { build: "complete", test: "complete", qa: "complete", locked: false };
const phaseHContract: PhaseContract = {
  scope: "Cross-campaign reporting, scenario effectiveness attribution, and Five9 drift detection between published mappings and the live Five9 configuration. Read-only intelligence on top of already-published Campaigns data.",
  buildItems: phaseHItems.map((i) => i.name),
  engineeringTests: [
    "v_campaign_call_attribution joins call_logs to campaigns via client_report_mappings (DNIS / campaign_name) without schema changes to call_logs",
    "v_campaign_rollup_30d returns calls_30d, avg_handle_time_seconds, and missed_pct per campaign",
    "disposition_bucket(text) classifies dispositions into resolved | escalated | no_contact | other (Vitest mirror)",
    "v_scenario_outcome_rollup returns zero-count rows for authored scenarios with no matching calls",
    "five9_drift_snapshots RLS denies anon reads and non-admin writes",
    "diffFive9Variables helper covers identical, missing-each-side, type-mismatch, kind-mismatch (Vitest)",
    "run_go_live_self_test() returns 13/13 green including reporting view + drift table probes",
  ],
  qaUat: [
    "Admin opens /admin/campaign-os/reporting and sees every campaign with 30-day calls, AHT, and missed %",
    "AdminOverview shows a Top 5 Campaigns (last 30 days) card backed by v_campaign_rollup_30d",
    "On a campaign with a published version, the Effectiveness tab shows per-scenario bucket counts",
    "Admin pastes Five9 variables into the drift panel and gets back 4 drift counters; main Five9 card shows a drift badge until resolved",
  ],
  exitCriteria: [
    "All 3 Phase H build items shipped",
    "At least one report consumed by Admin Overview (Top 5 Campaigns card)",
    "Self-test 13/13 green including reporting + drift probes",
    "Vitest stays green with new dispositionBucket and five9Drift suites",
  ],
};

const phaseZeroGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: true };
const phaseZeroContract: PhaseContract = {
  scope: "Planning and architecture only. Lock the canonical architecture for the entire 24H Virtual platform so all future phases build into one unified operating system. Audit-informed, foundations-first, no isolated builds.",
  buildItems: phaseZeroItems.map((i) => i.name),
  engineeringTests: [
    "Blueprint at .lovable/plan.md contains every required section A–O",
    "Every canonical foundation in §B maps to real tables, routes, or edge functions in the codebase",
    "Every preserve / extend / isolate / rationalize / deprecate decision in §C cites the actual subsystem name",
    "Every gap in §L is assigned to a numbered phase in §M",
  ],
  qaUat: [
    "User reviews and explicitly approves sections A–O of the blueprint",
    "User confirms the Phase 1–7 build order in §M",
    "User confirms no canonical engine (script, content, billing, WL, identity, observability) will be duplicated by future phases",
  ],
  exitCriteria: [
    "All 12 Phase 0 checklist items approved by the user",
    "Outline (/outline and /admin/outline) renders Phase 0 with locked-downstream gating",
    "Phase 1 (Structural Unification) does not begin until this phase is approved",
    "No production code, schema, RLS, or UI changes shipped under Phase 0",
  ],
  exclusions: [
    "No production code changes",
    "No schema, RLS, or migration changes",
    "No renames or refactors",
    "No new tables or new routes",
    "No isolated feature builds; every future build must belong to a canonical domain",
  ],
};

const phaseIGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseIContract: PhaseContract = {
  scope: "Audit-only inventory of the existing 24H Virtual Growth engine: routes, components, schema, sync, live-vs-placeholder status, and compatibility recommendations. NO code changes, renames, or refactors are permitted under this phase.",
  buildItems: phaseIItems.map((i) => i.name),
  engineeringTests: [
    "Every /admin/growth-hub*, /admin/blog*, /admin/keywords, /admin/discoverability* route is matched to a real component",
    "Every blog_*, keyword_*, autoblog_*, admin_*, disc_*, wl_* growth table is documented with column count and row count",
    "Every Growth-related edge function is matched to a frontend caller or marked unused",
  ],
  qaUat: [
    "Audit report enumerates routes, components, tables, edge functions, and integrations with no gaps",
    "Each Growth surface is classified as fully operational, partially operational, UI only, integrated read-only, or deprecated",
    "Compatibility recommendations call out which planned SuperAdmin modules reuse this engine vs stay separate",
  ],
  exitCriteria: [
    "Routes, components, schema, sync, and live-vs-placeholder checklists complete",
    "Compatibility recommendations approved by user before any merge work begins",
    "No production code changes introduced under Phase I",
  ],
};

const phaseOneItems: BuildMapItem[] = [
  { id: "phase-1-public-revenue-orchestration", name: "A. Public → Revenue Orchestration", description: "Canonical captureLead() helper + DB-trigger-emitted lead.captured events normalize every public lead-entry surface (Get Started, Call Advisor, Cost Calculator, Launch Estimator, Demo, GPT Advisor, Exit Intent, Blog, Chat, Coming Soon).", status: "in-progress" },
  { id: "phase-1-revenue-delivery-handoff", name: "B. Revenue → Delivery Handoff", description: "convert_lead_to_delivery() RPC: atomic stage promotion, lead_conversions row, direct internal_fulfillment_intakes skeleton, plus event + audit. LeadConversionDialog now uses it.", status: "in-progress" },
  { id: "phase-1-delivery-client-visibility", name: "C. Delivery → Client Visibility", description: "Delivery state (campaigns, intake, call_logs) reachable to the right persona via existing client/WL portal shells using the new lifecycle view; admin internals stay isolated.", status: "in-progress" },
  { id: "phase-1-event-reporting-spine", name: "D. Cross-Domain Event + Reporting Spine", description: "Triggers emit canonical lead.captured / lead.stage.changed / lead.converted / delivery.intake.created / delivery.campaign.created into dashboard_events + audit_log. v_lifecycle_overview and v_intake_pipeline give Governance one cross-domain query surface.", status: "in-progress" },
  { id: "phase-1-role-access-cleanup", name: "E. Role / Access Lifecycle Cleanup", description: "convert_lead_to_delivery enforces admin/sales/supervisor only; new SECURITY DEFINER triggers revoked from PUBLIC; views are SECURITY INVOKER and inherit existing RLS.", status: "in-progress" },
  { id: "phase-1-scheduler-readiness", name: "F. Scheduler / Automation Readiness", description: "pg_cron extension enabled (pg_net already enabled). No speculative jobs scheduled — interfaces ready for future recurring orchestration.", status: "in-progress" },
];
const phaseOneGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseOneContract: PhaseContract = {
  scope: "Connect Marketing, Revenue, Delivery, White-Label, and Governance into one operating system. Reuse all canonical spines from Phase 0; introduce no parallel architecture.",
  buildItems: [
    "captureLead() helper at src/lib/intake/captureLead.ts",
    "convert_lead_to_delivery(uuid, text) RPC for canonical Revenue→Delivery handoff",
    "DB triggers on leads, lead_conversions, internal_fulfillment_intakes, campaigns emitting standardized dashboard_events",
    "audit_log entries for lead.stage.changed and lead.converted",
    "v_lifecycle_overview and v_intake_pipeline SQL views",
    "fetchLifecycleOverview / fetchIntakePipeline TS wrappers",
    "LeadConversionDialog rewired to call convert_lead_to_delivery RPC",
    "pg_cron extension enabled",
  ],
  engineeringTests: [
    "Insert into leads emits one lead.captured row",
    "UPDATE leads.pipeline_stage emits one lead.stage.changed row + one audit_log row",
    "convert_lead_to_delivery returns ids and creates exactly one direct intake",
    "Non admin/sales/supervisor callers are rejected",
    "Views project conversion + intake + campaign counts correctly",
    "All new SECURITY DEFINER functions reject anon/PUBLIC EXECUTE",
  ],
  qaUat: [
    "Sales user converts a test lead through LeadConversionDialog and an intake appears under fulfillment",
    "Admin can read the new views; client / agent / wl_client cannot",
    "No public lead-entry surface regresses",
  ],
  exitCriteria: [
    "lead.captured emitted for every new lead regardless of surface",
    "Revenue→Delivery is one RPC call with full audit + event trail",
    "Governance has a single cross-domain query surface",
    "No parallel CRM, intake, or event system introduced",
  ],
  exclusions: [
    "Public-facing forms not refactored to call captureLead in this phase; triggers cover observability either way",
    "No new dashboards built in this phase — only the data spine and helper APIs",
    "No cron jobs scheduled — only the extension is enabled",
  ],
};

const phaseTwoItems: BuildMapItem[] = [
  { id: "phase-2-disc-admin-completion", name: "A. Discoverability Admin Completion", description: "All 11 discoverability sub-tabs are real CRUD: Templates, Locations, Keywords, Audiences, FAQ Sets + FAQs, Link Sets + Items, Generated Pages, Publish Queue, Quality Review, Sitemap Controls. Backed by canonical disc_* tables. No placeholders left where backend exists.", status: "in-progress" },
  { id: "phase-2-public-disc-renderer", name: "B. Public Discoverability Renderer", description: "/seo/:slug renders canonical disc_generated_pages with full SEO meta, JSON-LD WebPage + FAQPage schema, internal-link block, and primary CTA. RLS only exposes published+indexable+sitemap-included pages.", status: "in-progress" },
  { id: "phase-2-publishing-strategy", name: "C. Publishing Strategy Normalization", description: "blog_posts is the canonical content lake (Mrunsox is read-only inbound). Discoverability content is internal-first; admin WordPress connection is treated as optional syndication, not the source of truth. Phase 2 emits growth.content.published events on blog publish.", status: "in-progress" },
  { id: "phase-2-keyword-ownership", name: "D. Keyword / Intent Ownership", description: "keyword_tracker remains the canonical Growth keyword planning surface; disc_keywords remains the discoverability execution layer. Operators move keyword → discoverability page via the disc_keywords admin and Generated Pages flow. No third keyword store introduced.", status: "in-progress" },
  { id: "phase-2-intake-tightening", name: "E. Growth → Revenue Intake Tightening", description: "BlogLeadForm, ComingSoonPage, and ReportCaptureForm now use captureLead() with the canonical lead_source vocabulary. Other public surfaces remain compatible via Phase 1 triggers.", status: "in-progress" },
  { id: "phase-2-growth-reporting", name: "F. Growth Reporting Readiness", description: "v_growth_overview view + fetchGrowthOverview() typed wrapper provide one Growth KPI surface for SuperAdmin/Mission Control. publish_disc_page() RPC + disc_publish_log give a clean audit trail.", status: "in-progress" },
  { id: "phase-2-mrunsox-boundary", name: "G. Mrunsox Sync Boundary", description: "Mrunsox / Kingdom OS remains inbound-only into blog_posts. No outbound sync introduced in Phase 2. Direction of truth: Mrunsox → 24H for company blog; 24H discoverability is internal-only.", status: "in-progress" },
  { id: "phase-2-growth-governance", name: "H. Growth Governance / Safety", description: "publish_disc_page() RPC enforces approve→publish gating, writes disc_publish_log, and emits growth.disc.page.published events. Public disc renderer relies on RLS — drafts cannot be served. SECURITY DEFINER functions revoked from PUBLIC.", status: "in-progress" },
];
const phaseTwoGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseTwoContract: PhaseContract = {
  scope: "Complete the canonical Growth engine without forking it. Reuse blog_posts, keyword_tracker, and disc_*. Add the public disc renderer, finish admin CRUD, and tighten Growth → Revenue intake.",
  buildItems: [
    "Real CRUD admin sections for disc_templates, disc_locations, disc_keywords, disc_audiences, disc_faq_sets, disc_faqs, disc_internal_link_sets, disc_internal_link_items",
    "SitemapControlsPanel for published-page indexation/sitemap toggling",
    "Public route /seo/:slug → DiscoverabilityPublicPage with SEO + JSON-LD",
    "RLS: anon/authenticated SELECT on disc_generated_pages only when published + indexable + in sitemap",
    "publish_disc_page(_page_id, _action, _notes) RPC with disc_publish_log + dashboard_events emission",
    "blog_posts → growth.content.published trigger",
    "v_growth_overview view + src/lib/governance/growthOverview.ts wrapper",
    "captureLead() adoption in BlogLeadForm, ComingSoonPage, ReportCaptureForm",
  ],
  engineeringTests: [
    "Anon visitor can fetch a published+indexable+sitemap disc page; cannot fetch a draft",
    "publish_disc_page rejects non-admins and rejects publish on non-approved pages",
    "blog_posts status transitioning to 'published' emits exactly one growth.content.published event",
    "v_growth_overview returns one row with non-null counts",
    "Admin CRUD insert/update/delete works for every disc_* admin section",
  ],
  qaUat: [
    "Operator can create a Template + Location + Keyword + FAQ Set, generate a page, approve it, publish it, and view it on /seo/{slug}",
    "Sitemap Controls toggles index/sitemap and the public renderer reflects RLS",
    "Public renderer passes WCAG basics and emits valid FAQPage JSON-LD",
  ],
  exitCriteria: [
    "Zero discoverability tabs remain placeholders",
    "Canonical disc_generated_pages have a live, indexable public surface",
    "Growth governance has one KPI view + one publish RPC + one publish log",
    "All Phase 2 lead-form migrations preserve current UX",
    "No second blog/keyword/SEO engine introduced",
  ],
  exclusions: [
    "Outbound Mrunsox / WordPress sync remains deferred",
    "AI-generated copy assistance for disc templates not in Phase 2",
    "Programmatic sitemap.xml emission for disc pages — controls land here, sitemap regeneration job lands with cron in a later phase",
    "Mission Control Growth widget UI — wrapper exists, panel comes with SuperAdmin phase",
  ],
};

// ── Phase 3: Revenue Unification ──────────────────────────────────────
const phaseThreeItems: BuildMapItem[] = [
  { id: "phase-3-pipeline-model", name: "A. Canonical Lead Pipeline Model", description: "Single official stage vocabulary in src/lib/revenue/pipeline.ts (new → contacted → qualified → proposal → sales → won, plus delivery handoff stages onboarding/ready_for_billing/active and terminal lost/churned). Enforced by leads_pipeline_stage_check; transitions auto-stamp qualified_at/won_at/lost_at and emit lifecycle events.", status: "in-progress" },
  { id: "phase-3-ownership-routing", name: "B. Lead Ownership / Routing Unification", description: "SalesPipeline now reads/writes the canonical pipeline_stage column (no more parallel `status` field). Sales kanban scoped to the working subset; My Pipeline / Team toggle preserved. v_revenue_pipeline reports unassigned counts.", status: "in-progress" },
  { id: "phase-3-activity-task-flow", name: "C. CRM Activity + Task Flow", description: "crm_activities and crm_tasks remain the canonical operator substrate. Pipeline stage moves continue to land in audit_log via trg_leads_emit_stage_change. Proposal/meeting status changes now also flow through dashboard_events + audit_log.", status: "in-progress" },
  { id: "phase-3-meetings-unification", name: "D. Meetings / Demo Unification", description: "trg_meetings_emit broadcasts revenue.meeting.scheduled/completed/no_show events tied to lead_id, so demo and consultation meetings are first-class Revenue progression signals.", status: "in-progress" },
  { id: "phase-3-proposal-flow", name: "E. Proposal Flow Normalization", description: "trg_sales_proposals_emit emits revenue.proposal.created / .sent / .accepted / .declined / .expired. closed_at auto-stamps on terminal status. Proposals stay linked to lead_id; existing tokenized public access is untouched.", status: "in-progress" },
  { id: "phase-3-affiliate-integration", name: "F. Affiliate / Referral Revenue Integration", description: "trg_affiliate_referrals_link auto-stamps converted_at and emits revenue.referral.linked the moment a referral is bound to a lead. v_revenue_lead_360 surfaces has_affiliate_referral so partner-source revenue is legible in the same pipeline.", status: "in-progress" },
  { id: "phase-3-revenue-reporting", name: "G. Revenue Reporting Readiness", description: "v_revenue_pipeline (stage-level KPIs, unassigned, overdue follow-ups) and v_revenue_lead_360 (per-lead meetings/proposals/referral/conversion), both SECURITY INVOKER. Typed wrappers in src/lib/governance/revenueOverview.ts.", status: "in-progress" },
  { id: "phase-3-handoff-hardening", name: "H. Revenue→Delivery Handoff Hardening", description: "convert_lead_to_delivery is now idempotent (returns the prior conversion + intake on retry) and rejects lost/churned leads. LeadConversionDialog warns on non-eligible stages, blocks terminal stages, and surfaces the resulting intake number to the operator.", status: "in-progress" },
  { id: "phase-3-revenue-governance", name: "I. Revenue Governance / Safety", description: "leads_pipeline_stage_check makes silent invalid-stage writes impossible. Stage/proposal/meeting/referral lifecycle events all carry consistent metadata (from/to, lead_id) for cross-domain governance.", status: "in-progress" },
];
const phaseThreeGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseThreeContract: PhaseContract = {
  scope: "Unify the existing Revenue domain on one pipeline vocabulary, one handoff RPC, and one set of lifecycle events. Reuse leads, crm_activities, crm_tasks, lead_conversions, meetings, sales_proposals, affiliate_referrals. Do not introduce a parallel CRM.",
  buildItems: [
    "src/lib/revenue/pipeline.ts canonical PipelineStage + SALES_BOARD_STAGES + HANDOFF_ELIGIBLE_STAGES",
    "leads_pipeline_stage_check + qualified_at/won_at/lost_at/lost_reason columns",
    "trg_leads_stamp_stage_dates BEFORE UPDATE trigger",
    "trg_sales_proposals_emit (insert + update) + closed_at auto-stamp",
    "trg_meetings_emit (insert + update)",
    "trg_affiliate_referrals_link auto-converted_at + revenue.referral.linked event",
    "convert_lead_to_delivery hardened: idempotent + rejects lost/churned",
    "v_revenue_pipeline + v_revenue_lead_360 views (security invoker)",
    "src/lib/governance/revenueOverview.ts typed wrappers",
    "SalesPipeline.tsx migrated from leads.status to leads.pipeline_stage",
    "LeadConversionDialog eligibility guard + intake-number surfacing",
  ],
  engineeringTests: [
    "Inserting a lead with an unknown pipeline_stage fails the check constraint",
    "Updating pipeline_stage='qualified' stamps qualified_at exactly once",
    "convert_lead_to_delivery on a lead in stage='lost' raises 'cannot convert lead in stage lost'",
    "convert_lead_to_delivery called twice on the same lead returns idempotent=true and the same conversion_id",
    "Inserting a sales_proposal emits revenue.proposal.created in dashboard_events",
    "Updating sales_proposals.status='accepted' stamps closed_at and writes audit_log row",
    "Linking affiliate_referrals.lead_id stamps converted_at and emits revenue.referral.linked",
    "v_revenue_pipeline returns one row per stage with lead_count + unassigned_count",
  ],
  qaUat: [
    "Sales rep can drag a lead across the kanban; v_revenue_pipeline reflects it; lead.stage.changed appears in dashboard_events",
    "Admin opens LeadConversionDialog on a 'qualified' lead → conversion succeeds, toast shows intake number, intake appears in /admin/fulfillment-intake",
    "Admin opens LeadConversionDialog on a 'lost' lead → button disabled, warning surfaced",
    "Admin re-runs conversion on an already-converted lead → toast says 'Already converted'",
    "Affiliate referral created via affiliate flow → on linkage to a lead, revenue.referral.linked is visible in dashboard_events",
  ],
  exitCriteria: [
    "One canonical PipelineStage vocabulary used across admin + staff sales surfaces",
    "Revenue→Delivery handoff is idempotent and stage-gated",
    "Meetings, proposals, and affiliate referrals all emit revenue.* lifecycle events on the same spine",
    "Two reporting views give Governance a legible Revenue surface",
    "No parallel CRM/sales architecture introduced",
  ],
  exclusions: [
    "Executive Mission Control Revenue panel UI (wrappers only land here)",
    "Multi-currency proposal financial modeling overhaul",
    "Quote-to-cash automation beyond the existing convert_lead_to_delivery primitive",
    "WL partner pipeline merge — wl_partner_leads stays a separate tenant pipeline by design",
  ],
};

// ── Phase 4: Delivery Unification ─────────────────────────────────────
const phaseFourItems: BuildMapItem[] = [
  { id: "phase-4-handoff-consumption", name: "A. Handoff Consumption Model", description: "convert_lead_to_delivery now lands on a coherent Delivery substrate: lead_conversions + internal_fulfillment_intakes + client_onboarding_handoffs are linked, idempotent, and surface a single intake_number to operators.", status: "in-progress" },
  { id: "phase-4-account-context", name: "B. Active Accounts / Client Context Unification", description: "v_account_delivery_360 unifies leads → intake → handoff → campaigns → open tickets in one row per converted lead, so admins see a single canonical account view without a parallel accounts model.", status: "in-progress" },
  { id: "phase-4-fulfillment-flow", name: "C. Fulfillment Flow Completion", description: "set_intake_status RPC enforces the canonical 8-status vocabulary, auto-stamps received_at/approved_at/activated_at/closed_at via trg_intake_emit_status_change, and writes an internal note + audit_log entry on every transition.", status: "in-progress" },
  { id: "phase-4-campaign-os-integration", name: "D. Campaign OS Delivery Integration", description: "trg_campaigns_emit_status broadcasts delivery.campaign.status_changed events on the Phase 1 spine; campaigns_count and live_campaigns_count surface in v_account_delivery_360 so authoring/publishing state is legible alongside fulfillment state.", status: "in-progress" },
  { id: "phase-4-client-visibility", name: "E. Client-Facing Delivery Visibility", description: "v_client_delivery_status (RLS-scoped via auth.uid in the view's WHERE) plus DeliveryStatusCard on /client-dashboard expose service_state, live campaigns, open support, and activation date — without leaking internal fields or assignments.", status: "in-progress" },
  { id: "phase-4-support-linkage", name: "F. Support / Delivery Linkage", description: "open_tickets_count on the 360 + client status views ties support_tickets.lead_id directly into the Delivery picture; no parallel service-issue tracker.", status: "in-progress" },
  { id: "phase-4-ops-alignment", name: "G. Operations / Workforce Alignment", description: "delivery.intake.status_changed / delivery.handoff.status_changed / delivery.campaign.status_changed events let supervisor and ops surfaces consume the same canonical state. Existing supervisor constraints (no close, no urgent, no reassign) remain enforced via trg_enforce_supervisor_intake_constraints.", status: "in-progress" },
  { id: "phase-4-reporting-readiness", name: "H. Delivery Reporting Readiness", description: "v_delivery_pipeline (status-grouped intake counts with urgent/unassigned/oldest), v_account_delivery_360, and v_client_delivery_status. Typed wrappers in src/lib/governance/deliveryOverview.ts give Governance a legible Delivery surface ahead of Mission Control.", status: "in-progress" },
  { id: "phase-4-safety-audit", name: "I. Delivery Safety / Audit / State Hardening", description: "Every intake/handoff/campaign status transition writes audit_log + dashboard_events. set_intake_status validates the canonical vocabulary server-side. Lifecycle timestamps are stamped exactly once via BEFORE-UPDATE triggers.", status: "in-progress" },
];
const phaseFourGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseFourContract: PhaseContract = {
  scope: "Unify the existing Delivery domain on one canonical state model: leads → lead_conversions → internal_fulfillment_intakes + client_onboarding_handoffs → campaigns → support_tickets, all wired into the Phase 1 dashboard_events spine. Reuse Campaign OS as the canonical execution design system. Do not introduce a parallel delivery, accounts, or service-management model.",
  buildItems: [
    "trg_intake_emit_status_change BEFORE UPDATE (auto-stamp received_at/approved_at/activated_at/closed_at)",
    "trg_intake_emit_status_after AFTER UPDATE (delivery.intake.status_changed event + audit_log)",
    "trg_handoff_emit_status (delivery.handoff.created / .status_changed)",
    "trg_campaigns_emit_status (delivery.campaign.status_changed)",
    "set_intake_status(uuid, text, text) RPC — admin/supervisor, validated 8-status vocabulary, writes internal note",
    "v_delivery_pipeline view (security invoker)",
    "v_account_delivery_360 view (security invoker)",
    "v_client_delivery_status view (security invoker, scoped by auth.uid)",
    "src/lib/governance/deliveryOverview.ts typed wrappers + IntakeStatus union + INTAKE_STATUSES constant",
    "src/components/client-dashboard/DeliveryStatusCard.tsx surfaced on /client-dashboard",
  ],
  engineeringTests: [
    "Updating internal_fulfillment_intakes.status='activated' stamps activated_at exactly once and emits delivery.intake.status_changed",
    "set_intake_status with an unknown status raises 'invalid status'",
    "set_intake_status as a non-staff caller raises 'not authorized'",
    "Updating client_onboarding_handoffs.status emits delivery.handoff.status_changed in dashboard_events",
    "Updating campaigns.status emits delivery.campaign.status_changed and writes audit_log",
    "v_delivery_pipeline returns one row per non-closed status with urgent_count/unassigned_count",
    "v_account_delivery_360 returns one row per converted lead with intake/handoff/campaign rollups",
    "v_client_delivery_status returns 0 rows for a non-client user and the matching row for the lead's user_id",
  ],
  qaUat: [
    "Admin moves an intake from new_submission → received → approved → activated; each transition appears in dashboard_events and audit_log; activated_at stamps once",
    "Direct client logs into /client-dashboard and sees DeliveryStatusCard with their service_state, live campaigns, open support, and activation date",
    "Direct client cannot see another lead's status (v_client_delivery_status returns no row)",
    "Admin opens v_account_delivery_360 for a converted lead and sees intake_number, handoff_status, campaigns_count, and open_tickets_count in one row",
    "Supervisor still cannot close an intake or set urgent priority (existing supervisor constraints intact)",
  ],
  exitCriteria: [
    "Converted Revenue lands in a single, traceable Delivery path (intake + handoff + audit + events)",
    "One canonical IntakeStatus vocabulary used across server validation, RPC, and TS wrappers",
    "Three Delivery views give Governance and clients legible state without leaking internals",
    "Every intake/handoff/campaign status change emits a delivery.* event and writes audit_log",
    "No parallel delivery, accounts, or service-management architecture introduced",
  ],
  exclusions: [
    "Phase 5 AI Voice runtime work — explicitly out of scope",
    "Executive Mission Control Delivery panel UI (wrappers only land here)",
    "WL end-client portal redesign — kept compatible, not collapsed into client-dashboard",
    "New project-management surfaces on top of fulfillment",
  ],
};

// ── Phase 5: AI Voice / Hybrid Receptionist ───────────────────────────
const phaseFiveItems: BuildMapItem[] = [
  { id: "phase-5-domain-model", name: "A. Canonical AI Receptionist Domain Model", description: "call_flow_receptionist_configs is 1:1 with client_departments. Tenant identity mirrored via trg_recep_cfg_mirror_tenant. No second routing/voice domain.", status: "in-progress" },
  { id: "phase-5-config-completion", name: "B. Call Flow Configuration Completion", description: "Mode (ai_only/hybrid/human_only), greeting, business_hours JSON, after-hours behavior, escalation strategy, overflow targets, voicemail email, primary contact.", status: "in-progress" },
  { id: "phase-5-knowledge-grounding", name: "C. Knowledge / Script Grounding", description: "ground_in_campaign + knowledge_notes anchor receptionist behavior to the published Campaign script + FAQ + policy structures. No parallel KB.", status: "in-progress" },
  { id: "phase-5-hybrid-routing", name: "D. Hybrid Routing / Escalation Model", description: "Explicit escalation_strategy (transfer_human / callback_request / supervisor / overflow_number) plus after_hours_behavior. Human fallback first-class.", status: "in-progress" },
  { id: "phase-5-readiness-visibility", name: "E. Runtime / Readiness Visibility", description: "v_call_flow_receptionist_readiness computes unconfigured / configured_offline / awaiting_script_publish / awaiting_number / ready_to_activate / live per flow. v_account_receptionist_status rolls up.", status: "in-progress" },
  { id: "phase-5-client-visibility", name: "F. Client-Facing AI Voice Visibility", description: "v_client_receptionist_summary (RLS via leads.user_id) + ReceptionistStatusCard on /client-dashboard surface live/pending counts safely.", status: "in-progress" },
  { id: "phase-5-event-audit", name: "G. Event / Audit / Safety Hardening", description: "trg_recep_cfg_emit fires voice.receptionist.* events + audit_log. set_receptionist_enabled RPC gates live toggles to admin/supervisor.", status: "in-progress" },
  { id: "phase-5-delivery-linkage", name: "H. Delivery / AI Voice Linkage", description: "Readiness reuses Phase 4 substrate (campaigns.published_version_id, department_numbers.active). Live requires a published Campaign script.", status: "in-progress" },
  { id: "phase-5-reporting-readiness", name: "I. Reporting Readiness", description: "src/lib/governance/voiceOverview.ts gives Governance typed wrappers for readiness, account rollups, client summary, and gated enable.", status: "in-progress" },
];
const phaseFiveGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseFiveContract: PhaseContract = {
  scope: "Make AI Voice / Hybrid Receptionist a coherent canonical operating model on top of existing call flows (client_departments), Campaign OS scripts, and department_numbers. One config per flow, one readiness vocabulary, one event spine.",
  buildItems: [
    "call_flow_receptionist_configs table (1:1 with client_departments)",
    "receptionist_mode / after_hours_behavior / escalation_strategy enums",
    "trg_recep_cfg_mirror_tenant + trg_recep_cfg_emit",
    "set_receptionist_enabled(uuid, boolean, text) RPC",
    "v_call_flow_receptionist_readiness, v_account_receptionist_status, v_client_receptionist_summary",
    "src/lib/governance/voiceOverview.ts typed wrappers",
    "ReceptionistConfigCard embedded in CallFlowDetail",
    "ReceptionistStatusCard embedded in /client-dashboard",
  ],
  engineeringTests: [
    "Inserting a config inherits tenant identity from parent client_departments",
    "Updating mode emits voice.receptionist.updated and writes audit_log",
    "Enabling via RPC emits voice.receptionist.enabled + audit voice.receptionist.go_live",
    "set_receptionist_enabled as non-staff raises 'not authorized'",
    "v_call_flow_receptionist_readiness returns 'live' only when enabled + published script + active number + active campaign",
    "v_client_receptionist_summary scopes to leads.user_id",
  ],
  qaUat: [
    "Admin opens CallFlowDetail and sees ReceptionistConfigCard with readiness chips",
    "Admin saves a hybrid config; readiness flips to configured_offline; toggling Live calls the RPC and is logged",
    "Direct client sees ReceptionistStatusCard on /client-dashboard with live/pending counts",
    "Client cannot see another tenant's readiness rows",
    "Disabling a live receptionist writes audit voice.receptionist.taken_offline",
  ],
  exitCriteria: [
    "AI Voice has one canonical config table per call flow; no second routing engine",
    "One readiness vocabulary across admin, client, and governance surfaces",
    "Hybrid escalation + after-hours behavior are first-class enums",
    "Every receptionist state change writes a voice.* event and an audit_log row",
    "Voice cannot be Live without the Phase 4 published-script substrate",
  ],
  exclusions: [
    "Mission Control voice command center UI",
    "Live runtime AI prompt orchestration / model gateway wiring",
    "Real-time call telemetry dashboards (Phase H territory)",
    "WL end-client portal redesign",
  ],
};

// ── Phase 6: White Label Scaling ──────────────────────────────────────
const phaseSixItems: BuildMapItem[] = [
  { id: "phase-6-operating-model", name: "A. WL Operating Model Clarification", description: "Canonical WL model: partner → branding → custom_domain/aliases → wl_clients → portal user. Strict separation from direct-client shells; wl_partner_leads stays a separate tenant pipeline.", status: "in-progress" },
  { id: "phase-6-partner-dashboard", name: "B. WL Partner Dashboard Completion", description: "WLPartnerReadinessCard mounted on /white-label-dashboard. Reflects activation state: pending → configured → branded → domain_pending → domain_ready → live.", status: "in-progress" },
  { id: "phase-6-end-client-portal", name: "C. WL End-Client Portal Maturity", description: "WLClientServiceStatusCard on the masked /:slug portal surfaces published scripts, live/pending receptionist flows, open tickets, last call. RLS-scoped via wl_clients.user_id; no admin internals.", status: "in-progress" },
  { id: "phase-6-branding-hardening", name: "D. WL Branding / Domain / Config Hardening", description: "v_wl_partner_readiness exposes cname_status + domain_verified + alias_count + branding presence. Existing WL preview/config-diff/leak-audit foundations preserved.", status: "in-progress" },
  { id: "phase-6-voice-exposure", name: "E. WL AI Voice Exposure", description: "Per-tenant rollups of v_call_flow_receptionist_readiness exposed via v_wl_client_directory_for_partner (partner-scoped) and v_wl_client_service_status (end-client-scoped). No admin-only voice fields leaked.", status: "in-progress" },
  { id: "phase-6-support-delivery", name: "F. WL Support / Delivery Linkage", description: "Open ticket counts (wl_client_tickets) + published-campaign counts (campaigns) joined into the same WL service rollup so partners and end-clients see one coherent service state.", status: "in-progress" },
  { id: "phase-6-leak-prevention", name: "G. WL Safety / Leak Prevention Hardening", description: "trg_wl_partners_emit_lifecycle and trg_wl_clients_emit_lifecycle stamp wl.partner.* / wl.client.* events on dashboard_events + audit_log. Tenant context recorded for every transition.", status: "in-progress" },
  { id: "phase-6-reporting-readiness", name: "H. WL Reporting Readiness", description: "src/lib/governance/wlOverview.ts gives Governance typed wrappers for partner readiness, partner client directory, and end-client service status without bypassing RLS.", status: "in-progress" },
  { id: "phase-6-onboarding-cleanup", name: "I. WL Onboarding / Activation Cleanup", description: "Readiness state vocabulary replaces ad-hoc 'configured vs branded vs ready vs live' guesswork on the partner shell; activation transitions are auditable.", status: "in-progress" },
];
const phaseSixGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseSixContract: PhaseContract = {
  scope: "Scale and harden the existing White Label architecture into one coherent partner-scale operating system: canonical readiness, partner-safe rollups, end-client portal maturity, voice/delivery/support consumption from canonical Phase 4/5 substrate, and stronger tenant safety. No shell collapse.",
  buildItems: [
    "v_wl_partner_readiness (partner activation rollup)",
    "v_wl_client_directory_for_partner (partner-scoped client directory with delivery + voice + tickets)",
    "v_wl_client_service_status (RLS-scoped end-client service rollup)",
    "trg_wl_partners_emit_lifecycle + trg_wl_clients_emit_lifecycle",
    "src/lib/governance/wlOverview.ts typed wrappers",
    "WLPartnerReadinessCard on /white-label-dashboard",
    "WLClientServiceStatusCard on /:slug WL portal dashboard",
  ],
  engineeringTests: [
    "Partner readiness flips through pending → configured → branded → domain_pending → domain_ready → live as branding/domain/clients are added",
    "Updating white_label_clients.status emits wl.client.activated and writes audit_log",
    "Provisioning user_id on a wl_client emits wl.client.portal_provisioned",
    "v_wl_client_service_status returns only the WL client owned by auth.uid() (RLS via wl_clients.user_id)",
    "v_wl_client_directory_for_partner returns only rows under partners owned by auth.uid()",
    "Live receptionist count on the WL service rollup matches v_call_flow_receptionist_readiness for the same tenant",
  ],
  qaUat: [
    "WL partner sees a Partner Readiness card showing activation steps and current state on the partner dashboard",
    "WL end-client sees a Service Status card on the masked portal dashboard with live/pending receptionist counts and open tickets",
    "Suspending a partner is recorded as wl.partner.suspended in audit_log",
    "WL end-client cannot see another tenant's service status",
    "Partner cannot see another partner's clients in the directory rollup",
  ],
  exitCriteria: [
    "WL has one canonical activation/readiness vocabulary across partner + end-client surfaces",
    "WL partner shell, WL end-client shell, and direct client shell remain physically distinct",
    "wl_partner_leads remains a separate tenant pipeline (not merged into Revenue)",
    "Voice/delivery/support state in WL is read from canonical Phase 4/5 substrate, not re-implemented",
    "Every partner/client lifecycle transition emits a wl.* event and an audit_log row",
  ],
  exclusions: [
    "Mission Control / Governance command center UI",
    "Cross-tenant analytics dashboards (Phase H territory)",
    "Merge of wl_partner_leads into the direct Revenue pipeline",
    "Full WL end-client portal redesign (visuals/IA) — only meaningful next-step content added",
  ],
};

// ── Phase 7: SuperAdmin Command Center (Mission Control) ──────────────
const phaseSevenItems: BuildMapItem[] = [
  { id: "phase-7-ia", name: "A. Mission Control IA", description: "Two-tab cockpit on /admin/mission-control: Command Center (cross-domain readiness + lifecycle stream + risk) and AI Agents (existing agent governance preserved). Aligned to admin mental model, not raw tables.", status: "in-progress" },
  { id: "phase-7-readiness", name: "B. Cross-Domain Readiness Overview", description: "Five tiles (Growth, Revenue, Delivery, AI Voice, WL) computed by buildReadinessTiles() composing growthOverview, revenueOverview, deliveryOverview, voice readiness rollup, and WL partner rollup. Each tile drills into the canonical admin surface.", status: "in-progress" },
  { id: "phase-7-event-stream", name: "C. Lifecycle Event / Incident Stream", description: "MissionEventStream merges dashboard_events and audit_log, classifies into domains (growth/revenue/delivery/voice/wl/system) and severity (info/notice/warn). Filterable by domain. No new ingestion path.", status: "in-progress" },
  { id: "phase-7-subpanels", name: "D. Domain-Specific Drill-Down Links", description: "Each readiness tile links to the existing canonical admin surface (Discoverability, Leads, Fulfillment Intake, Call Flows, Partners). Mission Control does not re-implement those settings UIs.", status: "in-progress" },
  { id: "phase-7-blast-radius", name: "E. Risk / Blast Radius Panel", description: "BlastRadiusPanel highlights receptionists offline / blocked, WL partners not yet live, and urgent intakes. Heuristic over existing readiness views; no new heavy infrastructure.", status: "in-progress" },
  { id: "phase-7-gating", name: "F. SuperAdmin Gating & Safety", description: "Route gated via ProtectedRoute requiredRole='admin'. Phase 7 ships read-only — no new destructive controls. Existing Emergency Simulation toggle remains scoped to AI Agents tab.", status: "in-progress" },
  { id: "phase-7-perf", name: "G. Performance & Observability", description: "Tiles parallelize Phase 1–6 wrapper queries; event stream caps at 150 rows. No N+1, no long-polling. Lazy-loaded route via existing LazyRoute pattern. Loading + empty states represented per panel.", status: "in-progress" },
  { id: "phase-7-docs", name: "H. Documentation & Deferrals", description: "src/lib/governance/missionControl.ts exposes typed surface (DomainReadinessTile, MissionEvent, BlastRadiusItem). Deferred: real-time streaming, cross-tenant analytics charts, automated remediation actions — Phase H territory.", status: "in-progress" },
];
const phaseSevenGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseSevenContract: PhaseContract = {
  scope: "SuperAdmin Command Center on top of the canonical Phase 1–6 governance views and event spine. Read-only cross-domain readiness, lifecycle event stream, and blast-radius panel — not a second BI tool, not a parallel admin shell.",
  buildItems: [
    "src/lib/governance/missionControl.ts (cross-domain composer + event classifier + blast-radius)",
    "ReadinessTileCard, MissionEventStream, BlastRadiusPanel components",
    "AdminMissionControl tabbed cockpit (Command Center + AI Agents)",
    "Domain → drill-route mapping into existing admin surfaces",
  ],
  engineeringTests: [
    "buildReadinessTiles() returns 5 tiles even when individual wrappers fail (graceful fallback)",
    "fetchMissionEvents() merges dashboard_events + audit_log and orders by occurred_at desc",
    "Domain classifier maps voice.* / wl.* / lead.* / disc.* prefixes correctly; unknown → 'system'",
    "Severity classifier flags taken_offline / suspended / failed as 'warn'",
    "fetchBlastRadius() surfaces voice offline, voice blocked, WL not live, urgent intake categories",
    "Route is admin-only (ProtectedRoute requiredRole='admin')",
  ],
  qaUat: [
    "Admin opens /admin/mission-control and sees five readiness tiles with health chips",
    "Each tile drill-in link navigates to the correct canonical admin surface",
    "Event stream filters by domain and shows recent voice.* / wl.* / delivery.* / lead.* activity",
    "Blast Radius panel shows zero items in a healthy tenant and surfaces real risks otherwise",
    "Non-admin attempting /admin/mission-control is redirected to /unauthorized",
    "No client / WL portal shell ever links into Mission Control",
  ],
  exitCriteria: [
    "One admin-only Mission Control surface composes Phase 1–6 wrappers — no parallel data marts",
    "Cross-domain readiness, recent lifecycle events, and risk are visible at a glance",
    "All drill-downs respect existing shell boundaries and RLS",
    "Phase 7 introduces no new write controls, no new destructive flows",
    "/outline reflects Phase 7 truthfully",
  ],
  exclusions: [
    "Real-time event streaming (long-poll / websocket telemetry)",
    "Cross-tenant analytics charts and time-series visualizations (Phase H territory)",
    "Automated remediation / one-click incident response controls",
    "New cross-domain SQL views or compute-heavy data marts",
  ],
};

// ── Phase 8: Automation / Optimization Layer ─────────────────────────
const phaseEightItems: BuildMapItem[] = [
  { id: "phase-8-tier-model", name: "A. Automation Tier Model", description: "Four-tier safety classification (detect / recommend / confirm / auto_safe) enforced via DB CHECK on automation_recommendations.tier and surfaced in UI badges.", status: "in-progress" },
  { id: "phase-8-recs-engine", name: "B. Rule-Based Recommendation Engine", description: "generate_automation_recommendations() composes growth, voice, WL, delivery, intake, and revenue canonical views into deterministic recommendations with stable dedupe keys.", status: "in-progress" },
  { id: "phase-8-drift", name: "C. Drift Detection", description: "Drift summary derived from open recommendations grouped by domain. Reuses canonical readiness/pipeline views — no new compute mart.", status: "in-progress" },
  { id: "phase-8-cron", name: "D. Scheduled Checks", description: "pg_cron job 'automation_generate_recommendations_hourly' (17 * * * *) invokes the generator, captures result/error into automation_check_runs.", status: "in-progress" },
  { id: "phase-8-actions", name: "E. Safe Remediation Actions", description: "Operator-confirmed dismiss_recommendation / resolve_recommendation RPCs and a manual 'Run checks now' trigger. No destructive auto-mutation.", status: "in-progress" },
  { id: "phase-8-mc-integration", name: "F. Mission Control Integration", description: "New 'Automation' tab on /admin/mission-control with RecommendationsPanel + AutomationHealthPanel. Command Center remains read-only.", status: "in-progress" },
  { id: "phase-8-audit", name: "G. Eventing & Audit", description: "Every dismiss/resolve/run writes to audit_log + dashboard_events under automation.* prefix. Cron failures land in automation_check_runs with error_text.", status: "in-progress" },
  { id: "phase-8-docs", name: "H. Outline & Plan Truth", description: "Phase 8 added to buildMap; plan.md documents tier model, deferred items (deeper telemetry, real-time streaming, AI control loops).", status: "in-progress" },
];

const phaseEightGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseEightContract: PhaseContract = {
  scope: "Governed automation/optimization layer on top of Phases 1–7. Deterministic rule-based recommendations, drift summary, scheduled hourly checks, operator-confirmed remediation, and Mission Control integration. No autonomous control plane, no parallel workflow engine.",
  buildItems: [
    "automation_recommendations + automation_check_runs tables (admin RLS)",
    "v_open_recommendations view",
    "generate_automation_recommendations() / dismiss_recommendation() / resolve_recommendation() / record_automation_check_run() RPCs",
    "pg_cron job invoking the generator hourly with success/failed audit",
    "src/lib/governance/automation.ts typed wrapper",
    "RecommendationsPanel + AutomationHealthPanel on Mission Control 'Automation' tab",
  ],
  engineeringTests: [
    "Generator upserts by dedupe_key and respects 'dismissed' status (does not reopen dismissed items)",
    "Stale open items not regenerated this run auto-resolve with reason 'auto_resolved_no_longer_detected'",
    "dismiss_recommendation / resolve_recommendation reject non-admin callers",
    "Every state transition writes both audit_log and dashboard_events rows under automation.*",
    "Manual 'Run checks now' records a check_run with triggered_by='manual'",
    "Cron job records a failed check_run row with error_text on exception",
  ],
  qaUat: [
    "Admin opens /admin/mission-control → Automation, sees recommendations grouped by severity with tier badges",
    "Drill-in opens the canonical admin surface (e.g., /admin/discoverability, /admin/campaign-os/call-flows)",
    "Dismiss persists across runs; resolve clears the row; both reflected in audit log",
    "Automation Health panel shows drift-by-domain and the last 10 check runs",
    "Non-admin attempting RPC gets 'admin required' error",
  ],
  exitCriteria: [
    "Recommendations are deterministic, explainable, and tied to canonical views",
    "Scheduled checks produce auditable rows hourly",
    "All state-changing actions are admin-gated and audited",
    "Mission Control gains operational guidance without becoming dangerous",
    "/outline reflects Phase 8 truthfully",
  ],
  exclusions: [
    "Real-time streaming / websocket telemetry",
    "Cross-tenant analytics charts and time-series visualizations",
    "Autonomous AI agents that mutate revenue/delivery state",
    "One-click destructive remediation",
    "Sitemap regeneration cron (handled by Growth phase backlog, not here)",
  ],
};

// ── Phase 9: Reporting / Intelligence Layer ─────────────────────────
const phaseNineItems: BuildMapItem[] = [
  { id: "phase-9-ia", name: "A. Reporting Information Architecture", description: "Mission Control (operations) vs Intelligence (analytics) vs domain-native screens (execution) cleanly separated. New /admin/intelligence route added under the Insights nav group; admin-only.", status: "in-progress" },
  { id: "phase-9-trend-views", name: "B. Time-Series Trend Layer", description: "v_intelligence_event_trend_30d aggregates dashboard_events per day per domain (growth/revenue/delivery/voice/wl/automation/system) for the last 30 days. Pivoted client-side for the EventVolumeChart.", status: "in-progress" },
  { id: "phase-9-exec-summary", name: "C. Executive Summary View", description: "v_intelligence_executive_summary single-row roll-up: active leads, intakes open, receptionists live/blocked, WL partners live, blog published 30d, open recommendations + warn/critical, recs resolved 30d.", status: "in-progress" },
  { id: "phase-9-domain-panels", name: "D. Domain Analytics Panels", description: "DomainAnalyticsPanel composes Growth/Revenue/Delivery/Voice/WL/Automation panels by reusing canonical wrappers (growthOverview, revenueOverview, deliveryOverview, missionControl voice/WL summaries, automation drift). Each panel links back to its operational surface.", status: "in-progress" },
  { id: "phase-9-wrappers", name: "E. Intelligence Wrapper Module", description: "src/lib/governance/intelligence.ts centralizes typed reads, KPI assembly (buildExecutiveKpis), domain labels, event-trend pivoting, and recommendation drift aggregation. No raw component-level query sprawl.", status: "in-progress" },
  { id: "phase-9-tenant-safety", name: "F. Tenant-Safe WL Reporting", description: "Intelligence surface stays admin-only. WL partner shells are not granted superadmin analytics. Partner-scoped reporting remains in /portal/:slug WL screens (Phase 6 wrappers). No cross-tenant leakage introduced.", status: "in-progress" },
  { id: "phase-9-ux", name: "G. Visualization Quality", description: "Recharts line chart with zero-filled day buckets; KPI grid with tone-coded borders (positive/attention/warn). Loading and empty states handled. No chart spam — every visual answers a defined question.", status: "in-progress" },
  { id: "phase-9-docs", name: "H. Outline & Plan Truth", description: "Phase 9 added to buildMap. .lovable/plan.md appended with reporting IA, metric definitions, role boundaries, and deferred items (real-time streaming, forecasting, partner-facing intelligence).", status: "in-progress" },
];

const phaseNineGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseNineContract: PhaseContract = {
  scope: "Admin-only Reporting / Intelligence layer composing canonical Phase 1–8 wrappers and dashboard_events into a coherent analytical surface. Distinct from Mission Control. No new event sources, no parallel BI warehouse, no autonomous automation.",
  buildItems: [
    "v_intelligence_event_trend_30d view",
    "v_intelligence_executive_summary view",
    "classify_event_domain(text) helper function",
    "src/lib/governance/intelligence.ts typed wrapper + KPI assembly",
    "ExecutiveSummaryGrid, EventVolumeChart, DomainAnalyticsPanel components",
    "AdminIntelligence page at /admin/intelligence (Insights nav)",
  ],
  engineeringTests: [
    "Trend view zero-fills missing days client-side and renders continuous lines",
    "Executive summary returns a single row with all 13 metrics",
    "KPI tile tone reflects warn/critical thresholds",
    "Domain panels degrade gracefully when wrappers fail",
    "Route gated by ProtectedRoute requiredRole='admin'",
  ],
  qaUat: [
    "Admin opens /admin/intelligence and sees KPI grid + 30d event chart + 6 domain panels",
    "Each KPI tile drills into its canonical operational surface",
    "Mission Control automation tab still functions independently",
    "Non-admin user gets unauthorized when navigating to /admin/intelligence",
  ],
  exitCriteria: [
    "Trend-aware reporting available across all six canonical domains",
    "Executive summary visible at a glance",
    "Reporting and Mission Control distinct in purpose and route",
    "/outline reflects Phase 9 truthfully",
  ],
  exclusions: [
    "Real-time streaming / websocket telemetry",
    "Forecasting / predictive scoring",
    "Partner-facing cross-tenant intelligence",
    "Cohort or attribution modeling",
    "Write-back / control actions from reporting surfaces",
  ],
};

// ── Phase 10: Forecasting / Predictive Ops ──────────────────────────
const phaseTenItems: BuildMapItem[] = [
  { id: "phase-10-methodology", name: "A. Forecasting Methodology", description: "Explainable methods only: trailing_avg, moving_window, stage_baseline, age_risk, threshold_band. Two horizons: 7d and 30d. Confidence labels (high/moderate/low/insufficient) derived from observed data points. Documented in src/lib/governance/forecasting.ts.", status: "in-progress" },
  { id: "phase-10-revenue", name: "B. Revenue / Pipeline Forecast", description: "Stage-baseline projection (12% / 30d) over active pipeline value from v_revenue_pipeline. Surfaces expected conversions, expected pipeline value, overdue follow-ups, and unassigned signals. Advisory only — does not auto-advance stages.", status: "in-progress" },
  { id: "phase-10-delivery", name: "C. Delivery / Capacity Forecast", description: "Stage-baseline activation projection (35% / 30d) over open intakes from v_delivery_pipeline + age-risk on oldest_submitted_at. Surfaces expected activations, urgent backlog, and oldest-open-age signal.", status: "in-progress" },
  { id: "phase-10-voice", name: "D. Voice / Readiness Forecast", description: "Stage-baseline (50% / 7d) over flows in 'ready_to_activate' from v_call_flow_receptionist_readiness. Surfaces expected go-live volume and breakdown of likely-to-remain-blocked configurations by reason.", status: "in-progress" },
  { id: "phase-10-wl", name: "E. WL Activation Forecast", description: "Stage-baseline (25% / 30d) over partners in 'configured', 'branded', or 'domain_ready' from v_wl_partner_readiness. Stuck partners (DNS/pending) surfaced separately, never counted as forecast volume. Tenant-safe — admin-only.", status: "in-progress" },
  { id: "phase-10-automation", name: "F. Automation Load Forecast", description: "Trailing-30d daily mean of automation.* events from v_intelligence_event_trend_30d projected over horizon. Recurring drift detected via first_detected_at→last_detected_at gap on automation_recommendations.", status: "in-progress" },
  { id: "phase-10-ui", name: "G. Predictive UI Surface", description: "AdminIntelligence refactored to two tabs: Reporting (Phase 9) and Forecasts (Phase 10). ForecastingPanel composes all six forecasts with horizon toggle. ForecastTile shows band, confidence, and an inspectable basis popover (method + inputs + horizon).", status: "in-progress" },
  { id: "phase-10-explainability", name: "H. Explainability & Boundaries", description: "Every forecast carries a ForecastBasis (method, explanation, inputs, confidence, horizon). No black-box scoring, no autonomous mutation, no new event sources. Forecasts labeled as advisory throughout. /outline and .lovable/plan.md updated.", status: "in-progress" },
];

const phaseTenGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseTenContract: PhaseContract = {
  scope: "Admin-only Forecasting / Predictive Ops layer over the Phase 1–9 substrate. Pure-TS, deterministic, explainable methods (trailing averages, stage baselines, age risk). No new event sources, no parallel BI store, no autonomous mutation. Distinct from Reporting and Mission Control.",
  buildItems: [
    "src/lib/governance/forecasting.ts — six forecast functions, explainable methods, confidence labels, ForecastBasis type",
    "ForecastTile component with inspectable 'Why?' popover exposing method, inputs, horizon, confidence",
    "ForecastingPanel composing Revenue / Delivery / Voice / WL / Automation / Event-volume forecasts with 7d/30d toggle",
    "AdminIntelligence refactored to Reporting + Forecasts tabs",
  ],
  engineeringTests: [
    "Each forecast function returns a ForecastBasis with non-empty explanation",
    "Insufficient-data path returns confidence='insufficient' and band={0,0,0}",
    "7d vs 30d horizon scales projections linearly via documented horizon_scale",
    "Forecasting reads only from canonical wrappers/views — no direct table writes",
    "AdminIntelligence remains ProtectedRoute requiredRole='admin'",
  ],
  qaUat: [
    "Admin opens /admin/intelligence → Forecasts and sees six forecast cards plus per-domain event volume",
    "Toggling 7d/30d updates all bands without page reload",
    "Each tile's '?' popover shows method, inputs, horizon, and confidence",
    "Tiles with insufficient data display 'Insufficient data' badge instead of fake precision",
    "Mission Control and Reporting tabs continue to function unchanged",
  ],
  exitCriteria: [
    "Short-horizon forecasts available for all five canonical domains plus event volume",
    "Every forecast is explainable, bounded, and clearly labeled as advisory",
    "Forecasting introduces no autonomous mutations and no parallel data path",
    "Reporting / Forecasts / Mission Control remain three distinct surfaces",
    "/outline reflects Phase 10 truthfully",
  ],
  exclusions: [
    "Black-box ML / opaque predictive models",
    "Autonomous AI agents that act on forecasts",
    "Real-time / streaming predictive telemetry",
    "Partner-facing predictive surfaces (admin-only this phase)",
    "Cohort, attribution, and long-horizon (>30d) forecasting",
    "Materialized forecast snapshots / scheduled forecast runs",
  ],
};

// ── Phase 11: Export / External BI & Data Products ──────────────────
const phaseElevenItems: BuildMapItem[] = [
  { id: "phase-11-catalog", name: "A. Export Catalog", description: "Opinionated catalog of seven data products: Executive KPI Snapshot, Revenue/Delivery/Voice/WL Readiness/Automation live exports, and partner-scoped WL Reporting Snapshot. Defined in src/lib/governance/exports.ts (EXPORT_CATALOG) with audience, source, formats, and shareable flag.", status: "in-progress" },
  { id: "phase-11-snapshots", name: "B. Snapshot Storage + RPCs", description: "data_export_snapshots table (RLS: admins see all, partners see only their own). generate_executive_snapshot() admin-gated and generate_wl_partner_snapshot(p_partner_id) admin-or-owning-partner. Both materialize jsonb payload, audit to audit_log, and emit dashboard_events.", status: "in-progress" },
  { id: "phase-11-bi-views", name: "C. BI-Facing Views", description: "Stable, BI-ready views: v_bi_executive_kpi, v_bi_revenue_pipeline, v_bi_delivery_pipeline, v_bi_voice_readiness, v_bi_wl_partner_readiness, v_bi_wl_partner_export, v_bi_automation_health. All set to security_invoker=true so external warehouse callers inherit their own RLS.", status: "in-progress" },
  { id: "phase-11-admin-ui", name: "D. Admin Exports Surface", description: "AdminIntelligence gains a third tab 'Exports' rendering ExportsPanel: Executive Snapshot generator + history list, Live Data Exports (per-view CSV/JSON), and BI hook documentation block.", status: "in-progress" },
  { id: "phase-11-wl-ui", name: "E. WL Partner Reporting Export", description: "WLPartnerExportsCard added to WhiteLabelDashboard. Owning partner generates and downloads tenant-scoped readiness + client directory snapshots. Cross-tenant data is server-side impossible.", status: "in-progress" },
  { id: "phase-11-cron", name: "F. Daily Snapshot Cron", description: "pg_cron job 'intelligence_executive_snapshot_daily' at 03:17 UTC calls cron_generate_executive_snapshot() (admin-equivalent SECURITY DEFINER, EXECUTE revoked from PUBLIC). Each run inserts a row tagged snapshot_type='executive_snapshot_daily' and an audit_log entry.", status: "in-progress" },
  { id: "phase-11-audit", name: "G. Audit & Safety", description: "Every export RPC writes audit_log + dashboard_events. Live UI exports also emit dashboard_events via logExportDownload. Snapshot RLS prevents cross-tenant reads. No new event sources, no shadow tables.", status: "in-progress" },
  { id: "phase-11-docs", name: "H. Outline & Plan Truth", description: "Phase 11 added to buildMap. .lovable/plan.md appended with export catalog, BI schema notes, partner export rules, scheduled snapshot description, and deferred items (real-time streaming, full ETL, wide-open APIs, cohort/attribution beyond keys).", status: "in-progress" },
];

const phaseElevenGates: PhaseGates = { build: "in-progress", test: "pending", qa: "pending", locked: false };
const phaseElevenContract: PhaseContract = {
  scope: "Governed export and external-BI layer over the canonical reporting/forecasting/automation substrate. Admin snapshots + live CSV/JSON exports, partner-safe WL snapshot, BI-ready security_invoker views, and one daily pg_cron snapshot. No parallel warehouse, no streaming, no wide-open API.",
  buildItems: [
    "supabase migration: data_export_snapshots, v_bi_* views, generate_executive_snapshot, generate_wl_partner_snapshot, cron_generate_executive_snapshot",
    "src/lib/governance/exports.ts — catalog, RPC wrappers, list/CSV helpers",
    "src/components/admin/intelligence/ExportsPanel.tsx — admin Exports tab",
    "src/components/white-label/WLPartnerExportsCard.tsx — partner-safe export",
    "AdminIntelligence + WhiteLabelDashboard wiring",
    "pg_cron schedule 'intelligence_executive_snapshot_daily' (03:17 UTC)",
  ],
  engineeringTests: [
    "generate_executive_snapshot raises forbidden for non-admin callers",
    "generate_wl_partner_snapshot succeeds for admin and for owning partner; fails otherwise",
    "data_export_snapshots RLS: partners cannot read other partners' snapshots",
    "v_bi_* views report security_invoker=true",
    "Each export RPC writes audit_log + dashboard_events",
  ],
  qaUat: [
    "Admin opens /admin/intelligence → Exports → Generate Snapshot → row appears in history with timestamp + row count",
    "Admin downloads CSV and JSON of each live data export",
    "WL partner sees Reporting Exports card and downloads only their own snapshot",
    "Cron has run at least once and produced a snapshot row",
    "Audit log shows intelligence.export.* entries for both ad-hoc and cron runs",
  ],
  exitCriteria: [
    "Admin can reliably export key KPIs, analytics, and forecasts (CSV/JSON)",
    "Minimal BI/warehouse integration path exists via documented v_bi_* views",
    "WL partners can receive a safe, scoped reporting export",
    "Every export is auditable and tenant-safe",
    "/outline reflects Phase 11 truthfully",
  ],
  exclusions: [
    "Real-time streaming exports / change-data-capture pipelines",
    "Full ETL/ELT product (Fivetran-style)",
    "Wide-open public API for exports",
    "Cohort and multi-touch attribution modeling beyond stable identifiers",
    "Forecast snapshots in scheduled jobs (forecasts remain on-demand for now)",
  ],
};

export const buildPhases: BuildPhase[] = [
  { id: "phase-0", order: 0, code: "Phase 0", title: "Master Canonical Blueprint", oneLiner: "Architecture-only lock of the unified 24H Virtual platform: five domains, two tenancy planes, one governance spine. Downstream phases gated until approved.", status: "active", gates: phaseZeroGates, contract: phaseZeroContract, items: phaseZeroItems },
  { id: "phase-1", order: 1, code: "Phase 1", title: "Structural Unification", oneLiner: "Wire Marketing→Revenue→Delivery→Governance through one event spine, one handoff RPC, and two cross-domain views. No parallel systems.", status: "active", gates: phaseOneGates, contract: phaseOneContract, items: phaseOneItems },
  { id: "phase-2", order: 2, code: "Phase 2", title: "Growth Completion", oneLiner: "Finish the canonical Growth engine: real disc admin CRUD, public /seo/:slug renderer, publish RPC + event spine, and intake normalization. No second blog/keyword/SEO system.", status: "active", gates: phaseTwoGates, contract: phaseTwoContract, items: phaseTwoItems },
  { id: "phase-3", order: 3, code: "Phase 3", title: "Revenue Unification", oneLiner: "One canonical pipeline vocabulary, idempotent stage-gated handoff, and proposal/meeting/affiliate lifecycle events on the same spine. No parallel CRM.", status: "active", gates: phaseThreeGates, contract: phaseThreeContract, items: phaseThreeItems },
  { id: "phase-4", order: 4, code: "Phase 4", title: "Delivery Unification", oneLiner: "One canonical Delivery state model: handoff → intake → onboarding → campaigns → support, all wired into the Phase 1 event spine. Campaign OS stays canonical; client-safe service status surfaces on /client-dashboard.", status: "active", gates: phaseFourGates, contract: phaseFourContract, items: phaseFourItems },
  { id: "phase-5", order: 5, code: "Phase 5", title: "AI Voice / Hybrid Receptionist", oneLiner: "One canonical AI receptionist model on top of existing call flows + Campaign OS: per-flow config, hybrid escalation, readiness view from script+number+enabled, audited live toggle, and client-safe visibility on /client-dashboard.", status: "active", gates: phaseFiveGates, contract: phaseFiveContract, items: phaseFiveItems },
  { id: "phase-6", order: 6, code: "Phase 6", title: "White Label Scaling", oneLiner: "One canonical WL operating model: partner readiness rollup, partner-scoped client directory, end-client service status, and voice/delivery/support consumed from canonical Phase 4/5 substrate. Strict shell separation; wl_partner_leads stays separate.", status: "active", gates: phaseSixGates, contract: phaseSixContract, items: phaseSixItems },
  { id: "phase-7", order: 7, code: "Phase 7", title: "SuperAdmin Command Center (Mission Control)", oneLiner: "Admin-only cockpit composing Phase 1–6 governance wrappers + dashboard_events/audit_log into a single readiness, lifecycle, and blast-radius surface. Read-only; no parallel BI tool.", status: "active", gates: phaseSevenGates, contract: phaseSevenContract, items: phaseSevenItems },
  { id: "phase-8", order: 8, code: "Phase 8", title: "Automation / Optimization Layer", oneLiner: "Governed automation on top of Phases 1–7: rule-based recommendations, drift summary, hourly scheduled checks, operator-confirmed remediation, and Mission Control Automation tab. Tier-classified and fully audited; no autonomous control plane.", status: "active", gates: phaseEightGates, contract: phaseEightContract, items: phaseEightItems },
  { id: "phase-9", order: 9, code: "Phase 9", title: "Reporting / Intelligence Layer", oneLiner: "Admin-only Intelligence surface (/admin/intelligence) composing Phase 1–8 wrappers + dashboard_events into executive summary, 30-day event trend, and per-domain analytics panels. Distinct from Mission Control; no parallel BI warehouse, no real-time streaming.", status: "active", gates: phaseNineGates, contract: phaseNineContract, items: phaseNineItems },
  { id: "phase-10", order: 10, code: "Phase 10", title: "Forecasting / Predictive Ops", oneLiner: "Admin-only forecasting layer over the Phase 1–9 substrate. Explainable methods (trailing avg, stage baselines, age risk) with 7d/30d horizons and per-tile basis. Advisory only — no autonomous mutation, no black-box ML.", status: "active", gates: phaseTenGates, contract: phaseTenContract, items: phaseTenItems },
  { id: "phase-11", order: 11, code: "Phase 11", title: "Export / External BI & Data Products", oneLiner: "Governed export and external-BI layer: admin snapshots and live CSV/JSON exports, partner-safe WL snapshot, BI-ready security_invoker views, and a daily pg_cron snapshot. No parallel warehouse, no streaming, no wide-open API.", status: "active", gates: phaseElevenGates, contract: phaseElevenContract, items: phaseElevenItems },
  { id: "phase-12", order: 12, code: "Phase 12", title: "Partner & Client Experience Maturity", oneLiner: "Productize the canonical platform for non-admins: WL partner portfolio insights + nudges, WL end-client trend + nudges, direct client trend + nudges. Reuses Phase 4–6 RLS-scoped views; no new tables, no cross-tenant data, no admin internals leaked.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Front-of-house maturity layer over Phases 1–11. Adds opinionated insight, nudge, and trend cards to the WL partner dashboard, WL end-client portal, and direct client dashboard, all on existing canonical views with their existing RLS. No backend logic forks, no parallel WL/client analytics warehouse.", buildItems: ["src/lib/governance/partnerExperience.ts", "src/lib/governance/clientExperience.ts", "src/components/white-label/WLPartnerInsightsCard.tsx", "src/components/white-label/WLPartnerNudgesCard.tsx", "src/components/client-dashboard/ClientCallTrendCard.tsx", "src/components/client-dashboard/ClientNudgesCard.tsx", "Wiring: WhiteLabelDashboard, WLPortalDashboard, ClientDashboard"], engineeringTests: ["Partner insights only sum RLS-scoped directory rows", "Client trend respects RLS on call_logs / wl_call_logs", "Nudge derivation is pure (input → output)", "No new tables, no new RPCs, no admin-only views consumed in WL/client surfaces"], qaUat: ["WL partner sees Portfolio Insights tiles with 'what this means' copy", "WL partner sees What's Next nudges aligned to readiness state", "WL end-client sees 30-day trend + What's Next on portal dashboard", "Direct client sees 30-day trend + What's Next on /client-dashboard", "No tenant can see another tenant's data via these surfaces"], exitCriteria: ["WL partner dashboard meaningfully more informative", "WL end-clients have a clearer, action-oriented portal", "Direct clients see trend-aware health + nudges", "No shell boundaries or tenant-safety guarantees broken", "buildMap + plan reflect Phase 12 truthfully"], exclusions: ["Self-service WL configuration beyond existing pages", "Partner-facing forecasting (kept admin-only)", "Cross-tenant cohort or attribution analytics", "Client-facing recommendation resolution (admin/support-mediated)", "New BI views or new tables"] }, items: [
    { id: "phase-12-partner-insights", name: "A. Partner Dashboard Uplift", description: "WLPartnerInsightsCard + WLPartnerNudgesCard added to WhiteLabelDashboard. Insights aggregate from v_wl_client_directory_for_partner; nudges derive from v_wl_partner_readiness + insights. Existing readiness card and Phase 11 exports card preserved.", status: "in-progress" },
    { id: "phase-12-wl-portal", name: "B. WL End-Client Portal Evolution", description: "WLPortalDashboard now shows 30-day call trend (wl_call_logs, RLS-scoped) and What's Next nudges below the Phase 6 service status card. WL-branded shell preserved.", status: "in-progress" },
    { id: "phase-12-client", name: "C. Direct Client Dashboard Maturity", description: "Client dashboard now renders ClientCallTrendCard + ClientNudgesCard alongside existing DeliveryStatusCard + ReceptionistStatusCard. Trend uses call_logs RLS; nudges compose Phase 4 + Phase 5 wrappers + script count.", status: "in-progress" },
    { id: "phase-12-vocab", name: "D. Shared Vocabulary", description: "Readiness states (pending/configured/branded/domain_pending/domain_ready/live) and service states (not_started/collecting_info/in_review/live) used consistently in nudge copy. 'What this means' lines reduce cognitive load.", status: "in-progress" },
    { id: "phase-12-rec-exposure", name: "E. Selective Recommendation Exposure", description: "Read-only nudges expose only safe, partner/client-relevant recommendations (branding gap, domain pending, missing scripts, after-hours opportunity). Internal automation tiers remain admin-only in Mission Control.", status: "in-progress" },
    { id: "phase-12-perf", name: "F. Performance & Responsiveness", description: "All new cards use existing RLS-scoped views. Trend bucketing is in-process. Loading and empty states handled. No expensive cross-tenant aggregations.", status: "in-progress" },
    { id: "phase-12-safety", name: "G. Safety & Boundaries", description: "Partner aggregates derive only from RLS-scoped directory view. Client trend uses call_logs/wl_call_logs RLS. Admin-only BI views are NOT consumed in partner/client shells.", status: "in-progress" },
    { id: "phase-12-docs", name: "H. Outline & Plan Truth", description: "Phase 12 added to buildMap. .lovable/plan.md appended with what changed for WL partners, WL end-clients, direct clients; which signals are exposed and how; what remains admin-only.", status: "in-progress" },
  ] },
  { id: "phase-13", order: 13, code: "Phase 13", title: "Attribution / Cohorts / Growth Intelligence", oneLiner: "Honest first-touch attribution + lead-month cohorts + direct vs WL motion comparison. Adds growth_normalize_channel(), v_growth_attribution_lead, v_growth_channel_summary, v_growth_cohort_lead_month, v_growth_direct_vs_wl, BI mirrors, growthIntelligence.ts wrapper, /admin/intelligence Growth tab, and 3 new export catalog entries. No multi-touch theater, no shadow marketing schema.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Canonical growth-intelligence layer over Phases 1–12. Builds attribution and cohort views directly on leads + lead_conversions + internal_fulfillment_intakes; no parallel marketing schema. Admin-first; partner/client surfaces are intentionally untouched.", buildItems: ["SQL: growth_normalize_channel(text)", "View: v_growth_attribution_lead (per-lead canonical)", "View: v_growth_channel_summary (365d)", "View: v_growth_cohort_lead_month (12mo)", "View: v_growth_direct_vs_wl (365d)", "BI mirrors: v_bi_growth_channel_summary, v_bi_growth_cohort_summary, v_bi_growth_direct_vs_wl", "src/lib/governance/growthIntelligence.ts", "src/components/admin/intelligence/GrowthIntelligencePanel.tsx", "AdminIntelligence Growth tab", "EXPORT_CATALOG entries: growth_channel_summary, growth_cohort_lead_month, growth_direct_vs_wl"], engineeringTests: ["growth_normalize_channel returns deterministic buckets including 'unknown' for null/empty", "v_growth_attribution_lead acquisition_type is 'wl' iff a partner intake exists", "Cohort + channel views are SECURITY INVOKER (admin-visible only)", "BI mirrors expose no PII beyond what canonical views already do", "Channel + cohort exports respect Phase 11 audit + RLS"], qaUat: ["Admin sees Growth tab in /admin/intelligence", "Direct vs WL card shows leads, conversions, conv%, activation%, avg days to convert", "Top Channels table reflects normalized buckets", "Lead-Month Cohorts table covers up to 12 months trailing", "Exports panel offers Channel/Cohort/Direct-vs-WL CSV+JSON", "Partner and client surfaces show no growth-intel data"], exitCriteria: ["Documented attribution + cohort model in plan.md", "Admin can compare direct vs WL motion honestly", "Cohort + channel performance visible in admin intelligence", "BI/export surfaces include growth-intelligence outputs", "No tenant-safety regressions; no fake multi-touch attribution"], exclusions: ["Multi-touch / weighted attribution", "Ad-platform sync (Meta/Google/etc.)", "Partner-facing cohort intelligence", "Client-facing channel performance", "Predictive LTV / churn ML modeling", "Warehouse enrichment beyond v_bi_* mirrors"] }, items: [
    { id: "phase-13-attr-model", name: "A. Canonical Attribution Model", description: "growth_normalize_channel() maps leads.source into a small honest taxonomy (organic, paid, referral, partner_wl, widget, wizard, exit_intent, demo, direct, unknown). v_growth_attribution_lead resolves acquisition_type as direct vs wl based on intake.partner_id. Multi-touch is explicitly out of scope.", status: "in-progress" },
    { id: "phase-13-cohort-model", name: "B. Cohort Model", description: "Cohort anchor = date_trunc('month', leads.created_at). Conversion = lead_conversions row. Activation = internal_fulfillment_intakes.activated_at. Trailing 12 months in v_growth_cohort_lead_month.", status: "in-progress" },
    { id: "phase-13-views", name: "C. Attribution / Cohort Views", description: "v_growth_channel_summary, v_growth_cohort_lead_month, v_growth_direct_vs_wl — all SECURITY INVOKER, all derived from canonical sources. Typed wrappers in src/lib/governance/growthIntelligence.ts.", status: "in-progress" },
    { id: "phase-13-admin-ui", name: "D. Admin Intelligence Surface", description: "/admin/intelligence gains a Growth tab rendering Direct vs WL, Top Channels, and Lead-Month Cohort tables, with an explicit honesty banner about first-touch / unknowns.", status: "in-progress" },
    { id: "phase-13-exports", name: "E. Export / BI Extensions", description: "EXPORT_CATALOG (Phase 11) extended with growth_channel_summary, growth_cohort_lead_month, growth_direct_vs_wl. BI mirrors v_bi_growth_* expose stable shapes for external warehouses with admin RLS.", status: "in-progress" },
    { id: "phase-13-quality", name: "F. Segment Quality Insight", description: "Channel + cohort tables surface conversion rate, activation rate, and avg days to convert — quality, not just volume. Few strong metrics over dashboard clutter.", status: "in-progress" },
    { id: "phase-13-safety", name: "G. Boundaries & Safety", description: "Admin-only consumption. No partner/client surface reads v_growth_* or v_bi_growth_*. Honest 'unknown' bucket instead of guessed attribution.", status: "in-progress" },
    { id: "phase-13-docs", name: "H. Outline & Plan Truth", description: "Phase 13 added to buildMap. .lovable/plan.md appended with attribution model, cohort model, metric definitions, BI/export additions, and deferred items (multi-touch, ad-platform sync, partner-safe cohort subset, ML LTV/churn).", status: "in-progress" },
  ] },
  { id: "phase-14", order: 14, code: "Phase 14", title: "Commercial Ops / Packaging / Pricing Intelligence", oneLiner: "Honest commercial intelligence over canonical billing + intake + WL invoice data. Adds v_commercial_plan_performance, v_commercial_direct_vs_wl, v_commercial_revenue_mix (proxy), v_commercial_lifecycle_signals + summary, BI mirrors, commercialIntelligence.ts wrapper, /admin/intelligence Commercial tab, and 4 export catalog entries. No fabricated MRR/ARR/LTV, no shadow billing schema.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Canonical commercial-intelligence layer over Phases 1–13. Reuses billing_summaries, internal_fulfillment_intakes, wl_invoices, and Phase 13 attribution. Admin-only; no partner/client surface change.", buildItems: ["View: v_commercial_plan_performance (per-package metrics from billing_summaries)", "View: v_commercial_direct_vs_wl (intake-to-activation throughput)", "View: v_commercial_revenue_mix (PROXY: direct=overage, wl=paid invoices)", "View: v_commercial_lifecycle_signals (per-client expansion/downgrade_risk/stalled/steady)", "View: v_commercial_lifecycle_summary (signal aggregates)", "BI mirrors: v_bi_commercial_plan_performance, v_bi_commercial_direct_vs_wl, v_bi_commercial_revenue_mix, v_bi_commercial_lifecycle_signals", "src/lib/governance/commercialIntelligence.ts", "src/components/admin/intelligence/CommercialIntelligencePanel.tsx", "AdminIntelligence Commercial tab", "EXPORT_CATALOG entries: commercial_plan_performance, commercial_direct_vs_wl, commercial_revenue_mix, commercial_lifecycle_signals"], engineeringTests: ["All commercial views are SECURITY INVOKER (admin/billing-only via base RLS)", "plan_name nulls/blanks surface as 'unknown' (not coalesced to a guess)", "Lifecycle signals: <2 periods => 'insufficient_history'; rules deterministic", "Revenue mix is labeled PROXY in code, UI, and BI mirror comments", "BI mirrors expose stable schemas with no PII beyond canonical sources"], qaUat: ["Admin sees Commercial tab in /admin/intelligence", "Direct vs WL card shows intakes, activations, activation rate, avg days to activate", "Revenue mix tiles show direct overage proxy + WL paid + combined", "Plan performance table sorted by distinct_clients with capacity-strain column", "Lifecycle signal tiles count clients per bucket with rules legend", "Exports panel offers 4 new commercial CSV+JSON entries", "Partner and client surfaces show no commercial-intel data"], exitCriteria: ["Documented commercial model + proxy caveats in plan.md", "Admin can compare package performance honestly", "Direct vs WL monetization comparison visible", "Lifecycle signals bounded and explainable", "BI/export surfaces include commercial outputs", "No tenant-safety regressions; no fabricated finance metrics"], exclusions: ["Canonical contract MRR / ARR / LTV (data not present)", "Predictive churn ML modeling", "Partner-facing commercial intelligence", "Client-facing pricing-experiment UI", "Public pricing page changes", "Finance-grade accounting outputs"] }, items: [
    { id: "phase-14-model", name: "A. Commercial Segmentation Model", description: "Canonical segments: plan_name (from billing_summaries.plan_name; 'unknown' preserved), acquisition_type (direct vs wl from intake.source), and lifecycle signal bucket. No invented MRR/ARR.", status: "in-progress" },
    { id: "phase-14-plan-perf", name: "B. Plan / Package Performance", description: "v_commercial_plan_performance aggregates billing_periods, distinct_clients, total/included/overage minutes, overage_revenue_proxy, %periods-with-overage, and avg overage % of included as capacity-strain proxy.", status: "in-progress" },
    { id: "phase-14-direct-vs-wl", name: "C. Direct vs WL Monetization", description: "v_commercial_direct_vs_wl extends Phase 13's acquisition split into commercial throughput: intakes, activations, activation rate, avg days to activate, distinct WL partners.", status: "in-progress" },
    { id: "phase-14-mix", name: "D. Revenue Mix (Proxy)", description: "v_commercial_revenue_mix combines direct overage (billing_summaries.overage_amount) and WL paid invoices (wl_invoices.amount where status='paid'). Clearly labeled PROXY — not a financial statement.", status: "in-progress" },
    { id: "phase-14-lifecycle", name: "E. Lifecycle Signals", description: "v_commercial_lifecycle_signals applies bounded heuristics over the latest 2 billing periods per client: expansion (overage rate +25pp), downgrade_risk (minutes <75% of prior), stalled (>60d since last period), steady, insufficient_history. Not a churn ML model.", status: "in-progress" },
    { id: "phase-14-admin-ui", name: "F. Admin Intelligence Surface", description: "/admin/intelligence gains a Commercial tab with honesty banner, Direct-vs-WL card, Revenue Mix tiles, Plan Performance table, and Lifecycle Signal counts.", status: "in-progress" },
    { id: "phase-14-exports", name: "G. Export / BI Extensions", description: "EXPORT_CATALOG extended with commercial_plan_performance, commercial_direct_vs_wl, commercial_revenue_mix, commercial_lifecycle_signals. BI mirrors v_bi_commercial_* expose stable shapes for warehouses with admin RLS.", status: "in-progress" },
    { id: "phase-14-safety", name: "H. Boundaries, Honesty & Plan Truth", description: "Admin/billing-only consumption. No partner/client surface reads commercial views. Proxies labeled in code, UI, and BI. Phase 14 added to buildMap and plan.md with caveats and deferred items.", status: "in-progress" },
  ] },
  { id: "phase-15", order: 15, code: "Phase 15", title: "Self-Serve Onboarding / Activation Optimization", oneLiner: "Canonical activation model + role-aware activation surfaces (direct client, WL partner, WL end-client) + admin friction funnel. Truth-over-theatrics: every milestone derives from real readiness/delivery/receptionist signals, with explicit user_action vs support_dependent ownership. Adds activation.ts wrapper, ActivationPathCard, WLPartnerActivationCard, WLEndClientActivationCard, ActivationFunnelPanel, and an Activation tab in /admin/intelligence. Instruments activation_path_viewed and milestone_open events. No new schema; reuses Phases 4–6 views.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Role-aware activation experience for direct clients, WL partners, and WL end-clients, plus admin-only activation friction visibility. Pure presentation + governance wrappers over canonical readiness/delivery/receptionist views.", buildItems: ["src/lib/governance/activation.ts (canonical model + derivers + admin friction)", "src/components/client-dashboard/ActivationPathCard.tsx", "src/components/white-label/WLPartnerActivationCard.tsx", "src/components/wl-portal/WLEndClientActivationCard.tsx", "src/components/admin/intelligence/ActivationFunnelPanel.tsx", "AdminIntelligence: new Activation tab", "Mounts on /client-dashboard, /white-label-dashboard, WL portal dashboard", "Event instrumentation: activation_path_viewed, client_activation:milestone_open, wl_partner_activation:milestone_open"], engineeringTests: ["Every milestone state maps to a real backing field (no cosmetic %)", "owner=user_action milestones are the only ones rendering action CTAs", "Admin friction view consumes only admin-RLS views; renders nothing client/partner-only", "Direct client checklist completion derived from leads.onboarding_checklist required keys", "Honest progress: completedCount / totalCount only; no fabricated 'almost there' boosts"], qaUat: ["Direct client sees Activation Path with 5 milestones tied to intake, script, fulfillment, receptionist, live state", "WL partner sees activation path + portfolio rollout with no cross-tenant data", "WL end-client portal shows 4-step activation grounded in v_wl_client_service_status only", "Admin /admin/intelligence Activation tab shows funnel + ranked friction buckets", "All progress badges match underlying view values"], exitCriteria: ["Activation model documented in plan.md and buildMap", "Three persona surfaces show role-appropriate activation paths", "Admin can identify top friction buckets without manual queries", "No new RLS regressions; no cross-tenant exposure", "Events fire to dashboard_events with persona attribution"], exclusions: ["Mutation of canonical fulfillment / readiness states from client/partner UI", "Giant multi-step wizard replacing existing settings flows", "AI auto-completion of onboarding tasks", "Fabricated 'activation score' disconnected from system truth", "New schema or RLS-bearing tables (deferred until needed)"] }, items: [
    { id: "phase-15-model", name: "A. Canonical Activation Model", description: "activation.ts defines milestones for direct_client, wl_partner, wl_end_client. Each milestone has state (complete/in_progress/pending/blocked) and owner (user_action/support_dependent/info) tied to canonical signals.", status: "in-progress" },
    { id: "phase-15-direct", name: "B. Direct Client Uplift", description: "ActivationPathCard on /client-dashboard composed from v_client_delivery_status, v_client_receptionist_summary, client_scripts, leads.onboarding_checklist. Sequenced, ownership-tagged, drill-routed.", status: "in-progress" },
    { id: "phase-15-wl-partner", name: "C. WL Partner Uplift", description: "WLPartnerActivationCard composed from v_wl_partner_readiness + v_wl_client_directory_for_partner. Includes partner-level milestones plus portfolio rollout summary (with-script, live receptionists, fully live, blocked counts).", status: "in-progress" },
    { id: "phase-15-wl-end", name: "D. WL End-Client Portal Uplift", description: "WLEndClientActivationCard reads only v_wl_client_service_status row. Account-active, script-approved, receptionist-configured, service-live milestones; support items shown as 'Support handles' rather than asked of the client.", status: "in-progress" },
    { id: "phase-15-admin-funnel", name: "E. Admin Activation Funnel", description: "ActivationFunnelPanel in /admin/intelligence Activation tab. Funnel by service_state (not_started, collecting_info, in_review, live) + ranked friction buckets (intake_stalled, awaiting_review, no_script, receptionist_pending, ready_not_live).", status: "in-progress" },
    { id: "phase-15-events", name: "F. Eventing & Measurement", description: "trackEvent emits activation_path_viewed (per persona) on mount; track.cta emits client_activation:milestone_open and wl_partner_activation:milestone_open when users open a user_action milestone. Auditable via dashboard_events.", status: "in-progress" },
    { id: "phase-15-no-schema", name: "G. Minimal Governed Data Additions", description: "No new tables, RLS policies, or migrations. Pure wrappers + components over Phases 4–6 + 9 views. Admin friction summary aggregated client-side from RLS-scoped reads.", status: "in-progress" },
    { id: "phase-15-docs", name: "H. Outline / Docs", description: "Phase 15 added to buildMap.ts. .lovable/plan.md appended with activation model, role-specific onboarding rules, friction metrics, and deferred items.", status: "in-progress" },
  ] },
  { id: "phase-16", order: 16, code: "Phase 16", title: "Retention / Success Intelligence", oneLiner: "Canonical post-go-live success layer: per-account health bands (healthy/watch/intervention) derived from canonical delivery, receptionist, ticket, activity, and Phase 14 lifecycle signals — every flag exposes explicit reasons. Adds v_success_account_status, v_success_health_summary, v_success_risk_buckets, v_success_expansion_candidates, v_success_direct_vs_wl + BI mirrors, successIntelligence.ts wrapper, /admin/intelligence Success tab, 5 export catalog entries, and dashboard_events for success_panel_viewed / risk_bucket_open / intervention_open / expansion_open. Admin-only; no fabricated churn ML.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Admin-only retention/success intelligence over Phases 1–15. Reuses v_client_delivery_status, v_account_receptionist_status, v_commercial_lifecycle_signals, internal_fulfillment_intakes. No table/RLS changes; partner and client surfaces unchanged.", buildItems: ["View: v_success_account_status (per live-account snapshot + rule-based health_band + reasons[])", "View: v_success_health_summary (band counts split by direct/WL)", "View: v_success_risk_buckets (counts per explicit reason)", "View: v_success_expansion_candidates (lifecycle expansion + sustained healthy live)", "View: v_success_direct_vs_wl (portfolio comparison)", "BI mirrors: v_bi_success_account_status, v_bi_success_health_summary, v_bi_success_risk_buckets, v_bi_success_expansion_candidates, v_bi_success_direct_vs_wl", "src/lib/governance/successIntelligence.ts (typed wrappers + HEALTH_BAND_RULES + reason labels)", "src/components/admin/intelligence/SuccessIntelligencePanel.tsx", "AdminIntelligence Success tab", "EXPORT_CATALOG entries: success_account_status, success_health_summary, success_risk_buckets, success_expansion_candidates, success_direct_vs_wl"], engineeringTests: ["All success views are SECURITY INVOKER (admin/billing-only via base RLS)", "Health bands are deterministic rules; reasons[] enumerates every trigger", "lifecycle_signal preserved as-is from Phase 14 (no rebucketing)", "Expansion candidates require either signal='expansion' or sustained healthy live (>=60d, healthy receptionist)", "BI mirrors expose stable schemas for the Phase 11 export pipeline"], qaUat: ["Admin sees Success tab in /admin/intelligence between Activation and Forecasts", "Three band tiles show counts split by direct vs WL with rules legend", "Risk Buckets card lists reasons sorted by frequency", "Direct vs WL table shows accounts, healthy/watch/intervention, expansion-ready, avg days live", "Top intervention candidates show explicit reason badges and an Open link to /admin/clients?lead=", "Expansion-ready list shows lifecycle badge + plan + days live + receptionist health", "Exports panel offers 5 new success CSV+JSON entries", "Partner and client surfaces show no success-intel data"], exitCriteria: ["Documented success model + band rules + reason taxonomy in plan.md", "Admin can identify healthy / watch / intervention live accounts", "Direct vs WL post-go-live health comparable honestly", "Expansion-ready candidates surfaced with explicit signal", "BI/export surfaces include 5 success outputs", "No tenant-safety regressions; no fabricated churn/health ML"], exclusions: ["Predictive churn ML or composite 'AI health score'", "Canonical contract MRR / cancellation truth (no source of truth yet)", "Partner-facing or client-facing success intelligence", "Mutations of canonical service/billing state from this surface", "Shadow customer-success schema or CRM tables"] }, items: [
    { id: "phase-16-model", name: "A. Canonical Success Model", description: "Documented dimensions: live service continuity, receptionist health, recent activity, open tickets, lifecycle trajectory, expansion readiness. Composed into rule-based health_band (healthy/watch/intervention) with explicit reasons[].", status: "in-progress" },
    { id: "phase-16-views", name: "B. Account Health Views", description: "v_success_account_status, v_success_health_summary, v_success_risk_buckets, v_success_expansion_candidates, v_success_direct_vs_wl. SECURITY INVOKER. No new tables.", status: "in-progress" },
    { id: "phase-16-admin", name: "C. Admin Success Intelligence", description: "SuccessIntelligencePanel mounted as /admin/intelligence Success tab. Band tiles, risk buckets, direct-vs-WL table, top intervention candidates, expansion-ready list. Honesty banner clarifies rule-based bands.", status: "in-progress" },
    { id: "phase-16-ops", name: "D. CS Operations Support", description: "Each flagged account exposes its reasons[]; Open buttons drill into /admin/clients?lead= for support workflows. No automated interventions; humans decide.", status: "in-progress" },
    { id: "phase-16-bi", name: "E. Export / BI Extensions", description: "5 new EXPORT_CATALOG entries (success_account_status, success_health_summary, success_risk_buckets, success_expansion_candidates, success_direct_vs_wl) backed by v_bi_success_* mirrors.", status: "in-progress" },
    { id: "phase-16-events", name: "F. Eventing & Movement", description: "trackEvent emits success_panel_viewed on mount; track.cta emits admin_success:risk_bucket_open / intervention_open / expansion_open. Audited via dashboard_events.", status: "in-progress" },
    { id: "phase-16-partner-deferred", name: "G. Partner-Safe Subset (Deferred)", description: "Partner-facing success view deferred. Cross-tenant benchmarking and admin internals are not safely scoped today; revisit once a true tenant-safe success subset is defined.", status: "planned" },
    { id: "phase-16-docs", name: "H. Outline / Docs", description: "Phase 16 added to buildMap.ts. .lovable/plan.md appended with success model, band rules, reason taxonomy, BI additions, and deferred items.", status: "in-progress" },
  ] },
  { id: "phase-17", order: 17, code: "Phase 17", title: "Canonical Subscription / MRR / Churn Model", oneLiner: "Governed recurring-revenue truth layer over canonical billing data. Adds v_subscription_snapshot (per-lead normalized state + MRR only from custom_plans), v_subscription_wl_recurring (90d paid-invoice avg per partner, labeled proxy), v_subscription_mrr_summary, v_subscription_plan_summary, v_subscription_direct_vs_wl, v_subscription_churn_events, v_subscription_movements (12-month new/churn series; expansion/contraction = 0 until a movement event log exists) + BI mirrors. Wires subscriptionTruth.ts wrapper, /admin/intelligence Subscriptions tab, and 6 export catalog entries. Admin/billing-only; no fabricated MRR or churn ML.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Admin/billing-only canonical recurring-subscription substrate over Phases 3, 6, 14. Reuses leads, custom_plans, billing_summaries, wl_invoices, white_label_partners, internal_fulfillment_intakes. No new tables; pure SECURITY INVOKER view layer. Partner and client surfaces unchanged.", buildItems: ["Migration: 7 v_subscription_* views + 7 v_bi_subscription_* mirrors", "Honesty: mrr_usd derived only from custom_plans.minimum_monthly or fixed_amount; otherwise NULL with mrr_basis='unknown'", "Subscription state taxonomy: active / past_due / incomplete / canceled / unknown", "Churn = explicit transition to pipeline_stage churned/lost (never inactivity)", "src/lib/governance/subscriptionTruth.ts (typed wrappers + helpers + MRR_BASIS_LABEL)", "src/components/admin/intelligence/SubscriptionIntelligencePanel.tsx", "AdminIntelligence Subscriptions tab between Commercial and Activation", "EXPORT_CATALOG: subscription_snapshot, subscription_mrr_summary, subscription_plan_summary, subscription_direct_vs_wl, subscription_churn_events, subscription_movements"], engineeringTests: ["All 14 new views are SECURITY INVOKER and inherit existing admin/billing RLS", "Snapshot only includes leads with stripe_subscription_id, subscription_started_at, or relevant pipeline_stage", "MRR is NULL whenever no custom_plan value exists (no fallback to price tables)", "Direct vs WL stream rows are not summed into a single misleading total", "Movements expansion/contraction surfaced as 0 with basis='derived'"], qaUat: ["Admin sees Subscriptions tab in /admin/intelligence", "Honesty banner explains MRR basis and proxy boundaries", "KPI tiles show active subs, direct active known MRR, WL recurring proxy, churned subs", "Direct vs WL table shows known MRR vs recurring proxy with explicit basis column", "Plan summary lists active / canceled / past_due counts and known MRR per plan-stream", "Movements table shows 12 months of new/churn rows; expansion/contraction footnoted as 0", "Churn list shows lifetime days and lost MRR per canceled account", "Exports panel offers 6 new subscription CSV+JSON entries", "Partner and client surfaces show no subscription-truth data"], exitCriteria: ["Canonical subscription state and normalized MRR exposed for admin/billing roles", "Direct vs WL recurring measurable without conflating overage or one-time charges", "Churn events expressed as explicit transitions, not inactivity heuristics", "BI/export surfaces include 6 subscription outputs", "Phase 14 commercial proxies remain labeled; Phase 16 success layer unchanged but can now cross-reference subscription truth"], exclusions: ["Fabricated ARR, LTV, or composite finance scores", "Discrete expansion/contraction event log (deferred until subscription movement events are captured)", "Trial / paused / reactivation taxonomy beyond what canonical state allows today", "Partner-facing or client-facing subscription/MRR data", "Mutations of subscription state from this surface (read-only)", "Replacement of Stripe as system of record"] }, items: [
    { id: "phase-17-model", name: "A. Canonical Subscription Model", description: "Documented subscription grain: lead × plan × stream × interval. State taxonomy: active / past_due / incomplete / canceled / unknown. mrr_usd derived only from custom_plans (minimum_monthly | fixed_amount); otherwise null with mrr_basis='unknown'.", status: "in-progress" },
    { id: "phase-17-mrr", name: "B. MRR / Movement Logic", description: "v_subscription_mrr_summary aggregates known MRR per stream/state. v_subscription_movements emits 12 monthly rows with new_subs/new_mrr from subscription_started_at and churn_subs/churned_mrr from explicit cancellations. Expansion/contraction reported as 0 until a movement event log exists.", status: "in-progress" },
    { id: "phase-17-views", name: "C. Governed Views", description: "7 canonical views (snapshot, wl_recurring, mrr_summary, plan_summary, direct_vs_wl, churn_events, movements) + 7 v_bi_subscription_* mirrors. All SECURITY INVOKER.", status: "in-progress" },
    { id: "phase-17-admin", name: "D. Admin Subscriptions Tab", description: "SubscriptionIntelligencePanel mounted at /admin/intelligence Subscriptions. KPI tiles, direct vs WL table, plan summary, 12-month movements, recent churn list. Honesty banner clarifies MRR basis, proxy labeling, and churn definition.", status: "in-progress" },
    { id: "phase-17-proxy", name: "E. Proxy Migration", description: "Phase 14 commercial intelligence revenue mix and lifecycle signals remain labeled as proxies; Phase 16 success layer unchanged. Subscription truth provides the canonical substrate that downstream layers can adopt incrementally without forcing churn-from-inactivity rewrites.", status: "in-progress" },
    { id: "phase-17-exports", name: "F. Export / BI Extensions", description: "6 new EXPORT_CATALOG entries (subscription_snapshot, subscription_mrr_summary, subscription_plan_summary, subscription_direct_vs_wl, subscription_churn_events, subscription_movements) backed by v_bi_subscription_* mirrors.", status: "in-progress" },
    { id: "phase-17-honesty", name: "G. Honesty / Boundaries", description: "No ARR/LTV synthesis. Overage and one-time charges excluded from MRR. WL recurring labeled as 90d paid-invoice avg proxy. Admin/billing only; no partner/client exposure.", status: "in-progress" },
    { id: "phase-17-docs", name: "H. Outline / Docs", description: "Phase 17 added to buildMap.ts. .lovable/plan.md appended with subscription state taxonomy, MRR basis, churn definition, movement logic, BI additions, and deferred items (expansion/contraction event log, trial/pause taxonomy, partner-safe subset).", status: "in-progress" },
  ] },
  { id: "phase-18", order: 18, code: "Phase 18", title: "Executive Finance / Board Metrics Layer", oneLiner: "Board-grade composition over Phase 17 canonical subscription truth. Adds v_exec_mrr_spine (24-month ending MRR + net new MRR), v_exec_mrr_bridge (starting + new + expansion - contraction - churn = ending; expansion/contraction = 0 until movement event log), v_exec_retention_rates (logo churn, revenue churn, GRR, NRR; NULL when starting denominator is 0), v_exec_direct_vs_wl_summary (active/30d new/30d churn/known MRR/labeled WL recurring proxy), v_exec_plan_contribution (share of active known MRR per plan and stream), plus 5 v_bi_exec_* mirrors. Wires executiveFinance.ts wrapper, /admin/intelligence Executive tab, and 5 export catalog entries. Admin/billing-only; no fabricated CAC, LTV, or ARR.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Admin/billing-only executive finance composition layer over Phase 17. Pure SECURITY INVOKER views; no new tables, no new MRR or churn definitions. Inherits honesty contract: MRR only from canonical custom plans, churn = explicit cancellation transition, WL recurring is labeled 90d paid-invoice average proxy.", buildItems: ["Migration: 5 v_exec_* views + 5 v_bi_exec_* mirrors", "MRR spine: 24-month ending MRR derived from snapshot lifetimes (effective_start_at / effective_end_at)", "MRR bridge: starting + new + expansion - contraction - churn = ending per month", "Retention rates: logo churn, revenue churn, GRR and NRR; NULL when starting denominator is 0", "Direct vs WL exec summary: active subs, 30d new, 30d churn, known MRR, WL recurring proxy", "Plan contribution: per-plan share of active known MRR + avg per sub", "src/lib/governance/executiveFinance.ts (typed wrappers + bundle fetch + format helpers)", "src/components/admin/intelligence/ExecutiveFinancePanel.tsx", "AdminIntelligence Executive tab between Reporting and Growth", "EXPORT_CATALOG: exec_mrr_spine, exec_mrr_bridge, exec_retention_rates, exec_direct_vs_wl_summary, exec_plan_contribution"], engineeringTests: ["All 10 new views are SECURITY INVOKER and inherit Phase 17 admin/billing visibility", "MRR spine never sums unknown-MRR subscriptions; ending MRR uses effective lifetimes", "Bridge ending MRR equals spine ending MRR for the same month", "Retention denominators of 0 yield NULL rates (no division by zero, no fabricated 100%)", "WL recurring proxy is exposed only on the wl row of the direct-vs-wl summary, not summed with direct known MRR", "Plan contribution shares sum to ~1.0 when total known MRR > 0"], qaUat: ["Admin sees Executive tab in /admin/intelligence", "Honesty banner reiterates MRR basis, GRR=NRR caveat, WL proxy label, and absence of CAC/LTV", "Headline KPIs show ending MRR, net new MRR, GRR/NRR, revenue/logo churn", "MRR spine area chart renders 24 months of ending MRR", "MRR bridge for the latest month displays starting/new/expansion/contraction/churn/ending cells", "Direct vs WL table shows known MRR vs labeled WL recurring proxy in separate columns", "Plan contribution lists active count, active known MRR, and share of MRR per plan-stream", "12-month retention table shows GRR/NRR equal today (no expansion log)", "5 new executive exports appear in Exports panel", "Partner and client surfaces show no executive finance data"], exitCriteria: ["Executive can see a coherent MRR / churn / retention picture grounded in Phase 17 truth", "Direct vs WL economics visible at a glance with proxies clearly labeled", "Plan contribution and movements understandable without ad-hoc spreadsheets", "BI/export surfaces support board-pack assembly across 5 new entries", "All metrics derivable from governed views; no UI-side ad-hoc finance logic"], exclusions: ["CAC, LTV, payback, and any acquisition-spend modeling (Phase 19 candidate)", "Discrete expansion / contraction event log (deferred at Phase 17; expansion = 0 today)", "Trial / pause / reactivation taxonomy beyond canonical state", "Partner-facing or client-facing finance data", "Forecast or scenario modeling on top of executive metrics", "Replacing canonical MRR/churn definitions from Phase 17"] }, items: [
    { id: "phase-18-defs", name: "A. Executive Metric Catalog", description: "Documents MRR, new/expansion/contraction/churn MRR, logo and revenue churn rates, GRR, NRR, ending MRR, and plan contribution. Each metric: formula, input view, caveats. Catalog appended to .lovable/plan.md.", status: "in-progress" },
    { id: "phase-18-views", name: "B. Executive Finance Views", description: "5 v_exec_* views (mrr_spine, mrr_bridge, retention_rates, direct_vs_wl_summary, plan_contribution) + 5 v_bi_exec_* mirrors. All thin compositions over Phase 17 canonical truth; SECURITY INVOKER.", status: "in-progress" },
    { id: "phase-18-panel", name: "C. Admin Executive Panel", description: "ExecutiveFinancePanel mounted at /admin/intelligence Executive tab. Headline KPIs, 24-month MRR spine area chart, latest MRR bridge cells, direct vs WL summary table, plan contribution table, 12-month retention table. Honesty banner clarifies MRR basis, GRR=NRR caveat, WL proxy, and CAC/LTV exclusion.", status: "in-progress" },
    { id: "phase-18-exports", name: "D. Export / BI Extensions", description: "5 new EXPORT_CATALOG entries (exec_mrr_spine, exec_mrr_bridge, exec_retention_rates, exec_direct_vs_wl_summary, exec_plan_contribution) backed by v_bi_exec_* mirrors.", status: "in-progress" },
    { id: "phase-18-alignment", name: "E. Alignment with Existing Tabs", description: "Executive metrics inherit Phase 17 definitions verbatim; Subscriptions and Success tabs remain authoritative for their grain. No contradictions between executive headlines and lower-level truth; WL proxy labeling is consistent across surfaces.", status: "in-progress" },
    { id: "phase-18-honesty", name: "F. Honesty / Limits", description: "Unknown-MRR subscriptions excluded from sums (not zeroed). Expansion/contraction = 0 today, so GRR == NRR; both reported with explicit caveat. WL recurring labeled as 90d paid-invoice avg proxy. CAC, LTV, and full WL unit economics explicitly out of scope.", status: "in-progress" },
    { id: "phase-18-docs", name: "G. Outline / Docs", description: "Phase 18 added to buildMap.ts. .lovable/plan.md appended with executive metric catalog (formulas + input views + caveats), BI/export additions, and deferred items (expansion/contraction event log, CAC/LTV/payback, trial/pause taxonomy).", status: "in-progress" },
  ] },
  { id: "phase-19", order: 19, code: "Phase 19", title: "CAC / LTV / Payback Modeling", oneLiner: "Bridges Phase 13 attribution and Phase 17/18 subscription truth into honest unit economics. Adds v_unit_econ_lead_cost (per-lead cost from approved/paid sales_commissions only), v_unit_econ_channel (CAC, LTV = avg known MRR × avg observed churn lifetime months when ≥3 events, payback = CAC / avg known MRR, coverage_flag), v_unit_econ_direct_vs_wl, v_unit_econ_cohort, plus 3 v_bi_* mirrors. Wires unitEconomics.ts wrapper, /admin/intelligence Economics tab, and 3 export catalog entries. Admin-only; no fabricated ad spend; channels without recorded commissions render as cost_unknown.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Admin-only governed unit-economics layer composing Phase 13 attribution with Phase 17 subscription/churn truth. Pure SECURITY INVOKER views; no new tables; CAC inputs strictly from approved/paid sales_commissions.", buildItems: ["Migration: v_unit_econ_lead_cost + v_unit_econ_channel + v_unit_econ_direct_vs_wl + v_unit_econ_cohort + 3 v_bi_unit_econ_* mirrors", "CAC = sum(approved/paid commission_amount) / count(converted leads with known cost) per channel/segment/cohort", "LTV = avg known MRR × (avg lifetime_days from churn events / 30); requires ≥3 churn events in scope, else NULL", "Payback months = CAC / avg known MRR; NULL when either is missing", "coverage_flag enum: ok | cost_unknown | mrr_unknown | lifetime_insufficient", "src/lib/governance/unitEconomics.ts (typed wrappers + LTV:CAC helper + format helpers)", "src/components/admin/intelligence/UnitEconomicsPanel.tsx with honesty banner", "AdminIntelligence Economics tab between Subscriptions and Activation", "EXPORT_CATALOG: unit_econ_channel, unit_econ_direct_vs_wl, unit_econ_cohort"], engineeringTests: ["All 7 new views are SECURITY INVOKER and inherit existing leads/sales_commissions admin-only RLS", "CAC numerator strictly excludes pending/disputed/voided commissions", "Channels with no commissions yield cac_usd = NULL and coverage_flag = cost_unknown (not 0)", "LTV is NULL when fewer than 3 churn events exist in scope", "WL row carries explicit note that partner-side acquisition cost is excluded", "Cohort view omits LTV (insufficient grain) by design"], qaUat: ["Admin sees Economics tab in /admin/intelligence", "Honesty banner clarifies CAC source, LTV threshold, WL exclusion, and guidance vs accounting", "Channel table renders CAC, LTV, LTV:CAC, payback months, coverage badge", "Direct vs WL table compares the two motions side by side", "Cohort table shows last 12 lead-cohort months with CAC and payback", "Channels without commissions show — for CAC and the cost_unknown badge, never a fabricated value", "3 new economics exports appear in Exports panel", "Partner and client surfaces show no CAC/LTV data"], exitCriteria: ["CAC, LTV, and payback are computed only where canonical inputs support them", "Direct vs WL unit economics comparable honestly with WL exclusion clearly labeled", "Channels and cohorts with insufficient coverage render as unknown rather than guessed", "BI/export surfaces expose the new metrics to downstream tooling", "All formulas live in governed views, not UI-side ad-hoc logic"], exclusions: ["Ad-platform spend ingestion (Google/Meta/LinkedIn) — no source table yet", "Sales-rep-level CAC attribution beyond per-lead commission sums", "Partner-side acquisition cost in WL CAC", "Cohort-level LTV (insufficient observations at this grain)", "Predictive LTV / ML-based churn modeling", "Replacing canonical MRR/churn definitions from Phase 17 or executive metrics from Phase 18"] }, items: [
    { id: "phase-19-cost-model", name: "A. Cost Data Modeling (CAC Inputs)", description: "v_unit_econ_lead_cost aggregates approved/paid commission_amount per lead with cost_basis enum (sales_commissions | unknown). No ad spend table exists yet; gap is acknowledged not faked.", status: "in-progress" },
    { id: "phase-19-cac", name: "B. CAC Model", description: "Per channel, direct-vs-WL, and cohort CAC = total known cost / conversions with known cost. NULL with coverage_flag when no commissions recorded.", status: "in-progress" },
    { id: "phase-19-ltv", name: "C. LTV Model", description: "Conservative LTV = avg known MRR × avg observed churn-lifetime months. Requires ≥3 churn events in scope; censored subscriptions are not extrapolated.", status: "in-progress" },
    { id: "phase-19-payback", name: "D. Payback Model", description: "Payback months = CAC / avg known MRR per channel and per direct/WL. Cohort-level payback included; cohort LTV deliberately omitted.", status: "in-progress" },
    { id: "phase-19-views", name: "E. Governed Unit-Economics Views", description: "v_unit_econ_lead_cost + v_unit_econ_channel + v_unit_econ_direct_vs_wl + v_unit_econ_cohort + 3 v_bi_unit_econ_* mirrors. SECURITY INVOKER.", status: "in-progress" },
    { id: "phase-19-panel", name: "F. Admin Economics Panel", description: "UnitEconomicsPanel mounted at /admin/intelligence Economics tab with honesty banner, channel table, direct-vs-WL table, and 12-cohort table.", status: "in-progress" },
    { id: "phase-19-exports", name: "G. Export / BI Extensions", description: "3 new EXPORT_CATALOG entries (unit_econ_channel, unit_econ_direct_vs_wl, unit_econ_cohort) backed by v_bi_unit_econ_* mirrors.", status: "in-progress" },
    { id: "phase-19-honesty", name: "H. Honesty / Limits", description: "No fabricated ad spend. coverage_flag surfaces cost_unknown, mrr_unknown, lifetime_insufficient. WL CAC excludes partner-side acquisition cost. Outputs labeled guidance, not accounting.", status: "in-progress" },
    { id: "phase-19-docs", name: "I. Outline / Docs", description: "Phase 19 added to buildMap.ts. .lovable/plan.md appended with CAC/LTV/payback formulas, input views, coverage rules, and deferred items (ad-platform ingestion, partner-side WL cost, cohort LTV, predictive modeling).", status: "in-progress" },
  ] },
  { id: "phase-20", order: 20, code: "Phase 20", title: "WL Economics & Partner Profitability", oneLiner: "Admin-only partner profitability layer composing WL recurring proxy (v_subscription_wl_recurring 90d paid-invoice avg), known acquisition cost (approved/paid sales_commissions joined via v_growth_attribution_lead.wl_partner_id), latest servicing cost proxy (wl_partner_usage_summary total_wholesale_cost + total_campaign_fees), and lifecycle health overlays (v_commercial_lifecycle_signals). Adds v_wl_partner_economics, v_wl_partner_cohort_economics, v_wl_partner_profitability_ranking, v_wl_recurring_vs_internal_cost + 4 v_bi_* mirrors. Wires wlEconomics.ts wrapper, /admin/intelligence WL Economics tab, and 4 export catalog entries. Partner-side acquisition cost remains excluded; recurring stays a labeled proxy; partial margin is NULL when either input is missing.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Admin-only governed partner economics layer. Pure SECURITY INVOKER views; no new tables; reuses Phase 17 recurring proxy, Phase 19 commission CAC logic, Phase 16 lifecycle bands. Never exposed to partner-facing surfaces.", buildItems: ["Migration: v_wl_partner_economics + v_wl_partner_cohort_economics + v_wl_partner_profitability_ranking + v_wl_recurring_vs_internal_cost + 4 v_bi_* mirrors", "recurring_value_proxy_usd from v_subscription_wl_recurring (labeled 90d paid-invoice average; not canonical MRR)", "known_acq_cost_usd = sum(approved/paid sales_commissions.commission_amount) joined to leads via v_growth_attribution_lead.wl_partner_id", "servicing_cost_proxy_usd = latest wl_partner_usage_summary (total_wholesale_cost + total_campaign_fees); NULL when no usage row", "partial_margin_proxy_usd = recurring - servicing when both present, else NULL; acquisition cost reported separately, never amortized", "Health overlays: client expansion / contraction / stable counts from v_commercial_lifecycle_signals across the partner's portfolio", "coverage_flag enum: partial_ok | recurring_unknown | servicing_cost_unknown | no_data", "src/lib/governance/wlEconomics.ts (typed wrappers + bundle fetch + format helpers)", "src/components/admin/intelligence/WLEconomicsPanel.tsx with honesty banner, KPI tiles, ranking, health overlay, cohort table", "AdminIntelligence WL Economics tab after Economics", "EXPORT_CATALOG: wl_partner_economics, wl_partner_cohort_economics, wl_partner_profitability_ranking, wl_recurring_vs_internal_cost"], engineeringTests: ["All 8 new views are SECURITY INVOKER and inherit existing admin-only RLS on white_label_partners, wl_partner_usage_summary, sales_commissions, leads", "Recurring is sourced strictly from v_subscription_wl_recurring; never relabeled as canonical MRR", "Partial margin is NULL whenever recurring OR servicing is NULL; never coerced to zero", "Partners with no commission events render known_acq_cost_usd = 0 with commission_events = 0 (not a guessed CAC)", "Profitability ranking sorts NULL-margin partners last via NULLS LAST", "No partner-facing route reads any v_wl_partner_* economics view"], qaUat: ["Admin sees WL Economics tab in /admin/intelligence", "Honesty banner clarifies recurring proxy, servicing proxy, partner-side CAC exclusion, and admin-only scope", "KPI tiles show partner counts, sum recurring proxy, sum servicing cost, sum partial margin", "Ranking table lists partners with margin, margin %, recurring, servicing, acquisition cost, coverage badge", "Health overlay table shows expansion / stable / contraction counts per partner portfolio", "Cohort table groups by partner onboard month with avg recurring, sum recurring, avg margin %", "Partners missing recurring or servicing show — and an explicit coverage badge, never a fake number", "4 new WL economics exports appear in Exports panel", "WL partner and WL end-client surfaces show no cross-partner economics"], exitCriteria: ["Admin can compare partners on recurring proxy, known cost, partial margin and coverage honestly", "Partner cohorts comparable by onboard month without redefining metrics", "Lifecycle health overlays enrich economics without redefining Phase 16 bands", "BI/export surfaces expose all 4 new entries to downstream tooling", "No fabricated partner-side cost or cross-partner exposure"], exclusions: ["Partner-side acquisition cost (what the partner spends on their own sales/marketing) — no canonical source", "Full WL P&L / accounting reconciliation", "Per-client servicing cost decomposition beyond the partner-level usage summary", "Partner-facing benchmarking or cross-partner comparison surfaces", "Predictive partner LTV / churn modeling", "Replacing canonical recurring (Phase 17), executive metrics (Phase 18), or unit-economics CAC logic (Phase 19)"] }, items: [
    { id: "phase-20-model", name: "A. WL Economics Model", description: "Canonical dimensions documented: partner, cohort_month, active_clients, recurring_value_proxy_usd, known_acq_cost_usd, servicing_cost_proxy_usd, partial_margin_proxy_usd, partial_margin_pct, health overlays, coverage_flag.", status: "in-progress" },
    { id: "phase-20-views", name: "B. Partner Profitability Views", description: "v_wl_partner_economics + v_wl_partner_cohort_economics + v_wl_partner_profitability_ranking + v_wl_recurring_vs_internal_cost. SECURITY INVOKER; inherit admin RLS.", status: "in-progress" },
    { id: "phase-20-cost", name: "C. Internal Cost Signals for WL", description: "Servicing cost proxy from latest wl_partner_usage_summary (wholesale + campaign fees). Acquisition cost from approved/paid sales_commissions via v_growth_attribution_lead.wl_partner_id. No speculative partner-side CAC.", status: "in-progress" },
    { id: "phase-20-panel", name: "D. Admin WL Economics Surface", description: "WLEconomicsPanel mounted at /admin/intelligence WL Economics tab with honesty banner, KPI tiles, profitability ranking, health overlay, partner cohort table.", status: "in-progress" },
    { id: "phase-20-exports", name: "E. Export / BI Extensions", description: "4 new EXPORT_CATALOG entries (wl_partner_economics, wl_partner_cohort_economics, wl_partner_profitability_ranking, wl_recurring_vs_internal_cost) backed by v_bi_wl_* mirrors.", status: "in-progress" },
    { id: "phase-20-alignment", name: "F. Alignment With Existing Layers", description: "Reuses Phase 17 recurring proxy, Phase 19 commission CAC logic, and Phase 16 lifecycle signals as-is. Recurring stays clearly labeled and never summed with canonical MRR.", status: "in-progress" },
    { id: "phase-20-honesty", name: "G. Honesty / Safety", description: "Partner-side CAC remains excluded. Partial margin NULL when inputs missing. No partner-facing benchmarking. coverage_flag exposes recurring_unknown / servicing_cost_unknown / no_data.", status: "in-progress" },
    { id: "phase-20-docs", name: "H. Outline / Docs", description: "Phase 20 added to buildMap.ts. .lovable/plan.md appended with WL economics model, formulas, BI/export surfaces, and deferred items (partner-side CAC, richer servicing decomposition, partner-safe subset).", status: "in-progress" },
  ] },
  { id: "phase-21", order: 21, code: "Phase 21", title: "Scenario Modeling & Financial Planning", oneLiner: "Admin-only scenario engine projecting 12 months of MRR/churn/CAC/payback under explicit operator levers (new-MRR growth ×, churn ×, pricing uplift, CAC efficiency, expansion/contraction overrides). Baseline drawn ONLY from Phase 17/18/19 canonical views (v_exec_mrr_spine, v_exec_retention_rates, v_unit_econ_direct_vs_wl). Ships base/upside/downside presets + custom levers + month-by-month MRR walk. governance/scenarioModeling.ts + ScenarioModelingPanel + /admin/intelligence Scenarios tab.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Bounded scenario derivation over canonical Phase 17/18/19 metrics. No new tables, no parallel finance logic, no fabricated cash-flow model.", buildItems: ["src/lib/governance/scenarioModeling.ts (baseline builder + projector + presets)", "src/components/admin/intelligence/ScenarioModelingPanel.tsx", "AdminIntelligence Scenarios tab"], engineeringTests: ["Baseline reads only from canonical view bundles", "Levers are pure multipliers; no metric redefinition", "NULL baselines (e.g. churn) propagate as labeled notes, not fake zeros"], qaUat: ["Admin sees Scenarios tab", "Honesty banner present", "Base / upside / downside / custom rows render", "Custom month-by-month walk balances start + new + exp - contra - churn = end"], exitCriteria: ["Leadership can compare canonical scenarios with explicit levers", "No metric drift from Phase 17/18/19", "All caveats surfaced in UI"], exclusions: ["Full FP&A / cash-flow modeling", "Fabricated expansion/contraction series", "Persistent saved scenarios (deferred)", "WL mix-shift impact on MRR (informational only in v1)"] }, items: [
    { id: "phase-21-baseline", name: "A. Canonical Baseline Builder", description: "Pulls starting MRR + 3mo avg new MRR + 3mo avg churn rate + blended CAC/Avg MRR from canonical views. Unknowns stay NULL.", status: "in-progress" },
    { id: "phase-21-engine", name: "B. Scenario Projector", description: "12-month MRR walk under explicit lever multipliers + uplift + override expansion/contraction. Pure function; no DB writes.", status: "in-progress" },
    { id: "phase-21-panel", name: "C. Admin Scenarios Panel", description: "ScenarioModelingPanel with KPI tiles, lever inputs, base/upside/downside/custom comparison, and per-month walk for custom.", status: "in-progress" },
    { id: "phase-21-honesty", name: "D. Honesty / Limits", description: "Outputs labeled operator guidance, not forecast. Notes flag missing baselines, expansion-log absence, WL mix-shift not applied.", status: "in-progress" },
  ] },
  { id: "phase-22", order: 22, code: "Phase 22", title: "Board Pack / Investor-Ready Export", oneLiner: "Admin-only composed Board Pack bundle assembling MRR spine, MRR bridge, retention/GRR/NRR, direct vs WL, plan contribution, unit economics summary, top-10 WL partner profitability, Phase 21 scenario summary, and 12-month subscription movements. Pure composition over canonical views; per-section caveats preserved. governance/boardPack.ts + BoardPackPanel + JSON download + per-section CSV. EXPORT_CATALOG: board_pack.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Composed admin-only Board Pack output. No re-aggregation, no narrative synthesis. Each section maps to its source view(s).", buildItems: ["src/lib/governance/boardPack.ts (assembleBoardPack + fetchBoardPack)", "src/components/admin/intelligence/BoardPackPanel.tsx with JSON + per-section CSV downloads", "AdminIntelligence Board Pack tab", "EXPORT_CATALOG: board_pack"], engineeringTests: ["All section data sourced from canonical bundles", "Per-section caveats arrive intact in JSON output", "No section invents fields beyond its source view"], qaUat: ["Admin sees Board Pack tab", "Section list shows source + caveats", "Download JSON returns full bundle", "Per-section CSV downloads valid CSV"], exitCriteria: ["Leadership/board pack assembled without spreadsheet gymnastics", "Every metric traceable to a canonical view", "Caveats and proxy areas remain visible"], exclusions: ["Narrative storytelling / unsupported investor copy", "Re-aggregation of metrics in UI", "PDF generation (deferred)", "Persistent versioned packs (deferred)"] }, items: [
    { id: "phase-22-assembler", name: "A. Board Pack Assembler", description: "Composes 9 sections (MRR spine, latest bridge, retention, direct vs WL, plan contribution, unit economics, top-10 WL profitability, scenarios, movements) from canonical bundles.", status: "in-progress" },
    { id: "phase-22-panel", name: "B. Admin Board Pack Panel", description: "Renders section catalog with per-section caveats + download controls. JSON full bundle + per-section CSV.", status: "in-progress" },
    { id: "phase-22-exports", name: "C. Export Catalog Entry", description: "EXPORT_CATALOG: board_pack JSON bundle.", status: "in-progress" },
    { id: "phase-22-honesty", name: "D. Caveat Preservation", description: "Each section carries explicit caveats (WL recurring proxy, GRR=NRR, expansion log absence, LTV threshold, partner-side CAC excluded). Global caveats banner present.", status: "in-progress" },
  ] },
  { id: "phase-23", order: 23, code: "Phase 23", title: "Pricing Experimentation & Plan Analytics", oneLiner: "Admin-only governed pricing experiments. Tables pricing_experiments + pricing_experiment_assignments (RLS admin-only). View v_pricing_experiment_results (+ v_bi_* mirror) composes assignments with canonical Phase 17 subscription snapshot to compute per-variant assignments / leads / conversions / active subs / active known MRR / avg MRR. governance/pricingExperiments.ts + PricingLabPanel + /admin/intelligence Pricing Lab tab. EXPORT_CATALOG: pricing_experiment_results.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Admin-only pricing experiment tracking and outcome measurement composed against canonical subscription truth. No parallel billing or plan system.", buildItems: ["pricing_experiments + pricing_experiment_assignments tables (RLS admin-only)", "v_pricing_experiment_results SECURITY INVOKER view + v_bi_* mirror", "src/lib/governance/pricingExperiments.ts (CRUD + results + assignment helpers)", "src/components/admin/intelligence/PricingLabPanel.tsx (create + activate/close + per-variant results)", "AdminIntelligence Pricing Lab tab", "EXPORT_CATALOG: pricing_experiment_results"], engineeringTests: ["RLS restricts both tables to admin", "Results view reads from v_subscription_snapshot only; never invents conversions or MRR", "Variants with no assignments render zeros, never NULLs hidden as 0", "Status transitions stamp started_at / ended_at"], qaUat: ["Admin sees Pricing Lab tab", "Honesty banner present", "Create experiment with ≥2 variants works", "Activate / Close transitions persist", "Results table renders one row per variant"], exitCriteria: ["Pricing variants documented + measurable against canonical conversion / MRR", "No shadow pricing schema introduced", "Results trace cleanly to Phase 17 substrate"], exclusions: ["Live price-switching logic in checkout (deferred)", "Visitor-side variant assignment automation in production surfaces (manual record only in v1)", "Statistical significance computation (deferred)", "Per-variant dunning / billing logic"] }, items: [
    { id: "phase-23-schema", name: "A. Pricing Experiment Schema", description: "pricing_experiments + pricing_experiment_assignments with admin-only RLS via has_role('admin'). Updated_at trigger.", status: "in-progress" },
    { id: "phase-23-results", name: "B. Results View", description: "v_pricing_experiment_results composes assignments with v_subscription_snapshot. v_bi_pricing_experiment_results mirror.", status: "in-progress" },
    { id: "phase-23-ui", name: "C. Pricing Lab UI", description: "PricingLabPanel: create + activate/close, per-variant results table with conversion %, active subs, active MRR, avg MRR.", status: "in-progress" },
    { id: "phase-23-export", name: "D. Export Entry", description: "EXPORT_CATALOG: pricing_experiment_results.", status: "in-progress" },
  ] },
  { id: "phase-24", order: 24, code: "Phase 24", title: "Partner-Facing Finance & Performance", oneLiner: "Partner-safe subset of WL economics exposed to WL Partner Dashboard only. Views v_wl_partner_self_economics + v_wl_partner_self_portfolio_health filter on white_label_partners.user_id = auth.uid(); admin-only fields (servicing cost, partner-side CAC, partial margin) intentionally NOT projected. governance/wlPartnerSelf.ts + WLPartnerEconomicsCard mounted on /white-label-dashboard. EXPORT_CATALOG: wl_partner_self_economics (partner-safe).", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Partner-safe self-economics view layer. Strictly partner-own scope via SECURITY INVOKER + white_label_partners.user_id = auth.uid().", buildItems: ["v_wl_partner_self_economics SECURITY INVOKER view (own row only)", "v_wl_partner_self_portfolio_health SECURITY INVOKER view (own clients only)", "src/lib/governance/wlPartnerSelf.ts typed wrappers", "src/components/white-label/WLPartnerEconomicsCard.tsx (KPI tiles + portfolio health chips + caveat alert)", "Mounted on WhiteLabelDashboard above WLPartnerInsightsCard", "EXPORT_CATALOG: wl_partner_self_economics (audience: wl_partner, shareable)"], engineeringTests: ["Self views return only the calling partner's row(s)", "Admin-only fields (servicing cost, partial margin, partner-side CAC) NOT present in projected columns", "No cross-partner data leak under partner JWT", "Underlying admin views (v_wl_partner_economics) remain admin-only"], qaUat: ["Partner dashboard renders own portfolio card", "Recurring proxy clearly labeled", "Portfolio health chips reflect partner's own clients only", "Admin-only WL Economics tab continues to work; no regression"], exitCriteria: ["Partners gain meaningful self-portfolio visibility", "Tenant boundaries intact", "Admin-only economics stay admin-only"], exclusions: ["Cross-partner benchmarking", "Internal cost / margin exposure", "Partner-side CAC modeling", "Per-client cost decomposition", "Predictive partner LTV / churn"] }, items: [
    { id: "phase-24-views", name: "A. Partner-Safe Views", description: "v_wl_partner_self_economics + v_wl_partner_self_portfolio_health SECURITY INVOKER, scoped via white_label_partners.user_id = auth.uid().", status: "in-progress" },
    { id: "phase-24-ui", name: "B. WL Partner Dashboard Card", description: "WLPartnerEconomicsCard mounted on WhiteLabelDashboard with KPI tiles + portfolio health chips + caveat alert.", status: "in-progress" },
    { id: "phase-24-export", name: "C. Partner-Safe Export", description: "EXPORT_CATALOG: wl_partner_self_economics (audience wl_partner, shareable).", status: "in-progress" },
    { id: "phase-24-safety", name: "D. Tenant Safety", description: "Admin-only fields not projected. No cross-partner exposure. Underlying v_wl_partner_economics unchanged.", status: "in-progress" },
  ] },
  { id: "phase-25", order: 25, code: "Phase 25", title: "Experimentation Operations / Decision Engine", oneLiner: "Admin-only experimentation operating system. Adds saved_scenarios table (RLS admin-only), pricing_experiments lifecycle metadata (primary_metric, secondary_metrics, target_audience, decision_rule, owner_user_id, scheduled_for, paused_at, min_sample_per_variant), v_experiment_decisions view (two-proportion z-test vs control + sample-sufficiency + recommendation), and BI mirrors v_bi_experiment_decisions / v_bi_saved_scenarios. governance/experimentOps.ts + governance/savedScenarios.ts + ExperimentOpsPanel mounted on /admin/intelligence Experiment Ops tab. EXPORT_CATALOG: experiment_decisions, saved_scenarios.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Turn Phase 23 from analytics into a decision engine. Persist scenarios. Govern experiment lifecycle. Honest sample sufficiency + significance labels. No fake confidence, no shadow billing.", buildItems: ["saved_scenarios table (RLS admin-only) + updated_at trigger", "pricing_experiments lifecycle metadata columns", "v_experiment_decisions SECURITY INVOKER (sample sufficiency + z-test vs control + recommendation)", "v_bi_experiment_decisions + v_bi_saved_scenarios mirrors", "src/lib/governance/experimentOps.ts (decisions + lifecycle update + pause)", "src/lib/governance/savedScenarios.ts (CRUD + duplicate + archive)", "src/components/admin/intelligence/ExperimentOpsPanel.tsx", "AdminIntelligence Experiment Ops tab", "EXPORT_CATALOG: experiment_decisions + saved_scenarios", "Audit events: scenario.saved, experiment.lifecycle.updated"], engineeringTests: ["saved_scenarios RLS restricts to admin", "Decisions view returns 'insufficient_sample' when leads_assigned < min_sample_per_variant", "z_score only computed when both control and variant have leads", "promote_winner only fires when |z| >= 1.96 and sample sufficient", "Saved scenario output snapshot is stable (does not re-aggregate on read)"], qaUat: ["Admin sees Experiment Ops tab with confidence + recommendation columns", "Lifecycle editor updates min sample / decision rule / audience / primary metric", "Save current baseline persists scenario row visible in saved scenarios table", "Duplicate + archive controls work", "No partner / client role can access this tab"], exitCriteria: ["Experiments labeled with honest confidence + recommendation", "Scenarios persistable + reusable", "No fake significance, no billing-truth regression", "All controls admin-only"], exclusions: ["Live checkout variant switching (deferred)", "Multi-armed bandit / sequential testing (deferred)", "Auto-promotion of winners (recommendations only)", "Bayesian or sequential significance (z-test only in v1)", "Scenario comparison charts UI (table only in v1)", "PDF rendering of board pack (Phase 26 candidate)"] }, items: [
    { id: "phase-25-lifecycle", name: "A. Experiment Lifecycle Model", description: "pricing_experiments lifecycle metadata: primary_metric, secondary_metrics, target_audience, decision_rule, owner_user_id, scheduled_for, paused_at, min_sample_per_variant.", status: "in-progress" },
    { id: "phase-25-scenarios", name: "B. Persisted Scenarios", description: "saved_scenarios table + RLS + governance/savedScenarios.ts + admin UI for save / duplicate / archive.", status: "in-progress" },
    { id: "phase-25-assignment", name: "C. Assignment Integrity", description: "Reuses Phase 23 pricing_experiment_assignments. Live checkout variant switching deferred; manual + governed assignment only in v1.", status: "in-progress" },
    { id: "phase-25-significance", name: "D. Significance Layer", description: "v_experiment_decisions adds two-proportion z-test vs control + insufficient_sample state + directional vs statistical labels.", status: "in-progress" },
    { id: "phase-25-decisions", name: "E. Decision Engine", description: "Recommendations: keep_running / promote_winner / archive_loser / archive_inconclusive / no_action / baseline.", status: "in-progress" },
    { id: "phase-25-ui", name: "F. Admin Experiment Ops UI", description: "ExperimentOpsPanel mounted on /admin/intelligence Experiment Ops tab. Admin-only.", status: "in-progress" },
    { id: "phase-25-export", name: "G. Export / BI Extensions", description: "EXPORT_CATALOG: experiment_decisions + saved_scenarios. v_bi_* mirrors.", status: "in-progress" },
    { id: "phase-25-audit", name: "H. Eventing / Audit", description: "logAuditEvent for scenario.saved + experiment.lifecycle.updated via existing log-audit-event edge function.", status: "in-progress" },
  ] },
  { id: "phase-26", order: 26, code: "Phase 26", title: "Reporting Artifacts / PDF Board Pack Rendering", oneLiner: "Renders the canonical Phase 22 BoardPack bundle into a downloadable PDF (cover, global caveats, contents, per-section pages with source + caveats preserved). Pure presentation layer over governance/boardPack.ts; no re-aggregation, no narrative synthesis. Admin-only download from /admin/intelligence Board Pack tab. EXPORT_CATALOG.board_pack now lists pdf format alongside json.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Close out the reporting/artifact gap so executives can hand a board-ready PDF straight from the platform without spreadsheet gymnastics.", buildItems: ["src/lib/governance/boardPackPdf.ts (renderBoardPackPdf + downloadBoardPackPdf)", "BoardPackPanel PDF download button", "EXPORT_CATALOG.board_pack lists pdf format"], engineeringTests: ["Renders without errors against an empty bundle", "Section pages preserve source + caveats verbatim", "No re-aggregation of upstream metrics"], qaUat: ["Admin can download a multi-page PDF from Board Pack tab", "Each section shows title, source, caveats, and a data preview", "Page numbers + period label appear in the footer"], exitCriteria: ["PDF is generated entirely from canonical BoardPack bundle", "Download is admin-only", "No new metrics introduced"], exclusions: ["Live checkout variant switching (Phase 27 candidate)", "Bayesian / sequential significance (Phase 28 candidate)", "Partner-facing board PDF (Phase 29 candidate)", "Charts inside the PDF (text + tables only in v1)"] }, items: [
    { id: "phase-26-renderer", name: "A. PDF Renderer", description: "boardPackPdf.ts renders cover, contents, global caveats, and per-section pages from the canonical BoardPack.", status: "in-progress" },
    { id: "phase-26-ui", name: "B. Admin Download Button", description: "BoardPackPanel exposes a PDF download alongside the existing JSON export.", status: "in-progress" },
    { id: "phase-26-catalog", name: "C. Export Catalog", description: "EXPORT_CATALOG.board_pack now advertises pdf as a supported format.", status: "in-progress" },
  ] },
  { id: "phase-27", order: 27, code: "Phase 27", title: "Checkout / Offer Delivery Architecture", oneLiner: "Adds canonical `offers` table (thin lens over plan_key + stripe_price_id) and append-only `offer_exposures` log with shown/accepted/completed/rejected events. Selection engine in src/lib/governance/offers.ts: surface + audience + WL partner_id + new_only eligibility + price guardrails + experiment-variant preference over baseline fallback. OffersOpsPanel mounted on /admin/intelligence Offers tab. v_offer_exposure_summary + v_bi_offer_exposures views. EXPORT_CATALOG: offer_exposures + offer_exposure_summary. RLS: admin manages, WL partners read only own partner_id offers, authenticated users append exposures, anon may insert visitor-keyed exposures.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Turn pricing experiments + experiment ops into a real offer-delivery system. What users see at checkout/upgrade matches what gets billed. No shadow billing schema; offers always map to canonical plan_key + stripe_price_id. WL safety preserved.", buildItems: ["offers table (RLS admin all + wl_partner read own) + updated_at trigger", "offer_exposures table (RLS admin read + authenticated/anon insert)", "v_offer_exposure_summary (security_invoker)", "v_bi_offer_exposures BI mirror", "src/lib/governance/offers.ts (Offer model + selectOffer engine + recordOfferExposure + selectAndLogOffer)", "src/components/admin/intelligence/OffersOpsPanel.tsx (registry + create + activate/pause + exposure summary)", "AdminIntelligence Offers tab", "EXPORT_CATALOG: offer_exposures + offer_exposure_summary", "Audit events on offer.created and offer.active.toggled"], engineeringTests: ["selectOffer prefers experiment-variant match over baseline", "selectOffer respects new_only eligibility against isExistingCustomer", "selectOffer enforces partner_id when surface=wl_partner", "Price guardrails (price_min/max_usd) skip out-of-bounds offers", "RLS: WL partner cannot read offers for another partner_id", "Anon visitor exposure insert succeeds only when visitor_key is set"], qaUat: ["Admin sees Offers tab with create form + active table", "Toggling active flips status badge and is reflected in next selection", "Exposure summary populates after first shown event", "WL partner-scoped offers do not appear under direct surfaces"], exitCriteria: ["Every offer maps to canonical plan_key + stripe_price_id", "Selection engine returns deterministic, explainable results", "Exposure log is append-only and reconcilable with experiment results", "Admin-only management; WL partners only see their own surface"], exclusions: ["Live Stripe checkout integration switching (callers wire offer.stripe_price_id into existing create-checkout)", "Geo-pricing / personalization beyond audience+eligibility", "Multi-armed bandit allocation (Phase 28 candidate)", "Partner-facing offer authoring UI (deferred)", "Auto-promotion of winning offers"] }, items: [
    { id: "phase-27-schema", name: "A. Offer Schema", description: "offers + offer_exposures tables + v_offer_exposure_summary + v_bi_offer_exposures views with RLS.", status: "in-progress" },
    { id: "phase-27-engine", name: "B. Selection Engine", description: "src/lib/governance/offers.ts: selectOffer + recordOfferExposure + selectAndLogOffer with deterministic rules.", status: "in-progress" },
    { id: "phase-27-ui", name: "C. Admin Offers Ops UI", description: "OffersOpsPanel mounted on /admin/intelligence Offers tab.", status: "in-progress" },
    { id: "phase-27-export", name: "D. Export Catalog", description: "offer_exposures + offer_exposure_summary added to EXPORT_CATALOG.", status: "in-progress" },
    { id: "phase-27-audit", name: "E. Audit / Eventing", description: "logAuditEvent on offer.created and offer.active.toggled; exposures captured natively in offer_exposures.", status: "in-progress" },
  ] },
  { id: "phase-28", order: 28, code: "Phase 28", title: "Advanced Experimentation (Bandits & Sequential Testing)", oneLiner: "Adds opt-in allocation methods on top of Phase 23/25/27. pricing_experiments gains allocation_mode (fixed/bandit/sequential), bandit_algorithm (thompson/ucb1), max_exposure_per_variant, kill_switch_active, sequential_looks, min_effect_size, loss_threshold_pct. New experiment_allocation_log table (admin-only RLS) records governance/operator decisions. v_experiment_allocation surfaces per-variant cumulative reward + Beta(1+x,1+n−x) posterior; Thompson win-probability weights computed client-side via Marsaglia–Tsang gamma sampler. v_experiment_decisions extended to include allocation mode and Pocock-style sequential boundaries (z* lookup table by sequential_looks). offers.ts adds selectAndLogOfferAdvanced that overlays bandit-chosen variants into selectOffer's experimentAssignments while still enforcing Phase 27 price guardrails, audience, and WL constraints. ExperimentOpsPanel gains allocation badge + bandit win % column + Method editor + kill switch button. EXPORT_CATALOG: experiment_allocation. v_bi_experiment_allocation BI mirror. Falls back safely to fixed split on any error.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Add a small, well-governed set of advanced allocation/decision methods (Thompson bandit + Pocock-style sequential testing) on top of the existing experimentation substrate, scoped to pricing/checkout. Every method is opt-in, explainable in one paragraph, and operator-overrideable. Bandits never bypass Phase 27 price guardrails or WL constraints, never auto-promote winners, and always degrade to fixed split when sample is thin or any layer errors.", buildItems: ["pricing_experiments method/governance columns: allocation_mode, bandit_algorithm, max_exposure_per_variant, kill_switch_active, sequential_looks, min_effect_size, loss_threshold_pct", "experiment_allocation_log table (admin RLS, append-only)", "v_experiment_allocation (per-variant Beta posterior + max-exposure flag, security_invoker)", "v_experiment_decisions extended with allocation_mode + Pocock z* boundaries + early_stop_winner / early_stop_futility / max_exposure_reached / killed labels", "v_bi_experiment_allocation BI mirror", "src/lib/governance/banditAllocation.ts: Thompson sampling (Beta-Bernoulli, Marsaglia–Tsang gamma), UCB1, weight estimation, sequential z* lookup, updateExperimentMethod, setKillSwitch", "offers.ts: selectAndLogOfferAdvanced overlays bandit decisions into experimentAssignments and falls back to selectAndLogOffer on any error", "ExperimentOpsPanel: allocation/algorithm/kill-switch badges, bandit win % column, Method editor + Kill/Resume button", "EXPORT_CATALOG: experiment_allocation", "Audit events: experiment.method.updated, experiment.kill_switch.toggled"], engineeringTests: ["sampleBeta produces values in [0,1] and respects α/β shape", "chooseBanditVariant honors kill_switch_active by returning control with reason fallback_kill_switch", "chooseBanditVariant skips variants with max_exposure_reached", "selectAndLogOfferAdvanced overlay does not violate price_min/max guardrails (delegates to selectOffer)", "Sequential boundary lookup matches POCOCK_Z_BY_LOOKS", "v_experiment_decisions returns 'killed' when kill_switch_active and 'max_exposure_reached' when leads_assigned ≥ max_exposure_per_variant", "v_experiment_decisions sequential mode requires |z| ≥ sequential_z_critical for early_stop_winner/futility"], qaUat: ["Admin can flip an experiment's Method from fixed → bandit and the badge updates", "Bandit win % column appears for bandit-mode experiments and sums to ~100%", "Kill switch button toggles kill_switch_active and the row immediately shows 'killed' confidence label", "Sequential mode shows seq z* in the z column and labels early_stop_winner/futility only when threshold crossed", "Method editor and kill switch are admin-only — no other role can reach the tab", "Existing fixed-split A/B experiments behave unchanged"], exitCriteria: ["Eligible experiments can opt into bandit allocation with visible, safe behavior", "Sequential testing support exists for faster decisions where appropriate", "Operators can see and understand allocation weights and recommendations", "Price guardrails and WL constraints remain intact (Phase 27 still gates selectOffer)", "Fixed-split A/B remains available and unchanged", "Kill switch reverts allocation to control immediately"], exclusions: ["Contextual bandits / per-segment posteriors (deferred)", "Multi-metric / value-based reward (currently conversion only; MRR-weighted reward deferred)", "True alpha-spending (O'Brien-Fleming) — Pocock approximation only in v1", "Auto-promotion of winners (recommendation only, never automatic)", "Bandits on non-checkout surfaces (deferred to a future phase)", "Loss-threshold auto-pause enforcement (column exists; only displayed in v1)"] }, items: [
    { id: "phase-28-schema", name: "A. Method & Governance Schema", description: "pricing_experiments method columns + experiment_allocation_log + v_experiment_allocation + extended v_experiment_decisions + BI mirror.", status: "in-progress" },
    { id: "phase-28-bandit", name: "B. Bandit Algorithm Layer", description: "banditAllocation.ts: Thompson sampling + UCB1 + win-probability weight estimation + Marsaglia–Tsang gamma sampler.", status: "in-progress" },
    { id: "phase-28-sequential", name: "C. Sequential Testing", description: "Pocock z* lookup by sequential_looks; v_experiment_decisions early_stop_winner / early_stop_futility labels.", status: "in-progress" },
    { id: "phase-28-assignment", name: "D. Assignment Integration", description: "selectAndLogOfferAdvanced overlays bandit-chosen variants into selectOffer's experimentAssignments while preserving Phase 27 guardrails and WL constraints; safe fallback on error.", status: "in-progress" },
    { id: "phase-28-ui", name: "E. Reporting & Method UI", description: "ExperimentOpsPanel allocation badge, bandit win % column, MethodEditor + Kill/Resume button. Admin-only.", status: "in-progress" },
    { id: "phase-28-guardrails", name: "F. Guardrails & Kill Switch", description: "Per-experiment max_exposure_per_variant + kill_switch_active enforced in chooseBanditVariant and v_experiment_decisions; price guardrails still owned by selectOffer.", status: "in-progress" },
    { id: "phase-28-export", name: "G. Export / BI", description: "EXPORT_CATALOG.experiment_allocation + v_bi_experiment_allocation mirror.", status: "in-progress" },
    { id: "phase-28-audit", name: "H. Audit / Eventing", description: "logAuditEvent for experiment.method.updated and experiment.kill_switch.toggled via existing log-audit-event edge function.", status: "in-progress" },
  ] },
  { id: "phase-29", order: 29, code: "Phase 29", title: "Partner Success & Expansion Operations", oneLiner: "Adds a governed Partner Success operating layer over Phase 16 health bands and Phase 20/24 WL economics. New table partner_success_plays (admin-only RLS, lightweight tracking — type, status, follow-up, notes — not a full CRM). New views (all security_invoker): v_partner_success_summary (per-partner state strategic_growth | nurture | stabilize | at_risk derived from explainable flags: high intervention share, net contraction, low margin, expansion-ready, strategic), v_partner_success_accounts (drill-down to client-level drivers — health band, lifecycle signal, receptionist health, days since activity, open tickets), v_partner_success_opportunities (rule-based candidate plays per partner with explicit reason codes), v_partner_self_success (partner-safe: own portfolio only, no internal economics, no state labels — only safe boolean hints). PartnerSuccessOpsPanel mounted on /admin/intelligence Partner Success tab with pipeline / opportunities / plays / drill-down tabs plus Top Risk and Top Expansion summary cards. WLPartnerExpansionCard added to WLPartnerDashboard with health summary chips and cooperative-tone expansion nudges. EXPORT_CATALOG: partner_success_summary, partner_success_opportunities, partner_success_plays. BI mirrors: v_bi_partner_success_summary, v_bi_partner_success_opportunities, v_bi_partner_success_plays.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Turn the existing WL economics + success/health + activation signals into a governed Partner Success operating system: who to work with, on what, when, and how. Admins get a partner pipeline by state plus expansion/risk candidates and lightweight play tracking. WL partners get a small, safe, partner-own expansion view. No cross-partner leakage and no admin-only economics ever appear in partner-facing surfaces.", buildItems: ["partner_success_plays table (admin RLS, type/status/notes/follow_up_date) + updated_at trigger", "v_partner_success_summary (state + flags from v_wl_partner_economics + v_success_account_status, security_invoker)", "v_partner_success_accounts (drill-down from v_success_account_status filtered to partner_id IS NOT NULL)", "v_partner_success_opportunities (rule-based UNION ALL with explicit reason codes)", "v_partner_self_success (partner-safe self view, filters auth.uid() via white_label_partners.user_id, no state labels, no economics)", "v_bi_* mirrors for export", "src/lib/governance/partnerSuccess.ts (typed readers, createPartnerPlay, updatePartnerPlay, fetchSelfSuccess, display helpers)", "src/components/admin/intelligence/PartnerSuccessOpsPanel.tsx (Top Risk / Top Expansion + Pipeline / Opportunities / Plays / Drill-down tabs, Flag-play action, status editor)", "AdminIntelligence Partner Success tab", "src/components/white-label/WLPartnerExpansionCard.tsx (partner-safe nudges card on WL partner dashboard)", "EXPORT_CATALOG: partner_success_summary, partner_success_opportunities, partner_success_plays"], engineeringTests: ["v_partner_success_summary returns one row per partner from v_wl_partner_economics with health band counts joined", "Partner state classification: at_risk when partner_status='inactive' or intervention_share >= 0.30", "Partner state classification: stabilize when net contraction or partial_margin_pct < 0.10", "Partner state classification: strategic_growth when >=70% healthy and clients_expansion >= 2 and >=5 active", "v_partner_success_opportunities emits 'save' rows for flag_net_contraction / flag_high_intervention / flag_partner_inactive", "v_partner_success_opportunities emits 'upsell' rows only when flag_expansion_ready or flag_strategic", "v_partner_self_success scopes strictly via auth.uid() and never exposes margin or recurring revenue", "RLS: WL partner cannot read partner_success_plays or v_partner_success_summary"], qaUat: ["Admin sees Partner Success tab with Top Risk + Top Expansion summary cards", "Pipeline tab groups partners by state with Healthy% / Intervention% / Recurring / Margin% columns", "Opportunities tab lists candidate plays with explicit reasons; Flag play creates a row in partner_success_plays", "Plays tab status editor (not_started / active / completed / dismissed) updates immediately", "Drill-down opens after selecting a partner and lists their accounts with health badges and lifecycle signals", "WL partner dashboard shows expansion nudges card scoped to own portfolio with cooperative copy"], exitCriteria: ["Admins can see and act on a clear partner success pipeline", "Underlying client drivers per partner are visible via drill-down", "WL partners see a safe, actionable expansion view of their own portfolio only", "No cross-partner data and no internal-finance leakage in partner-facing surfaces", "All flags and states are rule-based and explainable; no opaque scoring"], exclusions: ["Deeper playbook automation (templates, sequences, reminders) — deferred", "ML / probabilistic risk scoring — deferred (rules-only in v1)", "Partner-facing P&L or margin numbers — intentionally excluded", "Cross-partner benchmarking surfaces for partners — never", "Auto-creation of plays from opportunities — opportunities are candidates only, plays remain manual"] }, items: [
    { id: "phase-29-model", name: "A. Partner Success Model", description: "Per-partner dimensions (economic health, portfolio mix, activation coverage, trends, risk + expansion flags) and four canonical states.", status: "in-progress" },
    { id: "phase-29-views", name: "B. Summary, Accounts, Opportunities, Self Views", description: "v_partner_success_summary + v_partner_success_accounts + v_partner_success_opportunities + v_partner_self_success (security_invoker).", status: "in-progress" },
    { id: "phase-29-admin", name: "C. Admin Pipeline UI", description: "PartnerSuccessOpsPanel: Top Risk / Top Expansion + Pipeline / Opportunities / Plays / Drill-down tabs.", status: "in-progress" },
    { id: "phase-29-partner", name: "D. Partner-Facing Nudges", description: "WLPartnerExpansionCard with portfolio health chips and cooperative-tone expansion hints (own portfolio only).", status: "in-progress" },
    { id: "phase-29-plays", name: "E. Lightweight Play Tracking", description: "partner_success_plays table + create/update helpers + status editor; not a CRM.", status: "in-progress" },
    { id: "phase-29-export", name: "F. Export / BI", description: "EXPORT_CATALOG: partner_success_summary + partner_success_opportunities + partner_success_plays.", status: "in-progress" },
  ] },
  { id: "phase-30", order: 30, code: "Phase 30", title: "Customer Success for Direct Accounts", oneLiner: "Mirrors the Phase 29 partner-success operating layer for non-WL direct accounts. New table direct_success_plays (admin-only RLS; type/status/notes/follow-up — not a CRM). New views (security_invoker): v_direct_success_summary (per-account state expansion_ready | nurture | stabilize | at_risk derived from explainable flags: payment risk, canceled, intervention, downgrade risk, no live receptionist after first week, support friction, inactivity, expansion-ready, new-account), v_direct_success_opportunities (rule-based per-account candidates with explicit reason codes), v_direct_self_success (client-safe: own lead via auth.uid() -> leads.user_id, only safe boolean hints — no internal economics, no state labels). DirectSuccessOpsPanel mounted on /admin/intelligence Customer Success tab (Top Risk + Expansion-Ready summary + Pipeline / Opportunities / Plays / Account Detail tabs). ClientSuccessGuidanceCard added to direct client dashboard with cooperative-tone next-step hints. EXPORT_CATALOG: direct_success_summary, direct_success_opportunities, direct_success_plays. BI mirrors: v_bi_direct_success_summary, v_bi_direct_success_opportunities, v_bi_direct_success_plays.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Stand up a canonical Customer Success operating layer for direct (non-WL) accounts that is parallel to but not a copy of Partner Success. Internal teams get an account-level pipeline and opportunity list; direct clients get bounded, cooperative next-step hints from their own state. No hidden scoring; no internal-finance leakage on the client surface.", buildItems: ["direct_success_plays table (admin RLS, lead_id/play_type/status/notes/follow_up_date) + updated_at trigger", "v_direct_success_summary (per-direct-account state + flags, joins v_success_account_status with v_subscription_snapshot, security_invoker)", "v_direct_success_opportunities (rule-based UNION ALL with explicit reasons)", "v_direct_self_success (client-safe self view filtered by auth.uid() against leads.user_id)", "v_bi_* mirrors", "src/lib/governance/directSuccess.ts (typed readers, createDirectPlay, updateDirectPlay, fetchDirectSelfSuccess, display helpers)", "src/components/admin/intelligence/DirectSuccessOpsPanel.tsx (Top Risk + Expansion-Ready, Pipeline by state, Opportunities → flag play, Plays editor, Account Detail drill-down)", "AdminIntelligence Customer Success tab", "src/components/client-dashboard/ClientSuccessGuidanceCard.tsx (cooperative-tone hints on /client-dashboard)", "EXPORT_CATALOG: direct_success_summary, direct_success_opportunities, direct_success_plays"], engineeringTests: ["v_direct_success_summary returns one row per direct account (acquisition_type='direct')", "State at_risk when subscription canceled OR past_due OR health_band='intervention'", "State stabilize when downgrade_risk OR receptionist missing after first week OR 3+ open tickets", "State expansion_ready when healthy AND expansion signal AND active sub AND days_live>=30 AND no open tickets", "v_direct_success_opportunities emits 'save' for payment risk/intervention/downgrade and 'reactivate' for canceled/30+d inactive", "v_direct_self_success scopes strictly via auth.uid()->leads.user_id and exposes no labels or economics", "RLS: non-admin cannot read direct_success_plays"], qaUat: ["Admin sees Customer Success tab with Top Risk + Expansion-Ready summary cards", "Pipeline groups direct accounts by state and shows health/lifecycle/sub/tickets", "Opportunities tab lists candidates with reasons; Flag play creates a row in direct_success_plays", "Plays tab status editor updates immediately", "Account Detail shows reasons array + active flag chips", "Direct client sees ClientSuccessGuidanceCard with cooperative copy when hints exist; no internal labels"], exitCriteria: ["Admins can see and act on a clear direct-account success pipeline", "Per-account drivers are visible via Account Detail", "Direct clients receive safe, relevant next-step guidance", "Lightweight plays trackable internally", "No hidden-score or internal-finance leakage on client surface"], exclusions: ["Playbook automation / templated sequences / reminders — deferred (Phase 31 candidate)", "ML / probabilistic risk scoring — never (rules-only)", "Direct-client P&L or internal economics on client surface — intentionally excluded", "Auto-creation of plays from opportunities — opportunities remain candidates only", "Cross-account benchmarking on client surface — never"] }, items: [
    { id: "phase-30-model", name: "A. Direct Success Model", description: "Per-account dimensions (health band, lifecycle signal, subscription state, receptionist health, tickets, days live/active) and four canonical states.", status: "in-progress" },
    { id: "phase-30-views", name: "B. Summary, Opportunities, Self Views", description: "v_direct_success_summary + v_direct_success_opportunities + v_direct_self_success (security_invoker).", status: "in-progress" },
    { id: "phase-30-admin", name: "C. Admin Pipeline UI", description: "DirectSuccessOpsPanel: Top Risk + Expansion-Ready, Pipeline by state, Opportunities, Plays, Account Detail.", status: "in-progress" },
    { id: "phase-30-client", name: "D. Client Guidance Surface", description: "ClientSuccessGuidanceCard with cooperative hints on /client-dashboard. No internal labels.", status: "in-progress" },
    { id: "phase-30-plays", name: "E. Lightweight Play Tracking", description: "direct_success_plays table + create/update helpers + status editor.", status: "in-progress" },
    { id: "phase-30-export", name: "F. Export / BI", description: "EXPORT_CATALOG: direct_success_summary + direct_success_opportunities + direct_success_plays.", status: "in-progress" },
  ] },
  { id: "phase-31", order: 31, code: "Phase 31", title: "Success Playbook Automation (Partner + Direct)", oneLiner: "Adds a lightweight, governed automation layer over Phase 29 partner success and Phase 30 direct customer success. New table playbook_templates (admin RLS, scope partner|direct, play_type, trigger_type, trigger_definition jsonb, default_followup_days, auto_create flag, active flag). New table play_suggestions (admin RLS, pending/accepted/dismissed/auto_created queue, dedupe-safe per (scope,target,template) while pending). Extended partner_success_plays + direct_success_plays with template_id, due_date, last_touch_at, reminder_enabled. New views (security_invoker): v_partner_overdue_plays, v_direct_overdue_plays, v_play_suggestions_open. New RPCs: generate_playbook_suggestions (scans v_partner_success_opportunities + v_direct_success_opportunities, matches to active templates by (scope, play_type), inserts pending suggestions or auto-creates plays for templates flagged auto_create), accept_play_suggestion, dismiss_play_suggestion. PlaybookAutomationPanel mounted on /admin/intelligence Playbooks tab with Suggested Plays / Reminders / Templates sub-tabs and a Run Trigger Scan button. EXPORT_CATALOG: playbook_templates, play_suggestions. Seeds: partner save + upsell, direct onboarding (auto_create) + save + expansion nudge.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Turn the existing partner and direct success opportunity rules into named, reusable templates with explicit triggers, an admin-approved suggestion queue, and a reminder layer for in-flight plays. Keep all automation rule-based, internal-facing, and opt-in per template.", buildItems: ["playbook_templates table (scope/play_type/trigger_type/trigger_definition/default_followup_days/auto_create/active) + admin RLS + updated_at trigger", "play_suggestions table (admin RLS, pending dedupe via partial unique index)", "partner_success_plays + direct_success_plays columns: template_id, due_date, last_touch_at, reminder_enabled", "v_partner_overdue_plays + v_direct_overdue_plays + v_play_suggestions_open (security_invoker)", "v_bi_playbook_templates + v_bi_play_suggestions", "generate_playbook_suggestions / accept_play_suggestion / dismiss_play_suggestion RPCs (SECURITY DEFINER, admin-gated)", "src/lib/governance/playbookAutomation.ts (typed readers, suggestion CRUD, overdue helpers)", "src/components/admin/intelligence/PlaybookAutomationPanel.tsx (Suggested Plays / Reminders / Templates tabs + Run Scan)", "AdminIntelligence Playbooks tab", "EXPORT_CATALOG: playbook_templates, play_suggestions", "Seed templates: partner_save_intervention, partner_expansion_nudge, direct_new_account_onboarding (auto_create), direct_risk_save, direct_expansion_nudge"], engineeringTests: ["generate_playbook_suggestions inserts suggestions only for active templates matching opportunity scope+play_type", "auto_create=true creates a play with template_id and CURRENT_DATE+default_followup_days due_date", "Pending suggestion dedupe via partial unique index on (scope,target_id,template_id) WHERE status='pending'", "accept_play_suggestion creates the right table row and links resulting_play_id", "v_partner_overdue_plays / v_direct_overdue_plays surface only not_started/active plays with reminder_enabled and due_date <= +3 days", "All RPCs reject non-admin callers", "Templates table: only admins can read/write"], qaUat: ["Admin Playbooks tab loads with seed templates", "Run Trigger Scan reports pending_inserted / auto_created counts", "Suggested Plays queue lists candidates with target, template, reason; Approve creates a play with due date set", "Reminders tab shows partner + direct plays at or past due with days_overdue badge; Mark touched updates last_touch_at", "Templates tab edits cadence, toggles active and auto_create"], exitCriteria: ["Both partner + direct pipelines have templated plays tied to clear triggers", "Admins can review and act on suggested plays with explicit reasons", "Reminders surface upcoming/overdue plays with no manual scanning", "Auto-create is opt-in per template; default is suggest-then-approve", "All automation is internal-facing and rule-based"], exclusions: ["Outbound email/SMS automation — deferred (Phase 32 candidate)", "ML / probabilistic trigger scoring — never (rules-only)", "External CRM integration — deferred", "Multi-step BPM workflow engine — out of scope; templates carry default_steps as metadata only", "Per-step task execution / assignment routing — deferred", "Scheduled background generation — manual scan in v1; cron deferred"] }, items: [
    { id: "phase-31-templates", name: "A. Playbook / Template Model", description: "playbook_templates table + seeds for partner save/upsell and direct onboard/save/expansion.", status: "in-progress" },
    { id: "phase-31-triggers", name: "B. Trigger Evaluation Layer", description: "generate_playbook_suggestions scans opportunity views and matches active templates by scope+play_type.", status: "in-progress" },
    { id: "phase-31-suggestions", name: "C. Suggestion Queue + Auto-Create", description: "play_suggestions table + accept/dismiss RPCs; auto_create=true bypasses approval for safe templates.", status: "in-progress" },
    { id: "phase-31-reminders", name: "D. Reminders / Follow-ups", description: "due_date / last_touch_at / reminder_enabled on plays + v_*_overdue_plays surfaces.", status: "in-progress" },
    { id: "phase-31-ui", name: "E. Admin UI", description: "PlaybookAutomationPanel: Suggested Plays / Reminders / Templates tabs + Run Trigger Scan.", status: "in-progress" },
    { id: "phase-31-export", name: "F. Export / BI", description: "EXPORT_CATALOG: playbook_templates, play_suggestions.", status: "in-progress" },
  ] },
  { id: "phase-32", order: 32, code: "Phase 32", title: "Success Communications & Renewal Automation", oneLiner: "Bounded, governed comms layer over Phase 31 plays + Phase 17 subscription truth. New tables: communication_templates (scope/channel/play_type/sequence/step/subject/body/allowed_tokens/requires_approval/auto_send/suppression_hours/active), communication_actions (suggested|approved|queued|sent|dismissed|failed|suppressed with partial unique index for in-flight dedupe), renewal_workflows (scope/target/renewal_date/stage approaching→renewed/downgraded/churned). Views: v_communication_actions_open, v_renewal_workflows_pipeline, BI mirrors v_bi_communication_templates / v_bi_communication_actions / v_bi_renewal_workflows. RPCs (admin-only SECURITY DEFINER): generate_communication_actions (walks plays, matches active templates by scope+play_type, applies suppression-window dedupe vs recent sends, auto-queues when auto_send && !requires_approval, plus seeds direct renewal rows from v_subscription_snapshot in 0–120d window), approve/dismiss/mark_sent communication action, upsert_renewal_workflow. SuccessCommsPanel mounted on /admin/intelligence Comms & Renewals tab with Queue / Renewals / Templates sub-tabs and Run Trigger Scan. Seeds: partner save + expansion, direct onboarding (auto_send), direct save + expansion, direct renewal 90/60/30 sequence. EXPORT_CATALOG: communication_templates, communication_actions, renewal_workflows.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Add a governed communications + renewal layer that turns playbook plays and subscription state into bounded, deduped, suggest-then-approve actions, with explicit suppression and auditable status transitions. No outbound blasting; no marketing automation.", buildItems: ["communication_templates table + admin RLS + updated_at trigger + 8 seeds", "communication_actions table + status enum + partial unique index for in-flight dedupe", "renewal_workflows table + stage enum + UNIQUE(scope,target,renewal_date)", "v_communication_actions_open / v_renewal_workflows_pipeline + BI mirrors", "RPCs: generate_communication_actions / approve / dismiss / mark_sent / upsert_renewal_workflow (admin-only)", "src/lib/governance/successComms.ts (typed readers + mutators + display helpers)", "src/components/admin/intelligence/SuccessCommsPanel.tsx (Queue / Renewals / Templates tabs + Run Scan)", "AdminIntelligence Comms & Renewals tab", "EXPORT_CATALOG: communication_templates, communication_actions, renewal_workflows"], engineeringTests: ["generate_communication_actions inserts only for active templates matching scope+play_type", "Suppression sets status='suppressed' when a sent action exists within suppression_hours", "Partial unique index prevents duplicate in-flight (suggested/approved/queued) per (scope,target,template)", "auto_send && !requires_approval routes new actions to status='queued'", "Renewal seeding inserts approaching rows for direct subscriptions in 0–120 day window", "All RPCs reject non-admin callers", "Tables: only admins can read/write"], qaUat: ["Comms & Renewals tab loads with seed templates", "Run Trigger Scan reports inserted/suppressed/auto_sent counts", "Queue lists suggested actions; Approve → Mark sent transitions are visible and auditable", "Renewals tab lists upcoming renewals with stage selector", "Templates tab toggles active / auto_send / requires_approval; subject edits persist on blur"], exitCriteria: ["Comms are template-driven, deduped, and suppression-aware", "Renewals tracked through explicit lifecycle stages", "Auto-send is opt-in per template; default is suggest-then-approve", "All actions auditable via status + sent_at + approved_by", "No external blast; no fabricated tokens"], exclusions: ["Outbound email rendering/dispatch — deferred (queue exists; provider integration deferred)", "Marketing campaigns / drip sequences / list-based sends — never (forbidden by policy)", "Reply-detection / inbound parsing — deferred", "WL renewal automation surface for partners — deferred", "Multi-channel (SMS/voice) — deferred"] }, items: [
    { id: "phase-32-templates", name: "A. Communication Template Model", description: "communication_templates table + 8 seeds (partner save/upsell, direct onboard/save/expansion, renewal 90/60/30).", status: "in-progress" },
    { id: "phase-32-sequences", name: "B. Sequences / Cadences", description: "sequence_key + step_number on templates; bounded renewal cadence at 90/60/30 days.", status: "in-progress" },
    { id: "phase-32-trigger", name: "C. Triggered Generation", description: "generate_communication_actions walks open plays + subscription windows.", status: "in-progress" },
    { id: "phase-32-suppression", name: "D. Suppression / Dedupe", description: "Partial unique index for in-flight actions + suppression-window check vs recent sends.", status: "in-progress" },
    { id: "phase-32-renewals", name: "E. Renewal Workflow", description: "renewal_workflows table with approaching → renewed/downgraded/churned lifecycle.", status: "in-progress" },
    { id: "phase-32-ui", name: "F. Admin UI", description: "SuccessCommsPanel: Queue / Renewals / Templates + Run Trigger Scan.", status: "in-progress" },
    { id: "phase-32-export", name: "G. Export / BI", description: "EXPORT_CATALOG: communication_templates, communication_actions, renewal_workflows.", status: "in-progress" },
  ] },
  { id: "phase-33", order: 33, code: "Phase 33", title: "Renewal & Expansion Deal Operations", oneLiner: "Thin internal commercial deal layer over Phase 32 renewal workflows + Phase 31 plays + Phase 17 subscription truth. New table renewal_expansion_deals (admin RLS, scope direct|partner, deal_type renewal|expansion|downsell|save, stage identified→outreach_started→proposal_prepared→proposal_sent→negotiation→verbally_approved→implemented→closed_won|closed_lost|deferred, status open|won|lost|deferred|stalled, descriptive proposed_plan_key/term/price_summary, links to renewal_workflows + partner/direct plays). communication_actions extended with deal_id. Views (security_invoker): v_open_deals_pipeline (with days_in_stage, comm_action_count, renewal_date), v_stalled_approved_deals (verbally_approved >14d still open). BI mirror v_bi_renewal_expansion_deals. RPCs (admin SECURITY DEFINER): create_renewal_expansion_deal (auto-fills current_plan_key from v_subscription_snapshot), transition_deal_stage (auto-derives status, stamps implemented_at), link_comm_action_to_deal, reconcile_renewal_expansion_deals (marks implemented when subscription truth shows proposed plan; flags stalled). RenewalDealsOpsPanel mounted on /admin/intelligence Deals tab (Pipeline / Open / Stalled / All / New deal sub-tabs + Reconcile button). EXPORT_CATALOG: renewal_expansion_deals.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Add a thin internal renewal/expansion deal layer that turns 'renewal approaching' and 'expansion opportunity' into structured commercial motions with explicit owners, stages, status, and outcomes. Billing/subscription truth remains authoritative — deals follow it via reconciliation, never the reverse.", buildItems: ["renewal_expansion_deals table + 4 enums (deal_scope, deal_type, deal_stage, deal_status) + admin RLS + updated_at trigger", "communication_actions.deal_id FK", "v_open_deals_pipeline + v_stalled_approved_deals (security_invoker) + v_bi_renewal_expansion_deals", "Partial unique index preventing >1 open deal per renewal workflow", "RPCs: create_renewal_expansion_deal, transition_deal_stage, link_comm_action_to_deal, reconcile_renewal_expansion_deals (admin-only)", "src/lib/governance/renewalDeals.ts (typed readers, mutators, stage labels)", "src/components/admin/intelligence/RenewalDealsOpsPanel.tsx (Pipeline/Open/Stalled/All/New + Reconcile)", "AdminIntelligence Deals tab", "EXPORT_CATALOG: renewal_expansion_deals"], engineeringTests: ["create_renewal_expansion_deal auto-fills current_plan_key from v_subscription_snapshot for direct scope", "transition_deal_stage maps stage→status: closed_won/implemented→won, closed_lost→lost, deferred→deferred, else open; stamps implemented_at on implemented", "Cannot create a second open deal for the same renewal_workflow (partial unique index)", "reconcile_renewal_expansion_deals marks open direct deals as implemented when v_subscription_snapshot.plan_key matches proposed_plan_key", "reconcile_renewal_expansion_deals sets status=stalled when stage=verbally_approved AND stage_changed_at <= now()-14d", "All RPCs reject non-admin callers", "Tables: only admins can read/write"], qaUat: ["Deals tab loads with Pipeline columns by stage", "Create deal succeeds with scope/type/target/proposed plan and appears under Open and in stage column", "Transitioning to verbally_approved then waiting reflects in Stalled tab after 14d (manually testable via direct UPDATE in QA)", "Reconcile button reports implemented/stalled counts; implemented deals move to closed/won", "Communication actions can be linked to a deal (RPC) and comm_action_count rises in detail panel", "Pipeline detail shows linked renewal_date / renewal_stage when present"], exitCriteria: ["Renewals and expansions tracked as structured deals with explicit stages, owners, outcomes", "Deals link cleanly to renewal_workflows, plays, and communication_actions", "Implemented outcomes reconcile back to subscription truth (no manual double-entry)", "Admin pipeline visible and actionable at /admin/intelligence → Deals", "No second billing system; no fabricated realized revenue"], exclusions: ["CPQ / line-item quoting / discount math — out of scope (price summary is descriptive only)", "Approval routing for discounts / non-standard terms — deferred (Phase 34 candidate)", "Partner/client-facing deal pipeline surfaces — deferred (internal-only in v1)", "Auto-creation of deals from renewals/opportunities — deferred (manual create + link in v1)", "Multi-currency / multi-entity deal modeling — deferred", "Won/lost forecast & weighted pipeline math — deferred"] }, items: [
    { id: "phase-33-model", name: "A. Deal Model", description: "renewal_expansion_deals table with enums, RLS, FK links to renewal workflows + plays.", status: "in-progress" },
    { id: "phase-33-lifecycle", name: "B. Stages / Lifecycle", description: "10 explicit stages identified→implemented + 5 statuses; transition_deal_stage auto-derives status.", status: "in-progress" },
    { id: "phase-33-creation", name: "C. Creation Paths", description: "create_renewal_expansion_deal RPC accepts links to renewal workflow / plays; auto-fills current plan from subscription truth.", status: "in-progress" },
    { id: "phase-33-linking", name: "D. Deal–Comms–Play Linking", description: "communication_actions.deal_id; link_comm_action_to_deal RPC; partial unique index prevents duplicate open deals per renewal.", status: "in-progress" },
    { id: "phase-33-reconcile", name: "E. Reconciliation", description: "reconcile_renewal_expansion_deals matches proposed_plan_key against v_subscription_snapshot; flags stalled at 14d.", status: "in-progress" },
    { id: "phase-33-ui", name: "F. Admin Deal Ops UI", description: "RenewalDealsOpsPanel: Pipeline/Open/Stalled/All/New with detail drill-down + Reconcile button.", status: "in-progress" },
    { id: "phase-33-export", name: "G. Export / BI", description: "EXPORT_CATALOG: renewal_expansion_deals via v_bi_renewal_expansion_deals.", status: "in-progress" },
  ] },
  { id: "phase-34", order: 34, code: "Phase 34", title: "Commercial Approvals & Discount Governance", oneLiner: "Light deal-desk gate over Phase 33 deals: configurable approval_policies (discount % thresholds, non-standard term, exception, unknown-discount fallback), approval_requests queue with decided_by/decided_at audit, and renewal_expansion_deals.approval_state (not_required|pending|approved|rejected) + estimated_discount_pct + is_non_standard_term + is_exception flags. Engine RPC evaluate_deal_approvals(deal_id) matches active policies and inserts pending requests (deduplicated per deal+policy+tier). decide_approval_request(id, approved|rejected|cancelled, notes) is admin-only, stamps decider, then re-evaluates state. Enforcement: transition_deal_stage refuses to move into proposal_sent/verbally_approved/closed_won/implemented unless approval_state is approved or not_required. Views (security_invoker): v_open_approval_requests + BI mirror v_bi_approval_requests. Admin UI: CommercialApprovalsPanel mounted on /admin/intelligence Approvals tab (Queue / Deal Governance / Policies). EXPORT_CATALOG: approval_policies, approval_requests. Five seeded policies cover discount > 15%, > 30%, non-standard term, exception, unknown discount.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Add a thin, governed approvals layer over renewal/expansion deals so risky discounts, non-standard terms, and exceptions cannot be marked approved/sent without explicit, audited admin sign-off. Not a CPQ — no line items, no parallel pricing engine.", buildItems: ["Enums approval_state, approval_request_status", "approval_policies + approval_requests tables (admin RLS, dedupe unique index)", "renewal_expansion_deals: approval_state, estimated_discount_pct, is_non_standard_term, is_exception, approval_evaluated_at", "RPCs evaluate_deal_approvals + decide_approval_request (admin)", "transition_deal_stage extended with approval gate", "v_open_approval_requests + v_bi_approval_requests (security_invoker)", "src/lib/governance/approvals.ts", "src/components/admin/intelligence/CommercialApprovalsPanel.tsx", "AdminIntelligence Approvals tab", "EXPORT_CATALOG: approval_policies + approval_requests", "Seed 5 starter policies"], engineeringTests: ["evaluate_deal_approvals creates pending requests idempotently per matching active policy", "approval_state resolves rejected > pending > approved > not_required correctly", "decide_approval_request rejects non-pending, stamps decided_by/decided_at, triggers re-evaluation", "transition_deal_stage blocks gated stages when approval_state is pending or rejected", "All RPCs and tables reject non-admin callers"], qaUat: ["Approvals tab loads with Queue, Deal Governance, Policies sub-tabs", "Setting a deal's discount above 15% and re-evaluating creates a pending request and flips state to pending", "Approving the only pending request flips state to approved; transitioning to proposal_sent now succeeds", "Rejecting flips state to rejected and blocks gated transitions with a clear message", "Toggling a policy off prevents new requests on next evaluation", "New policies persist via the inline editor"], exitCriteria: ["Risky deals require explicit, role-aware approvals before approved/sent", "Every decision is auditable (decided_by, decided_at, notes, reason)", "No second billing/pricing system; approvals only gate stage + comms", "Single Approvals surface for queue, deal governance, and policy tuning"], exclusions: ["Full CPQ / quote line-item engine", "External CRM/CPQ integration (Salesforce CPQ, etc.)", "Per-line-item discount math (deal-level only in v1)", "Partner-facing approval surface", "SLA timers / escalation rules on stale approvals", "Approval-aware revenue forecasting"] }, items: [
    { id: "phase-34-policies", name: "A. Approval Policy Model", description: "approval_policies: scope, deal_type, discount thresholds, non-standard/exception/unknown triggers, required role, tier, active.", status: "in-progress" },
    { id: "phase-34-discount", name: "B. Discount/Variance Estimation", description: "Per-deal estimated_discount_pct + is_non_standard_term + is_exception with explicit unknown fallback.", status: "in-progress" },
    { id: "phase-34-requests", name: "C. Request & State Model", description: "approval_requests + approval_state on deals; deduped pending per (deal,policy,tier).", status: "in-progress" },
    { id: "phase-34-engine", name: "D. Approval Engine", description: "evaluate_deal_approvals matches active policies, creates pending requests, recomputes state.", status: "in-progress" },
    { id: "phase-34-gate", name: "E. Enforcement Gate", description: "transition_deal_stage blocks gated stages unless approved or not_required.", status: "in-progress" },
    { id: "phase-34-ui", name: "F. Admin UI", description: "CommercialApprovalsPanel: Queue, Deal Governance, Policies.", status: "in-progress" },
    { id: "phase-34-export", name: "G. Export / BI", description: "EXPORT_CATALOG: approval_policies + v_bi_approval_requests.", status: "in-progress" },
  ] },
  { id: "phase-35", order: 35, code: "Phase 35", title: "Revenue Forecasting from Canonical Pipelines", oneLiner: "Thin recurring-revenue forecasting layer over canonical Phase 17 MRR truth + Phase 33 deal pipeline. New tables forecast_stage_probabilities (per deal_type+stage win probability, seeded for renewal/expansion/downsell/save) and forecast_assumptions (singleton: baseline_monthly_churn_rate, baseline_monthly_expansion_rate, new_business_mrr_direct, new_business_mrr_wl, horizon_months). Views (security_invoker): v_forecast_horizon (next N months), v_forecast_existing_base (carries current active MRR forward with baseline churn/expansion), v_forecast_renewals (per-month renewal_workflows due, weighted by linked deal stage prob, fallback 0.85), v_forecast_expansion_deals (open expansion/downsell/save deals weighted by stage prob, bucketed by expected_close_date or stage_changed_at+30d), v_forecast_assembled (period, starting_mrr, projected_base_mrr, baseline_churn_amount, baseline_expansion_amount, new_business_mrr, projected_ending_mrr + weighted renewal/expansion counts). BI mirrors v_bi_forecast_*. Admin UI: RevenueForecastPanel mounted on /admin/intelligence Revenue Forecast tab (Trajectory line+stack chart, Monthly components table, Renewal coverage tiles with 1.5x/2.0x bands, Assumptions editor, Stage probabilities editor). EXPORT_CATALOG: forecast_assembled, forecast_renewals, forecast_expansion_deals, forecast_existing_base, forecast_stage_probabilities, forecast_assumptions. v1 reports weighted counts, not weighted dollars (proposed_price_summary is text); dollars come from base trajectory + new-business assumption + baseline rates.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Add a thin, explainable recurring-revenue forecasting layer that decomposes monthly MRR into base, renewals, expansions, and new business using stage-weighted pipelines and tunable assumptions. Not GAAP revenue, not bookings, not a parallel MRR engine.", buildItems: ["forecast_stage_probabilities table (admin RLS, seeded)", "forecast_assumptions table (singleton key='default', admin RLS)", "v_forecast_horizon, v_forecast_existing_base, v_forecast_renewals, v_forecast_expansion_deals, v_forecast_assembled (security_invoker)", "BI mirrors v_bi_forecast_* (assembled, renewals, expansion_deals, existing_base, stage_probabilities, assumptions)", "src/lib/governance/forecastingPipeline.ts (typed readers + assumptions/probabilities mutators)", "src/components/admin/intelligence/RevenueForecastPanel.tsx (Trajectory / Components / Renewal coverage / Assumptions / Stage probabilities tabs)", "AdminIntelligence Revenue Forecast tab", "EXPORT_CATALOG: 6 forecast entries"], engineeringTests: ["v_forecast_existing_base produces 12 rows by default and applies (1 - churn + expansion)^month_index correctly", "v_forecast_renewals buckets renewal_workflows by month_start of renewal_date and uses linked deal stage probability when present", "v_forecast_expansion_deals only includes open deals of type expansion/downsell/save; falls back to stage_changed_at+30d when expected_close_date is null", "v_forecast_assembled exposes ending_mrr = base + new_business + base*expansion_rate - base*churn_rate", "forecast_stage_probabilities + forecast_assumptions reject non-admin writes", "Updating assumption_key='default' flows through to assembled view on next read"], qaUat: ["Revenue Forecast tab loads with horizon toggle (6 / 12)", "Assumptions tab edits persist and update the trajectory chart", "Stage probabilities editor saves on blur and reflects in weighted renewal/expansion columns", "Renewal coverage tiles colour-code by 1.5x / 1.0x thresholds", "Components table shows base, churn, expansion, new business, ending MRR per period", "Exports tab lists 6 forecast products and downloads CSV/JSON"], exitCriteria: ["Admin sees a clear, decomposable monthly MRR forecast over 6 / 12 months", "Renewal and expansion deals contribute via weighted pipeline, not guesswork", "All assumptions are explicit, editable, and audit-visible via updated_at", "No metric drift from canonical MRR/churn/NRR; no second pricing/billing system"], exclusions: ["Weighted dollar uplift per deal (proposed_price_summary is text in v1)", "Usage-based revenue forecasting", "Per-segment / per-channel new-business modelling beyond Direct vs WL", "Forecast accuracy backtesting / variance tracking (deferred)", "Scenario-aware forecasting beyond reading current assumptions (Phase 21 link is one-way)", "Partner-facing forecast surface"] }, items: [
    { id: "phase-35-model", name: "A. Forecast Model Scope", description: "Recurring revenue only; base + renewals + expansions + new business; not GAAP.", status: "in-progress" },
    { id: "phase-35-weights", name: "B. Pipeline Weighting", description: "forecast_stage_probabilities table with seeded defaults per deal_type+stage.", status: "in-progress" },
    { id: "phase-35-views", name: "C. Forecast Views", description: "v_forecast_existing_base, v_forecast_renewals, v_forecast_expansion_deals, v_forecast_assembled.", status: "in-progress" },
    { id: "phase-35-newbiz", name: "D. New Business Input", description: "forecast_assumptions singleton with direct + WL monthly MRR.", status: "in-progress" },
    { id: "phase-35-ui", name: "E. Admin UI", description: "RevenueForecastPanel: Trajectory, Components, Renewal coverage, Assumptions, Stage probabilities.", status: "in-progress" },
    { id: "phase-35-export", name: "F. Export / BI", description: "EXPORT_CATALOG: 6 v_bi_forecast_* mirrors.", status: "in-progress" },
  ] },
  { id: "phase-36", order: 36, code: "Phase 36", title: "Forecast Accuracy & Calibration", oneLiner: "Closes the loop on Phase 35 by adding a snapshot + variance + calibration layer over canonical actuals. New table forecast_snapshots (admin RLS) freezes assumptions + stage probabilities + the assembled forecast as JSONB at capture time, with parameters_hash + label + horizon. RPC capture_forecast_snapshot(label, notes) is admin-only SECURITY DEFINER. Views (security_invoker): v_forecast_vs_actuals (per snapshot × completed past month, joins to canonical v_subscription_movements and computes variance for new business / churn / net expansion in $ and %), v_forecast_stage_performance (per deal_type: avg configured probability, realized win rate over closed deals in last 180d, sample size, calibration_delta), v_forecast_assumption_performance (configured churn / expansion / new biz vs realized averages over last 6 closed months from v_subscription_movements). BI mirrors v_bi_forecast_snapshots, v_bi_forecast_vs_actuals, v_bi_forecast_stage_performance, v_bi_forecast_assumption_performance. Helper buildSuggestions() in src/lib/governance/forecastCalibration.ts emits human-readable, optional, half-step calibration suggestions tagged with low/medium/high confidence by sample size — never auto-applied. Admin UI: ForecastCalibrationPanel mounted on /admin/intelligence Calibration tab (Forecast vs Actuals, Stage performance, Assumption performance, Suggestions, Snapshots sub-tabs with capture button + history). EXPORT_CATALOG: forecast_snapshots, forecast_vs_actuals, forecast_stage_performance, forecast_assumption_performance.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Add a forecast accuracy & calibration loop on top of Phase 35: persist snapshots, compute forecast-vs-actual variance against canonical movements, surface stage & assumption over/under-optimism, and provide guided, optional calibration suggestions. No metric drift. No auto-tuning.", buildItems: ["forecast_snapshots table (admin RLS) + parameters JSONB + payload JSONB + parameters_hash", "capture_forecast_snapshot RPC (admin SECURITY DEFINER, freezes assumptions + probabilities + v_forecast_assembled)", "v_forecast_vs_actuals (security_invoker, completed-month variance vs v_subscription_movements)", "v_forecast_stage_performance (per deal_type configured vs realized win rate, 180d window)", "v_forecast_assumption_performance (configured churn/expansion/new-biz vs realized averages, 6-month window)", "BI mirrors v_bi_forecast_snapshots / vs_actuals / stage_performance / assumption_performance", "src/lib/governance/forecastCalibration.ts (typed readers + capture mutator + buildSuggestions)", "src/components/admin/intelligence/ForecastCalibrationPanel.tsx (5 sub-tabs)", "AdminIntelligence Calibration tab", "EXPORT_CATALOG: 4 calibration entries"], engineeringTests: ["capture_forecast_snapshot rejects non-admin callers", "Snapshot row stores assumptions + probabilities + assembled payload as JSONB and stable parameters_hash", "v_forecast_vs_actuals only returns rows for months strictly before the current month", "v_forecast_stage_performance returns one row per configured deal_type even when no closed deals exist (sample_size = 0, realized = NULL)", "v_forecast_assumption_performance computes realized rates as avg movement / current active known MRR", "buildSuggestions ignores deltas under threshold and never produces a suggestion when sample size is 0"], qaUat: ["Calibration tab loads with 5 sub-tabs", "Capture snapshot creates a row visible in Snapshots history", "Vs Actuals tab is empty until at least one snapshot's horizon includes a closed month, then shows variance", "Stage performance shows configured vs realized per deal type with low-n badge for small samples", "Assumption performance shows configured vs realized churn / expansion / new biz with delta", "Suggestions tab lists actionable items only when drift exceeds threshold and is empty otherwise", "Exports tab lists 4 new calibration products"], exitCriteria: ["Operators can compare past forecasts vs actuals for completed periods", "Variance is decomposed by component and explainable", "Stage and assumption over/under patterns are visible with sample size", "Suggestions are advisory and require human application via existing editors", "No hidden auto-tuning; no canonical metric drift"], exclusions: ["ML-based or auto-applied calibration", "Per-stage realized win rates (requires deal stage history; deferred — only per-deal_type aggregate in v1)", "Usage-based revenue forecasting", "Daily/weekly variance (monthly only)", "Cross-snapshot ensemble forecasts", "Partner-facing accuracy surfaces"] }, items: [
    { id: "phase-36-snapshots", name: "A. Snapshot Model", description: "forecast_snapshots table + capture_forecast_snapshot RPC.", status: "in-progress" },
    { id: "phase-36-variance", name: "B. Forecast vs Actuals", description: "v_forecast_vs_actuals against canonical movements (completed months only).", status: "in-progress" },
    { id: "phase-36-stage-perf", name: "C. Stage Performance", description: "v_forecast_stage_performance per deal_type with sample size.", status: "in-progress" },
    { id: "phase-36-assumption-perf", name: "D. Assumption Performance", description: "v_forecast_assumption_performance vs last 6 closed months.", status: "in-progress" },
    { id: "phase-36-suggestions", name: "E. Calibration Suggestions", description: "buildSuggestions() helper, advisory only, half-step bias.", status: "in-progress" },
    { id: "phase-36-ui", name: "F. Admin UI", description: "ForecastCalibrationPanel: vs Actuals / Stages / Assumptions / Suggestions / Snapshots.", status: "in-progress" },
    { id: "phase-36-export", name: "G. Export / BI", description: "EXPORT_CATALOG: 4 v_bi_forecast_* calibration mirrors.", status: "in-progress" },
  ] },
  { id: "phase-37", order: 37, code: "Phase 37", title: "GTM & Capacity Planning from Forecasts", oneLiner: "Adds a thin planning layer that translates v_forecast_assembled into directional capacity demand and compares against admin-maintained supply. New tables: capacity_assumptions (singleton scope=both with ARPU, accounts-per-CSM, tickets-per-agent, projects-per-specialist, WL rollouts-per-ops-head, ticket and project ratios), capacity_supply (scope × function × effective_date), gtm_targets (period × scope: target new biz MRR, NRR, renewal rate). All admin-RLS. Views (security_invoker): v_capacity_demand (per-month forecasted active/new accounts and needed CSM/support/implementation/WL-ops heads), v_capacity_supply_current (latest supply per scope+function), v_capacity_gaps (demand vs current supply per function with gap_now / gap_planned / over_under_pct), v_gtm_target_variance (forecast new business MRR vs target with variance %). BI mirrors: v_bi_capacity_assumptions / supply / demand / gaps / gtm_targets / gtm_target_variance, all admin SELECT. Helper src/lib/governance/capacityPlanning.ts wraps reads + admin upserts. Admin UI CapacityPlanningPanel mounted on /admin/intelligence Planning tab with Overview, Gaps, Supply, GTM Targets, and Assumptions sub-tabs. EXPORT_CATALOG: 6 new admin entries.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Translate canonical revenue forecasts into directional capacity needs and GTM target variance. Stay at high-leverage abstractions: a few ratios, a small supply table, and a target table. No HR or budgeting system.", buildItems: ["capacity_assumptions table (admin RLS, singleton scope=both seeded)", "capacity_supply table (scope × function × effective_date, admin RLS)", "gtm_targets table (period × scope, admin RLS)", "v_capacity_demand view derived from v_forecast_assembled and assumptions", "v_capacity_supply_current latest-per-(scope,function) view", "v_capacity_gaps demand vs supply per function", "v_gtm_target_variance vs v_forecast_assembled per period", "BI mirrors (6) granted to authenticated admins", "src/lib/governance/capacityPlanning.ts (typed readers + admin upserts)", "src/components/admin/intelligence/CapacityPlanningPanel.tsx (5 sub-tabs)", "AdminIntelligence Planning tab", "EXPORT_CATALOG: 6 capacity / GTM entries"], engineeringTests: ["All four planning tables reject non-admin writes via has_role check", "v_capacity_demand returns one row per forecast month with non-null ratio columns when assumptions row exists", "needed_csm_heads = forecasted_active_accounts / csm_accounts_per_head within rounding", "needed_wl_ops_heads only consumes new_business_mrr_wl, not direct", "v_capacity_gaps gap_now flips sign correctly when demand exceeds current_supply", "v_gtm_target_variance returns NULL variance when target_new_business_mrr is 0 or null"], qaUat: ["Planning tab loads with directional disclaimer banner", "Overview chart stacks needed CSM / Support / Implementation / WL Ops heads per month", "Demand detail table shows accounts and head counts per month", "Adding a supply row makes the Gaps tab populate for that function across all months", "Adding a GTM target shows up in Target vs Forecast with variance %", "Editing an assumption (e.g., ARPU) recomputes demand and gap rows on reload", "Exports tab lists 6 new planning products"], exitCriteria: ["Forecasts can be translated into directional capacity needs by function", "Admins can see where the org is under or over staffed vs forecast", "GTM targets can be compared against forecasted performance", "Assumptions are explicit and editable in the admin UI", "No HR roster, no expense budgeting, and no metric drift from canonical MRR"], exclusions: ["Per-individual headcount tracking or HRIS integration", "Detailed expense / opex modeling", "Role-by-role scheduling or shift planning", "Hiring pipeline tracking", "Auto-applied recommendations or automated hiring triggers", "Per-segment ARPU (single configurable ARPU in v1)", "Per-scope demand views (v1 emits scope=both rows only)"] }, items: [
    { id: "phase-37-assumptions", name: "A. Capacity Assumptions Model", description: "capacity_assumptions singleton with ARPU and key driver ratios.", status: "in-progress" },
    { id: "phase-37-demand", name: "B. Demand Derivation", description: "v_capacity_demand from v_forecast_assembled × ratios.", status: "in-progress" },
    { id: "phase-37-supply", name: "C. Capacity Supply", description: "capacity_supply table + v_capacity_supply_current latest-per-key view.", status: "in-progress" },
    { id: "phase-37-gaps", name: "D. Gap Analysis", description: "v_capacity_gaps demand vs current supply per function.", status: "in-progress" },
    { id: "phase-37-gtm", name: "E. GTM Targets", description: "gtm_targets + v_gtm_target_variance per period × scope.", status: "in-progress" },
    { id: "phase-37-ui", name: "F. Planning Panel", description: "CapacityPlanningPanel with Overview / Gaps / Supply / Targets / Assumptions.", status: "in-progress" },
    { id: "phase-37-export", name: "G. Export / BI", description: "EXPORT_CATALOG: 6 v_bi_capacity_* and gtm_* mirrors.", status: "in-progress" },
    { id: "phase-37-honesty", name: "H. Directional Disclosure", description: "Planning panel banner labels output as directional, not staffing prescription.", status: "in-progress" },
  ] },
  { id: "phase-38", order: 38, code: "Phase 38", title: "Finance & RevOps Snapshotting / Period Close", oneLiner: "Adds a thin RevOps period close layer that captures a per-period, immutable snapshot of canonical finance, pipeline, forecast, and capacity state. New tables: revops_period_snapshots (header with period_start/end, label UNIQUE, captured_at/by, linked_forecast_snapshot_id, linked_board_pack_ref, notes, extras JSONB), revops_snapshot_metrics (one row per snapshot with starting/ending/net new MRR, movement components, NRR, GRR, direct vs WL splits), revops_snapshot_pipeline (open deals by deal_type × stage and renewal_workflows by stage at capture time), revops_snapshot_capacity (per scope × function demand/supply/gap and GTM target vs forecast variance for the period). All admin-RLS. RPC capture_revops_snapshot(period_start, period_end, label, notes, forecast_snapshot_id, board_pack_ref, force) is admin SECURITY DEFINER, idempotent on label unless force=true, and pulls from v_exec_mrr_spine, v_subscription_movements, v_exec_direct_vs_wl_summary, v_exec_retention_rates, v_open_deals_pipeline, v_renewal_workflows_pipeline, v_capacity_gaps, v_gtm_target_variance. Read views (security_invoker): v_revops_period_snapshots (header + metrics expanded), v_revops_snapshot_pipeline_summary, v_revops_snapshot_capacity_summary, v_revops_snapshot_forecast_vs_actuals (joins linked forecast snapshot to v_forecast_vs_actuals for the captured month). BI mirrors: v_bi_revops_period_snapshots / pipeline_summary / capacity_summary / forecast_vs_actuals, all admin SELECT. Helper src/lib/governance/revopsSnapshots.ts wraps reads + capture mutator. Admin UI RevopsSnapshotsPanel mounted on /admin/intelligence Period Close tab with capture form, snapshot list, and per-snapshot detail (Metrics / Pipeline / Capacity & GTM / Forecast vs Actual / Links). EXPORT_CATALOG: 4 admin entries.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Persist immutable per-period RevOps snapshots tying together canonical finance, pipeline, forecast linkage, and capacity gaps. Snapshots are an admin RevOps record, not a GAAP financial close, and never recompute or overwrite canonical history.", buildItems: ["revops_period_snapshots header table with UNIQUE label and FKs", "revops_snapshot_metrics fact (1:1)", "revops_snapshot_pipeline fact (1:N over open deals + renewal workflows)", "revops_snapshot_capacity fact (1:N over capacity gaps + GTM variance rows)", "capture_revops_snapshot RPC (admin SECURITY DEFINER, idempotent unless force)", "v_revops_period_snapshots / pipeline_summary / capacity_summary / forecast_vs_actuals read views", "BI mirrors v_bi_revops_* (4) granted to authenticated admins", "src/lib/governance/revopsSnapshots.ts (typed readers + capture mutator + delete)", "src/components/admin/intelligence/RevopsSnapshotsPanel.tsx (capture form + list + 5-tab detail)", "AdminIntelligence Period Close tab", "EXPORT_CATALOG: 4 RevOps snapshot entries"], engineeringTests: ["capture_revops_snapshot rejects non-admin callers", "Duplicate label without force=true raises an exception", "Same label with force=true replaces the prior snapshot atomically", "Captured metrics row mirrors v_exec_mrr_spine for the snapshot month within rounding", "Pipeline rows reflect counts from v_open_deals_pipeline and v_renewal_workflows_pipeline at capture time only", "Capacity rows include GTM variance rows with function='gtm_new_mrr' when v_gtm_target_variance has data", "v_revops_snapshot_forecast_vs_actuals returns rows only when linked_forecast_snapshot_id is set and the snapshot's month is in the linked forecast's payload"], qaUat: ["Period Close tab loads with non-GAAP disclaimer banner", "Capture form defaults to the most recent fully-completed month", "Capturing creates a row visible in the snapshot list with metrics populated", "Re-capturing the same label without forcing shows a clear error toast", "Snapshot detail tabs show Metrics, Pipeline, Capacity & GTM, Forecast vs Actual, Links", "Forecast vs Actual tab is empty when no forecast snapshot is linked", "Exports tab lists 4 new RevOps snapshot products"], exitCriteria: ["Admins can capture a structured RevOps snapshot per period", "Snapshots hold finance, pipeline, forecast, and planning highlights for that period", "Snapshots are visible and explorable in /admin/intelligence", "No metric drift or silent re-computation of historical snapshots"], exclusions: ["Full GAAP / accounting close or revenue recognition", "Scheduled / cron-triggered automatic capture (manual in v1)", "Auto-generation of board pack PDF at capture time (operator-supplied reference only in v1)", "Backfill of pre-Phase-38 historical snapshots", "Partner-facing or end-client-facing snapshot surfaces", "In-place editing of captured metric values"] }, items: [
    { id: "phase-38-header", name: "A. Period Snapshot Header", description: "revops_period_snapshots with period bounds, label UNIQUE, audit columns.", status: "in-progress" },
    { id: "phase-38-metrics", name: "B. Snapshot Metrics Fact", description: "revops_snapshot_metrics 1:1 row of canonical MRR / NRR / GRR / movements / direct vs WL.", status: "in-progress" },
    { id: "phase-38-pipeline", name: "C. Snapshot Pipeline Fact", description: "revops_snapshot_pipeline rows across open deals and renewal workflows.", status: "in-progress" },
    { id: "phase-38-capacity", name: "D. Snapshot Capacity & GTM Fact", description: "revops_snapshot_capacity rows from v_capacity_gaps + v_gtm_target_variance.", status: "in-progress" },
    { id: "phase-38-rpc", name: "E. Capture RPC", description: "capture_revops_snapshot admin SECURITY DEFINER, idempotent on label.", status: "in-progress" },
    { id: "phase-38-views", name: "F. Read & BI Views", description: "v_revops_* + v_bi_revops_* (4) admin-readable.", status: "in-progress" },
    { id: "phase-38-ui", name: "G. Period Close Panel", description: "RevopsSnapshotsPanel: capture form, snapshot list, 5-tab detail.", status: "in-progress" },
    { id: "phase-38-export", name: "H. Export / BI", description: "EXPORT_CATALOG: 4 RevOps snapshot entries.", status: "in-progress" },
    { id: "phase-38-honesty", name: "I. Non-GAAP Disclosure", description: "Panel banner labels snapshots as RevOps records, not financial close.", status: "in-progress" },
  ] },
  { id: "phase-39", order: 39, code: "Phase 39", title: "QA Readiness & Test Harness", oneLiner: "Lightweight QA packaging layer for Computer-driven UAT: frozen scope, seeded persona catalog, scenario test scripts with expected outcomes, high-risk regression pack, defect handoff template, and an admin-only release gate (qa_release_gates table) with go/no-go decisions and per-check status. New table: qa_release_gates (release_label UNIQUE, scope_summary, scope_json, gate_checks JSONB, decision pending|go|no_go, decided_at/by). Admin-only RLS. BI mirror v_bi_qa_release_gates aggregates pass/fail counts. Helper src/lib/governance/qaReadiness.ts exposes QA_SCOPE_AREAS, QA_PERSONAS, QA_TEST_SCRIPTS, QA_REGRESSION_PACK, QA_DEFECT_TEMPLATE, DEFAULT_GATE_CHECKS plus typed CRUD on qa_release_gates. Admin UI QAReadinessPanel mounted on /admin/intelligence QA Readiness tab with Scope, Personas, Scripts, Regression Pack, Release Gate, and Defect Template sub-tabs. Operational only — does not introduce new product logic, fake production data, or a full bug tracker.", status: "active", gates: { build: "in-progress", test: "pending", qa: "pending", locked: false }, contract: { scope: "Package the product for an external Computer-driven QA cycle. Provide a frozen scope, deterministic persona catalog, scenario scripts with explicit expected outcomes, regression pack, defect template, and a tracked release gate. Stay light: no enterprise QA platform, no product logic changes, no auto-seed of fake data.", buildItems: ["qa_release_gates table (admin RLS, label UNIQUE, decision pending|go|no_go)", "v_bi_qa_release_gates BI mirror with pass/fail counts", "src/lib/governance/qaReadiness.ts (constants + typed CRUD)", "QA_SCOPE_AREAS frozen for current cycle", "QA_PERSONAS catalog (7 personas across admin/WL/direct/supervisor)", "QA_TEST_SCRIPTS catalog (10 scripts incl. negative paths)", "QA_REGRESSION_PACK (8 high-risk areas)", "QA_DEFECT_TEMPLATE + markdown generator", "DEFAULT_GATE_CHECKS canonical 8-item checklist", "src/components/admin/intelligence/QAReadinessPanel.tsx (6 sub-tabs)", "AdminIntelligence QA Readiness tab"], engineeringTests: ["qa_release_gates rejects non-admin SELECT/INSERT/UPDATE/DELETE", "release_label UNIQUE prevents duplicate gates", "decision CHECK enforces pending|go|no_go", "v_bi_qa_release_gates passed_checks + failed_checks sum within total_checks", "recordDecision sets decided_at and decided_by for the calling admin", "updateGateChecks persists status changes per check item"], qaUat: ["QA Readiness tab loads with all 6 sub-tabs", "Scope sub-tab renders 7 in-scope surfaces and the deferred list", "Personas sub-tab lists 7 personas with seeded state", "Scripts sub-tab shows 10 scripts with severity badges and negative tags", "Regression pack lists 8 high-risk areas linked to scripts", "Creating a gate with a duplicate label fails clearly", "Toggling a check status persists across reload", "Recording GO / NO-GO sets the decision badge and decided_at timestamp", "Defect template copy-to-clipboard works and matches the markdown structure"], exitCriteria: ["A stable QA environment and seeded persona catalog are defined", "Critical-path scripts exist with explicit expected outcomes", "Release-readiness / go-no-go criteria are explicit and tracked", "High-risk regression areas are identified and packaged", "Perplexity Computer can be handed a concrete QA brief instead of vague instructions"], exclusions: ["Auto-provisioning of seeded test users (defined as catalog only)", "Automatic test execution / runner in-app", "Full bug tracker with comments, attachments, and assignees", "Screen recording or evidence capture beyond defect template fields", "CI integration or scheduled regression runs"] }, items: [
    { id: "phase-39-scope", name: "A. QA Scope Definition", description: "QA_SCOPE_AREAS + deferred list frozen for the cycle.", status: "in-progress" },
    { id: "phase-39-personas", name: "B. Seeded Personas", description: "QA_PERSONAS catalog of 7 personas across admin/WL/direct/supervisor.", status: "in-progress" },
    { id: "phase-39-scripts", name: "C. Test Script Catalog", description: "QA_TEST_SCRIPTS with preconditions, steps, expected, severity, negative paths.", status: "in-progress" },
    { id: "phase-39-gate", name: "D. Release Gate", description: "qa_release_gates table + DEFAULT_GATE_CHECKS + go/no-go decision recording.", status: "in-progress" },
    { id: "phase-39-regression", name: "E. High-Risk Regression Pack", description: "QA_REGRESSION_PACK of 8 critical/high areas linked to scripts.", status: "in-progress" },
    { id: "phase-39-defects", name: "F. Defect Handoff Template", description: "QA_DEFECT_TEMPLATE + markdown generator with copy action.", status: "in-progress" },
    { id: "phase-39-ui", name: "G. Admin QA Hub", description: "QAReadinessPanel on /admin/intelligence with 6 sub-tabs.", status: "in-progress" },
    { id: "phase-39-bi", name: "H. BI Mirror", description: "v_bi_qa_release_gates with pass/fail counts for export.", status: "in-progress" },
  ] },

  { id: "phase-b", order: 3, code: "Phase B", title: "Campaigns Foundation Hardening", oneLiner: "Tenant identity, knowledge tables, field projection, Five9 mappings, and admin authoring shell", status: "built", gates: phaseBGates, contract: phaseBContract, items: phaseBItems },
  { id: "wave-1", order: 4, code: "Wave 1", title: "Campaigns + Scenarios + Build Packet", oneLiner: "Campaigns and campaign_scenarios authoring plus Build Packet PDF export. Placeholder publish-version table only.", status: "built", gates: wave1Gates, contract: wave1Contract, items: wave1Items },
  { id: "wave-2", order: 5, code: "Wave 2", title: "Script Builder + Runtime + Publish/Rollback", oneLiner: "Structured script documents, three-pane builder, real publish/rollback snapshots, and the Five9 iframe runtime", status: "built", gates: wave2Gates, contract: wave2Contract, items: wave2Items },
  { id: "wave-3", order: 6, code: "Wave 3", title: "Training + Go-Live Gates", oneLiner: "Training modules, signoffs, readiness gating, and per-campaign cutover tooling", status: "built", gates: wave3Gates, contract: wave3Contract, items: wave3Items },
  { id: "phase-f", order: 7, code: "Phase F", title: "Phase 4 Post-MVP", oneLiner: "Quizzes, retraining expiry, version diff, AI drafting, template marketplace", status: "built", gates: phaseFGates, contract: phaseFContract, items: phaseFItems },
  { id: "phase-g", order: 8, code: "Phase G", title: "Persona Expansion", oneLiner: "Direct Client, WL Partner, WL End-Client Campaigns surfaces and true supervisor scoping", status: "built", gates: phaseGGates, contract: phaseGContract, items: phaseGItems },
  { id: "phase-h", order: 9, code: "Phase H", title: "Operational Intelligence / Scale", oneLiner: "Cross-campaign reporting, scenario effectiveness, Five9 drift detection", status: "built", gates: phaseHGates, contract: phaseHContract, items: phaseHItems },
  { id: "phase-i", order: 10, code: "Phase I", title: "Growth Engine System Audit", oneLiner: "Audit-only inventory of the existing Growth Hub, Blog Manager, Keyword Tracker, Discoverability Engine, Mrunsox sync, and WordPress integration before any merge with the broader SuperAdmin blueprint", status: "active", gates: phaseIGates, contract: phaseIContract, items: phaseIItems },
];

// ── Stabilization alias (renders Phase A items in a flat section) ─
export const stabilizationItems = phaseAItems;

// ── Reusable testing checklist applied to every phase ─────────
export const testingChecklist: string[] = [
  "Schema migration validation",
  "RLS / permissions validation",
  "CRUD testing",
  "Resolver / projection testing where applicable",
  "Export / artifact validation where applicable",
  "Persona regression testing",
  "Visual QA",
  "UAT signoff",
  "Known-issues log",
];

// ═══════════════════════════════════════════════════════════════
// PLATFORM INVENTORY (already-shipped surfaces, reference only)
// Not part of the active execution order.
// ═══════════════════════════════════════════════════════════════

export const platformInventoryGrowth: BuildMapItem[] = [
  { id: "public-website", name: "Public Website & Landing Pages", description: "SEO-optimized pages for every service, industry, and location", status: "done" },
  { id: "lead-forms", name: "Lead Forms & Get Started", description: "Multi-step onboarding form with plan selection and UTM capture", status: "done" },
  { id: "roi-calculator", name: "ROI Calculator", description: "Interactive tool showing cost savings vs in-house receptionist", status: "done" },
  { id: "launch-estimator", name: "Launch Estimator", description: "Timeline and pricing estimator for new client setup", status: "done" },
  { id: "call-flow-builder", name: "Call-Flow Builder", description: "Visual drag-and-drop call routing designer", status: "done" },
  { id: "gated-pdfs", name: "Gated PDFs & Lead Magnets", description: "Downloadable resources behind email capture forms", status: "done" },
  { id: "exit-intent", name: "Exit-Intent Popups", description: "Behavioral triggers to capture abandoning visitors", status: "done" },
  { id: "utm-tracking", name: "UTM Tracking & Attribution", description: "Full-funnel source tracking from click to conversion", status: "done" },
  { id: "auto-blog", name: "Growth Hub: Auto-Blog (Read-Only Mirror)", description: "24H blog_posts is a read-only mirror of Mrunsox / Kingdom OS blog content via inbound sync webhook. AI generation and WordPress publishing happen upstream in Mrunsox; this side only consumes.", status: "done" },
  { id: "mrunsox-sync", name: "Mrunsox Content Sync", description: "Inbound webhook to sync blog content from Mrunsox/Kingdom OS into 24H blog_posts table", status: "done" },
  { id: "keyword-tracker", name: "Growth Hub: Keyword Tracker", description: "SEO keyword monitoring with ranking and volume data", status: "done" },
  { id: "newsletters", name: "Growth Hub: Newsletters", description: "Monthly newsletter drafting and batch sending via Resend", status: "done" },
  { id: "email-campaigns", name: "Growth Hub: Email Campaigns", description: "Contact management and targeted email blasts", status: "done" },
  { id: "seo-reports", name: "Growth Hub: SEO Reports", description: "Monthly SEO performance reports with PDF export", status: "done" },
  { id: "social-snippets", name: "Growth Hub: Social Snippets", description: "AI-generated social media posts from blog content", status: "done" },
  { id: "calendly-booking", name: "Bookii Meeting Booking", description: "Embedded Bookii scheduling with event ingestion via webhook", status: "done" },
  { id: "gpt-advisor", name: "GPT Call Advisor", description: "AI chat assistant for pre-sales questions and plan guidance", status: "done" },
  { id: "web-callback-widget", name: "Web Callback Widget", description: "Enter-your-number callback modal replacing all tel: links", status: "done" },
  { id: "desktop-qr-call", name: "Desktop QR-to-Call", description: "QR code for desktop visitors to call from their phone", status: "done" },
];

export const platformInventoryDelivery: BuildMapItem[] = [
  { id: "crm-pipeline", name: "CRM & 7-Stage Pipeline", description: "Lead lifecycle from new to qualified to onboarding to active to churned", status: "done" },
  { id: "ai-lead-intel", name: "AI Lead Intelligence", description: "Gemini-powered objection handling and follow-up suggestions", status: "done" },
  { id: "onboarding-checklists", name: "Client Onboarding Checklists", description: "Standardized 7-step activation workflow per client", status: "done" },
  { id: "client-scripts", name: "Client Scripts & Call Flows (Legacy)", description: "Custom greeting, FAQ, and call-handling rule management. Frozen surface, replaced per-campaign by Wave 2.", status: "done" },
  { id: "five9-ingestion", name: "Five9 Call Ingestion", description: "Automated call log import via edge function with client mapping", status: "done" },
  { id: "reach59-sms", name: "Reach59 SMS Bridge", description: "Post-call SMS notifications triggered by call events", status: "done" },
  { id: "agent-portal", name: "Agent Portal", description: "Clock in/out, call logs, scripts, tasks, messaging, and time-off", status: "done" },
  { id: "supervisor-portal", name: "Supervisor Portal", description: "Team oversight, shift reviews, SLA monitoring, and escalations", status: "done" },
  { id: "sales-portal", name: "Sales Portal", description: "Lead pipeline, meetings, proposals, and commission tracking", status: "done" },
  { id: "billing-portal", name: "Billing Portal", description: "Invoice management, payouts, subscriptions, and payment issues", status: "done" },
  { id: "hr-portal", name: "HR Portal", description: "Directory, onboarding, offboarding, payroll, contracts, and comms", status: "done" },
  { id: "tech-support-portal", name: "Tech Support Portal", description: "System issue tracking and internal knowledge base", status: "done" },
  { id: "tasks-ticketing", name: "Tasks & Ticketing", description: "SLA-driven task system with cross-departmental ticket routing", status: "done" },
  { id: "outbound-calls", name: "Outbound Call Requests", description: "Client-initiated callback queue with retry logic", status: "done" },
  { id: "call-logs", name: "Call Logs & Reporting", description: "Detailed call records with billable minutes and disposition tracking", status: "done" },
  { id: "meetings", name: "Meetings", description: "Bookii-synced meeting records linked to leads and pipeline", status: "done" },
  { id: "notifications", name: "Notifications", description: "In-app and email notifications for system events", status: "done" },
  { id: "callback-routing-engine", name: "Callback Routing Engine", description: "Intent classification and AI/human routing with business hours logic", status: "done" },
  
  { id: "pip-ai-assistant", name: "PiP AI Assistant", description: "Context-aware expert AI guide embedded across all 11 dashboard environments", status: "done" },
  { id: "onboarding-assistant", name: "Onboarding Assistant", description: "First-login dashboard tour and contextual walkthrough across all portals", status: "done" },
  { id: "people-directory", name: "People Directory", description: "Centralized identity table dedup'ing profiles, leads, and external IDs", status: "done" },
  { id: "ticketing-v2", name: "Ticketing v2 (work_queue routing)", description: "Normalized routing via work_queue, masked WL escalation linking System A/B", status: "done" },
];

export const platformInventoryPlatform: BuildMapItem[] = [
  { id: "admin-dashboard", name: "Admin Dashboard", description: "Full system overview with health metrics and quick actions", status: "done" },
  { id: "system-health", name: "System Health Views", description: "Real-time monitoring of API status, queue depth, and uptime", status: "done" },
  { id: "user-management", name: "User & Access Management", description: "User creation, role assignment, and portal access control", status: "done" },
  { id: "rbac-rls", name: "RBAC & RLS", description: "10-role system with row-level security across all tables", status: "done" },
  { id: "wl-partner-dash", name: "White-Label Partner Dashboard", description: "Branding, client management, usage tracking, and Growth Hub", status: "done" },
  { id: "wl-client-portals", name: "WL Client Portals", description: "Slug-based branded portals with isolated data access", status: "done" },
  { id: "wl-branding", name: "WL Branding & Theming", description: "Partner branding with colors, fonts, sidebar style, and live preview applied to client portals", status: "done" },
  { id: "wl-cname", name: "WL Custom Domain (CNAME)", description: "Partners can serve client portals from their own domain with DNS verification", status: "done" },
  { id: "affiliate-portal", name: "Affiliate Portal", description: "Referral tracking, commission tiers, payouts, and marketing assets", status: "done" },
  { id: "wl-usage-invoicing", name: "WL Usage Tracking & Invoicing", description: "Per-partner call volume and billing reconciliation", status: "done" },
  { id: "stripe-billing", name: "Stripe Billing & Dunning", description: "Subscription management with 4-stage automated dunning", status: "done" },
  { id: "airwallex-payroll", name: "Airwallex Payroll", description: "Semi-monthly agent payouts via international transfer API", status: "done" },
  { id: "hr-lifecycle", name: "HR Lifecycle & Payroll Ops", description: "Hiring pipeline, contracts, time-off, and payroll processing", status: "done" },
  { id: "wl-growth-hub", name: "Growth Hub for WL Partners", description: "Blog, keywords, WordPress, social, reports, and newsletters", status: "done" },
  { id: "edge-functions", name: "Edge Functions", description: "35+ serverless functions: ingestion, payouts, invites, notifications", status: "done" },
  { id: "analytics-monitoring", name: "Analytics & Monitoring", description: "Pipeline analytics, conversion tracking, and system metrics", status: "done" },
  { id: "report-mappings", name: "Client Report Mappings", description: "DNIS/campaign-based auto-routing of call reports to clients", status: "done" },
  { id: "agent-onboarding-pipe", name: "Agent Onboarding Pipeline", description: "8-step workflow from application to live call handling", status: "done" },
  { id: "wl-custom-domain-ui", name: "WL Custom Domain Self-Service UI", description: "Partners verify their own CNAMEs through the dashboard with live DNS checks", status: "done" },
  { id: "wl-domain-aliases", name: "WL Domain Aliases", description: "Multiple hostnames per partner with 301 canonical redirects to primary", status: "done" },
  { id: "mission-control", name: "Mission Control", description: "Superadmin governance UI for the 6 backend AI agents (modes, thresholds, run logs)", status: "done" },
  { id: "launch-checklist", name: "Launch Checklist", description: "Programmatic launch-readiness diagnostics at /admin/launch-checklist", status: "done" },
  { id: "audit-log", name: "Audit Log", description: "Append-only audit log for role grants, WL edits, lead deletions, billing changes", status: "done" },
];

export const platformInventory: BuildMapCategory[] = [
  { id: "inv-growth", title: "Front-End Growth Layer", subtitle: "How money and clients enter", items: platformInventoryGrowth },
  { id: "inv-delivery", title: "Service Delivery Layer", subtitle: "How calls get handled and value is delivered", items: platformInventoryDelivery },
  { id: "inv-platform", title: "Platform & Partner Layer", subtitle: "How we scale, resell, and administrate", items: platformInventoryPlatform },
];

// Back-compat alias: any older consumer reading buildMapCategories now sees
// the demoted Platform Inventory. Outline.tsx no longer reads this.
export const buildMapCategories: BuildMapCategory[] = platformInventory;

// ── All items flat (powers the global progress bar) ────────────
export const allBuildMapItems: BuildMapItem[] = [
  ...buildPhases.flatMap((p) => p.items),
  ...platformInventoryGrowth,
  ...platformInventoryDelivery,
  ...platformInventoryPlatform,
];

// ── Required Secrets Inventory ─────────────────────────────────
export const requiredSecrets: RequiredSecret[] = [
  { name: "Stripe Secret Key", service: "Billing", description: "Subscription management, webhooks, dunning automation", isPublic: false },
  { name: "Stripe Publishable Key", service: "Billing", description: "Client-side Stripe Elements for payment forms", isPublic: true },
  { name: "Five9 Webhook Key", service: "Call Ingestion", description: "Authenticating inbound call report webhooks from Five9", isPublic: false },
  { name: "Resend API Key", service: "Email / Newsletters", description: "Sending newsletters, email campaigns, and transactional emails", isPublic: false },
  { name: "Slack Bot Token", service: "Team Messaging", description: "Posting notifications and messages to Slack channels", isPublic: false },
  { name: "Slack Signing Secret", service: "Slack Events", description: "Verifying inbound Slack webhook payloads", isPublic: false },
  { name: "Airwallex Client ID", service: "Payroll", description: "Authenticating with Airwallex API for international payouts", isPublic: false },
  { name: "Airwallex API Key", service: "Payroll", description: "Authorizing payout transactions and beneficiary management", isPublic: false },
  { name: "WordPress App Password", service: "Growth Hub", description: "Publishing blog posts to WordPress via REST API (per-partner)", isPublic: false },
  { name: "Bookii Webhook Secret", service: "Meetings", description: "Verifying Bookii webhook payloads for meeting ingestion via Pabbly", isPublic: false },
  { name: "Lovable API Key", service: "AI Features", description: "AI gateway access for lead intelligence and content generation (auto-provisioned)", isPublic: false },
];
