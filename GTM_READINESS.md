# GTM Readiness
Last updated: 2026-07-01

## 🔖 CONTEXT FOR NEW CHAT

**Stack:** React + TypeScript + Vite + Supabase + Five9
**Codebase:** `C:\Users\ismar\Downloads\24H Virtual`
**Staging DB:** sdsxdqsomxuimrjpaylv.supabase.co
**Local dev:** localhost:8080
**Developer:** Suman (you are talking to Suman)
**Client:** Paul Joseph (pauljoseph@24hvirtual.com)
**All test passwords:** QATestPass123!

**Last session summary:**
Admin Dashboard fully audited and redesigned across all sections — Accounts (11 tabs), Campaign OS (14 pages), Insights (6 pages), Partners (7 pages), System (9 pages). 50+ missing DB grants fixed. Branding leakage tests passing 12/12. Next: Client Dashboard redesign.

**Key gotchas:**
- `white_label_partners` uses `partner_slug` column (not `portal_slug`)
- `wl_client_tickets` column is `partner_id` not `wl_partner_id`
- `notifications` table columns: `id, user_id, title, message, type, category, is_read, action_url, created_at, metadata`
- Missing grants is a recurring pattern — always run `GRANT SELECT,INSERT,UPDATE,DELETE ON public.<table> TO authenticated` when seeing 403
- `has_role()` function is SECURITY DEFINER — must not be called from client-side RLS loops
- `leads` table uses `pipeline_stage` not `status`
- `campaign_tenant_kind` enum: `direct_24h | wl_partner`
- WL branding — always set `suppressDefaultLogo=true` on DrilldownSidebar in WL contexts to prevent 24H logo leaking
- `call_logs.client_id` is FK to `leads.id` NOT `auth.uid()` — always join through `leads` for client RLS
- NMI: use `customer_vault=add_customer` not `type=add_customer` when adding vault entries
- Five9 v13 renames all pattern params: `skillNamePattern`, `campaignNamePattern`, `dispositionNamePattern`
- Five9 username must be `TechTeam` (no spaces) — confirmed with Five9 support, FIVE9_USERNAME secret updated
- Supabase UPDATE returns `{data: null, error: null}` on RLS block — always add `.select()` and check `data.length === 0`
- `agent_shifts` columns are `clock_in` / `clock_out` (NOT `clock_in_at` / `clock_out_at`)
- `open_shifts.posted_by` is NOT NULL — must always be supplied on INSERT
- All client-side notification inserts require `GRANT INSERT ON notifications TO authenticated`

**When starting new chat say:**
> "Continue 24H Virtual project. I am Suman. Read GTM_READINESS.md for full context. All passwords: QATestPass123!"

---

## ✅ COMPLETED

