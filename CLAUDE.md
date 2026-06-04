# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

**24H Virtual** — a multi-tenant answering service platform. Stack: React 18 + TypeScript + Vite + Supabase (Postgres + Edge Functions) + Five9 telephony.

**Key people:** Developer = Suman. Client = Paul Joseph (pauljoseph@24hvirtual.com).  
**Staging DB:** sdsxdqsomxuimrjpaylv.supabase.co | **Local dev:** http://localhost:8080  
**All test passwords:** `QATestPass123!`

Read `GTM_READINESS.md` at the start of every session — it has the current task list, gotchas, and pending decisions.

---

## Commands

```bash
npm run dev          # Dev server on :8080
npm run build        # Production build
npm run lint         # ESLint

# Vitest unit tests (runs src/**/*.{test,spec}.{ts,tsx})
npm test             # Run once
npm run test:watch   # Watch mode

# Run a single Vitest file
npx vitest run src/lib/campaign-os/versionDiff.test.ts

# Playwright E2E (requires dev server running or starts one automatically)
npx playwright test
npx playwright test e2e/tests/flow1-direct-ticket.spec.ts   # single file
npx playwright test --ui                                    # interactive UI
npx playwright show-report                                  # open last HTML report
```

Playwright config: `playwright.config.ts` — Chromium only, 2 workers, 1 retry, 60s timeout, base URL `http://localhost:8080`.

---

## Architecture

The app has three conceptual layers (from `src/docs/CONTENT_ARCHITECTURE.md`):
1. **Growth** — public site, lead capture, blog/SEO (Growth Hub)
2. **Service Delivery** — CRM pipeline, Campaign OS, staff portals (Sales/Agent/Supervisor/Billing/Tech), tickets, call logs
3. **Platform & Partner** — Admin dashboard, RBAC/RLS, white-label, Stripe billing, edge functions, analytics

### Route structure

All routes are lazy-loaded and live in `src/routes/`:

| File | Prefix | Roles |
|------|--------|-------|
| `AdminRoutes.tsx` | `/admin` | `admin` |
| `StaffRoutes.tsx` | `/staff/sales`, `/staff/agent`, `/staff/supervisor`, `/staff/billing`, `/staff/tech` | per-role |
| `ClientRoutes.tsx` | `/client-dashboard` | `client` |
| `WhiteLabelRoutes.tsx` | `/white-label-dashboard` | `white_label` (partner) |
| `WLPortalRoutes.tsx` | `/wl-portal/:slug`, `/c/:slug` | `wl_client` |
| `HRRoutes.tsx` | `/staff/hr` | `hr` |
| `AffiliateRoutes.tsx` | `/affiliate` | `affiliate` |

**Canonical Campaign OS path:** `/admin/campaign-os/*`. The `/admin/campaigns/*` alias is kept for back-compat only — add new routes to the canonical path.

### Auth & roles

`AuthContext` (`src/contexts/AuthContext.tsx`) loads the user, profile, and roles from `user_roles` table on mount. Convenience booleans: `isAdmin`, `isClient`, `isAgent`, `isSupervisor`, `isWhiteLabel`, `isWLClient`, etc.

Role enum (`app_role`): `admin | client | agent | affiliate | white_label | referrer | sales | billing | supervisor | tech | hr | wl_client`

`ProtectedRoute` wraps every route with a `requiredRole` check.

### Supabase client

```ts
import { supabase } from "@/integrations/supabase/client";
```

