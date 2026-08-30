/**
 * Phase 3 — Canonical Revenue pipeline model.
 *
 * One stage vocabulary used across admin + staff sales surfaces. The DB
 * `leads_pipeline_stage_check` constraint enforces these values; the
 * `trg_leads_emit_stage_change` and `leads_stamp_stage_dates` triggers wire
 * audit/observability automatically.
 */

export type PipelineStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "sales"
  | "onboarding"
  | "ready_for_billing"
  | "active"
  | "won"
  | "lost"
  | "churned";

export interface PipelineStageMeta {
  key: PipelineStage;
  label: string;
  /** Logical bucket: working = active sales effort, terminal = closed. */
  bucket: "working" | "delivery" | "terminal";
  color: string;
  description: string;
}

export const PIPELINE_STAGES: PipelineStageMeta[] = [
  { key: "new",                label: "New",                bucket: "working",  color: "bg-blue-500",   description: "Captured via canonical intake; awaiting first touch." },
  { key: "contacted",          label: "Contacted",          bucket: "working",  color: "bg-sky-500",    description: "First outreach made; awaiting reply." },
  { key: "qualified",          label: "Qualified",          bucket: "working",  color: "bg-purple-500", description: "Fit confirmed; ready for proposal/meeting." },
  { key: "proposal",           label: "Proposal",           bucket: "working",  color: "bg-orange-500", description: "Active proposal sent or under negotiation." },
  { key: "sales",              label: "In Sales",           bucket: "working",  color: "bg-yellow-500", description: "Owned by a sales rep; active conversion." },
  { key: "won",                label: "Won",                bucket: "working",  color: "bg-emerald-500",description: "Closed-won; eligible for handoff to Delivery." },
  { key: "onboarding",         label: "Onboarding",         bucket: "delivery", color: "bg-indigo-500", description: "Handed off; onboarding in progress." },
  { key: "ready_for_billing",  label: "Ready for Billing",  bucket: "delivery", color: "bg-cta",        description: "Delivery handoff confirmed; billing setup pending." },
  { key: "active",             label: "Active Client",      bucket: "delivery", color: "bg-secondary",  description: "Live, billable client." },
  { key: "lost",               label: "Lost",               bucket: "terminal", color: "bg-red-500",    description: "Did not convert; closed-lost." },
  { key: "churned",            label: "Churned",            bucket: "terminal", color: "bg-muted",      description: "Was active, no longer billable." },
];

export const PIPELINE_STAGE_KEYS = PIPELINE_STAGES.map(s => s.key);

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> =
  Object.fromEntries(PIPELINE_STAGES.map(s => [s.key, s.label])) as Record<PipelineStage, string>;

/** Stages a sales rep should see on the kanban (excludes delivery/terminal noise). */
export const SALES_BOARD_STAGES: PipelineStage[] = [
  "new", "contacted", "qualified", "sales", "proposal", "won", "lost",
];

/** Stages eligible to trigger Revenue→Delivery handoff via convert_lead_to_delivery. */
export const HANDOFF_ELIGIBLE_STAGES: PipelineStage[] = [
  "qualified", "proposal", "sales", "won",
];

export function isHandoffEligible(stage: string | null | undefined): boolean {
  return !!stage && (HANDOFF_ELIGIBLE_STAGES as string[]).includes(stage);
}

export function isTerminalStage(stage: string | null | undefined): boolean {
  return stage === "lost" || stage === "churned";
}

export const ALLOWED_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  new:               ['contacted', 'lost'],
  contacted:         ['qualified', 'lost'],
  qualified:         ['proposal', 'won', 'lost'],
  proposal:          ['won', 'lost', 'qualified'],
  sales:             ['onboarding', 'won', 'lost'],
  onboarding:        ['ready_for_billing', 'lost'],
  ready_for_billing: ['active'],
  active:            ['churned'],
  won:               ['active', 'lost'],
  lost:              ['contacted'],
  churned:           ['contacted'],
};

export function canTransition(from: PipelineStage, to: PipelineStage): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Map a public/marketing intake source to its initial pipeline stage. */
export function stageForSource(source: string | null | undefined): PipelineStage {
  // Direct demo/consultation requests come in pre-qualified.
  if (source === "demo_consultation") return "contacted";
  return "new";
}
