/**
 * Phase 12 — Partner & Client Experience Maturity
 *
 * Partner-facing aggregations + nudges. Tenant-safe by construction:
 * all data is derived from RLS-scoped Phase 6 views
 * (v_wl_partner_readiness, v_wl_client_directory_for_partner).
 * No cross-tenant data is touched, no admin internals exposed.
 */
import {
  fetchPartnerClientDirectory,
  fetchPartnerReadiness,
  type WLClientDirectoryRow,
  type WLPartnerReadinessRow,
  type WLPartnerReadinessState,
} from "./wlOverview";

export interface PartnerInsights {
  totalClients: number;
  activeClients: number;
  clientsWithPortal: number;
  liveReceptionists: number;
  pendingReceptionists: number;
  publishedScripts: number;
  totalScripts: number;
  openTickets: number;
  staleClients: number; // clients with no published campaigns
}

export async function fetchPartnerInsights(partnerId: string): Promise<PartnerInsights> {
  const rows = await fetchPartnerClientDirectory(partnerId);
  const sum = (k: keyof WLClientDirectoryRow) =>
    rows.reduce((s, r) => s + ((r[k] as number) || 0), 0);
  return {
    totalClients: rows.length,
    activeClients: rows.filter((r) => r.status === "active").length,
    clientsWithPortal: rows.filter((r) => r.portal_provisioned).length,
    liveReceptionists: sum("live_receptionist_flows"),
    pendingReceptionists: sum("pending_receptionist_flows"),
    publishedScripts: sum("published_campaigns"),
    totalScripts: sum("total_campaigns"),
    openTickets: sum("open_tickets"),
    staleClients: rows.filter(
      (r) => r.status === "active" && (r.published_campaigns || 0) === 0,
    ).length,
  };
}

// ── Nudges (read-only, partner-safe) ─────────────────────────────

export type NudgeTone = "info" | "action" | "ok";

export interface PartnerNudge {
  id: string;
  tone: NudgeTone;
  title: string;
  detail: string;
  drillRoute?: string;
}

export function derivePartnerNudges(
  readiness: WLPartnerReadinessRow | null,
  insights: PartnerInsights,
): PartnerNudge[] {
  const out: PartnerNudge[] = [];
  if (!readiness) return out;

  const stateOrder: WLPartnerReadinessState[] = [
    "pending",
    "configured",
    "branded",
    "domain_pending",
    "domain_ready",
    "live",
  ];
  const stage = stateOrder.indexOf(readiness.readiness_state);

  if (!readiness.has_branding) {
    out.push({
      id: "wl-branding",
      tone: "action",
      title: "Add your branding",
      detail: "Upload your logo and brand colors so partner-facing surfaces show your company, not ours.",
      drillRoute: "/white-label-dashboard/account/branding",
    });
  }
  if (readiness.has_branding && !readiness.has_custom_domain) {
    out.push({
      id: "wl-domain",
      tone: "action",
      title: "Connect your custom domain",
      detail: "A custom domain (e.g., portal.yourbrand.com) is required for clients to log in under your brand.",
      drillRoute: "/white-label-dashboard/domain",
    });
  }
  if (readiness.has_custom_domain && !readiness.domain_verified) {
    out.push({
      id: "wl-domain-verify",
      tone: "info",
      title: "Domain pending verification",
      detail: "Your DNS records are being verified. This typically takes minutes but can take up to 24h.",
      drillRoute: "/white-label-dashboard/domain",
    });
  }
  if (stage >= 4 && insights.totalClients === 0) {
    out.push({
      id: "wl-add-clients",
      tone: "action",
      title: "Add your first client",
      detail: "Your domain is ready. Onboard a client to start generating revenue under your brand.",
      drillRoute: "/white-label-dashboard/clients",
    });
  }
  if (insights.staleClients > 0) {
    out.push({
      id: "wl-stale-clients",
      tone: "action",
      title: `${insights.staleClients} client${insights.staleClients === 1 ? "" : "s"} without published scripts`,
      detail: "These accounts are active but have no published call scripts. Their service will not handle real calls until a script is live.",
      drillRoute: "/white-label-dashboard/clients",
    });
  }
  if (insights.pendingReceptionists > 0) {
    out.push({
      id: "wl-receptionist-pending",
      tone: "info",
      title: `${insights.pendingReceptionists} AI receptionist flow${insights.pendingReceptionists === 1 ? "" : "s"} pending setup`,
      detail: "Receptionist flows are configured but not yet live. Verify scripts and numbers, then enable to go live.",
    });
  }
  if (insights.openTickets > 5) {
    out.push({
      id: "wl-tickets",
      tone: "info",
      title: `${insights.openTickets} open client tickets`,
      detail: "Aggregated across your client portfolio. Triage to keep client-perceived response time low.",
      drillRoute: "/white-label-dashboard/clients/tickets",
    });
  }
  if (out.length === 0) {
    out.push({
      id: "wl-ok",
      tone: "ok",
      title: "Everything looks healthy",
      detail: "No urgent actions on your portfolio. Continue onboarding new clients or review usage trends.",
    });
  }
  return out;
}

export async function fetchPartnerExperience(partnerId: string): Promise<{
  readiness: WLPartnerReadinessRow | null;
  insights: PartnerInsights;
  nudges: PartnerNudge[];
}> {
  const [readiness, insights] = await Promise.all([
    fetchPartnerReadiness(partnerId),
    fetchPartnerInsights(partnerId),
  ]);
  return { readiness, insights, nudges: derivePartnerNudges(readiness, insights) };
}
