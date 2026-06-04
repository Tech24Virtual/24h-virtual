/**
 * Phase 15 — Self-Serve Onboarding / Activation Optimization
 *
 * Canonical activation model + derivers used across:
 *   - Direct client dashboard (/client-dashboard)
 *   - WL partner dashboard  (/white-label-dashboard)
 *   - WL end-client portal  (/portal/:slug or wl-portal)
 *   - Admin Intelligence    (/admin/intelligence → Activation tab)
 *
 * Truth-over-theatrics rules:
 *   1. Every milestone state is derived from canonical readiness/service/
 *      delivery views (Phases 4–6) or `leads.onboarding_checklist`.
 *      No invented "completion %" disconnected from real signals.
 *   2. Each milestone is tagged as `user_action`, `support_dependent`,
 *      or `info` so the UI never asks a client/partner to fix something
 *      that admin/support owns.
 *   3. The admin friction view aggregates partner-level + client-level
 *      blockers from RLS-safe inputs only. No cross-tenant client lists
 *      are ever rendered to partners or clients here.
 */
import { fetchPartnerClientDirectory, fetchPartnerReadiness, type WLClientDirectoryRow, type WLPartnerReadinessRow } from "./wlOverview";

export type MilestoneState = "complete" | "in_progress" | "pending" | "blocked";
export type MilestoneOwner = "user_action" | "support_dependent" | "info";

export interface ActivationMilestone {
  key: string;
  label: string;
  detail: string;
  state: MilestoneState;
  owner: MilestoneOwner;
  drillRoute?: string;
}

export interface ActivationPath {
  audience: "direct_client" | "wl_partner" | "wl_end_client";
  milestones: ActivationMilestone[];
  /** Real progress = complete / total. Honest, not cosmetic. */
  completedCount: number;
  totalCount: number;
  /** First non-complete milestone the user can actually act on. */
  nextUserAction: ActivationMilestone | null;
  /** First non-complete milestone owned by support/admin. */
  nextSupportAction: ActivationMilestone | null;
  isLive: boolean;
}

function summarize(audience: ActivationPath["audience"], milestones: ActivationMilestone[]): ActivationPath {
  const completedCount = milestones.filter((m) => m.state === "complete").length;
  const nextUserAction =
    milestones.find((m) => m.state !== "complete" && m.owner === "user_action") ?? null;
  const nextSupportAction =
    milestones.find((m) => m.state !== "complete" && m.owner === "support_dependent") ?? null;
  const liveMilestone = milestones.find((m) => m.key.endsWith("_live"));
  const isLive = liveMilestone ? liveMilestone.state === "complete" : completedCount === milestones.length;
  return { audience, milestones, completedCount, totalCount: milestones.length, nextUserAction, nextSupportAction, isLive };
}

// ── Direct client activation path ───────────────────────────────

export interface DirectClientActivationInputs {
  serviceState: string | null; // v_client_delivery_status.service_state
  fulfillmentStatus: string | null; // v_client_delivery_status.fulfillment_status
  hasActiveScript: boolean;
  liveCampaigns: number;
  receptionistLive: boolean;
  receptionistPending: boolean;
  intakeChecklistComplete: boolean; // derived from leads.onboarding_checklist
}

export function deriveDirectClientPath(input: DirectClientActivationInputs): ActivationPath {
  const m: ActivationMilestone[] = [
    {
      key: "intake_complete",
      label: "Complete Intake",
      detail: "Provide business info, hours, contacts, and greeting preferences.",
      state: input.intakeChecklistComplete ? "complete" : input.serviceState ? "in_progress" : "pending",
      owner: "user_action",
      drillRoute: "/client-dashboard/setup",
    },
    {
      key: "script_published",
      label: "Publish Call Script",
      detail: "Approve or activate at least one call script so calls can be answered.",
      state: input.hasActiveScript ? "complete" : "pending",
      owner: "user_action",
      drillRoute: "/client-dashboard/scripts",
    },
    {
      key: "fulfillment_review",
      label: "Setup Review",
      detail: "Our team reviews intake and script before go-live.",
      state:
        input.fulfillmentStatus === "complete" || input.serviceState === "live"
          ? "complete"
          : input.fulfillmentStatus
            ? "in_progress"
            : "pending",
      owner: "support_dependent",
    },
    {
      key: "receptionist_configured",
      label: "Receptionist Configured",
      detail: "AI/Hybrid receptionist wired to your call flow.",
      state: input.receptionistLive
        ? "complete"
        : input.receptionistPending
          ? "in_progress"
          : "pending",
      owner: "support_dependent",
    },
    {
      key: "service_live",
      label: "Service Live",
      detail: "Your service is answering calls.",
      state: input.serviceState === "live" && input.liveCampaigns > 0 ? "complete" : "pending",
      owner: "info",
    },
  ];
  return summarize("direct_client", m);
}