Typed via generated `src/integrations/supabase/types.ts`. The client uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` env vars.

**Critical gotcha — missing grants:** When you see a 403, run:
```sql
GRANT SELECT,INSERT,UPDATE,DELETE ON public.<table> TO authenticated;
```
This is the most common cause of unexpected permission errors.

### Database migrations

Migrations live in `supabase/migrations/` with UUID-named files. To add a migration, create a new `.sql` file with a timestamp prefix. The staging DB has 234 tables and 524 RLS policies.

Key gotchas:
- `white_label_partners` uses `partner_slug` column (not `portal_slug`)
- `wl_client_tickets` column is `partner_id` not `wl_partner_id`
- `leads` table uses `pipeline_stage` not `status`
- `campaign_tenant_kind` enum values: `direct_24h | wl_partner`
- `notifications` columns: `id, user_id, title, message, type, category, is_read, action_url, created_at, metadata`
- `has_role()` is SECURITY DEFINER — must not be called from client-side RLS loops

### Campaign OS tenancy system

Campaign OS is the core multi-tenant configuration engine. **All Campaign OS mutation hooks must use `resolveTenant` and `tenantWhere` from `src/lib/campaign-os/tenancy.ts`** — hand-rolled tenant predicates are forbidden.

Every Campaign OS table row carries four identity columns: `tenant_kind`, `wl_partner_id`, `client_lead_id`, `wl_client_id`. Global-scope rows have `scope='global'` and all four set to NULL.

Tenancy precedence: WL partner > WL end-client > direct client lead > internal staff (admin/supervisor get unfiltered queries).

Hooks pattern: all in `src/hooks/campaign-os/`. Every hook uses TanStack Query with keys prefixed `['campaign-os', ...]`. Mutations call `resolveTenant()` first, then build identity payload before insert/update.

### Edge functions

Live in `supabase/functions/`. Shared utilities in `supabase/functions/_shared/`:
- `agent-auth.ts` — `authenticateAgent()` + `getEffectiveMode()` for mission-control agents
- `applyClientActivationEffects.ts` — side effects when a client activates
- `email-templates.ts` — shared email HTML builders

### Data query pattern

Components use TanStack Query (`@tanstack/react-query`) for all data fetching. Toast notifications use `sonner` (import `toast` from `'sonner'`). Forms use `react-hook-form` + `zod`.

### White-label isolation rules

- WL portals (`/wl-portal/*`, `/white-label-dashboard/*`, `/c/*`) must never leak 24H branding
- `TrackingPixels.tsx` suppresses GA4 + Meta on all WL routes
- `wl_host_resolver` detects subdomain-based WL hosts
- Content source: 24H uses `blog_posts` table (read-only mirror from Mrunsox); WL partners use separate `wl_*` tables entirely

### Mission Control agents

Automated billing/reporting agents are controlled via `agent_configs` table (enabled/disabled, mode). The `run-call-billing` edge function reads `CallReportAgent` config before executing. Modes: `simulation | sandbox | live`. Safety thresholds can pause a run requiring admin review.

---

## E2E test conventions

Tests live in `e2e/tests/` named `flow{N}-{description}.spec.ts`. All use `loginAs(page, role)` from `e2e/helpers/auth.ts`.

Test users (all password `QATestPass123!`):
```
admin:      qa-admin@24hv-test.com
agent:      qa-agent@24hv-test.com
supervisor: qa-supervisor@24hv-test.com
client:     qa-client@24hv-test.com
wlOwner:    qa-wl-owner@24hv-test.com
wlClient1:  qa-wl-client1@24hv-test.com
wlPartnerB: qa-wl-partner-b@24hv-test.com
```

Use `test.describe.serial` for flows where steps depend on prior state. Add `waitForTimeout` sparingly — prefer `waitForLoadState('networkidle')` and selector-based waits.

---

## Key domain models

| Table | Purpose |
|-------|---------|
| `leads` | Master client/customer records; has `pipeline_stage`, `stripe_customer_id`, `stripe_subscription_id` |
| `profiles` | Auth user profile (name, avatar, onboarding state) |
| `user_roles` | RBAC — maps user_id → app_role |
| `campaigns` | Campaign OS core unit, linked to a `client_department` |
| `client_departments` | Call flows / departments (back-compat table name) |
| `campaign_faq_entries` | FAQs with scope hierarchy + draft/approved/archived lifecycle |
| `campaign_policy_blocks` | Policies with policy_kind + same lifecycle |
| `campaign_knowledge_versions` | Generic version snapshots for any Campaign OS entity |
| `campaign_script_documents` | Visual call scripts (node graph as JSONB tree) |
| `campaign_script_document_versions` | Published versions of scripts |
| `script_change_requests` | Client-initiated change requests with approval workflow |
| `white_label_partners` | WL partner accounts |
| `white_label_clients` | WL end-clients |
| `billing_summaries` | Monthly invoice records per client |
| `call_logs` | Call activity — source of billable minutes |
| `missions` | Background agent job tracking |
| `notifications` | Cross-dashboard notification fan-out |
| `support_tickets` | Ticketing across all portals |
