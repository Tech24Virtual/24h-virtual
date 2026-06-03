24H Virtual — Full Build Outline

Canonical build plan for platform evolution from current-state product to native Campaign OS runtime.

This outline is the master execution plan. Work should proceed phase by phase unless explicitly reprioritized.

======================================================================
0. NORTH STAR
======================================================================

Build 24H Virtual into the operating system for:

- CRM and revenue
- client onboarding and fulfillment
- live operations
- Campaign OS authoring and runtime
- billing and finance
- support/ticketing
- white-label operations
- admin/system management

The most important transformation:

replace the current document-driven workflow for campaign setup and servicing with a native Campaign OS that manages:

- FAQ knowledge
- service/scenario rules
- backend build instructions
- Five9 variable/config mapping
- live agent scripts
- agent training and go-live readiness

Current real-world artifacts this must replace over time:

- FAQ documents
- services/scenarios sheets
- backend docs sent to tech
- agent scripts loaded in Five9 via iframe
- training packets/manual agent enablement

Legacy script/doc surfaces remain frozen and readable until migration/cutover is complete.

======================================================================
1. CANONICAL REFERENCES
======================================================================

Use these as source-of-truth references in order:

1. .lovable/product-realignment.md
   Canonical information architecture, persona flows, route disposition, navigation rules.

2. .lovable/stabilization-backlog.md
   Canonical pre-Phase-4 cleanup queue.

3. .lovable/phase-4-campaign-os-runtime.md
   Canonical Phase 4 design for native Campaign OS runtime.

4. .lovable/phase-4-wave-1-plan.md
   Canonical Wave 1 implementation plan.

5. Existing implemented code + schema
   Treat current implemented P0/P0.5 state as the live baseline.

Do not contradict these references unless a new approved spec explicitly replaces them.

======================================================================
2. CURRENT BASELINE STATUS
======================================================================

Completed / accepted baseline:

- documentation-only realignment pass completed
- stabilization backlog created
- P0 implementation completed
- post-P0 verification/hardening completed
- Campaign OS admin authoring loop for FAQs / Policies / Fields / Departments exists
- Drafts Review admin page exists
- nav cleanup and naming cleanup complete
- AgentClients scoping fixed
- AdminOverview total clients metric fixed
- supervisor scope is currently an explicit documentation lock:
  admin-equivalent Campaign OS visibility until a future supervisor-assignment model exists

Already implemented Campaign OS foundation/knowledge work indicated in repo/history:

- tenant identity + RLS helpers
- client departments
- contacts
- department numbers
- FAQ / policy structures
- field groups / fields / visibility / display labels
- Five9 variable mappings
- campaign audit log foundation
- tenancy helpers and hooks

This means future work should build on the existing Campaign OS foundation rather than recreating it.

======================================================================
3. EXECUTION PRINCIPLES
======================================================================

1. No random feature work.
   Every change must tie back to a named phase or backlog item.

2. Protect source of truth.
   Structured Campaign OS data must replace duplicated doc content over time.

3. Admin-first authoring.
   New Campaign OS runtime surfaces should begin with admin-first workflows.
   Supervisor participation can be drafting/review-limited until true scoping exists.

4. Freeze legacy before cutover.
   Legacy script/doc routes stay readable and frozen until per-campaign migration is complete.

5. One campaign truth, many outputs.
   Store campaign facts once; generate:
   - build packet
   - live script bundle
   - training view
   - client approval/export artifacts

6. Five9 is a runtime consumer, not the authoring source.
   24H Virtual authors and publishes.
   Five9 consumes the published runtime bundle.

7. Every phase ends with validation.
   No skipping acceptance criteria.

======================================================================
4. MASTER ROADMAP
======================================================================

PHASE A — Product Coherence
PHASE B — Campaign OS Foundation Hardening
PHASE C — Phase 4 Wave 1
PHASE D — Phase 4 Wave 2
PHASE E — Phase 4 Wave 3
PHASE F — Phase 4 Post-MVP
PHASE G — Persona Expansion
PHASE H — Operational Intelligence / Scale

