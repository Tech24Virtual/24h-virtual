/**
 * Phase 7 — SuperAdmin Command Center / Mission Control
 *
 * Cross-domain aggregator that composes the typed wrappers from Phases
 * 1–6 plus the canonical event spine. No new tables/views are introduced
 * here — this is a thin governance read layer.
 *
 * All calls assume admin RLS context. UI must be gated to admin.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchGrowthOverview, type GrowthOverview } from "./growthOverview";
import { fetchRevenuePipeline, type RevenuePipelineRow } from "./revenueOverview";
import { fetchDeliveryPipeline, type DeliveryPipelineRow } from "./deliveryOverview";

// ── Cross-domain readiness ────────────────────────────────────────

export type DomainHealth = "healthy" | "attention" | "blocked" | "unknown";

export interface DomainReadinessTile {
  domain: "growth" | "revenue" | "delivery" | "voice" | "wl";
  label: string;
  health: DomainHealth;
  headline: string;
  subline: string;
  drillRoute: string;
  metrics: { label: string; value: number | string }[];
}

// ── Voice / WL roll-ups (admin-wide, no partner filter) ───────────

export interface VoiceReadinessSummary {
  total_flows: number;
  live: number;
  ready_to_activate: number;
  awaiting_script_publish: number;
  awaiting_number: number;
  configured_offline: number;
  unconfigured: number;
}

export interface WLPartnerReadinessSummary {
  partners_total: number;
  partners_live: number;
  partners_domain_pending: number;
  partners_branded: number;
  partners_configured: number;
  partners_pending: number;
}

export async function fetchVoiceReadinessSummary(): Promise<VoiceReadinessSummary> {
  const { data, error } = await (supabase as any)
    .from("v_call_flow_receptionist_readiness")
    .select("readiness_state");
  if (error) throw error;
  const rows = (data ?? []) as { readiness_state: string }[];
  const summary: VoiceReadinessSummary = {
    total_flows: rows.length,
    live: 0,
    ready_to_activate: 0,
    awaiting_script_publish: 0,
    awaiting_number: 0,
    configured_offline: 0,
    unconfigured: 0,
  };
  for (const r of rows) {
    const k = r.readiness_state as keyof VoiceReadinessSummary;
    if (k in summary && k !== "total_flows") (summary as any)[k] += 1;
  }
  return summary;
}

export async function fetchWLPartnerReadinessSummary(): Promise<WLPartnerReadinessSummary> {
  const { data, error } = await (supabase as any)
    .from("v_wl_partner_readiness")
    .select("readiness_state");
  if (error) throw error;
  const rows = (data ?? []) as { readiness_state: string }[];
  const s: WLPartnerReadinessSummary = {
    partners_total: rows.length,
    partners_live: 0,
    partners_domain_pending: 0,
    partners_branded: 0,
    partners_configured: 0,
    partners_pending: 0,
  };
  for (const r of rows) {
    if (r.readiness_state === "live") s.partners_live += 1;
    else if (r.readiness_state === "domain_pending" || r.readiness_state === "domain_ready") s.partners_domain_pending += 1;
    else if (r.readiness_state === "branded") s.partners_branded += 1;
    else if (r.readiness_state === "configured") s.partners_configured += 1;
    else s.partners_pending += 1;
  }
  return s;
}

// ── Cross-domain readiness tiles ─────────────────────────────────

export async function buildReadinessTiles(): Promise<DomainReadinessTile[]> {
  const [growth, revenue, delivery, voice, wl] = await Promise.all([
    fetchGrowthOverview().catch(() => null),
    fetchRevenuePipeline().catch(() => [] as RevenuePipelineRow[]),
    fetchDeliveryPipeline().catch(() => [] as DeliveryPipelineRow[]),
    fetchVoiceReadinessSummary().catch(
      () => ({ total_flows: 0, live: 0, ready_to_activate: 0, awaiting_script_publish: 0, awaiting_number: 0, configured_offline: 0, unconfigured: 0 } as VoiceReadinessSummary),
    ),
    fetchWLPartnerReadinessSummary().catch(
      () => ({ partners_total: 0, partners_live: 0, partners_domain_pending: 0, partners_branded: 0, partners_configured: 0, partners_pending: 0 } as WLPartnerReadinessSummary),
    ),
  ]);

  return [
    growthTile(growth),
    revenueTile(revenue),
    deliveryTile(delivery),
    voiceTile(voice),
    wlTile(wl),
  ];
}

function growthTile(g: GrowthOverview | null): DomainReadinessTile {
  if (!g) {
    return {
      domain: "growth",
      label: "Growth",
      health: "unknown",
      headline: "—",
      subline: "Growth overview unavailable",
      drillRoute: "/admin/discoverability",
      metrics: [],
    };
  }
  const needsRewrite = g.disc_pages_needs_rewrite ?? 0;
  const ready = g.disc_pages_ready_to_publish ?? 0;
  const health: DomainHealth = needsRewrite > 5 ? "attention" : ready > 0 ? "attention" : "healthy";
  return {
    domain: "growth",
    label: "Growth",
    health,
    headline: `${g.disc_pages_published ?? 0} published`,
    subline: `${ready} ready, ${needsRewrite} need rewrite`,
    drillRoute: "/admin/discoverability",
    metrics: [
      { label: "Disc pages", value: g.disc_pages_total ?? 0 },
      { label: "Blog posts", value: g.blog_posts_published ?? 0 },
      { label: "Keywords tracked", value: g.keywords_tracked ?? 0 },
    ],
  };
}

function revenueTile(rows: RevenuePipelineRow[]): DomainReadinessTile {
  const total = rows.reduce((s, r) => s + (r.lead_count ?? 0), 0);
  const overdue = rows.reduce((s, r) => s + (r.overdue_followups ?? 0), 0);
  const unassigned = rows.reduce((s, r) => s + (r.unassigned_count ?? 0), 0);
  const health: DomainHealth = overdue > 10 ? "attention" : unassigned > 5 ? "attention" : total === 0 ? "unknown" : "healthy";
  return {
    domain: "revenue",
    label: "Revenue",
    health,
    headline: `${total} active leads`,
    subline: `${overdue} overdue, ${unassigned} unassigned`,
    drillRoute: "/admin/leads",
    metrics: [
      { label: "Stages", value: rows.length },
      { label: "Overdue", value: overdue },
      { label: "Unassigned", value: unassigned },
    ],
  };
}

function deliveryTile(rows: DeliveryPipelineRow[]): DomainReadinessTile {
  const total = rows.reduce((s, r) => s + (r.intake_count ?? 0), 0);
  const urgent = rows.reduce((s, r) => s + (r.urgent_count ?? 0), 0);
  const unassigned = rows.reduce((s, r) => s + (r.unassigned_count ?? 0), 0);
  const health: DomainHealth = urgent > 0 ? "attention" : unassigned > 5 ? "attention" : total === 0 ? "unknown" : "healthy";
  return {
    domain: "delivery",
    label: "Delivery",
    health,
    headline: `${total} intakes in pipeline`,
    subline: `${urgent} urgent, ${unassigned} unassigned`,
    drillRoute: "/admin/fulfillment-intake",
    metrics: [
      { label: "Active stages", value: rows.length },
      { label: "Urgent", value: urgent },
      { label: "Unassigned", value: unassigned },
    ],
  };
}

function voiceTile(v: VoiceReadinessSummary): DomainReadinessTile {
  const blockers = v.awaiting_script_publish + v.awaiting_number;
  const health: DomainHealth =
    v.total_flows === 0 ? "unknown" : blockers > 0 ? "attention" : v.live > 0 ? "healthy" : "attention";
  return {
    domain: "voice",
    label: "AI Voice",
    health,
    headline: `${v.live} live receptionists`,
    subline: `${v.ready_to_activate} ready, ${blockers} blocked`,
    drillRoute: "/admin/campaign-os/call-flows",
    metrics: [
      { label: "Total flows", value: v.total_flows },
      { label: "Ready", value: v.ready_to_activate },
      { label: "Offline", value: v.configured_offline },
    ],
  };
}

function wlTile(w: WLPartnerReadinessSummary): DomainReadinessTile {
  const inFlight = w.partners_domain_pending + w.partners_branded + w.partners_configured + w.partners_pending;
  const health: DomainHealth =
    w.partners_total === 0 ? "unknown" : w.partners_live > 0 ? "healthy" : inFlight > 0 ? "attention" : "blocked";
  return {
    domain: "wl",
    label: "White Label",
    health,
    headline: `${w.partners_live}/${w.partners_total} partners live`,
    subline: `${inFlight} in onboarding`,
    drillRoute: "/admin/partners",
    metrics: [
      { label: "Pending", value: w.partners_pending },
      { label: "Branded", value: w.partners_branded },
      { label: "Domain", value: w.partners_domain_pending },
    ],
  };
}

// ── Event / incident stream ──────────────────────────────────────

export interface MissionEvent {
  source: "dashboard_events" | "audit_log";
  id: string;
  occurred_at: string;
  domain: "growth" | "revenue" | "delivery" | "voice" | "wl" | "system";
  event: string;
  actor: string | null;
  target: string | null;
  severity: "info" | "notice" | "warn";
}

const DOMAIN_PREFIX_MAP: { prefix: string; domain: MissionEvent["domain"] }[] = [
  { prefix: "voice.", domain: "voice" },
  { prefix: "wl.", domain: "wl" },
  { prefix: "delivery.", domain: "delivery" },
  { prefix: "intake.", domain: "delivery" },
  { prefix: "fulfillment.", domain: "delivery" },
  { prefix: "lead.", domain: "revenue" },
  { prefix: "revenue.", domain: "revenue" },
  { prefix: "proposal.", domain: "revenue" },
  { prefix: "meeting.", domain: "revenue" },
  { prefix: "disc.", domain: "growth" },
  { prefix: "blog.", domain: "growth" },
  { prefix: "keyword.", domain: "growth" },
  { prefix: "growth.", domain: "growth" },
];

function classifyDomain(name: string): MissionEvent["domain"] {
  for (const { prefix, domain } of DOMAIN_PREFIX_MAP) {
    if (name.startsWith(prefix)) return domain;
  }
  return "system";
}

function classifySeverity(name: string): MissionEvent["severity"] {
  if (
    name.includes("taken_offline") ||
    name.includes("suspended") ||
    name.includes("failed") ||
    name.includes("rollback") ||
    name.includes("delete")
  ) {
    return "warn";
  }
  if (name.includes("go_live") || name.includes("activated") || name.includes("published") || name.includes("converted")) {
    return "notice";
  }
  return "info";
}

export async function fetchMissionEvents(opts?: {
  domains?: MissionEvent["domain"][];
  limit?: number;
}): Promise<MissionEvent[]> {
  const limit = opts?.limit ?? 100;

  const [evRes, auRes] = await Promise.all([
    supabase
      .from("dashboard_events")
      .select("id, event_name, occurred_at, target, user_id, persona")
      .order("occurred_at", { ascending: false })
      .limit(limit),
    supabase
      .from("audit_log")
      .select("id, action, created_at, target_id, actor_email")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const evRows = (evRes.data ?? []).map((r: any): MissionEvent => ({
    source: "dashboard_events",
    id: r.id,
    occurred_at: r.occurred_at,
    domain: classifyDomain(r.event_name ?? ""),
    event: r.event_name ?? "(unknown)",
    actor: r.user_id ?? r.persona ?? null,
    target: r.target ?? null,
    severity: classifySeverity(r.event_name ?? ""),
  }));

  const auRows = (auRes.data ?? []).map((r: any): MissionEvent => ({
    source: "audit_log",
    id: r.id,
    occurred_at: r.created_at,
    domain: classifyDomain(r.action ?? ""),
    event: r.action ?? "(unknown)",
    actor: r.actor_email ?? null,
    target: r.target_id ?? null,
    severity: classifySeverity(r.action ?? ""),
  }));

  let merged = [...evRows, ...auRows].sort((a, b) =>
    a.occurred_at < b.occurred_at ? 1 : -1,
  );
  if (opts?.domains?.length) {
    merged = merged.filter((m) => opts.domains!.includes(m.domain));
  }
  return merged.slice(0, limit);
}

// ── Risk / blast radius (heuristic over existing data) ───────────

export interface BlastRadiusItem {
  kind: "voice_offline" | "voice_misconfigured" | "wl_partner_blocked" | "delivery_urgent";
  label: string;
  detail: string;
  drillRoute: string;
  count: number;
}

export async function fetchBlastRadius(): Promise<BlastRadiusItem[]> {
  const items: BlastRadiusItem[] = [];

  try {
    const voice = await fetchVoiceReadinessSummary();
    if (voice.configured_offline > 0) {
      items.push({
        kind: "voice_offline",
        label: "Receptionists configured but offline",
        detail: "Configured flows that are not currently routing live calls.",
        drillRoute: "/admin/campaign-os/call-flows",
        count: voice.configured_offline,
      });
    }
    const blocked = voice.awaiting_script_publish + voice.awaiting_number;
    if (blocked > 0) {
      items.push({
        kind: "voice_misconfigured",
        label: "Receptionists blocked from going live",
        detail: "Awaiting a published script or active phone number.",
        drillRoute: "/admin/campaign-os/call-flows",
        count: blocked,
      });
    }
  } catch {/* ignore */}

  try {
    const wl = await fetchWLPartnerReadinessSummary();
    const blocked = wl.partners_pending + wl.partners_configured;
    if (blocked > 0) {
      items.push({
        kind: "wl_partner_blocked",
        label: "WL partners not yet branded / live",
        detail: "Partner shells without branding or domain readiness.",
        drillRoute: "/admin/partners",
        count: blocked,
      });
    }
  } catch {/* ignore */}

  try {
    const delivery = await fetchDeliveryPipeline();
    const urgent = delivery.reduce((s, r) => s + (r.urgent_count ?? 0), 0);
    if (urgent > 0) {
      items.push({
        kind: "delivery_urgent",
        label: "Urgent intakes awaiting action",
        detail: "Delivery intakes flagged urgent across all stages.",
        drillRoute: "/admin/fulfillment-intake",
        count: urgent,
      });
    }
  } catch {/* ignore */}

  return items;
}
