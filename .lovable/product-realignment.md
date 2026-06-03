# 24H Virtual — Product Realignment Spec

**Status:** Canonical IA + user-flow reference. Documentation only.
**Source of truth:** This file is the IA reference for the entire 24H Virtual platform. When this file conflicts with code, this file wins and code follows via the stabilization backlog.
**Companion:** `.lovable/stabilization-backlog.md` (the implementation queue derived from this spec).

This spec is decisive. No placeholder nav items survive. Every route maps to a real user goal or is explicitly hidden, renamed, merged, deferred, or removed. Built on top of the current-state audit, not on assumption.

---

## 1. Product architecture

24H Virtual is one platform composed of eight operating domains plus two cross-cutting surfaces. Every page in the build belongs to exactly one domain. If a page lives in the wrong domain today, this section says so.

### Domain 1 — CRM & Revenue
- **Who uses it:** Admin, Sales staff, Supervisor (read-only on pipeline)
- **Business outcome:** Convert inbound + outbound leads into paying direct clients or WL partners.
- **Major entities:** `leads`, `crm_tasks`, `sales_commissions`, `sales_targets`, `proposals`, `meetings`, `outbound_call_attempts` (sales-originated).
- **Belongs here:** `/admin/leads`, `/admin/leads/:id`, `/admin/crm`, `/admin/outbound-calls`, `/staff/sales/*`, `/admin/analytics` (revenue slices).
- **Does NOT belong here:** `/admin/clients` (despite name, it reads `leads` filtered by `pipeline_stage`; conceptually it is an Active Accounts view inside Live Operations). `/admin/billing` (Billing domain).

### Domain 2 — Onboarding & Fulfillment
- **Who uses it:** Admin, Supervisor, Agent (read on own onboarding), WL Partner (own end-client onboarding).
- **Business outcome:** Move a won deal from contract to live operations in days, not weeks.
- **Major entities:** `client_onboarding_*`, `client_handoff_*`, `wl_partner_handoff_*`, `internal_fulfillment_*`, `agent_onboarding`, `onboarding_templates`.
- **Belongs here:** `/admin/fulfillment-intake`, `/admin/fulfillment-intake/:id`, `/staff/supervisor/fulfillment(+/:id)`, `/staff/supervisor/agent-onboarding`, `/staff/agent/onboarding`, `/white-label-dashboard/onboarding(+/:id)`, `/admin/launch-checklist`.
- **Does NOT belong here:** `/staff/supervisor/script-reviews` (Campaign OS domain — script lifecycle).

### Domain 3 — Live Operations
- **Who uses it:** Admin, Supervisor, Agent, Direct Client (read), WL End-Client (read).
- **Business outcome:** Run real-time receptionist work — answer calls, work tickets, log messages, run shifts.
- **Major entities:** `call_logs`, `wl_call_logs`, `support_tickets`, `agent_shifts`, `outbound_call_requests`, Slack messages, `client_agent_assignments`.
- **Belongs here:** `/admin/clients` (rename to **Active Accounts**), `/admin/agents`, `/staff/agent/*` (minus campaigns/scripts/onboarding), `/staff/supervisor/*` (minus fulfillment/script-reviews/agent-onboarding/scripts), `/client-dashboard/calls`, `/client-dashboard/schedule`, `/client-dashboard/outbound-requests`, `/portal/:slug/calls`, `/portal/:slug/schedule`, `/portal/:slug/outbound-requests`, `/portal/:slug/activity`.
- **Does NOT belong here:** `/staff/agent/scripts`, `/portal/:slug/scripts`, `/client-dashboard/scripts` (Campaign OS / legacy script subdomain).

### Domain 4 — Campaign OS
- **Who uses it (today):** Admin (authoring), Supervisor (read + draft suggestions). Other personas deferred.
- **Business outcome:** Single source of truth for what an agent says, asks, and routes per client × department. Replaces the three-way script split over time.
- **Major entities:** `client_departments`, `campaign_field_groups`, `campaign_fields`, `campaign_faq_entries`, `campaign_policy_blocks`, `five9_variable_mappings`, `campaign_department_type_defaults`, resolver views/RPCs (`v_candidate_*`, `resolve_effective_*`).
- **Belongs here:** `/admin/campaign-os/*` (7 routes), supervisor `Campaigns` workspace mode.
- **Legacy still readable inside this domain:** `client_scripts`, `wl_client_scripts` (frozen via `lib/campaign-os/legacyMarkers.ts`). Replacement is Phase 4.
- **Does NOT belong here:** `wl_client_campaigns` (recipient-list outbound; lives in WL Operations).

### Domain 5 — Billing & Finance
- **Who uses it:** Admin, Billing staff, Direct Client, WL Partner, WL End-Client (own invoices).
- **Business outcome:** Plan selection, usage metering, invoice generation, dunning, payroll, commissions.
- **Major entities:** `usage_records`, `wl_usage_records`, `wl_invoices`, `payment_failures`, `shift_invoices`, `sales_commissions`, `client_addons`, `addon_products`, `custom_plans`, `wl_wholesale_pricing`.
- **Belongs here:** `/admin/billing`, `/staff/billing/*`, `/client-dashboard/billing`, `/white-label-dashboard/billing`, `/white-label-dashboard/pricing`, `/portal/:slug/billing`.
- **Does NOT belong here:** `/admin/wl-config-diff` (Admin & System diagnostics).

### Domain 6 — Support & Tickets
- **Who uses it:** Every persona.
- **Business outcome:** Route, work, and resolve issues across departments (HR, Tech, Sales, Billing) with SLA tracking. Cross-tenant masking for WL.
- **Major entities:** `support_tickets`, `ticket_replies`, `ticket_views`, `work_queue` routing, escalations.
- **Belongs here:** `/admin/tickets(+/:id)`, `/staff/{billing,tech,supervisor,agent}/tickets(+/:id)`, `/staff/supervisor/escalations`, `/client-dashboard/support`, `/portal/:slug/support`, `/white-label-dashboard/client-tickets`, `/white-label-dashboard/support`, HR ticket views.
- **Does NOT belong here:** None — clean.

### Domain 7 — White-Label Operations
- **Who uses it:** WL Partner, Admin (oversight), WL End-Client (consumes branded surfaces).
- **Business outcome:** Run a partner-branded receptionist business: client management, branding, custom domains, wholesale economics, outbound campaigns, end-client portal.
- **Major entities:** `white_label_partners`, `white_label_clients`, `white_label_branding`, `white_label_domain_aliases`, `wl_client_campaigns`, `wl_campaign_recipients`, `wl_campaign_metrics`, `wl_partner_tasks`, `wl_proposals`, partner Growth Hub tables, partner KB.
- **Belongs here:** all of `/white-label-dashboard/*`, all of `/portal/:slug/*`, `/admin/partners(+/:id)` (rename to **WL Partners**), `/admin/wl-portals`, `/admin/wl-health`, `/admin/wl-leak-audit`, `/admin/wl-config-diff`, `/admin/wl-preview/:partnerId`.
- **Does NOT belong here:** Affiliates (currently fused into `/admin/partners` — split out into Admin & System / CRM affiliate operations).

