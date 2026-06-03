/**
 * Phase 39 — QA Readiness & Test Harness
 *
 * Lightweight, operational layer that packages the product for an external
 * Computer-driven QA cycle (Perplexity Computer / UAT).
 *
 * Constants describe the frozen QA scope, seeded personas, scenario scripts,
 * regression pack, and defect template. Nothing here introduces new product
 * logic — it only documents and tracks readiness. Release gate decisions are
 * persisted in `qa_release_gates` (admin-only).
 */

import { supabase } from "@/integrations/supabase/client";

// ────────────────────────────────────────────────────────────────────────────
// QA SCOPE (frozen for the current Computer-QA round)
// ────────────────────────────────────────────────────────────────────────────

export interface QAScopeArea {
  id: string;
  surface: string;
  included: string[];
  excluded?: string[];
}

export const QA_SCOPE_AREAS: QAScopeArea[] = [
  {
    id: "admin-intelligence",
    surface: "Admin Intelligence",
    included: [
      "Executive Finance / MRR spine",
      "Subscriptions & retention",
      "Forecasts, Calibration, Planning, Period Close",
      "Approvals & Deals (Phase 33–34)",
      "Exports catalog",
    ],
    excluded: ["Custom BI dashboards beyond v_bi_* mirrors"],
  },
  {
    id: "offers-experiments",
    surface: "Offers & Experiments",
    included: ["Offer eligibility", "Experiment Ops guardrails", "Pricing Lab read-only"],
    excluded: ["New experiment authoring (read-only this round)"],
  },
  {
    id: "renewals-deals-approvals",
    surface: "Renewals / Deals / Approvals",
    included: [
      "Renewal workflow visibility",
      "Deal stage progression",
      "Discount/term governance triggers",
      "Approval timeline & decisions",
    ],
  },
  {
    id: "partner-dashboard",
    surface: "WL Partner Dashboard",
    included: ["Partner-safe success hints", "Partner-scoped billing", "Branded portal access"],
    excluded: ["Partner-side experiment authoring"],
  },
  {
    id: "direct-client-dashboard",
    surface: "Direct Client Dashboard",
    included: ["Client guidance card", "Schedule, call logs, support, billing tabs"],
    excluded: ["Internal staff labels must remain hidden"],
  },
  {
    id: "exports-snapshots",
    surface: "Exports / Snapshots / Board Pack",
    included: [
      "EXPORT_CATALOG downloads",
      "Forecast snapshots (Phase 36)",
      "RevOps period snapshots (Phase 38)",
      "Board Pack PDF (Phase 22)",
    ],
  },
  {
    id: "auth-permissions",
    surface: "Auth & Permissions",
    included: [
      "Login / role gating across all 11 portals",
      "RLS enforcement on admin-only tables",
      "Cross-role admin bypass with audit trail",
    ],
  },
];

export const QA_DEFERRED: string[] = [
  "Scheduled / cron snapshot capture",
  "Automatic Board Pack PDF attachment to RevOps snapshots",
  "Per-individual headcount tracking",
  "Full GAAP financial close",
  "Auto-applied calibration suggestions",
];

// ────────────────────────────────────────────────────────────────────────────
// SEEDED TEST PERSONAS
// ────────────────────────────────────────────────────────────────────────────

export interface QAPersona {
  id: string;
  label: string;
  role: string;
  email: string;
  purpose: string;
  seededState: string[];
}