// ── WL partner activation path ──────────────────────────────────

export function deriveWLPartnerPath(readiness: WLPartnerReadinessRow | null, clients: WLClientDirectoryRow[]): ActivationPath {
  const totalClients = clients.length;
  const liveClients = clients.filter((c) => (c.published_campaigns || 0) > 0 && (c.live_receptionist_flows || 0) > 0).length;

  const m: ActivationMilestone[] = [
    {
      key: "partner_configured",
      label: "Partner Account Configured",
      detail: "Your white-label workspace is provisioned.",
      state: readiness?.partner_status === "active" ? "complete" : "pending",
      owner: "support_dependent",
      drillRoute: "/white-label-dashboard/account/settings",
    },
    {
      key: "branding_added",
      label: "Add Branding",
      detail: "Upload logo, colors, and brand assets so your portal is yours.",
      state: readiness?.has_branding ? "complete" : "pending",
      owner: "user_action",
      drillRoute: "/white-label-dashboard/account/branding",
    },
    {
      key: "domain_connected",
      label: "Connect Custom Domain",
      detail: "Point a CNAME so clients see your branded portal.",
      state: readiness?.domain_verified
        ? "complete"
        : readiness?.has_custom_domain
          ? "in_progress"
          : "pending",
      owner: "user_action",
      drillRoute: "/white-label-dashboard/domains",
    },
    {
      key: "first_client_added",
      label: "Add First Client",
      detail: "Onboard at least one end-client into your portal.",
      state: totalClients > 0 ? "complete" : "pending",
      owner: "user_action",
      drillRoute: "/white-label-dashboard/clients",
    },
    {
      key: "client_live",
      label: "First Client Live",
      detail: "An end-client has a published script and a live receptionist.",
      state: liveClients > 0 ? "complete" : totalClients > 0 ? "in_progress" : "pending",
      owner: "info",
    },
  ];
  return summarize("wl_partner", m);
}

// ── WL end-client activation path (portal-safe) ─────────────────

export interface WLEndClientActivationInputs {
  accountStatus: string | null;
  hasPublishedCampaign: boolean;
  hasLiveReceptionist: boolean;
  hasReceptionistPending: boolean;
}

export function deriveWLEndClientPath(input: WLEndClientActivationInputs): ActivationPath {
  const m: ActivationMilestone[] = [
    {
      key: "account_active",
      label: "Account Active",
      detail: "Your account has been activated by your provider.",
      state: input.accountStatus === "active" ? "complete" : "pending",
      owner: "support_dependent",
    },
    {
      key: "script_published",
      label: "Approve Call Script",
      detail: "Review and approve your call script so calls can be answered.",
      state: input.hasPublishedCampaign ? "complete" : "pending",
      owner: "user_action",
      drillRoute: "scripts",
    },
    {
      key: "receptionist_configured",
      label: "Receptionist Configured",
      detail: "Your provider is wiring up the AI/Hybrid receptionist.",
      state: input.hasLiveReceptionist
        ? "complete"
        : input.hasReceptionistPending
          ? "in_progress"
          : "pending",
      owner: "support_dependent",
    },
    {
      key: "service_live",
      label: "Service Live",
      detail: "Your service is answering calls.",
      state: input.hasLiveReceptionist && input.hasPublishedCampaign ? "complete" : "pending",
      owner: "info",
    },
  ];
  return summarize("wl_end_client", m);
}

// ── Admin friction view (portfolio-wide, admin-only) ────────────

export interface ActivationFrictionBucket {
  key: string;
  label: string;
  detail: string;
  count: number;
}

export interface ActivationFunnelStage {
  stage: string;
  label: string;
  count: number;
}

export interface ActivationFrictionSummary {
  funnel: ActivationFunnelStage[];
  buckets: ActivationFrictionBucket[];
  computedAt: string;
}

/**
 * Builds an admin-only friction summary across direct clients (via
 * v_client_delivery_status) and WL clients (via v_wl_client_directory_for_partner
 * aggregations). Pure aggregation — no PII, no cross-tenant leakage to non-admins.
 *
 * Caller must be admin-context; the underlying views enforce RLS.
 */
