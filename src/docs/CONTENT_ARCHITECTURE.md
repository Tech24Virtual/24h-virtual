# 24H Virtual — System Architecture

> This is the high-level architecture for 24H Virtual. Store it as the source-of-truth system design. When you generate routes, components, or flows, align them with these three layers and this terminology.

## Front-End Growth Layer

This is everything that attracts prospects and turns them into leads. It includes the public website and landing pages, interactive tools (ROI Calculator, Launch Estimator, Call‑Flow Builder), lead capture forms with UTM tracking, and the Growth Hub content engine (blog posts, keyword tracking, newsletters, social snippets, SEO reports). Its purpose is revenue generation — driving traffic, capturing interest, and feeding clean, attributed leads into the CRM pipeline.

## Service Delivery Layer

This is the operational core that fulfills the service once a client signs up. It covers the CRM with its 7‑stage pipeline, client onboarding checklists, script and call‑flow management, Five9 call ingestion, Reach59 SMS bridge, and all staff portals (Sales, Agent, Supervisor, Billing, HR, Tech Support). Tasks, ticketing, call logs, meetings, and notifications live here. Its purpose is value delivery — answering calls, handling customers, coordinating the team, and keeping SLAs and outcomes on track.

## Platform & Partner Layer

This is the infrastructure for scaling, reselling, and administrating. It includes the Admin dashboard, RBAC/RLS across all roles, white‑label partner dashboards and WL client portals, affiliate tracking, Stripe billing and dunning, Airwallex payroll, edge functions, analytics, and system health views. Its purpose is leverage — letting 24H grow through partners, automation, and multi‑tenant architecture instead of linear headcount.

## How Overlaps Are Handled

The Growth Hub exists in both Growth (for 24H's own marketing) and Platform & Partner (for white‑label partners using their own Growth Hub), but they are treated as separate tenants/tables. The Sales portal is considered part of Service Delivery, even though commissions and proposals touch Platform; CRM attribution simply consumes data from the Growth layer rather than living there.

---

# Content Architecture — 24H Virtual

## Source of Truth

### Admin Content (24Hvirtual.com)
- **Source of truth**: Mrunsox / Kingdom OS
- The `blog_posts` table in 24H is a **read-only mirror**
- Content is generated and managed in Mrunsox, then synced to 24H
- Posts synced from Mrunsox have `source = 'mrunsox'`
- Legacy posts created locally have `source = 'local'`

### WL Partner Content
- **Source of truth**: existing `wl_*` tables in the 24H project
- Partners generate and manage content entirely within the WL Growth Hub
- No dependency on Mrunsox whatsoever
- Tables: `wl_blog_queue`, `wl_keyword_tracker`, `wl_newsletter_drafts`, `wl_seo_reports`, `wl_social_snippets`, `wl_wordpress_connections`

## Path & Offer Tagging

- `primary_path` and `primary_offer` columns on `blog_posts` are **read-only metadata** synced from Mrunsox
- Used for analytics filtering on the admin side
- WL partners do not see or interact with these fields

## Isolation Rules

| Concern | Admin (24H HQ) | WL Partner |
|---|---|---|
| Content source | Mrunsox (synced) | `wl_*` tables (local) |
| Blog table | `blog_posts` (read-only mirror) | `wl_blog_queue` |
| Keywords | `keyword_tracker` (reference) | `wl_keyword_tracker` |
| Edge functions | `generate-blog-post` (legacy) | `wl-generate-blog-post` |
| Path/offer tags | `primary_path`, `primary_offer` | N/A |
