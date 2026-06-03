/**
 * Plain-English overlay for /outline.
 *
 * The catalog of items still lives in `src/data/buildMap.ts` (do not edit
 * that file for copy changes). This file only translates the existing item
 * IDs into founder-friendly titles, outcomes, and acceptance criteria.
 *
 * Anything not listed here falls back to `BuildMapItem.name` and
 * `BuildMapItem.description` from buildMap.ts.
 */

export interface OutlineLabel {
  /** Plain-English title shown in the console. */
  title: string;
  /** One-sentence outcome — what this means for the founder, not the dev. */
  outcome: string;
  /** Bullet list summarizing what "done" looks like. */
  acceptance?: string[];
  /** Optional short risk / dependency note. */
  note?: string;
}

export const outlineLabels: Record<string, OutlineLabel> = {
  // ── Phase A: Product Coherence ────────────────────────────────
  "p0-1-realignment-doc": {
    title: "Product map locked",
    outcome: "We have one canonical map of pages, personas, and flows that everyone builds against.",
    acceptance: ["IA, nav, and persona flows agree", "No orphan or contradictory pages"],
  },
  "p0-2-supervisor-lock": {
    title: "Supervisor scope frozen for now",
    outcome: "Supervisor acts as admin until the real assignment model ships later.",
    acceptance: ["Supervisor sees admin-equivalent surfaces", "True scoping queued for later"],
  },
  "p0-3-nav-cleanup": {
    title: "Navigation cleaned up",
    outcome: "Every persona's sidebar links somewhere real.",
  },
  "p0-4-agent-clients-scope": {
    title: "Agents only see their own clients",
    outcome: "Agent dashboard no longer leaks the full client list.",
  },
  "p0-5-admin-overview-totals": {
    title: "Admin totals are accurate",
    outcome: "Top-line client count on the admin overview matches the real database count.",
  },
  "p0-6-naming-cleanup": {
    title: "Naming is consistent across the app",
    outcome: "Page titles and nav labels match the canonical names.",
  },

  // ── Phase B: Foundation ───────────────────────────────────────
  "tenant-identity-helpers": {
    title: "Tenant separation enforced everywhere",
    outcome: "One client cannot see another client's data, even by accident.",
    acceptance: ["Cross-tenant reads blocked", "Cross-tenant writes blocked"],
  },
  "tenant-brand-profiles": {
    title: "Per-partner branding storage",
    outcome: "White Label partners can carry their own colors and logos through to their clients.",
  },
  "client-contacts-table": {
    title: "Client contacts",
    outcome: "Each client can have multiple named contacts with roles.",
  },
  "client-departments-table": {
    title: "Call Flows (formerly Departments)",
    outcome: "Each client can have multiple call flows with their own lifecycle.",
    acceptance: ["Create / edit / archive a call flow", "Lifecycle states visible in admin"],
  },
  "department-numbers": {
    title: "Phone numbers and routing",
    outcome: "Each call flow can carry its inbound numbers, transfer numbers, and DNIS.",
  },
  "campaign-audit-log": {
    title: "Audit trail for Campaigns changes",
    outcome: "Every meaningful Campaigns edit is recorded so we can answer 'who changed what'.",
  },
  "faq-entries-resolver": {
    title: "FAQ knowledge base",
    outcome: "FAQs can be authored at the right scope and surface in the right places.",
  },
  "policy-blocks-resolver": {
    title: "Policy knowledge base",
    outcome: "Policies can be authored at the right scope and surface in the right places.",
  },
  "knowledge-versions": {
    title: "Knowledge change history",
    outcome: "Edits to FAQs and policies are versioned so we can see what changed.",
  },
  "field-groups-fields-options": {
    title: "Custom intake fields",
    outcome: "We can define what info to collect on each call, grouped logically.",
  },
  "field-visibility-rules": {
    title: "Show / hide fields per audience",
    outcome: "Internal-only fields stay internal; client-visible ones surface where they should.",
  },
  "field-display-labels": {
    title: "Field labels per audience",
    outcome: "The same field can read differently for an agent vs a client vs an end-client.",
  },
  "resolve-fields-audience": {
    title: "Field projection helper",
    outcome: "One call returns the right fields with the right labels for whoever is looking.",
  },
  "five9-variable-mappings": {
    title: "Five9 field mapping",
    outcome: "Our fields are wired to Five9's call variables so data flows in and out cleanly.",
  },
  "campaign-os-hooks": {
    title: "Campaigns data hooks",
    outcome: "The app has the helpers it needs to read and write Campaigns data safely.",
  },
  "admin-departments-ui": {
    title: "Admin: manage Call Flows",
    outcome: "Admins can create and edit call flows from the admin Campaigns area.",
  },
  "admin-fields-ui": {
    title: "Admin: manage fields",
    outcome: "Admins can author groups, fields, options, and labels from one place.",
  },
  "admin-faqs-ui": {
    title: "Admin: manage FAQs",
    outcome: "Draft → review → approve → archive lifecycle for FAQs.",
  },
  "admin-policies-ui": {
    title: "Admin: manage policies",
    outcome: "Draft → review → approve → archive lifecycle for policies.",
  },
  "admin-five9-mappings-ui": {
    title: "Admin: manage Five9 mapping",
    outcome: "Admins can map fields to Five9 variables per tenant.",
  },
  "drafts-review-ui": {
    title: "Drafts review queue",
    outcome: "All pending FAQ, policy, and field drafts in one place.",
  },
  "campaign-os-route-guards": {
    title: "Admin-only Campaigns access",
    outcome: "Non-admins cannot reach the admin Campaigns pages.",
  },

  // ── Wave 1: Campaigns + Build Packet ──────────────────────────
  "wave-1-batch-a": {
    title: "Campaign records and scenarios",
    outcome: "Each call flow has exactly one campaign and a list of scenarios with the right separation between clients.",
  },
  "wave-1-batch-b": {
    title: "Campaign create / edit / archive",
    outcome: "Admins can create, edit, and archive campaigns from the UI.",
  },
  "wave-1-batch-c": {
    title: "Admin Campaigns workspace",
    outcome: "A full admin area to author every part of a campaign in one place.",
    acceptance: [
      "List of campaigns",
      "Detail page with tabs for scenarios, FAQs, policies, fields, Five9, Build Packet",
    ],
  },
  "wave-1-batch-d": {
    title: "Build Packet PDF",
    outcome: "One downloadable PDF that summarizes everything an agent needs to handle a campaign.",
    acceptance: ["PDF exports cleanly", "Empty sections show a warning, not blank pages"],
  },
  "wave-1-polish": {
    title: "Wave 1 polish",
    outcome: "Empty states, archived-campaign lockouts, and the launch-checklist diagnostics are clean.",
  },

  // ── Wave 2: Live Script + Runtime ─────────────────────────────
  "wave-2-script-schema": {
    title: "Live Script storage",
    outcome: "We can save a structured live script (blocks and branches), not just a text blob.",
  },
  "wave-2-script-builder-ui": {
    title: "Live Script builder",
    outcome: "Three-pane editor to author the live script with branches, FAQs, policies, fields, and Five9 fields linked in.",
  },
  "wave-2-publish-rollback": {
    title: "Publish and rollback",
    outcome: "Admins can publish a script version and roll back to a previous version safely.",
  },
  "wave-2-runtime-bundle": {
    title: "Runtime data feed",
    outcome: "Five9 can pull the published script and its supporting data on demand.",
  },
  "wave-2-runtime-iframe": {
    title: "Five9 in-call view",
    outcome: "Agents see the published script inside Five9 with no public-site chrome around it.",
  },
  "wave-2-legacy-cutover": {
    title: "Move legacy scripts onto Campaigns",
    outcome: "Old per-client scripts can be cut over to a campaign safely and reversibly.",
  },

  // ── Wave 3: Training + Go-Live ────────────────────────────────
  "wave-3-training-modules": {
    title: "Training modules and signoffs",
    outcome: "Each campaign has training content and we track which agent has signed off.",
    acceptance: ["Author a module", "Agent completes it", "Supervisor signs off"],
  },
  "wave-3-readiness-gates": {
    title: "Go-live checks",
    outcome: "A campaign cannot go live until script, FAQs, policies, and training are all in place.",
  },
  "wave-3-cutover-tooling": {
    title: "Per-campaign cutover",
    outcome: "Cleanly cut a single campaign over from legacy to the new flow with rollback safety.",
  },

  // ── Phase F: Post-MVP enhancements ────────────────────────────
  "phase-f-quizzes": {
    title: "Training quizzes",
    outcome: "Inline knowledge checks inside training modules.",
  },
  "phase-f-retraining-expiry": {
    title: "Auto-retraining when content changes",
    outcome: "When a campaign's content changes materially, agents are auto-retasked to retrain.",
  },
  "phase-f-version-diff": {
    title: "Visual diff between published versions",
    outcome: "See exactly what changed between two published versions of a campaign.",
  },
  "phase-f-ai-script-drafting": {
    title: "AI-assisted script drafts",
    outcome: "Generate an initial draft of new script blocks with AI.",
  },
  "phase-f-template-marketplace": {
    title: "Reusable campaign templates",
    outcome: "Share campaign templates across tenants.",
  },

  // ── Phase G: Persona Expansion ────────────────────────────────
  "phase-g-direct-client-co": {
    title: "Active Accounts Campaigns view",
    outcome: "Direct active accounts can see and (within limits) edit their own Campaigns data.",
  },
  "phase-g-wl-partner-co": {
    title: "WL Partners Campaigns view",
    outcome: "WL Partners can author Campaigns content across their full book of active accounts.",
  },
  "phase-g-wl-end-client-co": {
    title: "WL End-Client Campaigns view",
    outcome: "End clients see their Campaigns data under the partner's brand.",
  },
  "supervisor-true-scoping": {
    title: "Real supervisor scoping",
    outcome: "Supervisors are scoped to their assigned tenants instead of seeing everything.",
  },

  // ── Phase H: Operational Intelligence ─────────────────────────
  "phase-h-cross-campaign-reporting": {
    title: "Cross-campaign reporting",
    outcome: "Reports that span multiple campaigns and tenants for admins.",
  },
  "phase-h-scenario-effectiveness": {
    title: "Scenario effectiveness",
    outcome: "Track which scenarios actually drive the outcomes we want.",
  },
  "phase-h-five9-drift-detection": {
    title: "Five9 drift detection",
    outcome: "Catch mismatches between what we published and what is live in Five9.",
  },
};