### Domain 8 — Admin & System
- **Who uses it:** Admin, SuperAdmin.
- **Business outcome:** Govern the whole platform: users, roles, audit, AI mission control, launch readiness, settings, content/discoverability ops, blog, growth.
- **Major entities:** `profiles`, `user_roles`, `audit_log`, `mission_control_*`, `agent_configs`, `agent_runs`, `disc_*`, `blog_posts`, `keyword_tracker`, `affiliates`, `affiliate_referrals`, `affiliate_payouts`.
- **Belongs here:** `/admin/users`, `/admin/audit-log`, `/admin/mission-control`, `/admin/launch-controls`, `/admin/launch-checklist`, `/admin/settings`, `/admin/architecture`, `/admin/outline`, `/admin/email-preview`, `/admin/support`, `/admin/discoverability/*`, `/admin/growth-hub/*`, `/admin/blog(+editor)`, `/admin/keywords`, `/admin/analytics`, **new** `/admin/affiliates`.

### Cross-cutting A — Public Marketing
Unchanged scope. ~80 routes (industries, capabilities, guides, blog, locations, legal, calculators, advisor funnels, hybrid receptionist, AI receptionist gated by FeatureGate). Owned by marketing operations; not part of any persona workspace.

### Cross-cutting B — Embedded
Token + slug-based public surfaces: `/widget/v1` (chat embed), `/p/:token` (proposal viewer), `/c/:token` (script change form). Owned by their originating domain (Live Ops / WL / Campaign OS) but rendered outside the dashboard shell.

---

## 2. Persona-by-persona user flow map

### 2.1 Admin / SuperAdmin

- **Primary goals:** keep the platform running, convert pipeline, govern WL partners, manage users/roles, oversee Campaign OS authoring.
- **Daily JTBD:** review inbound leads, action escalated tickets, approve fulfillment intake, monitor AI mission control, publish Campaign OS knowledge, audit WL config drift.
- **Default landing:** `/admin` (Overview).
- **Core nav sections (clean):** Overview · Sales · Accounts · Operations · Fulfillment · WL Operations · Campaign OS · Growth · Insights · System.
- **Critical flows:**
  1. **Convert lead → active account.** `/admin/leads` → `/admin/leads/:id` (mark won) → assign agents from `/admin/agents` → configure scripts (today: `/staff/agent/scripts` proxy; Phase 4: Campaign OS) → enable billing `/admin/billing` → `/admin/launch-checklist`. **Today:** all steps work individually; **break:** no atomic "convert" action; pipeline_stage flip is implicit; admin clicks across 5 pages.
  2. **Author Campaign OS knowledge.** `/admin/campaign-os` → pick tenant → Departments → Fields → FAQs → Policies → Five9. **Today:** create works; **break:** no edit/approve/delete from UI for FAQ/Policy/Field/Department.
  3. **Govern WL partner config.** `/admin/wl-portals` → `/admin/partners/:id` → `/admin/wl-config-diff` → `/admin/wl-preview/:partnerId` → `/admin/wl-leak-audit`. **Break:** sidebar `WL Preview` entry is bare (no `:partnerId`) → 404; `wl-config-diff` ALL_MODULES is stale (missing `campaigns`).
  4. **Manage users + roles.** `/admin/users` (full CRUD via dialogs). **Today:** works.
  5. **Oversee AI agents.** `/admin/mission-control` (6 agents + Emergency Simulation toggle). **Today:** works.

### 2.2 Supervisor

- **Primary goals:** keep agents productive, clear escalations, approve script changes and shifts, surface knowledge gaps.
- **Daily JTBD:** review escalations, approve/edit shifts, action client assignments, review script change requests, draft Campaign OS suggestions.
- **Default landing:** `/staff/supervisor` (Dashboard).
- **Core nav sections (clean):** Dashboard · Workspace · Operations (Agents, Schedule, Tasks, Outbound) · Quality (Shift Reviews, Script Reviews, Performance) · Tickets & Escalations · Onboarding (Agent Onboarding, Client Assignments, Fulfillment) · Campaign Drafts · Settings.
- **Critical flows:**
  1. **Workspace shift.** `/staff/supervisor/workspace` (7 modes: Overview, Tickets, Escalations, Tasks, Reviews, Outbound, Campaigns). **Break:** Campaigns mode shows ALL tenants — `tenantWhere` short-circuits supervisor.
  2. **Approve script change.** `/staff/supervisor/script-reviews` → diff view → approve/reject. **Today:** works (legacy `client_scripts`).
  3. **Review escalations.** `/staff/supervisor/escalations` → resolve → optional WL masked escalation. **Today:** works.
  4. **Suggest Campaign OS draft.** Workspace Campaigns mode → "Suggest FAQ Draft" → status `draft`. **Break:** admin console has no review queue → drafts never get published. Add **Campaign Drafts Review** queue (admin or supervisor lands it; final spec puts it in supervisor nav and admin console).
  5. **Onboard new agent.** `/staff/supervisor/agent-onboarding` → checklist → live training. **Today:** works.

### 2.3 Agent

- **Primary goals:** answer calls accurately, log work, hit shift hours, follow scripts.
- **Daily JTBD:** clock in, work assigned client queue, take calls, log dispositions, action tickets, message in Slack, end shift.
- **Default landing:** `/staff/agent` (Dashboard).
- **Core nav sections (clean):** Dashboard · Workspace · My Clients · Calls · Scripts (legacy) · Tasks · Tickets · Outbound · Shifts · Schedule · Time Off · Messages · Onboarding · My Profile · Settings · Support.
- **Critical flows:**
  1. **Start shift.** `/staff/agent/shifts` clock in → break tracking → clock out. **Today:** works.
  2. **Take a call.** Five9 → `call_logs` ingest → review in `/staff/agent/call-logs`. **Today:** works.
  3. **Read script.** `/staff/agent/scripts` reads `client_scripts` for assigned clients. **Break:** `AgentClients` query reads ALL `profiles`, not `client_agent_assignments`-filtered; visible client list is wrong. Scripts come from those wrong clients in some cases.
  4. **Work a ticket.** `/staff/agent/tickets(+/:id)`. **Today:** works.
  5. **Onboarding.** `/staff/agent/onboarding`. **Today:** works.
- **Hidden:** `/staff/agent/campaigns` — placeholder; remove from nav.

### 2.4 Direct Client

- **Primary goals:** trust the service, see calls, edit scripts, manage billing, get help.
- **Daily JTBD:** review last calls, request a script change, check next invoice, file a ticket.
- **Default landing:** `/client-dashboard` (Dashboard).
- **Core nav sections (clean):** Dashboard · Calls · Scripts · Schedule · Outbound Requests · Billing · Referrals · Support · Settings.
- **Critical flows:**
  1. **Review calls.** `/client-dashboard/calls`. **Today:** works.
  2. **Request script change.** `/client-dashboard/scripts` → edit → submits `script_change_request`. **Today:** works.
  3. **Manage billing.** `/client-dashboard/billing` → PlanSelectorDialog → Stripe checkout. **Today:** works.
  4. **Refer.** `/client-dashboard/referrals`. **Today:** works.
  5. **Support.** `/client-dashboard/support`. **Today:** works.
- **Hidden:** `/client-dashboard/campaigns` — placeholder; remove from nav.
- **Cosmetic break:** Dashboard "+12% from last month" trend deltas are hard-coded.

### 2.5 White-Label Partner