| Task | Proof |
|------|-------|
| T-2: Admin cannot read WL private conversations | t2-rls-proof.spec.ts 9/9 |
| T-3/T-4: update-ticket-status dispatcher | Deployed + tested |
| wl_wordpress_connections RLS enabled | Migration applied |
| WL login redirect fix | LoginForm.tsx fixed |
| Staging environment setup | 234 tables, 524 policies |
| Seed script | 14 test users + 2 WL partners |
| Flow 1: Direct ticket lifecycle | flow1-direct-ticket.spec.ts 5/5 |
| Flow 2: WL ticket lifecycle | flow2-wl-ticket.spec.ts 5/5 |
| Flow 3: WL→24H escalation | flow3-wl-forward.spec.ts 5/5 |
| Flow 4: Direct client feedback | flow4-direct-feedback.spec.ts 5/5 |
| Flow 5: WL partner feedback | flow5-wl-feedback.spec.ts 5/5 |
| Flow 6: Partner team membership | flow6-partner-team.spec.ts 5/5 |
| service_role DB permissions | migration 20260522000001 |
| Fix wl_pm_select_team infinite recursion RLS bug | migration 20260522000002 |
| Add invited_email to wl_partner_members | migration 20260523000001 |
| Allow null user_id for pending invites | migration 20260523000002 |
| Add pending status to wl_partner_members | migration 20260523000003 |
| WL branding leakage tests | branding-leakage.spec.ts 12/12 |
| WhiteLabelHeader + Sidebar 24H logo leak fixed | WhiteLabelHeader.tsx + WhiteLabelSidebar.tsx |
| Notification RLS isolation | t2-rls-proof.spec.ts 19/19 |
| Notification fan-out tests | notification-bell.spec.ts 5/5 |
| T-7: WL end-client notification bell | NotificationBell wired in WhiteLabelHeader |
| T-8: Legacy column retirement | No orphaned columns found — nothing to retire |
| notifications GRANT UPDATE/SELECT to authenticated | Applied in staging |
| wl_partner_members INSERT RLS policy | wl_pm_insert_own_partner policy created |
| T-6: Shared TicketThread component | TicketThread.tsx + flow7-ticket-thread.spec.ts 5/5 |
| update-ticket-status client post_message fix | isClient + isWhiteLabel guards, SERVICE_ROLE_JWT + ANON_KEY_JWT secrets, removed is_escalated_to_24h from support_tickets select |
| Client mobile nav Support + Feedback links | DashboardMobileNav.tsx fixed |
| Client support detail route | src/pages/client-dashboard/SupportDetail.tsx + ClientRoutes.tsx |
| WL partner-client onboarding flow | ClientDetail.tsx, invite-wl-client edge fn, pending_setup status, race condition fix, send-wl-ticket-notification email fix |
| flow8-wl-client-onboarding tests | flow8-wl-client-onboarding.spec.ts 5/5 |
| Client onboarding activation side effects | Welcome email + handoff sync on activated status, green banner in AdminFulfillmentIntakeDetail, client_lead_id guard fix |
| DashboardOnboarding modal persistence fix | useEffect pattern in WhiteLabelDashboard.tsx + Dashboard.tsx, profiles GRANT applied |
| flow9-onboarding-modal tests | flow9-onboarding-modal.spec.ts 4/4 |
| Tracking pixels suppressed on WL routes | TrackingPixels.tsx — GA4 + Meta suppressed on /wl-portal/*, /white-label-dashboard/*, /c/* |
| index.html branding neutralized | Title, OG tags, author, canonical cleared — no 24H leakage on WL routes |
| BL-09 through BL-12 branding tests | branding-leakage.spec.ts 12/12 |
| WL Partner Onboarding submission UX | Success banner, activity log, query invalidation — WLSubmitToFulfillmentCard + useWLFulfillmentSubmit |
| WL dashboard SEO suppressBranding | 8 WL dashboard pages suppress 24H branding in title/OG tags |
| flow10-wl-partner-onboarding tests | flow10-wl-partner-onboarding.spec.ts 4/4 |
| Agent training checklist self-service | TrainingAssignment canCheck prop, agent-side checklist in AgentOnboarding.tsx with supervisor notification |
| flow11-agent-onboarding tests | flow11-agent-onboarding.spec.ts 4/4 |
| Five9 password security fix | Removed from SELECT * queries, never pre-populated in UI, conditional write-only, security note added |
| flow11b-provisioning-security tests | flow11b-provisioning-security.spec.ts 3/3 |
| Onboarding templates connected to agent_onboarding | Template selector in SendOfferDialog, onboarding_template_id written on INSERT, steps preview shown |
| flow11c-onboarding-template tests | flow11c-onboarding-template.spec.ts 3/3 |
| Agent onboarding dual completion path fixed | Single path to completed: HR sign-off → activation_in_progress → Slack channels assigned → completed |
| Duplicate agent_onboarding records prevented | Two-layer guard: filtered dropdown + pre-INSERT duplicate check |
| live_training_scheduled_at now writable | datetime-local input with Schedule/Edit/Cancel + audit log |
| Five9 drift remediation | Type/kind mismatch details shown, + Add button for missing_in_os items, Acknowledge all button |
| flow12-five9-drift tests | flow12-five9-drift.spec.ts 3/3 |
| Five9 drift → add to mappings fix | tenant_kind (direct_24h/wl_partner), data_type (text), five9_variable_kind (custom) constraint fixes in CampaignOsFive9.tsx |
| Nav restructure — all dashboards | Supabase-style rail, hierarchical URLs (WL/Client/HR), PiP consolidated, Tasks wired, 30+ legacy redirects |
| WL client portal login fix | clientLoading race condition, partner_slug fix, RLS slug policy |
| Preview client portal button | partner_slug column fix, /login suffix, opens correct page |
| AuthContext affiliates 403 fix | fetchRoles returns AppRole[], affiliates only queried for affiliate role users |
| System 1 — Lead capture & routing | Auto-assignment trigger, sales rep notification, AddLeadDialog, LiveChatWidget captureLead migration, unique email index, missing grants fixed |
| System 2 — Sales CRM & pipeline | SalesLeads status→pipeline_stage fix, ALLOWED_TRANSITIONS rules, LeadPipelineBoard shared component, Admin CRM Pipeline tab |
| Manual testing session | Fixed RLS recursion in has_role(), sales role leads policies, supervisor profiles policy, notification bell count fix, WL ticket reply UI, ScrollArea height fix, agent onboarding FK join fix |
| System 9 — Client account setup wizard | Structured intake wizard for new clients post-activation; campaign + department pre-seeding | flow15-client-setup.spec.ts |
| System 11A — Script management | Campaign script documents, node graph JSONB editor, published version snapshots | flow16a-script-management.spec.ts |
| System 11B — FAQ management | FAQ entries with scope hierarchy, draft/approved/archived lifecycle, bulk approve | flow16b-faq-management.spec.ts |
| System 11C — Policy management | Policy blocks with policy_kind, draft/approved/archived lifecycle, client preview | flow16c-policy-management.spec.ts |
| System 11D — Change requests | Client-initiated script change requests, admin approval workflow, version diff | flow16d-change-requests.spec.ts |
| System 12 — QA & go-live checklist | Snapshot triggers, regression notifier, client confirm, supervisor approve, admin readiness dashboard | flow18-qa-checklist.spec.ts |
| System 26 — Usage reconciliation | Variance queue on billing edge function, admin review UI, approval/override actions | flow19-usage-reconciliation.spec.ts |
| Sales portal — proposals page | /staff/sales/proposals built out with pipeline integration | Playwright visual check |
| Sales portal — meetings page | /staff/sales/meetings built out with calendar view | Playwright visual check |
| Sales portal — performance page | /staff/sales/performance built out with rep metrics | Playwright visual check |
| WL portal — outbound requests page | /portal/:slug/outbound-requests built with form + status tracking | Playwright visual check |
| WL portal — activity page | /portal/:slug/activity built with call/ticket activity feed | Playwright visual check |
| WL portal — reviews page | /portal/:slug/reviews built with rating + review display | Playwright visual check |
| WL portal branding — favicon + logo | suppressDefaultLogo added to WLPortalSidebar; qa-test-agency branding seeded in DB | WLPortalSidebar.tsx |
| WL branding flash fix | DrilldownSidebar logoLoading shimmer; RAIL BrandHeader now forwards suppressDefaultLogo | DrilldownSidebar.tsx + WhiteLabelSidebar.tsx + WhiteLabelHeader.tsx |
| Billing.tsx crash fix (reseller tier) | Added reseller to tierDetails map; nullish coalescing fallback for unknown tiers | Billing.tsx |
| Vite allowedHosts for ngrok | allowedHosts: true in vite.config.ts server block | vite.config.ts |
| CLAUDE.md updated | Canonical Campaign OS path, suppressDefaultLogo gotcha, test user list, architecture docs | CLAUDE.md |
| GitHub Actions CI | 4 secrets added, CI pipeline green | .github/workflows/ |
| Admin branding edit UI | 8th tab on AdminPartnerDetail — view + edit WL branding, RLS fix, login preview mockup | AdminPartnerBrandingTab.tsx |
| [object Object] UUID error on WL dashboard | Inline corsHeaders in escalate-feedback + escalate-wl-ticket, defensive string coercion, calculate-wl-usage reads both partner_id and partnerId | escalate-feedback/index.ts, escalate-wl-ticket/index.ts |
| Call logs grants fix | GRANT SELECT,INSERT,UPDATE,DELETE on call_logs + wl_call_logs | migration applied |
| Client creation flow fix | invite-user now links lead.user_id + handoff.client_user_id | flow21 4/4 |
| Full client creation E2E | Lead → Convert → Invite → Login → Wizard all working | flow21 4/4 |
| Go-live demo data | 3 campaigns seeded with mixed gate states for Paul demo | staging DB |
| System 4 — Activation → NMI charge | applyClientActivationEffects wired to nmi-charge | NMI sandbox |
| System 10 — Five9 campaign mapping validation | Campaign Link tab, five9_ok gate, live API | flow22-five9-campaign-mapping.spec.ts 7/7 |
| System 27 — Direct billing (NMI) | nmi-charge wired in run-call-billing, billing_summaries.payment_status | NMI sandbox |
| Five9 API connection | Admin API v13 connected — 80 users, 201 campaigns, 172 skills, 1922 dispositions | five9-proxy deployed |
| Five9 Hybrid Part A | Reporting API actions, pull-five9-call-report edge function, Pull button on billing page | flow23 7/7 |
| Five9 Hybrid Part B | v_client_call_summary view, per-client call report page, charts | flow24 10/10 |
| Five9 Hybrid Part C | CSV/XLSX/PDF exports — admin + client side | flow28 6/6 |
| NMI payment integration | nmi-vault-add, nmi-charge, nmi-card-update, admin UI, client billing page | flow25 4/4, flow26 5/5 |
| NMI webhook | Async transaction confirmation, decline recovery, idempotent | flow29 7/7 |
| NMI monthly auto-scheduler | pg_cron registered, runs 1st of month 6am UTC, triggered_by tracking | active |
| NMI test page | /admin/nmi-test sandbox demo page | deployed |
| Client call reports | /client-dashboard/reports with CSV/XLSX/PDF exports, leadId fix, RLS fix | deployed |
| Bookii.io integration | Iframe embed in Admin/Client/Agent/Sales portals, Calendly replaced, webhook handler deployed | bookii-webhook deployed |
| Five9 report retrieval working | runReport + isReportRunning + getReportResultCsv all working, real data confirmed | Shared Reports/Call Log - Sales |
| Five9 username fix | Changed from "Tech Team" (space) to "TechTeam" (no space) per Five9 support | FIVE9_USERNAME secret updated |
| Support requests grants fix | GRANT SELECT,INSERT,UPDATE on support_requests TO authenticated | migration 20260623000005 |
| PiP AI assistant | Rewritten with Anthropic claude-sonnet-4-6, human conversational tone, platform_knowledge seeded | support-assistant deployed |
| Agent Dashboard redesign | Shift clock, glance cards, quick actions, assigned clients, recent activity | AgentDashboard.tsx |
| Agent Training system | campaign_training_assignments table, auto-assign on onboarding/campaign, supervisor signoff flow | flow + migrations |
| Agent Onboarding redesign | Journey timeline, milestone grid, training checklist, status badges | AgentOnboarding.tsx |
| Agent notification badges | All nav items + sub-items badged, badges clear on completion | StaffSidebar.tsx + DrilldownSidebar.tsx |
| Agent Support page redesign | Submit form, my requests list, PiP AI collapsible | StaffSupport.tsx |
| Agent Outbound calls fixes | Atomic claim RPC, RLS fix, dial helper panel, log outcome | OutboundCallQueue.tsx + migration |
| Agent Clients page fix | leadId vs userId bug fixed, auto-refresh, status badges, last call date | AgentClients.tsx |
| Agent Tasks page | Priority badges, mark complete, due date warnings, overdue highlighting | AgentTasks.tsx |
| Agent Notifications page | /staff/agent/notifications, full list, mark read, clear | AgentNotifications.tsx |
| Agent Schedule fixes | Grants on agent_schedules + shift_invoices, date validation, cancel time off | migrations + fixes |
| Agent Messages nav fix | Removed confusing sub-sidebar, Tasks as standalone nav item | staffNav.ts |
| Browser tab titles | All portals show correct portal name (Agent Portal, HR Portal, etc.) | StaffLayout.tsx |
| HR portal separation | Removed from admin sidebar, standalone portal via Dashboard Switcher only | adminNav.ts + HRSidebar.tsx |
| Onboarding walkthrough removal | Removed from all 11 dashboards | DashboardOnboarding.tsx deleted |
| Missing grants sweep | agent_onboarding, agent_schedules, time_off_requests, open_shifts, client_agent_assignments, shift_invoices, support_requests, agent_performance_reviews, agent_banking, campaign_training_* tables | multiple migrations |
| FAQ badge clears on Scripts visit | localStorage timestamp, invalidates on page visit | AgentScripts.tsx |
| Training badge clears on completion | Excludes completed module_ids from urgent count | useTrainingAssignments.ts |
| Supervisor portal — full audit and redesign | All 15 sidebar tabs redesigned: Dashboard, Workspace, Team, Quality, Training, Fulfillment, Comms, Support | SupervisorDashboard.tsx + all tabs |
| Supervisor Agents page | Redesign, agent detail page, RLS fix | SupervisorAgents.tsx + SupervisorAgentDetail.tsx |
| Supervisor Onboarding | Grants, pipeline pills, agent name fix | SupervisorAgentOnboarding.tsx |
| Supervisor Assignments | Leads data source fix, delete confirmation, agent filter | SupervisorClientAssignments.tsx |
| Supervisor Schedule | Team calendar, overnight shifts, agent notifications | SupervisorSchedule.tsx |
| Supervisor Performance | Grants, full redesign, edit/delete drafts, publish confirmation | SupervisorPerformance.tsx |
| Supervisor Shift Reviews | Notifications fix, status tabs, payout info | SupervisorShiftReviews.tsx |
| Supervisor Script Reviews | Approve order fix, client/supervisor notifications | SupervisorScriptReviews.tsx |
| Supervisor Escalations | Grants, notifications, redesign | SupervisorEscalations.tsx |
| Supervisor Training Signoffs | Notifications, AlertDialog, gradient header | SupervisorTrainingSignoffs.tsx |
| Supervisor Go-Live Approvals | AlertDialog, client/supervisor notifications, Five9 pill | SupervisorGoLiveApprovals.tsx |
| Supervisor Fulfillment | Grants, RLS policies, error state | SupervisorFulfillment.tsx |
| Supervisor Comms | Tickets stats fix, create task, gradient headers | SupervisorTasks.tsx + SupervisorMessages.tsx |
| Supervisor Support | Unified all roles, PiP knowledge seeded | StaffSupport.tsx |
| Outbound call flow redesign | New outcomes, detail drawer, digital signatures, scheduled callbacks, task creation on claim | AgentOutboundCalls.tsx + SupervisorOutboundCalls.tsx |
| Break time system | Lunch/bathroom breaks, deduction logic, admin settings | ShiftClockWidget.tsx + shift_break_settings table |
| Task system fixes | RLS policies, visibility constraint, notes permissions, clickable dialogs in agent + supervisor | crm_tasks migration + TaskDetailDialog.tsx |
| Call logs — detail sheet | Clickable rows, slide-in sheet, agent notes, search by name/phone/disposition | AgentCallLogs.tsx + migration |
| Available shifts — smart coverage | 80% client coverage threshold, split shifts (2×4h blocks), 12h daily limit, conflict check, reset-to-pending | OpenShiftBoard.tsx + TimeOffRequestsList.tsx + migration |
| Agent calendar — weekly schedule view | Mon–Sun grid, 4 data sources (schedules/shifts/time-off/claimed), prev/next week nav | AgentCalendar.tsx |
| Agent nav — Appointments rename | Calendar renamed to Appointments (Bookii), My Calendar added for schedule view | staffNav.ts + AgentAppointments.tsx |
| Agent schedule — 7-day lookback | Past shifts shown (dimmed), upcoming highlighted, no longer shows empty | AgentScheduleView.tsx |
| GRANT INSERT ON notifications | Systemic fix — all client-side notification inserts now work across all portals | migration applied |
| platform_knowledge seeded | PiP AI context seeded for supervisor, admin, sales, HR, white_label roles | staging DB |
| Admin Dashboard redesign | Workflow alerts top, independent queries, search, personalized greeting | AdminOverview.tsx |
| Admin Accounts — Active (Clients) | TanStack Query, NaN fix, skeleton loading, error state | AdminClients.tsx |
| Admin Accounts — Leads | Stage pills, TanStack Query, scoring fix, optimistic updates | AdminLeads.tsx |
| Admin Accounts — CRM | Slack crash guard, pipeline admin links, grants | AdminCRM.tsx |
| Admin Accounts — Outbound | Create request dialog, error boundary, gradient header | AdminOutbound.tsx |
| Admin Accounts — Billing | NMI replaces Stripe, active clients filter, call_report_imports grant | AdminBilling.tsx |
| Admin Accounts — Tickets | Source values fixed (5 real sources) | AdminTickets.tsx |
| Admin Accounts — Agents | Invite dialog, status badges, skills grants (INSERT/DELETE), offboard confirmation | AdminAgents.tsx |
| Admin Accounts — Users | Email backfill (profiles.email + sync trigger), role management grants, role filter dropdown | AdminUsers.tsx |
| Admin Accounts — PiP | Gradient header, error states, staleTime | AdminPiP.tsx |
| Admin Accounts — Appointments | Bookii fallback UI, renamed from Calendar | AdminCalendar.tsx |
| Campaign OS — all 14 pages | Gradient header via layout, grants, error states, AlertDialogs, skeleton loading | CampaignOsLayout.tsx + all pages |
| Campaign OS — Reporting | v_campaign_rollup_30d grant, error state | CampaignOsReporting.tsx |
| Campaign OS — Five9 | 4 sub-tab error states, API timeout handling (10s) | CampaignOsFive9.tsx |
| Campaign OS — Departments | client_departments + department_numbers grants, AlertDialog | CampaignOsDepartments.tsx |
| Campaign OS — Call Flows | call_flow_receptionist_configs grant, error states | CampaignOsCallFlows.tsx |
| Campaign OS — Defaults | campaign_department_type_defaults grant, error state | CampaignOsDefaults.tsx |
| Campaign OS — Drafts | AlertDialog for archive, independent error states per tab | CampaignOsDrafts.tsx |
| Campaign OS — Templates | campaign_templates grant, skeleton loading | CampaignOsTemplates.tsx |
| Campaign OS — Active Accounts + Locations | client_locations grant, skeleton loading, error states | CampaignOsActive.tsx |
| Admin Insights — all 6 pages | Grants for 15 tables (blog_posts, keyword_tracker, disc_* etc), gradient headers, error states | all Insights pages |
| Admin Insights — Blog | Delete confirmation AlertDialog | AdminBlog.tsx |
| Admin Insights — Keywords | .single() → .maybeSingle() crash fix | AdminKeywords.tsx |
| Admin Insights — Analytics | TanStack Query migration, error state | AdminAnalytics.tsx |
| Admin Insights — Intelligence | Error boundary for 20+ sub-panels | AdminIntelligence.tsx |
| Admin Partners — all pages | 10 grants fixed, P0 bugs fixed | all Partners pages |
| Admin Partners — WL Preview | Infinite blink fixed (removed live iframe), broken nav fixed | AdminWLPreview.tsx |
| Admin Partners — Impersonate | .single() crash fixed, slug bug fixed, N+1 batched | AdminImpersonate.tsx |
| Admin Partners — WL Health | Correct domain_aliases column names, accurate health scores | AdminWLHealth.tsx |
| Admin Partners — Partner Detail | 5 tabs unblocked (pricing, clients, usage, agreements, add-ons) | AdminPartnerDetail.tsx |
| Admin System — all 9 pages | Grants, gradient headers, sonner toasts | all System pages |
| Admin System — Audit Log | audit_log grant, error state | AdminAuditLog.tsx |
| Admin System — Launch Controls | feature_launch_flags UPDATE grant | AdminLaunchControls.tsx |
| Admin System — Mission Control | platform_settings grant, .single() → .maybeSingle() | AdminMissionControl.tsx |
| Admin System — Feedback Queue | feedback UPDATE/DELETE grant, wl_partner_feedback_escalations grant | AdminFeedback.tsx |
| Browser tab titles (all portals) | All portals show correct title, WL portals show partner branding | All Layout files + index.html |
| WL portal branding leakage fix | WhiteLabelLayout + WLPortalLayout Helmet, neutral og:title in index.html | WhiteLabelLayout.tsx + WLPortalLayout.tsx |
| Branding leakage tests | branding-leakage.spec.ts 12/12 ✅ | All BL-01 through BL-12 passing |
| Recurring grant bug pattern documented | TRUNCATE/REFERENCES/TRIGGER ≠ CRUD — always use SELECT/INSERT/UPDATE/DELETE only | CLAUDE.md + migrations |

---

## 🔴 REMAINING

| Task | Priority | Notes |
|------|----------|-------|
| Dashboard redesign — Client | MEDIUM | Next up |
| Dashboard redesign — Sales/HR/WL | LOW | After Client |
| Google Calendar integration | MEDIUM | Waiting on Paul's Google Workspace API credentials |
| NMI go-live | HIGH | Waiting on Paul + Ryker (PlatPay) — need merchant account + live API key |
| Notification badges for all portals | MEDIUM | Currently only agent portal has badges |
| Stripe → NMI migration | MEDIUM | Phase 2 — Paul to set crossover date |
| URL readability improvements | LOW | IDs in URLs not human-readable |
| Client self-service card entry (Collect.js) | LOW | Decision needed from Paul |
| Tracking pixels server-level enforcement | LOW | Suppressed in code, needs Cloudflare/server config |
| pg_cron Five9 pull schedule | LOW | Already wired, needs service_role_key set via `ALTER DATABASE postgres SET app.service_role_key = '...'` |
| Admin Partners — WL Partners page polish | LOW | Raw useEffect, gradient headers for remaining 3 pages |

---

## 📊 Test Score
```
Vitest RLS:  19/19  ✅
Playwright: 186/186 ✅ (skipped tests are for live Five9/NMI credentials)
CI Pipeline:   green ✅
Total:       205/205 ✅
```
