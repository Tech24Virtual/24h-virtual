# GTM Readiness
Last updated: 2026-06-12

## 🔖 CONTEXT FOR NEW CHAT

**Stack:** React + TypeScript + Vite + Supabase + Five9
**Codebase:** `C:\Users\ismar\Downloads\24H Virtual`
**Staging DB:** sdsxdqsomxuimrjpaylv.supabase.co
**Local dev:** localhost:8080
**Developer:** Suman (you are talking to Suman)
**Client:** Paul Joseph (pauljoseph@24hvirtual.com)
**All test passwords:** QATestPass123!

**Key decisions pending from Paul:**
1. NMI payment gateway — approve or not?
2. Five9 hybrid architecture — final sign-off




**Last session summary:**
- Completed Systems 9, 11 (Parts A-D), 12, 26. Fixed sales portal (3 pages), WL portal (3 pages), WL branding flash, logo leak, Billing.tsx crash.
- All tests passing: 19 Vitest + 125 Playwright = 144/144. CI green.

**Key gotchas:**
- `white_label_partners` uses `partner_slug` column (not `portal_slug`)
- `wl_client_tickets` column is `partner_id` not `wl_partner_id`
- `notifications` table columns: `id, user_id, title, message, type, category, is_read, action_url, created_at, metadata`
- Missing grants is a recurring pattern — always run `GRANT SELECT,INSERT,UPDATE,DELETE ON public.<table> TO authenticated` when seeing 403
- `has_role()` function is SECURITY DEFINER — fixed in prior session
- `leads` table uses `pipeline_stage` not `status`
- `campaign_tenant_kind` enum: `direct_24h | wl_partner`
- WL branding — always set `suppressDefaultLogo=true` on DrilldownSidebar in WL contexts to prevent 24H logo leaking

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
| WL branding leakage tests | branding-leakage.spec.ts 8/8 |
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
| GitHub Actions CI | 4 secrets added (SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY), CI pipeline green | .github/workflows/ |

## 🔴 REMAINING

| Task | Priority | Notes |
|------|----------|-------|
| [object Object] UUID error on WL dashboard | LOW | Pre-existing, originates in Edge Function server-side, not client code |
| Five9 architecture refactor | HIGH | Agreed hybrid approach: proxy + monthly pull + PDF exports. Needs implementation |
| NMI payment integration | HIGH | Paul approved NMI. Needs scoping and build |
| System 4 — Close & activation → onboarding trigger | HIGH | Payment webhook → applyClientActivationEffects(). Blocked on NMI decision |
| System 10 — Five9 campaign mapping validation | MEDIUM | Block go-live if campaign mappings incomplete or have drift |
| System 27 — Direct billing | HIGH | Invoice engine based on Five9 call volume. Not built |
| Tracking pixels on WL portals | HIGH | Privacy/legal — GA4 + Meta suppressed in code but needs server-level enforcement |
| Admin branding edit UI | MEDIUM | Admins can view WL partner branding but have no edit UI — needs form in AdminPartnerDetail or dedicated page |

## 📊 Test Score
```
Vitest RLS:  19/19   ✅
Playwright: 125/125  ✅
CI Pipeline:   green ✅
Total:       144/144 ✅
```