- **Primary goals:** run a branded receptionist business; manage end-clients; control branding, domains, pricing, outbound campaigns.
- **Daily JTBD:** onboard new end-client, monitor usage and billing, configure branding/domain, run outbound campaigns, work partner tasks/tickets.
- **Default landing:** `/white-label-dashboard` (Overview).
- **Core nav sections (clean):** Overview · Pipeline · Clients · Onboarding · Operations (Outbound Campaigns, Knowledge Base, Client Tickets) · Branding & Domain · Billing & Pricing · Growth Hub · Settings · Support.
- **Critical flows:**
  1. **Onboard end-client.** `/white-label-dashboard/clients` → create → `/white-label-dashboard/onboarding/:id` → branding inheritance → portal slug live. **Today:** works.
  2. **Configure branding + domain.** `/white-label-dashboard/branding` → `/white-label-dashboard/custom-domain` → CNAME proof → alias 301 wired. **Today:** works.
  3. **Run outbound campaign.** `/white-label-dashboard/campaigns` → create campaign → recipients → metrics. **Break:** sibling `/campaign-os` placeholder confuses — rename this surface to **Outbound Campaigns**, hide `/campaign-os` from nav until Phase 7.
  4. **Manage billing.** `/white-label-dashboard/billing` + `/white-label-dashboard/pricing`. **Today:** works.
  5. **Growth.** `/white-label-dashboard/growth-hub/*` (7 sub-routes). **Today:** works.
- **Hidden:** `/white-label-dashboard/campaign-os` — placeholder; remove from nav.
- **Orphan to remove:** `src/pages/white-label-dashboard/Tasks.tsx` not registered in router.

### 2.6 White-Label End-Client

- **Primary goals:** identical to Direct Client but inside a partner-branded shell.
- **Daily JTBD:** review calls/messages/leads/reviews, see campaign metrics, file support, view invoices.
- **Default landing:** `/portal/:slug` (Dashboard) — masked by partner hostname.
- **Core nav sections (clean):** Dashboard · Activity · Calls · Leads · Reviews · Campaigns · Schedule · Outbound Requests · Scripts · Billing · Support · Settings. (Module-gated via `wlModuleVisibility`.)
- **Critical flows:**
  1. **Login through branded hostname.** `wlHostResolver` → `WLPortalContext` → branded UI. **Today:** works.
  2. **Review calls.** `/portal/:slug/calls`. **Today:** works.
  3. **View campaigns.** `/portal/:slug/campaigns` (recipient model). **Today:** works.
  4. **File support.** `/portal/:slug/support` (masked routing to partner). **Today:** works.
  5. **Read scripts.** `/portal/:slug/scripts` (read-only). **Today:** works (legacy).
- **No Campaign OS surface.** Intentional. Phase 8 gated on partner config.

---

## 3. Navigation architecture (clean sidebar per persona)

Status legend: **K** keep · **R** rename · **M** merge · **H** hide (route stays) · **D** defer · **X** remove · **N** new.

### 3.1 Admin

| Section | Item | Purpose | Route | Data source | Status |
|---|---|---|---|---|---|
| Overview | Overview | KPI snapshot | `/admin` | leads, profiles, tickets | K (fix Total Clients query) |
| Sales | Leads | Lead pipeline | `/admin/leads` | `leads` | K |
| Sales | CRM | Tasks + messages + mappings | `/admin/crm` | `crm_tasks` | K |
| Sales | Outbound Calls | Sales outbound | `/admin/outbound-calls` | `outbound_call_*` | K |
| Accounts | Active Accounts | Live clients | `/admin/clients` | `leads` filtered | R (was "Clients") |
| Accounts | Billing | Invoices + plans | `/admin/billing` | `usage_records` etc. | K |
| Accounts | Tickets | Support queue | `/admin/tickets` | `support_tickets` | K |
| Operations | Agents | Agent roster | `/admin/agents` | `user_roles` | K |
| Operations | Users | Portal access | `/admin/users` | `profiles`, `user_roles` | K |
| Operations | Mission Control | AI agents | `/admin/mission-control` | `mission_control_*` | K |
| Fulfillment | Fulfillment Intake | Onboarding queue | `/admin/fulfillment-intake` | `internal_fulfillment_*` | K |
| WL Operations | WL Partners | Partner directory | `/admin/partners` | `white_label_partners` | R (was "Partners") |
| WL Operations | WL Portals | Portal directory | `/admin/wl-portals` | `white_label_clients` | K |
| WL Operations | WL Health | Diagnostics | `/admin/wl-health` | health checks | K |
| WL Operations | WL Leak Audit | Tenancy audit | `/admin/wl-leak-audit` | audit | K |
| WL Operations | WL Config Diff | Per-partner module diff | `/admin/wl-config-diff` | `wlModuleVisibility` | K (fix import) |
| WL Operations | ~~WL Preview~~ | Bare entry | `/admin/wl-preview` | n/a | X (remove from nav; route requires `:partnerId`) |
| Campaign OS | Overview | Tenant picker | `/admin/campaign-os` | tenants | K |
| Campaign OS | Departments | Per-tenant departments | `/admin/campaign-os/departments` | `client_departments` | K (add edit/archive) |
| Campaign OS | Fields | Field groups + fields | `/admin/campaign-os/fields` | `campaign_fields` | K (wire upsert) |
| Campaign OS | FAQs | Effective FAQ merge | `/admin/campaign-os/faqs` | `campaign_faq_entries` | K (add update/approve/delete) |
| Campaign OS | Policies | Effective policy merge | `/admin/campaign-os/policies` | `campaign_policy_blocks` | K (add update/approve/delete) |
| Campaign OS | Five9 | Mappings + Std 12 | `/admin/campaign-os/five9` | `five9_variable_mappings` | K |
| Campaign OS | Defaults | Per-type defaults | `/admin/campaign-os/defaults` | `campaign_department_type_defaults` | K |
| Campaign OS | Drafts Review | Supervisor-submitted drafts | `/admin/campaign-os/drafts` | `campaign_faq_entries` + policies status=draft | N (closes Phase 3 loop) |
| Affiliates | Affiliates | Affiliate program | `/admin/affiliates` | `affiliates`, `affiliate_referrals` | N (split from Partners) |
| Growth | Growth Hub | 7-tool suite | `/admin/growth-hub/*` | growth tables | K |
| Growth | Blog | Blog CMS | `/admin/blog` | `blog_posts` | K |
| Growth | Keywords | Keyword tracker | `/admin/keywords` | `keyword_tracker` | K |
| Growth | Discoverability | SEO/AEO/GEO ops | `/admin/discoverability` | `disc_*` | K |
| Insights | Analytics | Cross-domain | `/admin/analytics` | many | K |
| Insights | Audit Log | Activity stream | `/admin/audit-log` | `audit_log` | K |
| Insights | Launch Checklist | Pre-launch diag | `/admin/launch-checklist` | diagnostics | K |
| System | Launch Controls | Feature gates | `/admin/launch-controls` | `admin_settings` | K |
| System | Settings | Global settings | `/admin/settings` | `admin_settings` | K |
| System | Architecture | Build map | `/admin/architecture` | docs | K (docs surface) |
| System | Outline | Build outline | `/admin/outline` | docs | K (docs surface) |
| System | Email Preview | Template harness | `/admin/email-preview` | `admin_email_*` | K |
| System | Support | Internal support | `/admin/support` | `support_tickets` | K |

### 3.2 Supervisor

> **Campaign OS scope (P0-2 lock):** Supervisor visibility in Campaign OS is **admin-equivalent by design** — no per-supervisor tenant scoping is implied or enforced. This is intentional, not an oversight: there is no `supervisor_tenant_assignments` table in the schema today, and any narrower scoping would either be fabricated or lock supervisors out entirely. A real fix is tracked as a P1 follow-up in `.lovable/stabilization-backlog.md` ("Implement true supervisor Campaign OS scoping"). Until that lands, the short-circuit in `src/lib/campaign-os/tenancy.ts` `tenantWhere` is the **intended** behavior.

