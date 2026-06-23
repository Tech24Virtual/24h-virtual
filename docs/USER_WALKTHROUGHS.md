# 24H Virtual — Portal User Walkthroughs

**Last updated:** June 2026  
**Platform:** 24H Virtual — Multi-Tenant Answering Service Platform  
**Test password (all accounts):** `QATestPass123!`  
**Login page:** `http://localhost:8080/login` (dev) or your production domain

---

## Table of Contents

1. [Admin Portal](#1-admin-portal)
2. [Client Dashboard](#2-client-dashboard)
3. [Agent Portal](#3-agent-portal)
4. [Supervisor Portal](#4-supervisor-portal)
5. [Sales Portal](#5-sales-portal)
6. [Billing Portal](#6-billing-portal)
7. [Tech Support Portal](#7-tech-support-portal)
8. [HR Portal](#8-hr-portal)
9. [White Label Partner Dashboard](#9-white-label-partner-dashboard)
10. [White Label Client Portal](#10-white-label-client-portal)
11. [Affiliate Portal](#11-affiliate-portal)

---

## 1. Admin Portal

**URL:** `/admin`  
**Test account:** `qa-admin@24hv-test.com`  
**Role:** `admin`

### Who is this for?

Platform administrators at 24H Virtual. Admins have unrestricted access to every system, every client record, every configuration, and every portal. An admin can impersonate any other portal, review all billing activity, manage Five9 mappings, configure Campaign OS for any client, and control platform-wide settings.

### How to log in

1. Go to `/login`
2. Enter `qa-admin@24hv-test.com` / `QATestPass123!`
3. You land on `/admin` — the Admin Overview dashboard

### Dashboard Overview

The admin dashboard opens on a **6-item vertical rail** (Supabase-style). Each rail item expands to horizontal tabs across the top of the content area:

| Rail Item | Icon | What it opens |
|-----------|------|---------------|
| Overview | Grid | Platform-wide KPI dashboard |
| Accounts | Building2 | Clients, leads, CRM, billing, agents, users, tickets |
| Campaign OS | Layers | Multi-cluster campaign management system |
| Insights | BarChart3 | Analytics, intelligence, growth hub, blog, SEO |
| Partners | Share2 | White label partner management |
| System | Settings | Popover tray for settings, flags, audit log, tools |

A **floating grid button** (bottom-right) opens the Dashboard Switcher to jump to any other portal instantly.

---

### Features

#### Overview Dashboard

**What it does:** Real-time platform health snapshot — leads, clients, agents, calls, partners, open tickets, WL revenue, and workflow alerts.

**How to use:**
1. Click **Overview** in the left rail
2. Review the 8 KPI cards (Total Leads, Total Clients, Active Agents, Total Calls, WL Partners, Open Tickets, Affiliates, WL Revenue)
3. Check **Workflow Alerts** — flagged items like leads stuck at billing, unverified WL clients, unresolved payment failures, and unsigned agreements
4. Review **Fulfillment Pulse** for the current intake queue status
5. Review **Top 5 Campaigns (last 30 days)** for call volume and AHT
6. Check **Ticket Pipeline by Source** to see open vs. in-progress counts by source

**Who can see this:** `admin` only

---

#### Accounts — Client Management

**What it does:** Full lifecycle management for direct 24H clients — from lead to active account.

**How to use:**
1. Click **Accounts** in the rail → opens at `/admin/clients` (Active tab)
2. Use the horizontal tabs to switch between: Active, Leads, CRM, Outbound, Billing, Tickets, Fulfillment, Agents, Users, Support, Calendar

**Active Clients (`/admin/clients`)**
1. View all active client accounts in a searchable, filterable list
2. Click any client to open their profile
3. From the client profile, manage their billing, scripts, call flow assignments, and Five9 configuration

**Leads (`/admin/leads`)**
1. View all inbound leads with pipeline stage, source, and status
2. Click a lead to open `/admin/leads/:id` — the full lead detail (contact info, pipeline history, notes, outreach)
3. Progress leads through stages: `new → contacted → qualified → proposal → onboarding → ready_for_billing → active`
4. Assign leads to a sales rep from the detail view

**CRM (`/admin/crm`)**
1. View the full CRM dashboard with tasks, follow-ups, and pipeline visibility
2. Create, assign, and complete CRM tasks
3. Set follow-up dates that surface in the Sales portal

**Outbound Calls (`/admin/outbound-calls`)**
1. View all outbound call requests from clients
2. Assign to agents, mark complete, or escalate

**Billing (`/admin/billing`)**
1. View platform-wide billing summary
2. See Stripe subscription status per client
3. Review monthly usage totals and invoice status
4. Access NMI payment gateway results

**Agents (`/admin/agents`)**
1. View all agent accounts
2. See agent skill assignments, Five9 IDs, and assignment counts
3. Add or remove agent accounts

**Users (`/admin/users`)**
1. Search all platform users regardless of role
2. Assign or change roles (admin, client, agent, supervisor, sales, billing, tech, hr, white_label, affiliate)
3. Access `/admin/users/supervisor-scope` to configure what supervisor accounts can see

**Who can see this:** `admin` only

---

#### Campaign OS

**What it does:** The core multi-tenant campaign configuration engine. Every client's call flow, FAQ library, policy blocks, scripts, and Five9 mappings live here. Supports versioning, draft approval workflows, and a readiness assessment.

**Navigation:** 4 clustered tab groups — Catalog, Operations, Reporting, Integrations

##### Catalog

**Overview (`/admin/campaign-os`)**
1. See all campaigns across all clients at a glance
2. View draft vs. published counts and readiness scores

**Active Accounts (`/admin/campaign-os/clients`)**
1. Filter campaigns by client
2. Click a client to open their Campaign OS profile (`/admin/campaign-os/clients/:clientId`)
3. From the client profile, navigate to their locations and campaigns

**Locations (`/admin/campaign-os/locations`)**
1. Manage client locations (each client can have multiple service locations)
2. Each location has its own call flow configuration
3. Click a location to edit its specific routing rules

**Campaigns (`/admin/campaign-os/campaigns`)**
1. View all campaigns in the system
2. Filter by client, status (draft/published), or tenant kind (direct vs. white label)
3. Click a campaign to open its detail view

**Campaign Detail (`/admin/campaign-os/campaigns/:id`)**
1. View campaign metadata (name, client, department, created date)
2. Navigate to: Script Builder, Version History, FAQ entries, Policy blocks, Fields
3. Publish a draft or roll back to a previous version

**Script Builder (`/admin/campaign-os/campaigns/:id/script`)**
1. Visual node-graph editor for building call scripts
2. Add nodes: greetings, questions, branches, transfers, closings
3. Connect nodes with arrows to define conversation flow
4. Preview the script as it would be read by an agent
5. Save a draft or publish to make live

**Version History (`/admin/campaign-os/campaigns/:id/versions`)**
1. View all published versions with timestamps
2. Compare any two versions side-by-side
3. Roll back to any prior version with one click

**Templates (`/admin/campaign-os/templates`)**
1. View reusable campaign templates
2. Create a new campaign from a template to pre-populate the script structure

##### Operations

**Call Flows (`/admin/campaign-os/call-flows`)**
1. View all call flow configurations (departments)
2. Create new call flows or edit routing rules
3. Assign Five9 skill groups and queue settings

**Drafts Review (`/admin/campaign-os/drafts`)**
1. See all campaigns with pending drafts awaiting approval
2. Review client-requested changes before they go live
3. Approve or reject with comments

**Defaults Catalog (`/admin/campaign-os/defaults`)**
1. Manage global default FAQ entries and policy blocks
2. Defaults cascade down to all clients that haven't overridden them
3. Edit or archive global defaults

**Readiness (`/admin/campaign-os/readiness`)**
1. View a readiness score for every campaign
2. See which required fields (FAQs, policies, scripts) are missing
3. Drill into any flagged campaign to complete the missing items

##### Reporting

**Campaign Reporting (`/admin/campaign-os/reporting`)**
1. View call volume, average handle time (AHT), and missed-call rate per campaign
2. Filter by date range, client, or campaign
3. Export report data to CSV

##### Integrations

**Five9 Mappings (`/admin/campaign-os/five9`)**
1. Map Campaign OS fields to Five9 system variables
2. Add new mappings for custom data capture
3. Test mappings to confirm they're pulling correctly

**Custom Fields (`/admin/campaign-os/fields`)**
1. Define custom fields that can be captured during calls
2. Set field type (text, date, boolean, select)
3. Mark fields as required or optional

**FAQ Library (`/admin/campaign-os/faqs`)**
1. View all FAQ entries (global + per-client)
2. Create, edit, and archive FAQs
3. FAQs go through a draft → approved → archived lifecycle
4. Global scope FAQs apply to all clients; client-scoped FAQs are client-specific

**Policy Blocks (`/admin/campaign-os/policies`)**
1. View all policy blocks (global + per-client)
2. Policy blocks define how agents handle specific situations (cancellations, refunds, emergencies)
3. Create, edit, approve, and archive policy blocks

**Who can see this:** `admin` only

---

#### Insights

**What it does:** Analytics, AI intelligence, growth tools (blog, social, email, newsletter, WordPress), and SEO keyword management.

**Analytics (`/admin/analytics`)**
1. View platform-wide call analytics (volume, AHT, missed rate)
2. Filter by date range, client, or agent
3. See `/admin/analytics/dashboard-events` for front-end event tracking

**Intelligence (`/admin/intelligence`)**
1. AI-powered insights panel
2. Surfaces anomalies, trends, and recommendations based on call data

**Growth Hub (`/admin/growth-hub`)**
Sub-sections:
- **Social** (`/admin/growth-hub/social`) — schedule and manage social media posts
- **Reports** (`/admin/growth-hub/reports`) — downloadable growth reports
- **Newsletter** (`/admin/growth-hub/newsletter`) — newsletter creation and distribution
- **WordPress** (`/admin/growth-hub/wordpress`) — sync content to WordPress sites
- **Email** (`/admin/growth-hub/email`) — email marketing campaign management

**Blog (`/admin/blog`)**
1. View all blog posts with publish status
2. Click **New Post** → opens `/admin/blog/editor`
3. Write in the rich-text editor with markdown support
4. Set SEO title, meta description, slug, and publish date
5. Publish immediately or schedule for later

**Discoverability (`/admin/discoverability`)**
A full SEO content engine with sections: Templates, Locations, Keywords, Audiences, FAQs, Internal Links, Generated Pages, Publish Queue, Quality Review, Sitemap Controls. Use these to generate location-based landing pages at scale.

**Who can see this:** `admin` only

---

#### Partners (White Label)

**What it does:** Full management of white label reseller partners — their configuration, health, branding, and portal access.

**WL Partners (`/admin/partners`)**
1. View all white label partner accounts
2. Click a partner to open `/admin/partners/:id` — their full profile
3. From the partner detail: manage their clients, branding config, pricing tier, billing, and agreements

**WL Health (`/admin/wl-health`)**
1. See a health dashboard across all partners
2. Flag partners with unverified clients, unsigned agreements, or billing issues

**WL Leak Audit (`/admin/wl-leak-audit`)**
1. Scan all WL portal configurations for 24H brand leakage
2. Any page or component showing 24H branding on a WL portal is flagged here

**WL Config Diff (`/admin/wl-config-diff`)**
1. Compare any two partner configurations side-by-side
2. Useful for troubleshooting a partner whose portal behavior differs from expected

**WL Preview (`/admin/wl-preview/:partnerId`)**
1. Preview exactly what a WL partner's end-client portal looks like
2. Renders the full portal with the partner's branding applied — without logging in as a client

**Impersonate (`/admin/wl-portals`)**
1. View a list of all WL partner portals
2. Click any portal to enter it directly as an admin (with an impersonation banner visible at the top)
3. Use for QA, support, or training

**Who can see this:** `admin` only

---

#### System Tray (Settings gear icon)

| Item | What it does |
|------|-------------|
| Settings | Platform-wide configuration (features, integrations) |
| Launch Controls | Feature flags — enable/disable features per environment |
| Mission Control | Agent job runs, billing automation status |
| Launch Checklist | Pre-launch verification checklist |
| Audit Log | Immutable record of all platform actions |
| Feedback Queue | Collected product feedback from all portals |
| Product Testing | QA harness, seed_qa_state runner |
| NMI Test | Sandbox NMI payment gateway demo |
| Architecture | Live system architecture map |

**Who can see this:** `admin` only

---

#### Dashboard Switcher

**What it does:** Jump to any portal from anywhere in the admin interface.

**How to use:**
1. Click the **grid icon** (⊞) in the bottom-right corner of any page
2. A popover opens listing all portals: Admin, Clients, White Label, Affiliates, HR, Sales Team, Supervisors, Agents, Billing, Tech Support
3. Click any portal to navigate to it directly
4. The current active portal is highlighted

**Who can see this:** `admin` only

---

### Common Admin Tasks

**Add a new lead:**
1. Accounts → Leads → **+ New Lead** button
2. Enter name, email, company, source
3. Lead is created in `new` stage

**Activate a client:**
1. Accounts → Leads → find the lead at `ready_for_billing`
2. Open lead detail → trigger activation (marks them as `active`, sends welcome email, enables their client portal)

**Review a pending draft campaign:**
1. Campaign OS → Operations → Drafts Review
2. Open the draft → review changes → Approve or Reject

**Check if a WL partner portal has brand leakage:**
1. Partners → WL Leak Audit
2. Review flagged items → open the impersonate link to verify visually

**Run a manual billing cycle:**
1. System → Mission Control
2. Find the `run-call-billing` agent → trigger manually

---

## 2. Client Dashboard

**URL:** `/client-dashboard`  
**Test account:** `qa-client@24hv-test.com`  
**Role:** `client`

### Who is this for?

Business owners and their designated staff who are paying 24H Virtual clients. They use the dashboard to monitor their answering service, manage their call scripts, handle billing, request outbound calls, and contact support.

### How to log in

1. Go to `/login`
2. Enter your email and password
3. You land on `/client-dashboard` automatically

### Dashboard Overview

The client dashboard opens to the **main overview** showing:
- Personalized welcome header
- Delivery status card (is your service active?)
- Receptionist status card (is an agent online?)
- Call trend chart (7-day volume)
- Nudges card (action items specific to your account)
- Activation path (if still onboarding)
- Customer success guidance
- KPI stats: Calls This Month, Total Minutes, Missed Calls, Active Scripts
- Recent calls list
- Quick actions panel

---

### Features

#### Account Setup Wizard

**What it does:** Guided first-time setup for new clients to get their service configured before going live.

**How to use:**
1. After first login, a banner prompts "Complete your account setup to go live"
2. Click **Complete Setup** → `/client-dashboard/setup`
3. Work through the wizard steps:
   - Business name and industry
   - Receptionist instructions
   - Business hours
   - Call routing preferences
   - Emergency contact
4. Submit the form — your setup goes to the Supervisor for go-live approval

**Who can see this:** `client` (shown automatically during onboarding phase)

---

#### Go-Live Readiness Checklist

**What it does:** Shows a checklist of everything that must be completed before your service goes live.

**How to use:**
1. Click **Go-Live Readiness** in the left sidebar (`/client-dashboard/readiness`)
2. Review each checklist item — green checkmark = done, amber = pending
3. Click any incomplete item to jump to the relevant section
4. Once all items are complete, submit for supervisor approval

**Who can see this:** `client`

---

#### Call Logs

**What it does:** Complete history of all calls handled by your 24H Virtual receptionist.

**How to use:**
1. Click **Calls** in the left sidebar → `/client-dashboard/calls`
2. View a table of all calls with: date, caller name, caller number, call duration, call status
3. Use the search bar to find calls by caller name or number
4. Filter by date range or status (answered, missed, transferred)
5. Click any row to expand the call detail including transcript (if available)

**Sub-sections:**
- **Outbound Requests** (`/client-dashboard/calls/outbound`) — requests you've submitted for callbacks
- **Campaigns** (`/client-dashboard/calls/campaigns`) — calls associated with specific campaigns

**Who can see this:** `client`

---

#### Call Reports

**What it does:** Aggregated analytics on your call activity — volume trends, missed call rates, busiest times.

**How to use:**
1. Click **Reports** in the sidebar → `/client-dashboard/reports`
2. View charts: calls per day, total minutes, missed-call percentage
3. Set a custom date range using the date picker
4. Export the report as CSV for your own records

**Who can see this:** `client`

---

#### Scripts

**What it does:** View the call scripts your receptionist uses when handling your calls.

**How to use:**
1. Click **Scripts** in the sidebar → `/client-dashboard/scripts`
2. Browse your active scripts
3. Click any script to read the full text
4. To request a change, open a support ticket (scripts are edited by admin/supervisors)

**Who can see this:** `client`

---

#### Receptionist Schedule

**What it does:** Configure your business hours — when your 24H Virtual receptionist is active vs. directing callers to voicemail.

**How to use:**
1. Click **Schedule** in the sidebar → `/client-dashboard/schedule`
2. Set your standard business hours for each day of the week
3. Add holiday or closure dates with overriding schedules
4. Click **Save** — changes take effect immediately

**Who can see this:** `client`

---

#### Booking Calendar

**What it does:** View and manage bookings made through your receptionist via the Bookii integration.

**How to use:**
1. Click **Booking** in the sidebar → `/client-dashboard/booking`
2. View your calendar of appointments booked by the receptionist
3. See booking details: client name, service, time, notes
4. Cancel or reschedule by clicking a booking

**Who can see this:** `client`

---

#### Billing & Usage

**What it does:** View your current plan, monthly usage (minutes), invoices, and payment method.

**How to use:**
1. Click **Billing** in the sidebar → `/client-dashboard/billing`
2. See your current billing period and minutes used
3. View past invoices and download PDFs
4. Update your payment method (links to Stripe)
5. View overage charges if applicable

**Who can see this:** `client`

---

#### Request Outbound Call

**What it does:** Submit a request for the 24H Virtual team to make an outbound call on your behalf.

**How to use:**
1. On the main dashboard, click **Request Outbound Call**
2. Fill in: recipient name, phone number, purpose/script, preferred time
3. Submit — the request appears in the agent's outbound queue
4. Track the request status in **Calls → Outbound Requests**

**Who can see this:** `client`

---

#### Referral Program

**What it does:** Earn credits by referring other businesses to 24H Virtual.

**How to use:**
1. Click **Referrals** in the sidebar → `/client-dashboard/referrals`
2. Copy your unique referral link
3. Share it with other business owners
4. Track referral status: clicked, signed up, converted
5. Credited referrals appear as account credits on your next invoice

**Who can see this:** `client`

---

#### Support Tickets

**What it does:** Submit and track support requests to the 24H Virtual team.

**How to use:**
1. Click **Support** in the sidebar → `/client-dashboard/support`
2. Click **+ New Ticket**
3. Select a category (billing, technical, script change, general)
4. Write your message and attach files if needed
5. Submit — your ticket is routed to the appropriate team
6. Track replies and status in the tickets list
7. Click any ticket to view the thread (`/client-dashboard/support/:id`)

**Who can see this:** `client`

---

#### Account Settings

**What it does:** Manage your profile, notification preferences, and account details.

**How to use:**
1. Click **Settings** in the sidebar → `/client-dashboard/settings`
2. Update: display name, contact email, phone number, timezone
3. Configure notification preferences (email alerts for missed calls, billing reminders)
4. Save changes

**Who can see this:** `client`

---

### Common Client Tasks

**Check last night's calls:**
1. Calls → set date filter to yesterday → review list

**Update business hours for the holidays:**
1. Schedule → add a holiday date → set to "Closed" or custom hours

**Request a script change:**
1. Support → New Ticket → Category: Script Change → describe the change needed

**Download last month's invoice:**
1. Billing → Invoice History → click the PDF icon next to the invoice

---

## 3. Agent Portal

**URL:** `/staff/agent`  
**Test account:** `qa-agent@24hv-test.com`  
**Role:** `agent`

### Who is this for?

Frontline answering service agents who handle inbound calls, manage their assigned clients, complete CRM tasks, request time off, and track their training progress.

### How to log in

1. Go to `/login`
2. Enter `qa-agent@24hv-test.com` / `QATestPass123!`
3. You land on `/staff/agent`

### Dashboard Overview

The agent dashboard shows:
- Slack mapping banner (if Five9 Slack integration not configured)
- KPI cards: Open Tickets, Resolved Tickets, Total Calls, My Clients, Open Shifts
- Cross-department widgets: My Performance score, Pending Time Off, Training Progress
- 7-day ticket trend chart
- Task SLA compliance chart
- Upcoming schedule
- Client support ticket list

---

### Features

#### Agent Workspace

**What it does:** The primary working interface for active call handling.

**How to use:**
1. Click **Workspace** in the sidebar → `/staff/agent/workspace`
2. View your active assignments, incoming ticket queue, and current shift status
3. Use this as your primary working screen during a shift

**Who can see this:** `agent`

---

#### My Assigned Clients

**What it does:** View the clients you are personally assigned to handle calls for.

**How to use:**
1. Click **Clients** in the sidebar → `/staff/agent/clients`
2. See your assigned clients with their account status and call flow
3. Click any client to review their scripts, FAQs, and call handling instructions before a call

**Who can see this:** `agent`

---

#### Client Scripts

**What it does:** Access all call scripts for your assigned clients.

**How to use:**
1. Click **Scripts** in the sidebar → `/staff/agent/scripts`
2. Browse scripts by client
3. Search for specific scripts by keyword
4. Click a script to read the full call flow including branches and special instructions

**Who can see this:** `agent`

---

#### Call Logs

**What it does:** View all calls you have handled.

**How to use:**
1. Click **Calls** in the sidebar → `/staff/agent/calls`
2. Filter by date range, client, or call status
3. Click a call to see details: duration, caller info, notes, outcome
4. Add or edit call notes from the detail view

**Who can see this:** `agent`

---

#### Task Management

**What it does:** View and complete CRM tasks assigned to you.

**How to use:**
1. Click **Tasks** in the sidebar → `/staff/agent/tasks`
2. View tasks sorted by due date and priority
3. Click a task to open it → add notes → mark as complete
4. Overdue tasks appear at the top highlighted in red

**Who can see this:** `agent`

---

#### Shifts

**What it does:** View open shifts, claim shifts, and see your shift history.

**How to use:**
1. Click **Shifts** in the sidebar → `/staff/agent/shifts`
2. Browse open shifts available for claiming (filtered by your skill set)
3. Click **Claim Shift** on any open shift to add it to your schedule
4. View your upcoming shifts and their clients/campaigns

**Who can see this:** `agent`

---

#### Schedule

**What it does:** View your upcoming work schedule in a weekly calendar format.

**How to use:**
1. Click **Schedule** in the sidebar → `/staff/agent/schedule`
2. See a week-view calendar with your shifts, client assignments, and meetings
3. Navigate forward/backward with the arrow buttons

**Who can see this:** `agent`

---

#### Time Off Requests

**What it does:** Submit and track time off requests.

**How to use:**
1. Click **Time Off** in the sidebar → `/staff/agent/time-off`
2. Click **+ Request Time Off**
3. Select date range and provide a reason
4. Submit — request goes to supervisor for approval
5. Track status (pending, approved, denied) in the list

**Who can see this:** `agent`

---

#### Training

**What it does:** Access training materials and track your completion progress.

**How to use:**
1. Click **Training** in the sidebar → `/staff/agent/training`
2. View your training checklist with completed and remaining items
3. Click any item to open the training material
4. Mark items complete after reviewing
5. Your completion percentage shows on the main dashboard

**Who can see this:** `agent`

---

#### Onboarding Progress

**What it does:** Track your own agent onboarding checklist (new hires).

**How to use:**
1. Click **Onboarding** in the sidebar → `/staff/agent/onboarding`
2. See each step: document submission, training modules, system access, supervisor sign-off
3. Complete items in order — supervisor unlocks later steps

**Who can see this:** `agent`

---

#### Outbound Calls

**What it does:** View outbound call requests assigned to you for callback.

**How to use:**
1. Click **Outbound** in the sidebar → `/staff/agent/outbound-calls`
2. Review the list of callback requests with caller info and preferred time
3. Click a request to see the full context and script
4. After completing the call, mark it as done with notes

**Who can see this:** `agent`

---

#### My Profile

**What it does:** Manage your personal information, skills, and Five9 credentials.

**How to use:**
1. Click **My Profile** in the sidebar → `/staff/agent/my-profile`
2. Update: display name, contact info, timezone, profile photo
3. Add or update your skill tags (used to match you to relevant shifts and clients)
4. View your performance score history

**Who can see this:** `agent`

---

#### Support Tickets

**What it does:** Submit support tickets for operational issues you encounter.

**How to use:**
1. Click **Support** in the sidebar → `/staff/agent/support`
2. Submit a ticket describing the issue
3. Track replies in the tickets list (`/staff/agent/tickets`)

**Who can see this:** `agent`

---

#### Messages

**What it does:** Internal messaging between agents and supervisors.

**How to use:**
1. Click **Messages** in the sidebar → `/staff/agent/messages`
2. View message threads by conversation
3. Reply to messages or start a new conversation

**Who can see this:** `agent`

---

#### Personal Calendar

**What it does:** Set your personal availability for scheduling purposes.

**How to use:**
1. Click **Calendar** in the sidebar → `/staff/agent/calendar`
2. Block out unavailable times
3. Supervisors use this when assigning shifts

**Who can see this:** `agent`

---

### Common Agent Tasks

**Find the script for an incoming call:**
1. Clients → find client by name → open their script

**Request next Friday off:**
1. Time Off → New Request → select Friday → submit

**Claim an available shift:**
1. Shifts → find an open shift that matches your skills → Claim

**Log notes after a call:**
1. Call Logs → find the call → open detail → add notes → save

---

## 4. Supervisor Portal

**URL:** `/staff/supervisor`  
**Test account:** `qa-supervisor@24hv-test.com`  
**Role:** `supervisor`

### Who is this for?

Shift supervisors who oversee the agent team, approve agent onboarding, assign clients to agents, review script and shift quality, manage escalations, and approve clients for go-live.

### How to log in

1. Go to `/login`
2. Enter `qa-supervisor@24hv-test.com` / `QATestPass123!`
3. You land on `/staff/supervisor`

### Dashboard Overview

The supervisor dashboard shows:
- KPI cards: Total Tickets, Urgent/High priority, Pending Tasks, Resolved
- Cross-department widgets: Clients Needing Assignment, Open Escalations, Avg Agent Score, Client Pipeline status (billing → onboarding → active)
- Overdue follow-ups widget
- Active shifts widget
- 7-day ticket trend and SLA compliance charts
- Client support ticket list

---

### Features

#### Supervisor Workspace

**What it does:** Central command view for active supervision during a shift.

**How to use:**
1. Click **Workspace** → `/staff/supervisor/workspace`
2. Monitor active agents, live tickets, and shift status in real time

**Who can see this:** `supervisor`

---

#### Team Agent Management

**What it does:** View and manage all agents on your team.

**How to use:**
1. Click **Agents** → `/staff/supervisor/agents`
2. See all agents with their status (active/inactive), skill tags, current assignments, and performance scores
3. Click any agent to view their detailed profile and history

**Who can see this:** `supervisor`

---

#### Agent Onboarding Administration

**What it does:** Manage new agents through the onboarding workflow.

**How to use:**
1. Click **Agent Onboarding** → `/staff/supervisor/agent-onboarding`
2. View each new agent's onboarding status
3. Review submitted documents and training progress
4. Unlock the next step for agents who have completed the current one
5. Mark training sign-offs as approved

**Who can see this:** `supervisor`

---

#### Training Sign-Offs

**What it does:** Formally certify that an agent has completed required training modules.

**How to use:**
1. Click **Training Sign-Offs** → `/staff/supervisor/training-signoffs`
2. Review agents with pending sign-off requests
3. Open the agent's training record to verify completion
4. Click **Approve Sign-Off** or request re-training

**Who can see this:** `supervisor`

---

#### Client Assignments

**What it does:** Assign clients to specific agents.

**How to use:**
1. Click **Client Assignments** → `/staff/supervisor/client-assignments`
2. See a list of active/onboarding clients without an assigned agent (count shown on dashboard)
3. Click a client → select an agent from the dropdown → save assignment
4. Assignments are immediately visible to the agent in their Clients list

**Who can see this:** `supervisor`

---

#### Go-Live Approvals

**What it does:** Review clients who have completed setup and approve them to go live.

**How to use:**
1. Click **Go-Live** → `/staff/supervisor/go-live`
2. View clients pending go-live approval
3. Click a client to review their setup: call flow, hours, scripts, agent assignment
4. Click **Approve** to activate their service, or **Request Changes** to send back
5. Client receives an email notification when approved

**Who can see this:** `supervisor`

---

#### Team Schedule

**What it does:** Manage the team's shift schedule.

**How to use:**
1. Click **Schedule** → `/staff/supervisor/schedule`
2. View the week/month calendar with all shifts
3. Create new shifts with date, time, required skills, and client assignments
4. Drag-and-drop to adjust shift times
5. Shifts become visible to agents in their Shifts list

**Who can see this:** `supervisor`

---

#### Escalations

**What it does:** Manage urgent issues escalated by agents that require supervisor intervention.

**How to use:**
1. Click **Escalations** → `/staff/supervisor/escalations`
2. View open escalations with priority and agent who escalated
3. Claim an escalation → resolve → close with notes
4. Closed escalations count in the dashboard resolution metrics

**Who can see this:** `supervisor`

---

#### Shift Reviews

**What it does:** Review completed shifts for quality scoring.

**How to use:**
1. Click **Shift Reviews** → `/staff/supervisor/shift-reviews`
2. Select a completed shift
3. Review call handling, adherence to scripts, and customer satisfaction
4. Score the shift and add notes — this feeds into the agent's performance score

**Who can see this:** `supervisor`

---

#### Script Reviews

**What it does:** Review script quality before client-facing use.

**How to use:**
1. Click **Script Reviews** → `/staff/supervisor/script-reviews`
2. View scripts pending quality review
3. Read through the script flow and check for errors or gaps
4. Approve or return for revision

**Who can see this:** `supervisor`

---

#### Fulfillment Intake

**What it does:** Manage the queue of new client setup packages submitted for review.

**How to use:**
1. Click **Fulfillment** → `/staff/supervisor/fulfillment`
2. View packages with their submission date and review status
3. Open a package (`/staff/supervisor/fulfillment/:id`) to review all submitted client info
4. Approve to advance the client toward go-live, or request more information

**Who can see this:** `supervisor`

---

#### Team Performance

**What it does:** View performance metrics for the entire agent team.

**How to use:**
1. Click **Performance** → `/staff/supervisor/performance`
2. View: average score per agent, ticket resolution time, call volume, SLA compliance
3. Filter by agent or date range
4. Click an agent's row to view their individual breakdown

**Who can see this:** `supervisor`

---

#### Outbound Call Oversight

**What it does:** Monitor outbound call requests across all agents.

**How to use:**
1. Click **Outbound Calls** → `/staff/supervisor/outbound-calls`
2. View all open outbound requests with assigned agent and due date
3. Reassign requests or escalate if overdue

**Who can see this:** `supervisor`

---

### Common Supervisor Tasks

**Approve a new client for go-live:**
1. Go-Live → find client → review checklist → Approve

**Assign a client to an agent:**
1. Client Assignments → find unassigned client → select agent → save

**Review a new agent's onboarding:**
1. Agent Onboarding → find agent → review each step → unlock next phase

**Handle an escalation:**
1. Dashboard widget → Open Escalations → claim → resolve → close

---

## 5. Sales Portal

**URL:** `/staff/sales`  
**Role:** `sales`

### Who is this for?

Sales representatives who manage the lead pipeline, conduct discovery meetings, create proposals, and track their personal performance and commissions.

### How to log in

1. Go to `/login` with a `sales` role account
2. You land on `/staff/sales`

### Dashboard Overview

The sales dashboard shows:
- KPI cards: Total Leads, New Leads, Open Tickets, My Commissions (pending)
- Overdue Follow-Ups widget
- Today's Meetings card (next upcoming meeting highlighted)
- Follow-Ups Due Today list
- Recent Wins list
- Lead pipeline funnel chart
- New leads trend (7-day)
- Recent leads missions
- Sales tickets list

---

### Features

#### Lead Management

**What it does:** View and manage all leads in the system.

**How to use:**
1. Click **Leads** → `/staff/sales/leads`
2. View the full lead list with pipeline stage, source, and assigned rep
3. Search by name, company, or email
4. Click a lead to open `/staff/sales/leads/:id` — full lead profile with:
   - Contact info and company details
   - Pipeline stage history
   - Notes and follow-up log
   - Email/call log (if integrated)
   - Next follow-up date

**Who can see this:** `sales`

---

#### Sales Pipeline

**What it does:** Visual funnel view of all leads by pipeline stage.

**How to use:**
1. Click **Pipeline** → `/staff/sales/pipeline`
2. View the funnel: New → Contacted → Qualified → Proposal → Onboarding → Active
3. See count and value at each stage
4. Click a stage to filter the leads list to that stage

**Who can see this:** `sales`

---

#### Proposals

**What it does:** Create and track proposals sent to qualified leads.

**How to use:**
1. Click **Proposals** → `/staff/sales/proposals`
2. Click **+ New Proposal** to create one
3. Select a lead, set pricing tier, add services, and add notes
4. Save as draft or send directly to the lead
5. Track status: draft, sent, accepted, declined

**Who can see this:** `sales`

---

#### Meetings & Calendar

**What it does:** View and manage scheduled meetings with prospects.

**How to use:**
1. Click **Meetings** → `/staff/sales/meetings`
2. See your calendar with all scheduled meetings
3. View today's meetings on the dashboard with the next meeting highlighted
4. Meetings sync from the Bookii booking integration

**Who can see this:** `sales`

---

#### Performance

**What it does:** Track your personal sales performance metrics and commission earnings.

**How to use:**
1. Click **Performance** → `/staff/sales/performance`
2. View: leads contacted, conversion rate, proposals sent, proposals won, total commissions
3. Compare current month vs. prior month
4. See commission breakdown by deal

**Who can see this:** `sales`

---

#### Support Tickets

**What it does:** Submit and track sales-related support requests.

**How to use:**
1. Click **Tickets** → `/staff/sales/tickets`
2. Submit tickets for: lead data issues, system access problems, proposal template requests
3. Track reply status per ticket

**Who can see this:** `sales`

---

#### Follow-Up Management

**What it does:** Set and track scheduled follow-up dates for leads.

**How to use:**
1. Open any lead detail → set **Next Follow-Up Date**
2. On the dashboard, the **Follow-Ups Due Today** widget surfaces leads due for contact
3. The **Overdue Follow-Ups** widget shows leads past their follow-up date
4. Click a lead from either widget to open their profile and log contact

**Who can see this:** `sales`

---

### Common Sales Tasks

**Log a discovery call with a lead:**
1. Leads → find lead → open detail → add note with call outcome → update stage → set next follow-up

**Create and send a proposal:**
1. Proposals → New Proposal → select lead → configure pricing → Send

**Check your commission for the month:**
1. Performance → filter to current month → view commission total

---

## 6. Billing Portal

**URL:** `/staff/billing`  
**Role:** `billing`

### Who is this for?

Billing team members who process agent payouts, resolve payment failures, manage client subscriptions, handle billing-related support tickets, and reconcile monthly invoices.

### How to log in

1. Go to `/login` with a `billing` role account
2. You land on `/staff/billing`

### Dashboard Overview

The billing dashboard shows:
- KPI cards: Billing Tickets, Open Tickets, Payment Failures, Pending Commissions, Active Subscriptions, Resolved, WL Unverified
- Quick actions: Run Billing, Resolve Payments, Review Commissions, Client Lookup, View Subscriptions, WL Partners
- Recent Billing Runs (missions list)
- Billing tickets list

---

### Features

#### Billing Tickets

**What it does:** Manage billing-specific support tickets from clients.

**How to use:**
1. Click **Tickets** → `/staff/billing/tickets`
2. View open billing tickets sorted by priority
3. Click a ticket to open the detail (`/staff/billing/tickets/:id`)
4. Reply to the client, resolve the issue, and close the ticket

**Who can see this:** `billing`

---

#### Subscription Management

**What it does:** View and manage all client Stripe subscriptions.

**How to use:**
1. Click **Subscriptions** → `/staff/billing/subscriptions`
2. View all active subscriptions with plan, MRR, and next billing date
3. Search by client name
4. Cancel, pause, or update a subscription from the detail view

**Who can see this:** `billing`

---

#### Payment Issues

**What it does:** Resolve failed payments and outstanding balances.

**How to use:**
1. Click **Payment Issues** → `/staff/billing/payment-issues`
2. View all unresolved payment failures with age and client name
3. Click a failure to see the error details and Stripe event ID
4. Options: retry charge, contact client, write off, or mark resolved
5. All resolutions are logged with a timestamp

**Who can see this:** `billing`

---

#### Agent Payouts / Invoices

**What it does:** Process agent shift invoices and payouts.

**How to use:**
1. Click **Payouts** → `/staff/billing/invoices`
2. View shift invoices submitted and approved by supervisors
3. Filter by agent or date range
4. Approve payout batches → triggers transfer to agent's payment method
5. Download payout receipts for records

**Who can see this:** `billing`

---

#### Commission Management

**What it does:** Review and approve sales commissions.

**How to use:**
1. Click **Commissions** → `/staff/billing/commissions`
2. View all pending commissions with deal name, rep, and amount
3. Review commission calculations (rate × deal value)
4. Approve or flag for review
5. Approved commissions are queued in the next payout run

**Who can see this:** `billing`

---

#### Client Lookup

**What it does:** Quickly find a client's billing profile by name or email.

**How to use:**
1. Click **Client Lookup** → `/staff/billing/client-lookup`
2. Enter the client's name, email, or Stripe customer ID
3. See their subscription status, billing history, outstanding balance, and invoices
4. Take action directly from the lookup result

**Who can see this:** `billing`

---

#### White Label Partner Billing

**What it does:** Manage billing for white label partners (wholesale).

**How to use:**
1. Click **WL Partners** → `/staff/billing/wl-partners`
2. View WL partner usage, wholesale costs, and billing status
3. Flag partners with unverified billing (`WL Unverified` counter on dashboard)
4. Issue partner invoices or update pricing

**Who can see this:** `billing`

---

#### Billing Reconciliation

**What it does:** Cross-reference call logs with billed minutes to identify discrepancies.

**How to use:**
1. Click **Reconciliation** → `/staff/billing/reconciliation`
2. Select a billing period
3. Review: minutes billed vs. minutes in call logs, any difference flagged
4. Investigate flagged clients and correct if needed
5. Mark the period as reconciled

**Who can see this:** `billing`

---

#### Run Billing

**What it does:** Manually trigger the monthly billing cycle for all clients.

**How to use:**
1. On the dashboard, click **Run Billing** (or via Mission Control)
2. Confirm the billing period
3. The billing agent runs in simulation mode first — review results
4. Switch to live mode and run again to charge clients

**Who can see this:** `billing`

---

### Common Billing Tasks

**Resolve a failed payment for a client:**
1. Payment Issues → find client → click failure → retry charge or contact client

**Process agent payouts for the month:**
1. Payouts → filter to current month → select all supervisor-approved invoices → batch approve

**Look up a client's invoice:**
1. Client Lookup → enter client name → view invoice history → download PDF

---

## 7. Tech Support Portal

**URL:** `/staff/tech`  
**Role:** `tech`

### Who is this for?

Technical support team members who handle technical tickets, track system issues, maintain the knowledge base, and manage chat widget deployments.

### How to log in

1. Go to `/login` with a `tech` role account
2. You land on `/staff/tech`

### Dashboard Overview

Shows:
- KPI cards: Total Tickets, Open, In Progress, Resolved, Resolution Rate, Open Issues
- Quick actions: System Issues, Knowledge Base
- 7-day ticket volume and resolution trend charts
- Tech support ticket queue

---

### Features

#### Tech Support Tickets

**What it does:** Manage and resolve technical support tickets.

**How to use:**
1. Click **Tickets** → `/staff/tech/tickets`
2. View all tickets with source, priority, and status
3. Click a ticket to open detail (`/staff/tech/tickets/:id`)
4. Reply to the client or internal reporter
5. Assign to yourself or another tech team member
6. Update status: open → in_progress → resolved → closed

**Who can see this:** `tech`

---

#### System Issues

**What it does:** Track known platform-level technical issues.

**How to use:**
1. Click **Issues** → `/staff/tech/issues`
2. View open issues sorted by priority (critical → high → medium → low)
3. Click an issue to see: description, affected systems, workaround, resolution status
4. Create a new issue from any ticket if it represents a systemic problem
5. Mark issues as resolved with root cause notes

**Who can see this:** `tech`

---

#### Knowledge Base

**What it does:** Internal knowledge base for tech staff — troubleshooting guides, runbooks, and reference docs.

**How to use:**
1. Click **Knowledge Base** → `/staff/tech/knowledge-base`
2. Browse articles by category or search by keyword
3. Create a new article with title, content (markdown), and category
4. Publish articles — they become searchable for the whole tech team

**Who can see this:** `tech`

---

#### Chat Deployments

**What it does:** Manage chat widget configurations deployed on client websites.

**How to use:**
1. Click **Chat** → `/staff/tech/chat-deployments`
2. View all active chat widget deployments
3. Click a deployment (`/staff/tech/chat-deployments/:id`) to see:
   - Embed code snippet
   - Client website it's deployed on
   - Widget configuration (color, greeting, routing)
4. Edit configuration and regenerate the embed code
5. Archive deployments for inactive clients

**Who can see this:** `tech`

---

### Common Tech Tasks

**Investigate a reported technical issue:**
1. Tickets → find ticket → open detail → investigate → reply with findings → update status

**Log a new system bug:**
1. Issues → New Issue → set priority → describe reproduction steps → save

**Help a client with their chat widget:**
1. Chat Deployments → find client deployment → review config → update as needed → give client new embed code

---

## 8. HR Portal

**URL:** `/hr-portal`  
**Role:** `hr`

### Who is this for?

Human Resources team members who manage employee records, onboarding/offboarding workflows, payroll processing, time off approvals, job postings, and contracts.

### How to log in

1. Go to `/login` with an `hr` role account
2. You land directly at `/hr-portal` — the HR Dashboard

### Dashboard Overview

The HR dashboard shows:
- KPI cards: Total Employees, Active Onboardings, Pending Offboardings, Payroll Due, Pending Time Off, Open Job Postings, Unread Messages
- Recent activity feed from onboarding log
- Quick action buttons: + New Hire, Initiate Offboarding, Process Payroll

---

### Features

#### Employee Directory

**What it does:** View and manage all employee records.

**How to use:**
1. Click **Directory** in the sidebar → `/hr-portal/people/directory`
2. Browse the full employee list with name, role, department, hire date, and status
3. Search by name or filter by department/role
4. Click an employee to open their full profile:
   - Contact information
   - Employment details (start date, contract type, salary band)
   - Performance history
   - Documents (contracts, ID, certifications)
   - Onboarding/offboarding status

**Who can see this:** `hr`

---

#### Onboarding Management

**What it does:** Manage the workflow for new hires from offer acceptance to their first day and beyond.

**How to use:**
1. Click **Onboarding** → `/hr-portal/people/onboarding`
2. View all active onboarding cases with current step and completion percentage
3. Click **+ New Hire** to start a new onboarding:
   - Enter name, email, role, and start date
   - Select the onboarding template
4. Each onboarding case tracks: document collection, system access setup, training assignment, equipment request, supervisor sign-off
5. Click any case to advance steps, add notes, or upload documents
6. Completed onboardings move to the Directory as active employees

**Who can see this:** `hr`

---

#### Offboarding Management

**What it does:** Manage the workflow for departing employees.

**How to use:**
1. Click **Offboarding** → `/hr-portal/people/offboarding`
2. Click **Initiate Offboarding** for an employee
3. Set their last working day
4. The workflow tracks: access revocation, equipment return, final paycheck, exit interview, knowledge transfer
5. Each step can be assigned to a responsible party (IT, finance, manager)
6. Mark steps complete as they're done
7. Completed offboardings archive the employee record

**Who can see this:** `hr`

---

#### Payroll

**What it does:** Process employee payroll and view payroll history.

**How to use:**
1. Click **Payroll** → `/hr-portal/payroll`
2. View the current payroll period with pending approvals (supervisor-approved shift invoices)
3. Review each employee's hours, rate, and total pay
4. Identify discrepancies and flag for correction
5. Click **Process Payroll** to finalize the period
6. Download the payroll summary report for records

**Who can see this:** `hr`

---

#### Time Off Management

**What it does:** Review and approve or deny employee time off requests.

**How to use:**
1. Click **Time Off** → `/hr-portal/payroll/time-off`
2. View all pending time off requests in chronological order
3. See: employee name, dates requested, reason, type (vacation, sick, personal)
4. Check for schedule conflicts (other agents off on the same dates)
5. Click **Approve** or **Deny** with an optional message
6. Approved time off updates the agent's schedule automatically

**Who can see this:** `hr`

---

#### Job Postings

**What it does:** Create and manage job postings for open positions.

**How to use:**
1. Click **Job Postings** → `/hr-portal/hiring/jobs`
2. View all open and closed job postings
3. Click **+ New Job Posting** to create one:
   - Title, department, employment type, location
   - Job description (markdown editor)
   - Required skills and qualifications
   - Salary range
4. Set status: draft, open, paused, closed
5. Open postings can receive applicants (if external portal is configured)

**Who can see this:** `hr`

---

#### Contract Management

**What it does:** Create, send, and track employment contracts.

**How to use:**
1. Click **Contracts** → `/hr-portal/hiring/contracts`
2. View all contracts with status: draft, sent, signed, expired
3. Click **+ New Contract** for a new hire:
   - Select employee
   - Choose contract template (full-time, part-time, contractor)
   - Set terms (start date, pay rate, duration)
4. Send contract to the employee for e-signature
5. Signed contracts are stored automatically and linked to the employee's directory record

**Who can see this:** `hr`

---

#### HR Communications

**What it does:** Send announcements and messages to staff.

**How to use:**
1. Click **Communications** → `/hr-portal/communications`
2. View the inbox of messages sent to you by staff
3. Compose a new announcement:
   - Select recipients (all staff, specific role, individual)
   - Write the message
   - Send or schedule
4. Unread message count appears on the dashboard KPI card

**Who can see this:** `hr`

---

#### HR Tickets

**What it does:** Submit and track HR-specific support requests from staff.

**How to use:**
1. Click **Tickets** → `/hr-portal/tickets`
2. View all incoming HR tickets (payroll questions, PTO disputes, HR policy questions)
3. Click a ticket to open the thread (`/hr-portal/tickets/:id`)
4. Reply and resolve

**Who can see this:** `hr`

---

#### HR Settings

**What it does:** Configure HR portal settings including payroll period, leave policies, and approval chains.

**How to use:**
1. Click **Settings** → `/hr-portal/settings`
2. Set payroll frequency (weekly, bi-weekly, monthly)
3. Configure leave types and accrual rules
4. Set approval chain for time off (direct manager → HR → auto-approve threshold)

**Who can see this:** `hr`

---

### Common HR Tasks

**Onboard a new agent:**
1. Dashboard → + New Hire → enter details → start onboarding workflow

**Approve pending time off:**
1. Time Off → review requests → check schedule conflicts → Approve or Deny

**Process this month's payroll:**
1. Payroll → review period totals → resolve discrepancies → Process Payroll

**Post a job opening:**
1. Job Postings → + New Job Posting → fill in details → set to Open

---

## 9. White Label Partner Dashboard

**URL:** `/white-label-dashboard`  
**Test account:** `qa-wl-owner@24hv-test.com`  
**Role:** `white_label`

### Who is this for?

Reseller partners who white-label the 24H Virtual platform under their own brand. They manage their own book of end-clients, configure branding, access the growth hub, and handle partner-level billing.

### How to log in

1. Go to `/login`
2. Enter `qa-wl-owner@24hv-test.com` / `QATestPass123!`
3. You land on `/white-label-dashboard`

### Dashboard Overview

The WL partner dashboard shows:
- KPI cards: Total Clients, Active Subscriptions, Monthly Revenue, Growth Rate
- Partner activation card (for new partners still in setup)
- Partner economics card (wholesale vs. retail margin)
- Portfolio expansion recommendations
- Portfolio insights
- Partner readiness and nudges
- Fulfillment status
- Partner status card (tier, monthly fee, member since)
- Quick actions panel

---

### Features

#### Client Management

**What it does:** Manage your white-label end-clients.

**How to use:**
1. Click **Clients** → `/white-label-dashboard/clients`
2. View your full client list with status (active, pending, inactive) and monthly value
3. Click **+ Add Client** to onboard a new client:
   - Enter their business name, contact, and service type
   - Configure their portal access (slug, login)
   - Assign their campaign from your Campaign OS library
4. Click any client to open their detail (`/white-label-dashboard/clients/:id`):
   - Contact info, service config, billing summary
   - Campaign assignments
   - Support ticket history

**Who can see this:** `white_label`

---

#### Leads Pipeline

**What it does:** Track sales leads for new clients you're bringing into your reseller network.

**How to use:**
1. Click **Clients → Leads** → `/white-label-dashboard/clients/leads`
2. View your prospect list with stage and last contact date
3. Advance leads through stages as you qualify them
4. Convert a qualified lead to a new client with one click

**Who can see this:** `white_label`

---

#### Proposals

**What it does:** Create and send service proposals to prospects.

**How to use:**
1. Click **Clients → Proposals** → `/white-label-dashboard/clients/proposals`
2. Click **+ New Proposal** → select a lead → configure services and pricing
3. Preview the proposal with your branding applied
4. Send directly to the prospect's email
5. Track status: draft, sent, accepted, declined

**Who can see this:** `white_label`

---

#### Client Onboarding

**What it does:** Manage your clients through their onboarding workflow.

**How to use:**
1. Click **Clients → Onboarding** → `/white-label-dashboard/clients/onboarding`
2. View all clients currently in onboarding with their current step
3. Click a client (`/white-label-dashboard/clients/onboarding/:id`) to:
   - Review their submitted setup information
   - Advance them to the next step
   - Assign an agent for their account
4. Completion triggers their portal access to go live

**Who can see this:** `white_label`

---

#### Campaign OS Access

**What it does:** Configure Campaign OS for your clients under your partner tenant.

**How to use:**
1. Click **Campaigns → Campaign OS** → `/white-label-dashboard/campaigns/campaign-os`
2. This opens the Campaign OS interface scoped to your partner account
3. Create and manage campaigns for your clients
4. Your clients see these campaigns through their white-labeled portal
5. Use Templates to create standardized scripts you can deploy across multiple clients

**Who can see this:** `white_label`

---

#### Growth Hub

**What it does:** Marketing tools to grow your reseller business.

**Sub-sections:**
- **Blog** — write and publish articles under your brand
- **Keywords** — keyword planning for your service area
- **WordPress** — sync content to your WordPress site
- **Social Media** — schedule posts across social platforms
- **Reports** — downloadable growth reports
- **Newsletter** — create and send email newsletters
- **Email Marketing** — run email campaigns

**How to use:**
1. Click **Growth** → select a sub-section
2. Each tool is a full-featured marketing module operating under your branding

**Who can see this:** `white_label`

---

#### Partner Branding

**What it does:** Customize the visual identity of your white-label portal.

**How to use:**
1. Click **Account → Branding** → `/white-label-dashboard/account/branding`
2. Upload your logo (shown in the portal header and emails)
3. Set your brand colors (primary, secondary, accent)
4. Set your company name and tagline
5. Preview changes in real-time
6. Save — changes apply immediately to all your clients' portal views

**Who can see this:** `white_label`

---

#### Custom Domain

**What it does:** Set up a custom domain so your clients access their portal at `yourcompany.com/portal` instead of the 24H domain.

**How to use:**
1. Click **Account → Branding → Custom Domain** → `/white-label-dashboard/account/branding/custom-domain`
2. Enter your desired domain
3. Follow the DNS configuration instructions (CNAME record setup)
4. Click **Verify** once DNS is propagated
5. Active clients automatically use the custom domain

**Who can see this:** `white_label`

---

#### Partner Billing

**What it does:** View your wholesale billing from 24H Virtual and your retail revenue from clients.

**How to use:**
1. Click **Account → Billing** → `/white-label-dashboard/account/billing`
2. View: your monthly wholesale cost from 24H, your retail revenue from clients, and your margin
3. Download invoices from 24H
4. View outstanding balances

**Who can see this:** `white_label`

---

#### Wholesale Pricing

**What it does:** Configure the pricing you charge your end-clients.

**How to use:**
1. Click **Account → Pricing** → `/white-label-dashboard/account/pricing`
2. View your wholesale rates from 24H
3. Set your retail mark-up per service tier
4. Set per-minute overage pricing for clients who exceed their plan

**Who can see this:** `white_label`

---

#### Service Agreements

**What it does:** View and sign partner service agreements with 24H Virtual.

**How to use:**
1. Click **Account → Agreements** → `/white-label-dashboard/account/agreements`
2. View pending agreements requiring signature
3. Review agreement terms
4. E-sign directly in the portal
5. Download signed agreements as PDFs

**Who can see this:** `white_label`

---

#### Team Management

**What it does:** Add team members who can access the partner dashboard.

**How to use:**
1. Click **Account → Team** → `/white-label-dashboard/account/team`
2. View current team members and their access levels
3. Click **+ Invite Member** → enter email → select role (owner, manager, viewer)
4. Team member receives an invitation email
5. Remove or change roles from the team list

**Who can see this:** `white_label`

---

#### Partner Support

**What it does:** Submit support tickets to 24H Virtual for partner-level issues.

**How to use:**
1. Click **Account → Support** → `/white-label-dashboard/account/support`
2. Submit a ticket for: billing disputes, technical issues, configuration help
3. Track replies in the support detail view

**Who can see this:** `white_label`

---

### Common WL Partner Tasks

**Onboard a new client:**
1. Clients → + Add Client → fill in details → assign campaign → send portal invite

**Customize portal branding:**
1. Account → Branding → upload logo, set colors → Save

**Check this month's margin:**
1. Account → Billing → view wholesale cost vs. retail revenue → calculate margin

**Publish a blog post under your brand:**
1. Growth → Blog → + New Post → write content → Publish

---

## 10. White Label Client Portal

**URL:** `/portal/:slug` (e.g., `/portal/acme-corp`)  
**Test account:** `qa-wl-client1@24hv-test.com`  
**Role:** `wl_client`

### Who is this for?

End-clients of white label reseller partners. They access a fully branded portal (not branded as 24H Virtual) to monitor their answering service, review calls, manage scripts, and submit support requests — all under their reseller partner's branding.

### How to log in

1. Navigate to `/portal/your-partner-slug/login`
   - Each WL client's portal URL uses their partner's unique slug
   - Example: `/portal/acme-corp` for a client under the "Acme Corp" partner
2. Enter your email and password
3. You land on the portal dashboard

> If you access your portal via a custom domain (e.g., `portal.yourreseller.com`), the login URL is just the root of that domain.

### Dashboard Overview

The WL client portal is branded entirely in the partner's colors and logo. Features shown depend on the modules your reseller has enabled for your account.

The main dashboard shows:
- Call stats: Calls This Month, Total Minutes, Missed Calls, Active Scripts
- Service status card (is your service active?)
- Activation path (if still onboarding)
- Call trend chart
- Nudges card (account action items)
- Recent calls list
- Quick actions panel

---

### Features

#### Call Logs

**What it does:** View all calls handled by your receptionist.

**How to use:**
1. Click **Calls** in the sidebar → `/portal/:slug/calls`
2. Browse the full call history with date, caller, duration, and status
3. Filter by date range or status
4. Click a call row to see full details

**Requires module:** `calls`

---

#### Scripts

**What it does:** View the call scripts your receptionist follows.

**How to use:**
1. Click **Scripts** → `/portal/:slug/scripts`
2. Browse your active scripts
3. To request a change, submit a support ticket

**Requires module:** `scripts`

---

#### Receptionist Schedule

**What it does:** Configure your business hours for your receptionist coverage.

**How to use:**
1. Click **Schedule** → `/portal/:slug/schedule`
2. Set your hours per day of the week
3. Add closure dates
4. Save — your receptionist adjusts their handling immediately

**Requires module:** `schedule`

---

#### Billing & Usage

**What it does:** View your service plan, monthly usage, and invoices.

**How to use:**
1. Click **Billing** → `/portal/:slug/billing`
2. View minutes used this period and overage if applicable
3. Download invoices
4. Billing is managed by your reseller partner, not 24H directly

**Requires module:** `billing`

---

#### Support Tickets

**What it does:** Submit support requests to your reseller partner.

**How to use:**
1. Click **Support** → `/portal/:slug/support`
2. Submit a ticket describing your issue
3. Your reseller (and 24H if needed) responds through the ticket thread
4. Track resolution status

---

#### Outbound Call Requests

**What it does:** Request a callback on your behalf.

**How to use:**
1. Click **Outbound** → `/portal/:slug/outbound-requests` (or Quick Actions on dashboard)
2. Fill in: recipient name, phone number, purpose, preferred time
3. Submit — the request goes to the agent queue
4. Track status in the outbound requests list

**Requires module:** `outbound-requests`

---

#### Activity Log

**What it does:** A chronological log of all activity on your account.

**How to use:**
1. Click **Activity** → `/portal/:slug/activity`
2. View timestamped events: calls received, scripts updated, support tickets opened, schedule changes

**Requires module:** `activity`

---

#### Reviews

**What it does:** View customer reviews and ratings for your business.

**How to use:**
1. Click **Reviews** → `/portal/:slug/reviews`
2. View incoming customer reviews with rating and comment
3. Use this to monitor customer satisfaction with your service

**Requires module:** `reviews`

---

#### Campaigns

**What it does:** View campaigns associated with your account.

**How to use:**
1. Click **Campaigns** → `/portal/:slug/campaigns`
2. View your assigned campaigns with call scripts and status
3. Click a campaign to see the associated call flow and call history

**Requires module:** `campaigns`

---

#### Settings

**What it does:** Manage your account profile and notification preferences.

**How to use:**
1. Click **Settings** → `/portal/:slug/settings`
2. Update contact information and timezone
3. Set notification preferences

**Requires module:** `settings`

---

### Common WL Client Tasks

**Check yesterday's calls:**
1. Calls → filter to yesterday → review list

**Request a callback for a prospect:**
1. Outbound Requests → fill in details → Submit

**Report an issue with your service:**
1. Support → + New Ticket → describe the problem → Submit

---

## 11. Affiliate Portal

**URL:** `/affiliate`  
**Role:** `affiliate`

### Who is this for?

Affiliate partners who earn commissions by referring new clients to 24H Virtual. They use the portal to track referrals, monitor earnings, request payouts, and download marketing materials.

### How to log in

1. Go to `/login` with an affiliate account
2. You land on `/affiliate`

### Dashboard Overview

The affiliate dashboard shows:
- KPI cards: Total Earnings, Available Balance, Total Referrals, Conversions
- Your unique referral link with one-click copy
- Commission rate and tier bonus display
- Tabs: Referrals, Payouts, Support, Marketing

---

### Features

#### Your Referral Link

**What it does:** Your unique tracking link. Anyone who signs up via this link is attributed to you.

**How to use:**
1. On the dashboard, your referral link is displayed prominently
2. Click **Copy** to copy it to your clipboard
3. Share via email, social media, your website, or directly with prospects
4. Commission rate shown: $150 conversion bonus + tier monthly bonus (Standard/Silver/Gold/Platinum)

**Who can see this:** `affiliate`

---

#### Referral Tracking

**What it does:** Track everyone who clicked your link and their current status.

**How to use:**
1. Click **Referrals** tab (or `/affiliate/referrals`)
2. View a table of all referrals with:
   - Referred name and email
   - Current status: clicked, signed_up, converted
   - Commission amount
   - Date of click
3. "Converted" = a paying client. That's when you earn your commission.

**Who can see this:** `affiliate`

---

#### Payout Management

**What it does:** View your payout history and request a payout of your available balance.

**How to use:**
1. Click **Payouts** tab (or `/affiliate/payouts`)
2. View your payout history: amount, status, payment method, date requested, date processed
3. Available balance shown at the top (total earnings − paid out − pending payouts)
4. Click **Request Payout** when your balance is available
5. Select payment method and submit
6. Typical processing time varies by payment method

**Who can see this:** `affiliate`

---

#### Performance Metrics

**What it does:** Detailed analytics on your referral and conversion performance.

**How to use:**
1. Click **Performance** → `/affiliate/performance`
2. View: click-through rate, conversion rate, earnings by month, best-performing channels
3. Use this to optimize where and how you promote your link

**Who can see this:** `affiliate`

---

#### Marketing Materials

**What it does:** Download branded banners, email templates, and other promotional assets.

**How to use:**
1. Click **Marketing** tab (or `/affiliate/marketing`)
2. Browse available assets: Banner 300×250, Banner 728×90, Email Templates
3. Click **Download** on any asset
4. Use assets on your website, in emails, or on social media — always include your referral link

**Who can see this:** `affiliate`

---

#### Brand Assets

**What it does:** Official 24H Virtual logos and brand guidelines for affiliates.

**How to use:**
1. Click **Brand Assets** → `/affiliate/brand-assets`
2. Download logos in various formats (PNG, SVG, horizontal, stacked)
3. Follow brand guidelines when creating your own promotional materials

**Who can see this:** `affiliate`

---

#### Affiliate Support

**What it does:** Submit support tickets to the 24H affiliate team.

**How to use:**
1. Click **Support** tab (or `/affiliate/support`)
2. Submit a ticket for: commission questions, payout delays, marketing help, technical issues
3. Track replies in the **Tickets** sub-tab

**Who can see this:** `affiliate`

---

### Common Affiliate Tasks

**Copy your referral link:**
1. Dashboard → click **Copy** next to the referral URL

**Check if a referral converted:**
1. Referrals tab → look for the prospect's email → check status column for "converted"

**Request a payout:**
1. Payouts tab → check Available balance → Request Payout → select method → submit

**Download a banner for your website:**
1. Marketing tab → Banner 300×250 → Download

---

## Appendix: Quick Reference

### All Portal URLs

| Portal | URL | Role |
|--------|-----|------|
| Admin | `/admin` | `admin` |
| Client | `/client-dashboard` | `client` |
| Agent | `/staff/agent` | `agent` |
| Supervisor | `/staff/supervisor` | `supervisor` |
| Sales | `/staff/sales` | `sales` |
| Billing | `/staff/billing` | `billing` |
| Tech Support | `/staff/tech` | `tech` |
| HR | `/hr-portal` | `hr` |
| WL Partner | `/white-label-dashboard` | `white_label` |
| WL Client | `/portal/:slug` | `wl_client` |
| Affiliate | `/affiliate` | `affiliate` |

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `qa-admin@24hv-test.com` | `QATestPass123!` |
| Agent | `qa-agent@24hv-test.com` | `QATestPass123!` |
| Supervisor | `qa-supervisor@24hv-test.com` | `QATestPass123!` |
| Client | `qa-client@24hv-test.com` | `QATestPass123!` |
| WL Partner | `qa-wl-owner@24hv-test.com` | `QATestPass123!` |
| WL Client 1 | `qa-wl-client1@24hv-test.com` | `QATestPass123!` |
| WL Partner B | `qa-wl-partner-b@24hv-test.com` | `QATestPass123!` |

### How Login Routing Works

After login, the platform automatically routes you to the correct portal based on your role:

```
admin       → /admin
sales       → /staff/sales
supervisor  → /staff/supervisor
billing     → /staff/billing
agent       → /staff/agent
tech        → /staff/tech
hr          → /hr-portal
white_label → /white-label-dashboard
affiliate   → /affiliate
wl_client   → /portal/:your-slug
client      → /client-dashboard
```

### Jumping Between Portals (Admin Only)

Admins can switch between any portal using the **floating grid button** (⊞) in the bottom-right corner. Click it to open the Dashboard Switcher and select any portal to jump directly to it.