export const QA_PERSONAS: QAPersona[] = [
  {
    id: "qa-superadmin",
    label: "Super Admin",
    role: "admin",
    email: "qa.superadmin@24hvirtual.test",
    purpose: "Full admin coverage: intelligence, approvals, snapshots, mission control.",
    seededState: ["At least one open deal", "One pending approval", "One forecast snapshot", "One RevOps snapshot"],
  },
  {
    id: "qa-admin-approver",
    label: "Admin Approver",
    role: "admin",
    email: "qa.approver@24hvirtual.test",
    purpose: "Discount/term approval workflow as a second admin.",
    seededState: ["A pending approval routed to admin role"],
  },
  {
    id: "qa-wl-partner-healthy",
    label: "WL Partner (Healthy)",
    role: "white_label",
    email: "qa.partner.ok@24hvirtual.test",
    purpose: "Partner dashboard happy path: branding, leads, billing.",
    seededState: ["Active branding", "≥3 active end-clients", "Recent invoice"],
  },
  {
    id: "qa-wl-partner-atrisk",
    label: "WL Partner (At-Risk)",
    role: "white_label",
    email: "qa.partner.risk@24hvirtual.test",
    purpose: "At-risk visibility, retention hints (no admin-only fields).",
    seededState: ["At-risk score on portfolio", "Renewal in window"],
  },
  {
    id: "qa-direct-healthy",
    label: "Direct Client (Healthy)",
    role: "client",
    email: "qa.client.ok@24hvirtual.test",
    purpose: "Standard client portal happy path.",
    seededState: ["Active subscription", "Recent call logs", "No open tickets"],
  },
  {
    id: "qa-direct-renewal",
    label: "Direct Client (Renewal Window)",
    role: "client",
    email: "qa.client.renew@24hvirtual.test",
    purpose: "Renewal banner / guidance card visibility.",
    seededState: ["Subscription within 60-day renewal window", "One scheduled offer exposure"],
  },
  {
    id: "qa-supervisor",
    label: "Supervisor",
    role: "supervisor",
    email: "qa.supervisor@24hvirtual.test",
    purpose: "SLA, team queue, training signoffs.",
    seededState: ["At least one agent on shift", "One open SLA-tracked ticket"],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TEST SCRIPT CATALOG
// ────────────────────────────────────────────────────────────────────────────

export type QASeverity = "critical" | "high" | "medium" | "low";

export interface QATestScript {
  id: string;
  area: string;
  persona: string;
  title: string;
  preconditions: string[];
  steps: string[];
  expected: string;
  severityIfFailed: QASeverity;
  negative?: boolean;
}

export const QA_TEST_SCRIPTS: QATestScript[] = [
  {
    id: "TS-01",
    area: "Forecasts",
    persona: "Super Admin",
    title: "Admin can view and edit forecast assumptions",
    preconditions: ["Logged in as qa.superadmin"],
    steps: [
      "Navigate to /admin/intelligence → Revenue Forecast tab",
      "Open Assumptions sub-tab",
      "Edit churn rate, save",
    ],
    expected: "Save succeeds, forecast trajectory recomputes on next reload, no console errors.",
    severityIfFailed: "high",
  },
  {
    id: "TS-02",
    area: "Approvals",
    persona: "Super Admin",
    title: "Deal requiring approval cannot advance before approval",
    preconditions: ["Open deal with discount > governance threshold"],
    steps: [
      "Open Deals tab",
      "Try to move deal to Closed-Won",
      "Observe approval requirement",
    ],
    expected: "UI blocks advancement; approval timeline shows pending request.",
    severityIfFailed: "critical",
    negative: true,
  },
  {
    id: "TS-03",
    area: "WL Partner",
    persona: "WL Partner (At-Risk)",
    title: "WL partner sees own economics hints but not admin-only fields",
    preconditions: ["Logged in as qa.partner.risk"],
    steps: ["Open partner dashboard", "Inspect retention/at-risk hints"],
    expected: "Hints visible; no admin-only labels (margin, internal scores) leak.",
    severityIfFailed: "critical",
  },
  {
    id: "TS-04",
    area: "Direct Client",
    persona: "Direct Client (Renewal Window)",
    title: "Direct client sees guidance card without internal labels",
    preconditions: ["Logged in as qa.client.renew"],
    steps: ["Open /client-dashboard", "Inspect guidance / renewal card"],
    expected: "Renewal hint visible; no internal staff labels or admin terminology shown.",
    severityIfFailed: "high",
  },
  {
    id: "TS-05",
    area: "Period Close",
    persona: "Super Admin",
    title: "Snapshot capture creates immutable period record",
    preconditions: ["Most recent fully completed month available"],
    steps: [
      "Open Period Close tab",
      "Capture snapshot with label e.g. '2026-04-QA'",
      "Re-capture same label without force",
    ],
    expected: "First capture succeeds; second errors clearly; force=true overwrites atomically.",
    severityIfFailed: "high",
  },
  {
    id: "TS-06",
    area: "Offers",
    persona: "Direct Client (Renewal Window)",
    title: "Offer selection respects eligibility and guardrails",
    preconditions: ["Eligible offer exposure for client"],
    steps: ["Open offer surface", "Attempt selection of ineligible offer (negative path)"],
    expected: "Eligible offer accepts; ineligible blocked with clear messaging.",
    severityIfFailed: "critical",
    negative: true,
  },
  {
    id: "TS-07",
    area: "Exports",
    persona: "Super Admin",
    title: "Export entries download and match visible data",
    preconditions: ["Exports tab populated"],
    steps: ["Open Exports tab", "Trigger one v_bi_* export", "Open file"],
    expected: "Download succeeds; row counts and headers match the on-screen view.",
    severityIfFailed: "medium",
  },
  {
    id: "TS-08",
    area: "Auth / RLS",
    persona: "Direct Client (Healthy)",
    title: "Direct client cannot access admin routes",
    preconditions: ["Logged in as qa.client.ok"],
    steps: ["Navigate to /admin/intelligence directly"],
    expected: "Redirected to /unauthorized; no admin data leaks via network panel.",
    severityIfFailed: "critical",
    negative: true,
  },
  {
    id: "TS-09",
    area: "Calibration",
    persona: "Super Admin",
    title: "Calibration shows forecast vs actuals for completed periods",
    preconditions: ["At least one captured forecast snapshot older than current month"],
    steps: ["Open Calibration tab → Vs Actuals sub-tab"],
    expected: "Variance rows render for completed months; suggestions advisory only.",
    severityIfFailed: "medium",
  },
  {
    id: "TS-10",
    area: "Planning",
    persona: "Super Admin",
    title: "Capacity gaps recompute when supply changes",
    preconditions: ["Capacity assumptions seeded"],
    steps: ["Add a supply row in Planning → Supply tab", "Reload Gaps tab"],
    expected: "Gap rows reflect new supply within rounding; no NaN values.",
    severityIfFailed: "medium",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// HIGH-RISK REGRESSION PACK
// ────────────────────────────────────────────────────────────────────────────

export interface QARegressionItem {
  id: string;
  label: string;
  severity: QASeverity;
  scriptIds: string[];
}

export const QA_REGRESSION_PACK: QARegressionItem[] = [
  { id: "RG-AUTH", label: "Auth + role visibility across 11 portals", severity: "critical", scriptIds: ["TS-08"] },
  { id: "RG-RLS", label: "RLS boundaries on admin-only tables", severity: "critical", scriptIds: ["TS-08", "TS-03"] },
  { id: "RG-APPROVALS", label: "Deal approvals enforcement", severity: "critical", scriptIds: ["TS-02"] },
  { id: "RG-OFFERS", label: "Offer selection / checkout branching", severity: "critical", scriptIds: ["TS-06"] },
  { id: "RG-EXPORTS", label: "Exports match visible data", severity: "high", scriptIds: ["TS-07"] },
  { id: "RG-SNAPSHOTS", label: "Snapshots and period close immutability", severity: "high", scriptIds: ["TS-05"] },
  { id: "RG-FORECASTS", label: "Forecast edits & calibration recompute", severity: "high", scriptIds: ["TS-01", "TS-09"] },
  { id: "RG-SUCCESS", label: "Partner / direct success visibility separation", severity: "critical", scriptIds: ["TS-03", "TS-04"] },
];

// ────────────────────────────────────────────────────────────────────────────
// DEFECT HANDOFF TEMPLATE
// ────────────────────────────────────────────────────────────────────────────

export const QA_DEFECT_TEMPLATE = {
  fields: [
    "title",
    "persona",
    "area",
    "script_id",
    "repro_steps",
    "expected",
    "actual",
    "severity",
    "screenshot_or_video",
    "console_errors",
    "network_failures",
  ],
  severityScale: ["critical", "high", "medium", "low"] as QASeverity[],
} as const;

export function defectMarkdownTemplate(): string {
  return [
    "## Defect Report",
    "",
    "**Title:** ",
    "**Persona / Role:** ",
    "**Area / Surface:** ",
    "**Related Script ID:** ",
    "",
    "### Repro Steps",
    "1. ",
    "2. ",
    "3. ",
    "",
    "### Expected",
    "",
    "### Actual",
    "",
    "**Severity:** critical | high | medium | low",
    "**Screenshot / Video:** ",
    "**Console errors:** ",
    "**Network failures:** ",
  ].join("\n");
}

// ────────────────────────────────────────────────────────────────────────────
// RELEASE GATE CHECKLIST (canonical items)
// ────────────────────────────────────────────────────────────────────────────

export interface QAGateCheck {
  name: string;
  status: "pending" | "pass" | "fail" | "na";
  notes?: string;
}

export const DEFAULT_GATE_CHECKS: QAGateCheck[] = [
  { name: "Environment ready (preview reachable, no 5xx)", status: "pending" },
  { name: "Test accounts available for all personas", status: "pending" },
  { name: "Migrations applied (latest Phase 38 + 39)", status: "pending" },
  { name: "Role enforcement spot-checked (TS-08)", status: "pending" },
  { name: "Critical scripts passed (TS-02, TS-06, TS-08)", status: "pending" },
  { name: "High-risk regression pack passed", status: "pending" },
  { name: "Known bugs reviewed and triaged", status: "pending" },
  { name: "Go / No-Go decision recorded", status: "pending" },
];

// ────────────────────────────────────────────────────────────────────────────
// DB layer for release gates
// ────────────────────────────────────────────────────────────────────────────

export interface QAReleaseGate {
  id: string;
  release_label: string;
  scope_summary: string | null;
  scope_json: Record<string, unknown>;
  gate_checks: QAGateCheck[];
  decision: "pending" | "go" | "no_go";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  decided_by: string | null;
  decided_at: string | null;
}

export async function listReleaseGates(): Promise<QAReleaseGate[]> {
  const { data, error } = await (supabase as any)
    .from("qa_release_gates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QAReleaseGate[];
}

export async function createReleaseGate(input: {
  release_label: string;
  scope_summary?: string;
  scope_json?: Record<string, unknown>;
  gate_checks?: QAGateCheck[];
  notes?: string;
}): Promise<QAReleaseGate> {
  const payload = {
    release_label: input.release_label,
    scope_summary: input.scope_summary ?? null,
    scope_json: input.scope_json ?? { areas: QA_SCOPE_AREAS.map((a) => a.id), deferred: QA_DEFERRED },
    gate_checks: input.gate_checks ?? DEFAULT_GATE_CHECKS,
    notes: input.notes ?? null,
  };
  const { data, error } = await (supabase as any)
    .from("qa_release_gates")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as QAReleaseGate;
}

export async function updateGateChecks(id: string, gate_checks: QAGateCheck[]): Promise<void> {
  const { error } = await (supabase as any)
    .from("qa_release_gates")
    .update({ gate_checks })
    .eq("id", id);
  if (error) throw error;
}

export async function recordDecision(
  id: string,
  decision: "go" | "no_go",
  notes?: string,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await (supabase as any)
    .from("qa_release_gates")
    .update({
      decision,
      notes: notes ?? null,
      decided_at: new Date().toISOString(),
      decided_by: userData.user?.id ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteReleaseGate(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("qa_release_gates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