| Section | Item | Route | Status |
|---|---|---|---|
| Dashboard | Dashboard | `/staff/supervisor` | K |
| Dashboard | Workspace | `/staff/supervisor/workspace` | K (admin-equivalent scope per P0-2) |
| Operations | Agents | `/staff/supervisor/agents` | K |
| Operations | Schedule | `/staff/supervisor/schedule` | K |
| Operations | Tasks | `/staff/supervisor/tasks` | K |
| Operations | Outbound Calls | `/staff/supervisor/outbound-calls` | K |
| Operations | Messages | `/staff/supervisor/messages` | K |
| Quality | Shift Reviews | `/staff/supervisor/shift-reviews` | K |
| Quality | Script Reviews | `/staff/supervisor/script-reviews` | K |
| Quality | Performance | `/staff/supervisor/performance` | K |
| Tickets | Tickets | `/staff/supervisor/tickets` | K |
| Tickets | Escalations | `/staff/supervisor/escalations` | K |
| Onboarding | Agent Onboarding | `/staff/supervisor/agent-onboarding` | K |
| Onboarding | Client Assignments | `/staff/supervisor/client-assignments` | K |
| Onboarding | Fulfillment | `/staff/supervisor/fulfillment` | K |
| Campaign OS | Drafts Review | `/staff/supervisor/campaign-drafts` | N (mirrors admin queue) |
| System | Settings | `/staff/supervisor/settings` | K |
| System | Support | `/staff/supervisor/support` | K |

### 3.3 Agent

| Section | Item | Route | Status |
|---|---|---|---|
| Dashboard | Dashboard | `/staff/agent` | K |
| Dashboard | Workspace | `/staff/agent/workspace` | K |
| My Work | My Clients | `/staff/agent/clients` | K (fix query to use assignments) |
| My Work | Call Logs | `/staff/agent/call-logs` | K |
| My Work | Scripts | `/staff/agent/scripts` | K (legacy) |
| My Work | Tasks | `/staff/agent/tasks` | K |
| My Work | Tickets | `/staff/agent/tickets` | K |
| My Work | Outbound | `/staff/agent/outbound-calls` | K |
| My Work | Messages | `/staff/agent/messages` | K |
| Time | Shifts | `/staff/agent/shifts` | K |
| Time | Schedule | `/staff/agent/schedule` | K |
| Time | Time Off | `/staff/agent/time-off` | K |
| Me | Onboarding | `/staff/agent/onboarding` | K |
| Me | My Profile | `/staff/agent/profile` | K |
| Me | Settings | `/staff/agent/settings` | K |
| Me | Support | `/staff/agent/support` | K |
| ~~Campaigns~~ | ~~Campaigns~~ | `/staff/agent/campaigns` | H (route kept, nav removed) |

### 3.4 Direct Client

| Section | Item | Route | Status |
|---|---|---|---|
| Home | Dashboard | `/client-dashboard` | K (remove hardcoded deltas) |
| Service | Calls | `/client-dashboard/calls` | K |
| Service | Scripts | `/client-dashboard/scripts` | K (legacy) |
| Service | Schedule | `/client-dashboard/schedule` | K |
| Service | Outbound Requests | `/client-dashboard/outbound-requests` | K |
| Account | Billing | `/client-dashboard/billing` | K |
| Account | Referrals | `/client-dashboard/referrals` | K |
| Account | Support | `/client-dashboard/support` | K |
| Account | Settings | `/client-dashboard/settings` | K |
| ~~Campaigns~~ | ~~Campaigns~~ | `/client-dashboard/campaigns` | H |

### 3.5 White-Label Partner

| Section | Item | Route | Status |
|---|---|---|---|
| Home | Overview | `/white-label-dashboard` | K (remove hardcoded "+2") |
| Pipeline | Leads | `/white-label-dashboard/leads` | K |
| Pipeline | Pipeline | `/white-label-dashboard/pipeline` | K |
| Pipeline | Proposals | `/white-label-dashboard/proposals` | K |
| Clients | Clients | `/white-label-dashboard/clients` | K |
| Clients | Onboarding | `/white-label-dashboard/onboarding` | K |
| Clients | Usage | `/white-label-dashboard/usage` | K |
| Operations | Outbound Campaigns | `/white-label-dashboard/campaigns` | R (was "Campaigns") |
| Operations | Knowledge Base | `/white-label-dashboard/knowledge-base` | K |
| Operations | Client Tickets | `/white-label-dashboard/client-tickets` | K |
| Brand | Branding | `/white-label-dashboard/branding` | K |
| Brand | Custom Domain | `/white-label-dashboard/custom-domain` | K |
| Brand | Agreements | `/white-label-dashboard/agreements` | K |
| Money | Billing | `/white-label-dashboard/billing` | K |
| Money | Pricing | `/white-label-dashboard/pricing` | K |
| Growth | Growth Hub | `/white-label-dashboard/growth-hub/*` | K |
| Account | Settings | `/white-label-dashboard/settings` | K |
| Account | Support | `/white-label-dashboard/support` | K |
| ~~Campaign OS~~ | ~~Campaign OS~~ | `/white-label-dashboard/campaign-os` | H |
| ~~Tasks~~ | ~~Tasks~~ | (no route) | X (delete orphan file) |

### 3.6 White-Label End-Client (`/portal/:slug/*`)

All entries module-gated. Status K for everything; nav order rationalized:

Dashboard · Activity · Calls · Leads · Reviews · Campaigns · Schedule · Outbound Requests · Scripts · Billing · Support · Settings.

---

## 4. Route-to-flow mapping table

Every route from the audit. Disposition is decisive.

### 4.1 Public marketing (grouped — disposition K)

All routes in `PublicRoutes.tsx` (~80): home, industries (15), capabilities, guides (20), blog index + slug, locations (~600 dynamic), legal (privacy/terms/cookies), `/cost-calculator`, `/launch-estimator`, `/get-started`, `/gpt-advisor`, `/hybrid-receptionist` (gated), `/ai-receptionist` (gated), `/join-us`, `/contact`, `/about`, `/services/*`, `/widget/v1`, `/p/:token`, `/c/:token`. **Status:** functional. **Disposition:** K all. Out of realignment scope.

### 4.2 Admin (`/admin/*`)