======================================================================
5. PHASE A — PRODUCT COHERENCE
======================================================================

Goal:
Finish any remaining product-structure cleanup so Campaign OS expansion lands on a clean platform.

Status:
Mostly complete.

Remaining items:

- P1 cleanup from stabilization backlog
- true supervisor Campaign OS scoping decision path
- broader admin-gate audit
- regression coverage where needed
- small UX hardening of newly added Campaign OS surfaces

Key backlog follow-ups:

- P1-6a true supervisor Campaign OS scoping (requires supervisor-assignment model)
- WL/admin cleanup items from stabilization backlog
- trend delta cleanup
- admin partners split / affiliate separation
- any remaining IA naming consistency work

Acceptance:

- no placeholder nav items visible
- route structure aligned with real user goals
- admin-only authoring areas clearly protected
- no ambiguity around supervisor scope

Do not block Phase 4 on all P1 items unless a dependency is real.

======================================================================
6. PHASE B — CAMPAIGN OS FOUNDATION HARDENING
======================================================================

Goal:
Make the existing Campaign OS knowledge layer production-safe before new runtime layers are added.

Scope:

- audit existing Campaign OS schema and hooks
- verify RLS coverage on all campaign-related tables
- verify tenancy helper usage is consistent
- verify audit logging strategy
- confirm lifecycle/status semantics across:
  - departments
  - FAQs
  - policies
  - fields
  - Five9 mappings

Tasks:

1. Schema review
   - document current tables, enums, triggers, views, RPCs
   - identify anything already usable for Phase 4
   - identify naming mismatches to avoid duplicate tables

2. RLS review
   - verify all campaign tables use has_role / is_tenant_member pattern
   - verify no broad SELECT/UPDATE leaks

3. Status model review
   - standardize draft / approved / archived / live semantics

4. Audit/logging review
   - confirm whether campaign_audit_log is sufficient for Phase 4
   - define how publish and rollback events will be logged

5. Existing UI review
   - confirm current FAQs / Policies / Fields / Departments pages can become submodules of the campaign runtime

Acceptance:

- clear inventory of reusable assets
- no duplicate object creation in later phases
- known hardening issues queued explicitly

======================================================================
7. PHASE C — PHASE 4 WAVE 1
======================================================================

Goal:
Introduce campaign as a first-class object and replace the backend build document with structured data + generated output.

Scope:

- campaigns table/model
- campaign_scenarios
- admin Campaigns surface
- admin Scenarios authoring
- Build Packet output/export

This wave does NOT include:

- script builder
- live runtime iframe replacement
- training
- migration tooling
- agent UI changes

----------------------------------------------------------------------
7.1 Business outcome
----------------------------------------------------------------------

A new client/campaign can be prepared for tech setup without manually maintaining a backend Google Doc/PDF. Instead, the build packet is generated from structured Campaign OS data.

----------------------------------------------------------------------
7.2 Wave 1 objects
----------------------------------------------------------------------

Use existing where possible; add only what is needed:

- campaigns
  1:1 wrapper around an active client_department
  stores campaign-level runtime/build identity and lifecycle

- campaign_scenarios
  structured replacement for the services/scenarios document
  captures:
  - scenario name
  - trigger / call reason
  - intent
  - expected agent action
  - routing/disposition outcome
  - escalation rule
  - booking / transfer / message capture rule
  - service limits / notes

Likely reuse existing:

- client_departments
- client_contacts
- department_numbers
- campaign_faq_entries
- campaign_policy_blocks
- campaign_fields / field_groups
- five9_variable_mappings

----------------------------------------------------------------------
7.3 Wave 1 UI
----------------------------------------------------------------------

Admin-only.

Routes:

- /admin/campaign-os/campaigns
- /admin/campaign-os/campaigns/:id
- /admin/campaign-os/scenarios

Campaign detail tabs should include:

- Overview
- Department / routing context
- Contacts
- Numbers
- Scenarios
- FAQs
- Policies
- Fields
- Five9 mappings
- Build Packet

No script tab yet unless clearly labeled "coming in Wave 2" and hidden from nav if unfinished.

----------------------------------------------------------------------
7.4 Build Packet output
----------------------------------------------------------------------

Structured replacement for the backend build document.

Sections:

- campaign identity
- client + department summary
- coverage / holiday coverage
- numbers / ANI / DNIS / transfer display
- voicemail / callback behavior
- intake fields
- worksheet sequences
- dispositions and assigned emails
- connectors / booking links / escalation channels
- IVR greeting / hold / transition messages
- Five9 mapping summary
- go-live checklist

Outputs:

- on-screen admin build packet view
- exportable PDF
- exportable JSON payload if needed later

----------------------------------------------------------------------
7.5 Wave 1 acceptance tests
----------------------------------------------------------------------

1. Admin can create a campaign from an eligible department.
2. Campaign cannot exist without valid tenant identity and linked department.
3. Admin can create/edit/archive scenarios.
4. Build Packet view renders from structured data without manual document entry.
5. Build Packet PDF export works for at least one direct client and one WL client scenario.
6. Existing FAQ / policy / fields / Five9 mappings can be linked/viewed from a campaign context.
7. RLS prevents cross-tenant campaign access.
8. No legacy script routes are changed in this wave.

======================================================================
8. PHASE D — PHASE 4 WAVE 2
======================================================================

Goal:
Replace the static agent script document with a native script authoring system and published runtime bundle consumed by Five9.

This is the highest-value transformation for live operations because your current agent script is still a long manual document used via iframe.

Scope:

- campaign_script_documents
- campaign_script_blocks
- campaign_script_branches
- script builder UI
- publish / rollback model
- runtime bundle endpoint
- /run/campaign/:campaignId/script iframe renderer
- per-campaign cutover from legacy scripts

This wave does NOT include:

- quiz engine
- retraining auto-expiry
- client-facing self-service surfaces

----------------------------------------------------------------------
8.1 Business outcome
----------------------------------------------------------------------

Agents use a live, versioned script generated from the same structured knowledge base as onboarding/setup, instead of a manually maintained Google Doc/PDF script.

----------------------------------------------------------------------
8.2 Script model
----------------------------------------------------------------------

Script architecture:

- script document
- sections / blocks
- branch conditions
- linked FAQs
- linked policies
- linked fields
- linked variable mappings
- linked scenarios

Block types:

- greeting
- identity confirmation
- call reason selection
- info capture
- transfer / book / escalate
- callback / voicemail
- compliance / restricted disclosure note
- internal-only note
- closing

Branch conditions:

- department
- call intent
- Five9 variable presence/value
- customer type
- language
- current campaign state

----------------------------------------------------------------------
8.3 Runtime bundle
----------------------------------------------------------------------

Published endpoint:

- /run/campaign/:campaignId/script

Optional admin preview:

- /run/campaign/:campaignId/script?version=draft

Bundle contents:

- published script tree
- effective FAQs
- effective policies
- relevant field definitions
- Five9 variable bindings
- campaign metadata

Five9 integration principle:

24H Virtual publishes the runtime.
Five9 iframe reads the published bundle.
No authoring in Five9.

----------------------------------------------------------------------
8.4 Publish / rollback
----------------------------------------------------------------------

Each publish creates a version snapshot.
Published version pointer changes; old versions remain.
Rollback repoints to prior published version.

Acceptance:

- admin can preview draft vs published
- publish writes version record
- rollback restores prior published experience without destructive rewrites
- runtime only serves published version to agent context

----------------------------------------------------------------------
8.5 Migration / cutover
----------------------------------------------------------------------

Legacy remains frozen:

- client_scripts
- wl_client_scripts
- /staff/agent/scripts
- related legacy script routes

Per-campaign cutover:

1. author Phase 4 script
2. publish v1
3. validate runtime
4. flip iframe source to /run/campaign/:id/script
5. mark legacy script read-only with migration pointer

----------------------------------------------------------------------
8.6 Wave 2 acceptance tests
----------------------------------------------------------------------

1. Admin can create and save a draft script.
2. Admin can branch by scenario/call reason.
3. Runtime bundle returns published script data only.
4. Five9 iframe can render the script without changing agent workflow.
5. Publish creates version history.
6. Rollback restores a prior published version.
7. Legacy script remains readable after cutover.
8. Per-campaign cutover can be reversed if rollback is needed.

======================================================================
9. PHASE E — PHASE 4 WAVE 3
======================================================================

Goal:
Replace manual pre-go-live training with native campaign training, signoff, and readiness gating.

Scope:

- campaign_training_modules
- campaign_training_lessons
- campaign_training_signoffs
- campaign readiness gates
- assigned-agent certification checks
- migration support for training records if needed

Initial MVP excludes quizzes if you want to stay tight.

----------------------------------------------------------------------
9.1 Business outcome
----------------------------------------------------------------------

Campaigns cannot go live until:

- script is published
- core FAQ/policy package is approved
- build config is complete
- assigned agents have completed required training/signoff

----------------------------------------------------------------------
9.2 Training model
----------------------------------------------------------------------

Objects:

- module
- lesson
- acknowledgment
- optional video URL
- signoff/certification record

Minimum lesson types:

- content lesson
- acknowledgment lesson

Deferred:

- quiz scoring
- advanced analytics
- retraining auto-expiry (can be post-MVP)

----------------------------------------------------------------------
9.3 Go-live gates
----------------------------------------------------------------------

A campaign cannot move to live unless:

- published script exists
- approved FAQ/policy bundle exists
- required Five9 mappings exist
- at least one trained/signoff-ready agent exists
- launch checklist is complete

Optionally prevent agent assignment if certification is missing.

----------------------------------------------------------------------
9.4 Wave 3 acceptance tests
----------------------------------------------------------------------

1. Admin can create training modules tied to campaign.
2. Lessons can be completed and signed off.
3. Campaign readiness status updates based on completion.
4. Untrained agent cannot be marked ready for the campaign.
5. Campaign cannot move live without required gates satisfied.

======================================================================
10. PHASE F — PHASE 4 POST-MVP
======================================================================

Goal:
Extend the Campaign OS runtime after the core document-replacement workflow is complete.

Deferred capabilities:

- quizzes + scoring
- retraining auto-expiry when retraining-required content changes
- training analytics dashboard
- AI-assisted script drafting
- AI-assisted FAQ/policy suggestions
- side-by-side version diff
- runtime experiments / A/B branching
- advanced approvals / change requests
- bulk migration console
- richer audit timelines
- packaged templates by industry/use case

Only do this after Waves 1–3 are solid.

======================================================================
11. PHASE G — PERSONA EXPANSION
======================================================================

Goal:
Expand Campaign OS beyond admin-first usage.

Order from current spec:

- Direct Client later
- WL Partner later
- WL End-Client later

----------------------------------------------------------------------
11.1 Direct Client surface
----------------------------------------------------------------------

Potential future capabilities:

- review approved FAQs and policies
- request script changes
- view campaign status
- upload onboarding information
- approve build packet / script revisions
- see billing/training/go-live readiness summaries

Do not expose raw authoring prematurely.

----------------------------------------------------------------------
11.2 WL Partner surface
----------------------------------------------------------------------

Potential future capabilities:

- end-client campaign list
- outbound campaigns
- branded campaign summaries
- change requests
- billing/usage overlay
- approval workflow for branded clients

----------------------------------------------------------------------
11.3 WL End-Client surface
----------------------------------------------------------------------

Potential future capabilities:

- branded self-service portal
- script/build packet review
- support + billing + campaign summaries

All persona expansion should happen only after admin runtime works end to end.