export async function fetchActivationFriction(): Promise<ActivationFrictionSummary> {
  const { supabase } = await import("@/integrations/supabase/client");

  // Direct clients: pull all delivery rows admin can see.
  const direct = await (supabase as any)
    .from("v_client_delivery_status")
    .select("service_state, fulfillment_status, live_campaigns_count, total_campaigns_count");
  const directRows: Array<{
    service_state: string | null;
    fulfillment_status: string | null;
    live_campaigns_count: number | null;
    total_campaigns_count: number | null;
  }> = (direct?.data ?? []) as any;

  // Account receptionist status (admin scope).
  const recept = await (supabase as any)
    .from("v_account_receptionist_status")
    .select("client_lead_id, live_count, pending_count, any_enabled");
  const receptRows: Array<{ client_lead_id: string | null; live_count: number | null; pending_count: number | null; any_enabled: boolean | null }> =
    (recept?.data ?? []) as any;

  const stages: ActivationFunnelStage[] = [
    { stage: "not_started", label: "Not Started", count: 0 },
    { stage: "collecting_info", label: "Intake In Progress", count: 0 },
    { stage: "in_review", label: "Setup Review", count: 0 },
    { stage: "live", label: "Live", count: 0 },
  ];
  for (const r of directRows) {
    const s = stages.find((x) => x.stage === (r.service_state ?? "not_started"));
    if (s) s.count += 1;
  }

  const liveReceptIds = new Set(receptRows.filter((r) => (r.live_count ?? 0) > 0).map((r) => r.client_lead_id).filter(Boolean));
  const pendingReceptIds = new Set(receptRows.filter((r) => (r.pending_count ?? 0) > 0 && (r.live_count ?? 0) === 0).map((r) => r.client_lead_id).filter(Boolean));

  const buckets: ActivationFrictionBucket[] = [
    {
      key: "intake_stalled",
      label: "Intake Stalled",
      detail: "Service started but intake never advanced past collecting_info.",
      count: directRows.filter((r) => r.service_state === "collecting_info").length,
    },
    {
      key: "awaiting_review",
      label: "Awaiting Setup Review",
      detail: "Intake submitted but fulfillment hasn't completed review.",
      count: directRows.filter(
        (r) => r.service_state === "in_review" || (r.fulfillment_status && r.fulfillment_status !== "complete" && r.service_state !== "live"),
      ).length,
    },
    {
      key: "no_script",
      label: "No Live Script",
      detail: "Account exists but no campaign is published yet.",
      count: directRows.filter((r) => (r.total_campaigns_count ?? 0) === 0 && r.service_state !== "live").length,
    },
    {
      key: "receptionist_pending",
      label: "Receptionist Pending",
      detail: "Receptionist configured but not yet live.",
      count: pendingReceptIds.size,
    },
    {
      key: "ready_not_live",
      label: "Ready But Not Live",
      detail: "Live campaigns exist but service_state is not 'live'.",
      count: directRows.filter((r) => (r.live_campaigns_count ?? 0) > 0 && r.service_state !== "live").length,
    },
  ];

  return { funnel: stages, buckets, computedAt: new Date().toISOString() };
}

// ── WL partner-scoped portfolio activation rollup ────────────────

export interface PartnerPortfolioActivation {
  totalClients: number;
  activeClients: number;
  withPortal: number;
  withScript: number;
  liveReceptionists: number;
  fullyLive: number;
  blockedNoScript: number;
  blockedReceptionistPending: number;
}

export function summarizePartnerPortfolio(clients: WLClientDirectoryRow[]): PartnerPortfolioActivation {
  return {
    totalClients: clients.length,
    activeClients: clients.filter((c) => c.status === "active").length,
    withPortal: clients.filter((c) => c.portal_provisioned).length,
    withScript: clients.filter((c) => (c.published_campaigns || 0) > 0).length,
    liveReceptionists: clients.filter((c) => (c.live_receptionist_flows || 0) > 0).length,
    fullyLive: clients.filter((c) => (c.published_campaigns || 0) > 0 && (c.live_receptionist_flows || 0) > 0).length,
    blockedNoScript: clients.filter((c) => c.status === "active" && (c.published_campaigns || 0) === 0).length,
    blockedReceptionistPending: clients.filter(
      (c) => (c.pending_receptionist_flows || 0) > 0 && (c.live_receptionist_flows || 0) === 0,
    ).length,
  };
}

export async function fetchPartnerPortfolioActivation(partnerId: string): Promise<{
  readiness: WLPartnerReadinessRow | null;
  path: ActivationPath;
  portfolio: PartnerPortfolioActivation;
}> {
  const [readiness, clients] = await Promise.all([
    fetchPartnerReadiness(partnerId).catch(() => null),
    fetchPartnerClientDirectory(partnerId).catch(() => [] as WLClientDirectoryRow[]),
  ]);
  return {
    readiness,
    path: deriveWLPartnerPath(readiness, clients),
    portfolio: summarizePartnerPortfolio(clients),
  };
}

// ── Tone helpers shared by the cards ─────────────────────────────

export function ownerLabel(owner: MilestoneOwner): string {
  switch (owner) {
    case "user_action": return "You";
    case "support_dependent": return "Support";
    case "info": return "Info";
  }
}

export function stateBadge(state: MilestoneState): { label: string; tone: "ok" | "info" | "warn" | "muted" } {
  switch (state) {
    case "complete": return { label: "Done", tone: "ok" };
    case "in_progress": return { label: "In Progress", tone: "info" };
    case "blocked": return { label: "Blocked", tone: "warn" };
    case "pending": return { label: "To Do", tone: "muted" };
  }
}