| Route | Current label | Domain | User goal | Status | Disposition | Reason |
|---|---|---|---|---|---|---|
| `/admin` | Overview | Admin & System | Daily snapshot | functional | K | Fix Total Clients query (P0) |
| `/admin/leads` | Leads | CRM & Revenue | Work pipeline | functional | K | — |
| `/admin/leads/:id` | Lead Detail | CRM & Revenue | Action a lead | functional | K | — |
| `/admin/crm` | CRM | CRM & Revenue | Tasks + messages + mappings | functional | K | — |
| `/admin/outbound-calls` | Outbound Calls | CRM & Revenue | Sales outbound | functional | K | — |
| `/admin/clients` | Client Management | Live Operations | Active accounts | functional | R → "Active Accounts" | Reads `leads` not `clients`; label misleading |
| `/admin/billing` | Billing | Billing | Invoices + plans | functional | K | — |
| `/admin/tickets` | Tickets | Support | Ticket queue | functional | K | — |
| `/admin/tickets/:id` | Ticket Detail | Support | Work a ticket | functional | K | — |
| `/admin/agents` | Agents | Live Operations | Agent roster | functional | K | — |
| `/admin/users` | Users | Admin & System | Portal access | functional | K | — |
| `/admin/mission-control` | Mission Control | Admin & System | AI governance | functional | K | — |
| `/admin/fulfillment-intake` | Fulfillment Intake | Onboarding | Onboarding queue | functional | K | — |
| `/admin/fulfillment-intake/:id` | Intake Detail | Onboarding | Action intake | functional | K | — |
| `/admin/partners` | Partners | WL Ops | Partner directory | functional | R + M-out → "WL Partners"; split affiliates to `/admin/affiliates` | Partners + affiliates fused; cognitive overload |
| `/admin/partners/:id` | Partner Detail | WL Ops | Manage partner | functional | K (under "WL Partners") | — |
| `/admin/wl-portals` | WL Portals | WL Ops | Portal directory | functional | K | — |
| `/admin/wl-health` | WL Health | WL Ops | Diagnostic | functional | K | — |
| `/admin/wl-leak-audit` | WL Leak Audit | WL Ops | Tenancy audit | functional | K | — |
| `/admin/wl-config-diff` | WL Config Diff | WL Ops | Per-partner config diff | functional | K | Fix ALL_MODULES import (P1) |
| `/admin/wl-preview/:partnerId` | WL Preview | WL Ops | Preview partner UI | functional | K | — |
| `/admin/wl-preview` (bare) | WL Preview | WL Ops | n/a | broken | X (nav only) | Bare path 404s; route requires id |
| `/admin/campaign-os` | Campaign OS | Campaign OS | Tenant picker | functional | K | — |
| `/admin/campaign-os/departments` | Departments | Campaign OS | CRUD departments | partial (no edit/archive) | K + close loop | P0 |
| `/admin/campaign-os/fields` | Fields | Campaign OS | Manage fields | partial (read-only) | K + wire upsert | P0 |
| `/admin/campaign-os/faqs` | FAQs | Campaign OS | Manage FAQs | partial (no update/approve/delete) | K + close loop | P0 |
| `/admin/campaign-os/policies` | Policies | Campaign OS | Manage policies | partial (no update/approve/delete) | K + close loop | P0 |
| `/admin/campaign-os/five9` | Five9 | Campaign OS | Mappings + Std 12 | functional | K | — |
| `/admin/campaign-os/defaults` | Defaults | Campaign OS | Per-type defaults | functional | K | Structured editor follow-up |
| (new) `/admin/campaign-os/drafts` | Drafts Review | Campaign OS | Approve supervisor drafts | n/a | N | Closes Phase 3 loop |
| (new) `/admin/affiliates` | Affiliates | Admin & System | Affiliate ops | n/a | N | Split from Partners |
| `/admin/growth-hub` (+sub) | Growth Hub | Admin & System | Marketing suite | functional | K | — |
| `/admin/blog` | Blog | Admin & System | Blog CMS | functional | K | — |
| `/admin/blog/:id` | Blog Editor | Admin & System | Edit post | functional | K | — |
| `/admin/keywords` | Keywords | Admin & System | Keyword tracker | functional | K | — |
| `/admin/discoverability` (+10 sub) | Discoverability | Admin & System | SEO/AEO/GEO | functional | K | — |
| `/admin/analytics` | Analytics | Admin & System | Cross-domain | functional | K | — |
| `/admin/audit-log` | Audit Log | Admin & System | Activity | functional | K | — |
| `/admin/launch-checklist` | Launch Checklist | Admin & System | Pre-launch diag | functional | K | — |
| `/admin/launch-controls` | Launch Controls | Admin & System | Feature gates | functional | K | — |
| `/admin/settings` | Settings | Admin & System | Global settings | functional | K | — |
| `/admin/architecture` | Architecture | Admin & System | Build map | docs | K | — |
| `/admin/outline` | Outline | Admin & System | Build outline | docs | K | — |
| `/admin/email-preview` | Email Preview | Admin & System | Template harness | functional | K | — |
| `/admin/support` | Support | Admin & System | Internal support | functional | K | — |

### 4.3 Staff — Sales (`/staff/sales/*`)

All routes K. Sales-specific CRM ops (leads, pipeline, proposals, meetings, performance, settings, support). No realignment changes.

### 4.4 Staff — Supervisor (`/staff/supervisor/*`)

| Route | Status | Disposition | Reason |
|---|---|---|---|
| `/staff/supervisor` | functional | K | — |
| `/staff/supervisor/workspace` | partial | K | Fix Campaigns mode scoping (P0) |
| `/staff/supervisor/agents` | functional | K | — |
| `/staff/supervisor/tasks` | functional | K | — |
| `/staff/supervisor/schedule` | functional | K | — |
| `/staff/supervisor/messages` | functional | K | — |
| `/staff/supervisor/outbound-calls` | functional | K | — |
| `/staff/supervisor/tickets(+/:id)` | functional | K | — |
| `/staff/supervisor/escalations` | functional | K | — |
| `/staff/supervisor/shift-reviews` | functional | K | — |
| `/staff/supervisor/script-reviews` | functional | K | Legacy `client_scripts` |
| `/staff/supervisor/agent-onboarding` | functional | K | — |
| `/staff/supervisor/client-assignments` | functional | K | — |
| `/staff/supervisor/performance` | functional | K | — |
| `/staff/supervisor/fulfillment(+/:id)` | functional | K | — |
| `/staff/supervisor/settings` | functional | K | — |
| `/staff/supervisor/support` | functional | K | — |
| (new) `/staff/supervisor/campaign-drafts` | n/a | N | Closes draft loop on supervisor side |

### 4.5 Staff — Agent (`/staff/agent/*`)

| Route | Status | Disposition | Reason |
|---|---|---|---|
| `/staff/agent` | functional | K | — |
| `/staff/agent/workspace` | functional | K | — |
| `/staff/agent/clients` | partial (wrong query) | K + fix | Use `client_agent_assignments` (P0) |
| `/staff/agent/call-logs` | functional | K | — |
| `/staff/agent/scripts` | functional (legacy) | K | Legacy until Phase 4 |
| `/staff/agent/tasks` | functional | K | — |
| `/staff/agent/tickets(+/:id)` | functional | K | — |
| `/staff/agent/outbound-calls` | functional | K | — |
| `/staff/agent/messages` | functional | K | — |
| `/staff/agent/shifts` | functional | K | — |
| `/staff/agent/schedule` | functional | K | — |
| `/staff/agent/time-off` | functional | K | — |
| `/staff/agent/onboarding` | functional | K | — |
| `/staff/agent/profile` | functional | K | — |
| `/staff/agent/settings` | functional | K | — |
| `/staff/agent/support` | functional | K | — |
| `/staff/agent/campaigns` | placeholder | H | Route kept for deep links; nav removed (P0) |

### 4.6 Staff — Billing / Tech / HR / Affiliate

All routes in `/staff/billing/*`, `/staff/tech/*`, `/hr-portal/*`, `/affiliate/*` — disposition K. Workflows complete; not part of realignment beyond the affiliate split surfacing them in Admin (`/admin/affiliates`) too.

### 4.7 Direct Client (`/client-dashboard/*`)