======================================================================
12. PHASE H — OPERATIONAL INTELLIGENCE / SCALE
======================================================================

Goal:
Turn Campaign OS into a scaling engine, not just a records system.

Possible additions:

- full activity/audit log UI
- cross-campaign reporting
- SLA and QA tracking
- publish history dashboard
- agent performance by script version
- scenario effectiveness metrics
- call disposition reporting tied back to scenarios
- error and drift detection between Five9 runtime and authored config
- migration health dashboard
- template marketplace / internal playbooks

======================================================================
13. DOCUMENT-TO-PRODUCT MAPPING
======================================================================

1. FAQ document → campaign_faq_entries + effective resolver + runtime FAQ widget
2. Services/scenarios document → campaign_scenarios + policy blocks + service config
3. Backend build document → campaign + department + fields + mappings + scenarios + Build Packet
4. Agent script document → script documents/blocks/branches + published runtime bundle + iframe renderer
5. Training materials → training modules + lessons + signoffs + go-live gate

======================================================================
14. DATA / ARCHITECTURE RULES
======================================================================

1. Preserve tenant identity model (four-column tenant identity).
2. Reuse tenancy helpers (tenantWhere / is_tenant_member). No ad hoc filtering.
3. Admin-first mutations. Supervisor remains drafting/review-limited until true scoping is designed.
4. One campaign per active department in initial model.
5. Status discipline: draft / approved / archived / published/live.
6. Version discipline: anything runtime-facing must support versioning once Wave 2 begins.
7. No hidden duplication. One operational truth per fact.

======================================================================
15. UX / NAV RULES
======================================================================

Admin Campaign OS should evolve to include:

- Overview
- Campaigns
- Departments
- Fields
- FAQs
- Policies
- Scenarios
- Five9 Mappings
- Drafts Review
- Build Packet
- Scripts (Wave 2)
- Training (Wave 3)
- Versions / Publish (Wave 2+)

Rules:

- hide unfinished items from nav
- allow deep links only where intentionally frozen
- no placeholder nav entries
- page labels must match actual business purpose

======================================================================
16. BUILD ORDER
======================================================================

Always build in this order unless explicitly changed:

1. confirm current baseline / dependencies
2. write or refresh phase plan
3. implement schema/backend first
4. implement hooks/data layer
5. implement admin UI
6. implement exports/runtime
7. run validation + regression
8. update memory/spec references
9. only then proceed to next wave

Never mix multiple major waves in one pass.

======================================================================
17. ACCEPTANCE GATES BY WAVE
======================================================================

A wave is only complete when all are true:

- schema is merged and documented
- RLS/tenancy verified
- admin routes work
- empty states and failure states exist
- regression checklist run
- memory/spec references updated
- no placeholder nav for incomplete surfaces
- migration/cutover behavior documented if relevant

======================================================================
18. RISKS TO WATCH
======================================================================

1. Duplicate data model drift — one source fact, many views.
2. Five9 coupling too early — Five9 only consumes published runtime.
3. Supervisor ambiguity — keep admin-equivalent lock explicit until real scoping.
4. Overbuilding client/WL surfaces too soon — admin-first until Waves 1–3 are proven.
5. Migration chaos — per-campaign cutover, frozen legacy, reversible publish/rollback.

======================================================================
19. IMMEDIATE NEXT ACTION
======================================================================

Phase 4 Wave 1 implementation (plan already approved at .lovable/phase-4-wave-1-plan.md).

Next implementation batch (Batch A): migration for `campaigns`, `campaign_scenarios`, `campaign_publish_versions` tables + triggers + RLS + indexes.

Awaiting explicit go-ahead to begin Batch A.

======================================================================
20. DO NOT DO
======================================================================

- do not start Wave 2 while Wave 1 is incomplete
- do not build new persona surfaces early
- do not replace legacy script routes before runtime is ready
- do not add placeholder nav items
- do not claim supervisor scoping is solved
- do not scatter campaign truth across new documents again