| Route | Status | Disposition | Reason |
|---|---|---|---|
| `/client-dashboard` | functional (mock deltas) | K + fix | Remove hardcoded trend deltas (P1) |
| `/client-dashboard/calls` | functional | K | — |
| `/client-dashboard/scripts` | functional | K | Legacy |
| `/client-dashboard/schedule` | functional | K | — |
| `/client-dashboard/outbound-requests` | functional | K | — |
| `/client-dashboard/billing` | functional | K | — |
| `/client-dashboard/referrals` | functional | K | — |
| `/client-dashboard/support` | functional | K | — |
| `/client-dashboard/settings` | functional | K | — |
| `/client-dashboard/campaigns` | placeholder | H | Route kept; nav removed (P0) |

### 4.8 White-Label Partner (`/white-label-dashboard/*`)

| Route | Status | Disposition | Reason |
|---|---|---|---|
| `/white-label-dashboard` | functional (one mock) | K + fix | Remove "+2 this month" hardcode (P1) |
| `/white-label-dashboard/clients` | functional | K | — |
| `/white-label-dashboard/leads` | functional | K | — |
| `/white-label-dashboard/pipeline` | functional | K | — |
| `/white-label-dashboard/proposals(+new+/:id)` | functional | K | — |
| `/white-label-dashboard/onboarding(+/:id)` | functional | K | — |
| `/white-label-dashboard/usage` | functional | K | — |
| `/white-label-dashboard/client-tickets` | functional | K | — |
| `/white-label-dashboard/knowledge-base` | functional | K | — |
| `/white-label-dashboard/pricing` | functional | K | — |
| `/white-label-dashboard/branding` | functional | K | — |
| `/white-label-dashboard/custom-domain` | functional | K | — |
| `/white-label-dashboard/agreements` | functional | K | — |
| `/white-label-dashboard/growth-hub/*` (7) | functional | K | — |
| `/white-label-dashboard/billing` | functional | K | — |
| `/white-label-dashboard/support` | functional | K | — |
| `/white-label-dashboard/settings` | functional | K | — |
| `/white-label-dashboard/campaigns` | functional | R → "Outbound Campaigns" | Disambiguate from Campaign OS (P1) |
| `/white-label-dashboard/campaign-os` | placeholder | H | Route kept; nav removed (P0) |
| `Tasks.tsx` (no route) | orphan | X | Delete or route (P1) |

### 4.9 WL End-Client (`/portal/:slug/*` + partner hostname)

All 13 routes K. Module-gated via `wlModuleVisibility`. No realignment changes; intentionally no Campaign OS surface.

### 4.10 Embedded

| Route | Status | Disposition |
|---|---|---|
| `/widget/v1` | functional | K |
| `/p/:token` | functional | K |
| `/c/:token` | functional | K |

---

## 5. Core entity workflow map

| # | Entity | Owning persona | Read scope | Write scope | Routes | Related | Lifecycle | Lifecycle gap |
|---|---|---|---|---|---|---|---|---|
| 1 | Leads | Admin/Sales | Admin, Sales, Supervisor (read) | Admin, Sales | `/admin/leads*`, `/staff/sales/*`, `/admin/clients` | crm_tasks, billing_summaries, proposals | new → contacted → qualified → won/lost → active → churned | "Convert" is implicit (pipeline_stage flip); no atomic action |
| 2 | Direct Clients | Admin | Admin, Agent (assigned), Supervisor | Admin (via leads) | `/admin/clients`, `/client-dashboard/*` | client_agent_assignments, client_scripts, usage_records | onboarding → active → churned | No `clients` table — overloaded `leads`. Naming mismatch. |
| 3 | WL Partners | WL Partner / Admin | Admin, Partner (own) | Admin, Partner (own scope) | `/admin/partners*`, `/white-label-dashboard/*` | white_label_clients, branding, domains | new → onboarding → active → suspended | Multi-partner-per-user not supported |
| 4 | WL End-Clients | WL Partner | Partner, end-client, Admin | Partner | `/white-label-dashboard/clients`, `/portal/:slug/*` | wl_call_logs, wl_invoices | onboarding → active → churned | Identity overlap with direct client unhandled |
| 5 | Contacts | Campaign OS (admin) | Admin (via Campaign OS) | Admin | hook only — no UI | client_departments | n/a | UI not built |
| 6 | Users / Roles | Admin | Admin (full), self (own profile) | Admin | `/admin/users` | profiles, user_roles, app_role | invited → active → suspended | Strong |
| 7 | Agents | Admin / Supervisor | Admin, Supervisor, Agent (own) | Admin, Supervisor | `/admin/agents`, `/staff/supervisor/agents`, `/staff/agent/*` | agent_shifts, agent_skills, agent_banking | applicant → onboarding → active → terminated | Strong |
| 8 | Departments | Campaign OS (admin) | Admin, Supervisor (assigned — broken) | Admin | `/admin/campaign-os/departments` | fields, faqs, policies, five9 | draft → active → archived | No edit/archive UI; supervisor scoping leak |
| 9 | Phone numbers / routing | Campaign OS | Admin | Admin (hook only) | hook only — no UI | client_departments, five9 | n/a | UI not built |
| 10 | Scripts (direct) | Direct Client + Admin | Direct Client, assigned Agent, Admin, Supervisor | Direct Client (with approval), Admin | `/client-dashboard/scripts`, `/staff/agent/scripts`, `/staff/supervisor/script-reviews` | script_change_requests | draft → submitted → approved → active | Legacy. Will be replaced Phase 4. |
| 11 | Scripts (WL) | WL End-Client (read) | End-Client (read), Partner | Partner | `/portal/:slug/scripts` | wl_client_scripts | active only | No CRUD on end-client side; legacy |
| 12 | Scripts (Campaign OS) | n/a | n/a | n/a | n/a | n/a | n/a | **Phase 4 hole** |
| 13 | FAQs | Admin (publish), Supervisor (draft) | Admin, Supervisor (assigned) | Admin (publish), Supervisor (draft) | `/admin/campaign-os/faqs`, supervisor Campaigns | resolver views | draft → approved → archived | No update/approve/delete UI; draft has no destination |
| 14 | Policies | Admin (publish), Supervisor (draft) | same as FAQs | same as FAQs | `/admin/campaign-os/policies`, supervisor Campaigns | resolver views | draft → approved → archived | Same gap as FAQs |
| 15 | Fields / Field groups | Admin | Admin, Supervisor (read) | Admin (mutations exist; UI not wired) | `/admin/campaign-os/fields` | options, visibility, labels | draft → active → archived | UI is read-only |
| 16 | Five9 mappings | Admin | Admin | Admin (via seed/edge) | `/admin/campaign-os/five9` | five9_native_variables | seeded → custom-overridden | Native vars intentionally read-only |
| 17 | Tickets | Originating persona | Routed dept staff, originator, Admin | Same | every persona | ticket_replies, ticket_views | open → assigned → in-progress → resolved → closed | Strong (System v2 in place) |
| 18 | Tasks | Owner persona | Self + universal-mode visible to all in workspace | Same | every persona | task_notes | todo → in_progress → done → archived | WL `Tasks.tsx` orphaned (no route) |
| 19 | Onboarding / Fulfillment | Admin / Supervisor | Admin, Supervisor, target persona | Admin, Supervisor | `/admin/fulfillment-intake`, `/staff/supervisor/fulfillment`, `/white-label-dashboard/onboarding` | client_handoff_*, agent_onboarding | submitted → in-progress → blocked → live | Multiple parallel tracks; immutability triggers in place |
| 20 | Billing records | Admin / Billing | Owner + Admin | Admin, Billing | `/admin/billing`, `/staff/billing/*`, all portal billing pages | usage_records, wl_invoices, payment_failures | draft → finalized → paid → past-due | Strong |
| 21 | Outbound Campaigns (recipient) | WL Partner | Partner, end-client | Partner | `/white-label-dashboard/campaigns`, `/portal/:slug/campaigns` | wl_campaign_recipients, wl_campaign_metrics | draft → active → paused → completed | Naming collision with Campaign OS |
| 22 | Call logs | Live Ops | Owner + Agent + Admin | system (ingest) + Admin (manual import) | every call-log page | call_report_imports | ingested → assigned → reconciled | Strong |

---

## 6. Workflow integrity fixes

Each item: problem · root cause · fix · priority.

1. **Three Campaign OS placeholder pages live in nav.** Users click and see a "Coming in Phase X" card. → Routes registered; nav not gated. → Hide nav entries; keep routes for deep links. → **P0**.
2. **Supervisor sees ALL tenants in Campaign OS.** Workspace Campaigns mode lists every department. → `tenantWhere` short-circuits supervisor. → Add supervisor branch that scopes via assigned tenants (or explicitly delegates to admin scope if business confirms). → **P0**.
3. **Agents see all profiles as "clients".** `AgentClients` query reads `profiles`. → Wrong source. → Join `client_agent_assignments`. → **P0**.
4. **Admin Overview "Total Clients" miscounts.** Shows partners + staff + applicants. → Counts all `profiles`. → Filter `leads` by `pipeline_stage IN ('active','onboarding','ready_for_billing')`. → **P0**.
5. **WL "Campaigns" vs "Campaign OS" indistinguishable.** Two sibling nav items. → Naming collision; both real-looking. → Rename `Campaigns` → `Outbound Campaigns`; hide `Campaign OS` from nav until Phase 7. → **P0** (rename) / **P0** (hide).
6. **Campaign OS authoring loop incomplete.** Admin can create FAQs/Policies/Fields/Departments but cannot update/approve/delete from UI. Supervisor drafts have no destination. → UI not wired to existing mutations + no approval flow. → Add update/approve/delete actions; add Drafts Review queue. → **P0**.
7. **`AdminWLConfigDiff` ALL_MODULES is stale.** Missing `campaigns`. → Hardcoded constant. → Import from `wlModuleVisibility.ts`. → **P1**.
8. **Orphan `WhiteLabelDashboard/Tasks.tsx`.** Not registered. → Component left over. → Delete or route. → **P1**.
9. **Bare `/admin/wl-preview` 404s.** Sidebar lacks `:partnerId`. → Nav malformed. → Remove bare entry; require partner picker. → **P1**.
10. **Admin Partners mixes WL + affiliates.** One page, one table, two domains. → Legacy fusion. → Split into `/admin/partners` (WL only) + `/admin/affiliates`. → **P1**.
11. **Hardcoded trend deltas.** Client + WL dashboards show fake "+12% / +2 this month". → Mock copy. → Either back with prior-period queries or remove. → **P1**.
12. **`AdminClients` "View Billing" goes to lead detail.** Misleading dropdown. → Wrong route. → Route to `/admin/billing?clientId=…`. → **P2**.
13. **Domain naming Lead vs Client.** UI says "Client" everywhere; DB has only `leads`. → Schema overload. → Add `v_clients` view; standardize UI labels. → **P2**.
14. **`HostnameRouter` allows `/admin` on partner host.** Admin staff signing in on a partner hostname see admin routes branded as the partner. → No allowlist. → Document behavior; optionally enforce host allowlist for `/admin` and `/staff`. → **P2**.
15. **`AdminClients.tsx` UI label mismatch.** Heading "Client Management" backed by `leads`. → Naming pass. → Rename heading "Active Accounts". → **P0** (small label fix tied to fix #4 in user perception).

---

## 7. Navigation cleanup decisions

```
HIDE NOW (route stays for deep links, sidebar entry removed):
  - /staff/agent/campaigns
  - /client-dashboard/campaigns
  - /white-label-dashboard/campaign-os
  - /admin/wl-preview (bare path; route /admin/wl-preview/:partnerId stays)

RENAME NOW:
  - WL "Campaigns" → "Outbound Campaigns"
  - Admin "Clients" page heading → "Active Accounts"
  - Admin "Partners" → "WL Partners"

SPLIT:
  - Admin Partners → "WL Partners" + "Affiliates" (new /admin/affiliates)

NEW (close existing loops, not new features):
  - /admin/campaign-os/drafts (admin Drafts Review queue)
  - /staff/supervisor/campaign-drafts (supervisor mirror)
  - /admin/affiliates (split target)

REMOVE (orphan):
  - src/pages/white-label-dashboard/Tasks.tsx (unrouted; delete file)

LEGACY (kept until Phase 4 ships replacement):
  - client_scripts, wl_client_scripts
  - /client-dashboard/scripts, /portal/:slug/scripts, /staff/agent/scripts
  - /staff/supervisor/script-reviews

DEFER (no nav now; revisit at the persona's dedicated phase):
  - Agent Campaign OS surface (Phase 5)
  - Direct-Client Campaign OS surface (Phase 6)
  - WL Partner Campaign OS surface (Phase 7)
  - WL End-Client Campaign OS surface (Phase 8)

SOURCE OF TRUTH (locked — single import; no parallel constants):
  - Tenancy resolution → lib/campaign-os/tenancy.ts + is_tenant_member()
  - WL hostname resolution → lib/wlHostResolver.ts
  - WL module visibility → lib/wlModuleVisibility.ts
  - Roles → app_role enum + user_roles + has_role()
  - Outbound campaigns → wl_client_campaigns (WL scope only)
  - Campaign configuration → client_departments + Campaign OS tables (Phase 3+)
  - IA & user-flow reference → .lovable/product-realignment.md (this file)
  - Pre-Phase-4 cleanup queue → .lovable/stabilization-backlog.md
```

---

## 8. Golden-path workflows

Nine paths the product must support cleanly before adding more scope.

### GP-1 Admin creates and operates a direct client
- **Persona:** Admin · **Start:** `/admin/leads/:id` · **End:** Live, billable client with assigned agents and active scripts.
- **Screens:** Lead Detail → Active Accounts → Agents → Scripts → Billing → Launch Checklist.
- **Entities:** leads, client_agent_assignments, client_scripts, usage_records.
- **Blockers:** No atomic "convert lead → client" action; pipeline_stage flip is implicit; AdminClients heading misleading; AdminOverview metric wrong.
- **Stabilize:** P0 #4 + #15. (Atomic convert action is post-P0.)

### GP-2 Admin / Supervisor authors and approves Campaign OS knowledge
- **Persona:** Admin (publish), Supervisor (draft) · **Start:** `/admin/campaign-os` · **End:** Approved FAQ/Policy visible to runtime resolver.
- **Screens:** Tenant picker → Departments → Fields → FAQs → Policies → Drafts Review.
- **Entities:** Campaign OS tables, resolver views/RPCs.
- **Blockers:** No update/approve/delete UI; supervisor drafts orphaned; supervisor scoping leak.
- **Stabilize:** P0 #2 + #6.

### GP-3 Agent works an assigned shift end-to-end
- **Persona:** Agent · **Start:** `/staff/agent` · **End:** Shift ended with calls + tickets logged.
- **Screens:** Dashboard → Shifts (clock in) → My Clients → Scripts → Call Logs → Tasks → Tickets → Shifts (clock out).
- **Entities:** agent_shifts, client_agent_assignments, call_logs, support_tickets.
- **Blockers:** My Clients lists wrong roster (reads all profiles).
- **Stabilize:** P0 #3.

### GP-4 Direct client self-services scripts / billing / support
- **Persona:** Direct Client · **Start:** `/client-dashboard` · **End:** Script change submitted + invoice paid + ticket filed if needed.
- **Screens:** Dashboard → Scripts → Billing → Support.
- **Entities:** client_scripts, script_change_requests, usage_records, support_tickets.
- **Blockers:** Hardcoded dashboard deltas erode trust; Campaigns nav placeholder.
- **Stabilize:** P0 #1 + P1 #11.

### GP-5 WL partner onboards an end-client
- **Persona:** WL Partner · **Start:** `/white-label-dashboard/clients` · **End:** End-client live in branded portal.
- **Screens:** Clients → Onboarding → Branding → Custom Domain → Portal.
- **Entities:** white_label_clients, white_label_branding, white_label_domain_aliases.
- **Blockers:** None blocking; "Outbound Campaigns" rename clarifies later steps.

### GP-6 WL partner manages branding + billing + outbound campaigns
- **Persona:** WL Partner · **Start:** `/white-label-dashboard` · **End:** Branding tuned, plan correct, campaign live.
- **Screens:** Branding → Pricing → Billing → Outbound Campaigns.
- **Entities:** white_label_branding, wl_wholesale_pricing, wl_invoices, wl_client_campaigns.
- **Blockers:** Campaigns vs Campaign OS naming collision in nav.
- **Stabilize:** P0 #5.

### GP-7 WL end-client uses branded portal
- **Persona:** WL End-Client · **Start:** partner hostname → `/portal/:slug` · **End:** Calls reviewed, invoice paid, support filed.
- **Screens:** Dashboard → Calls → Campaigns → Billing → Support.
- **Entities:** wl_call_logs, wl_campaign_metrics, wl_invoices, support_tickets (masked).
- **Blockers:** None functional; intentional no Campaign OS surface.

### GP-8 Ticket lifecycle
- **Persona:** Originator + routed staff · **Start:** any portal Support page · **End:** Ticket resolved + closed with SLA tracked.
- **Screens:** Support form → routed dept queue → ticket detail → resolve → close.
- **Entities:** support_tickets, ticket_replies, work_queue routing.
- **Blockers:** None (System v2 in place).

### GP-9 Billing lifecycle
- **Persona:** Admin/Billing + Client/Partner · **Start:** plan selection · **End:** Invoice paid; usage metered; commissions/payroll posted.
- **Screens:** PlanSelectorDialog → Stripe → Billing dashboards → Dunning.
- **Entities:** custom_plans, usage_records, wl_invoices, payment_failures, sales_commissions, shift_invoices.
- **Blockers:** AdminClients "View Billing" dropdown lands on wrong page (cosmetic).
- **Stabilize:** P2 #12.

---

## 9. Final realignment output

### A. Final recommended top-level product map

```
                           24H VIRTUAL PLATFORM
                                    |
        +----------------+----------+-----------+----------------+
        |                |                      |                |
   PUBLIC MARKETING   DASHBOARD WORKSPACES  EMBEDDED         PLATFORM CORE
   (~80 routes)       (six personas)        (widget,         (auth, RLS,
                            |                proposal,        roles, audit,
                            |                script-form)     mission ctrl)
                            |
   +----------+----------+--+--------+----------+-------------+----------+
   |          |          |           |          |             |          |
  CRM &     ONBOARD &   LIVE       CAMPAIGN    BILLING &     SUPPORT &  WL
  REVENUE   FULFILLMENT  OPS         OS         FINANCE      TICKETS    OPS
   |          |          |           |          |             |          |
  Leads     Intake     Calls       Departments Invoices     Tickets    Partners
  CRM       Handoff    Tickets     Fields     Plans         Replies    Branding
  Sales     Templates  Shifts      FAQs       Usage         Routing    Domains
  Outbound  Live-go    Outbound    Policies   Payroll       SLA        Portals
  Pipeline  Checklist  Messages    Five9      Commissions   Dept       End-clts
                       Schedule    Defaults                  isolation Outbound
                                   Scripts(Ph4)                         Campaigns
                                                                        Growth Hub
                                          ADMIN & SYSTEM
                                          (cross-cutting)
                                          Users · Roles · Audit
                                          Mission Control · Settings
                                          Discoverability · Blog
                                          Affiliates · Email Preview
                                          Launch Controls/Checklist
```

### B. Final recommended nav per persona

**Admin / SuperAdmin**
```
Overview
Sales              · Leads · CRM · Outbound Calls
Accounts           · Active Accounts · Billing · Tickets
Operations         · Agents · Users · Mission Control
Fulfillment        · Fulfillment Intake
WL Operations      · WL Partners · WL Portals · WL Health · WL Leak Audit · WL Config Diff
Campaign OS        · Overview · Departments · Fields · FAQs · Policies · Five9 · Defaults · Drafts Review
Affiliates         · Affiliates
Growth             · Growth Hub · Blog · Keywords · Discoverability
Insights           · Analytics · Audit Log · Launch Checklist
System             · Launch Controls · Settings · Architecture · Outline · Email Preview · Support
```

**Supervisor**
```
Dashboard          · Dashboard · Workspace
Operations         · Agents · Schedule · Tasks · Outbound Calls · Messages
Quality            · Shift Reviews · Script Reviews · Performance
Tickets            · Tickets · Escalations
Onboarding         · Agent Onboarding · Client Assignments · Fulfillment
Campaign OS        · Drafts Review
System             · Settings · Support
```

**Agent**
```
Dashboard          · Dashboard · Workspace
My Work            · My Clients · Call Logs · Scripts · Tasks · Tickets · Outbound · Messages
Time               · Shifts · Schedule · Time Off
Me                 · Onboarding · My Profile · Settings · Support
```

**Direct Client**
```
Home               · Dashboard
Service            · Calls · Scripts · Schedule · Outbound Requests
Account            · Billing · Referrals · Support · Settings
```

**White-Label Partner**
```
Home               · Overview
Pipeline           · Leads · Pipeline · Proposals
Clients            · Clients · Onboarding · Usage
Operations         · Outbound Campaigns · Knowledge Base · Client Tickets
Brand              · Branding · Custom Domain · Agreements
Money              · Billing · Pricing
Growth             · Growth Hub
Account            · Settings · Support
```

**White-Label End-Client (`/portal/:slug/*`)**
```
Dashboard
Activity · Calls · Leads · Reviews · Campaigns
Schedule · Outbound Requests
Scripts
Billing
Support · Settings
```

(All entries module-gated by `wlModuleVisibility`. Order is rationalized; gates unchanged.)

### C. Stabilization backlog reference + Implementation order

The full prioritized queue lives in `.lovable/stabilization-backlog.md`. P0 is the gate.

**Implementation order (locked):**
1. **P0 stabilization backlog first.** All six P0 items must land before any new domain work.
2. **Then Phase 4 planning.** Phase 4 = Campaign OS script replacement (closes the three-script split). Planning starts only after P0 is cleared and the WL Campaigns naming collision is resolved.
3. **Then later persona expansion for Campaign OS.** Phase 5 (Agent), Phase 6 (Direct Client), Phase 7 (WL Partner), Phase 8 (WL End-Client) — each lands its own persona-scoped surfaces. Placeholder routes stay hidden from nav until their phase ships.

No new feature work jumps the queue. If a request lands that does not fit P0, P1, P2, or one of the above phases, it goes into a separate intake and is not implemented until prioritized against this list.
