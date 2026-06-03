/**
 * Phase 27 — Checkout / Offer Delivery Architecture
 *
 * Thin offer abstraction over canonical plans/prices. Offers are a lens, not a
 * shadow billing system: every offer maps back to a canonical plan_key and
 * Stripe price_id. Experiment variants influence selection, never billing.
 */
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/audit";

export type OfferSurface = "signup" | "upgrade" | "wl_partner" | "in_app";
export type OfferAudience = "direct" | "wl_end_client" | "all";
export type OfferEvent = "shown" | "accepted" | "completed" | "rejected";

export interface Offer {
  id: string;
  key: string;
  label: string;
  surface: OfferSurface;
  audience: OfferAudience;
  plan_key: string;
  stripe_price_id: string | null;
  experiment_id: string | null;
  variant_key: string | null;
  is_baseline: boolean;
  active: boolean;
  partner_id: string | null;
  eligibility: Record<string, unknown>;
  price_min_usd: number | null;
  price_max_usd: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OfferExposureSummary {
  offer_id: string;
  offer_key: string;
  label: string;
  surface: OfferSurface;
  audience: OfferAudience;
  plan_key: string;
  stripe_price_id: string | null;
  experiment_id: string | null;
  variant_key: string | null;
  is_baseline: boolean;
  active: boolean;
  partner_id: string | null;
  shown_count: number;
  accepted_count: number;
  completed_count: number;
  rejected_count: number;
  last_exposure_at: string | null;
}

export interface OfferSelectionContext {
  surface: OfferSurface;
  audience?: OfferAudience;
  partnerId?: string | null;
  isExistingCustomer?: boolean;
  experimentAssignments?: Array<{ experiment_id: string; variant_key: string }>;
}

export interface OfferExposureInput {
  offer: Offer;
  event: OfferEvent;
  userId?: string | null;
  leadId?: string | null;
  visitorKey?: string | null;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────
export async function fetchOffers(): Promise<Offer[]> {
  const { data, error } = await (supabase as any)
    .from("offers")
    .select("*")
    .order("surface", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("offers: list", error.message);
    return [];
  }
  return (data ?? []) as Offer[];
}

export async function fetchOfferExposureSummary(): Promise<OfferExposureSummary[]> {
  const { data, error } = await (supabase as any)
    .from("v_offer_exposure_summary")
    .select("*");
  if (error) {
    console.warn("offers: summary", error.message);
    return [];
  }
  return (data ?? []) as OfferExposureSummary[];
}

// ─────────────────────────────────────────────────────────────
// Mutations (admin)
// ─────────────────────────────────────────────────────────────
export async function createOffer(input: {
  key: string;
  label: string;
  surface: OfferSurface;
  audience?: OfferAudience;
  plan_key: string;
  stripe_price_id?: string | null;
  experiment_id?: string | null;
  variant_key?: string | null;
  is_baseline?: boolean;
  partner_id?: string | null;
  price_min_usd?: number | null;
  price_max_usd?: number | null;
  metadata?: Record<string, unknown>;
  eligibility?: Record<string, unknown>;
}): Promise<Offer | null> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from("offers")
    .insert({
      ...input,
      audience: input.audience ?? "all",
      is_baseline: input.is_baseline ?? false,
      eligibility: input.eligibility ?? {},
      metadata: input.metadata ?? {},
      created_by: u?.user?.id ?? null,
    })
    .select()
    .single();
  if (error) {
    console.warn("offers: create", error.message);
    return null;
  }
  await logAuditEvent({
    action: "admin.tool.launched",
    target_table: "offers",
    target_id: (data as any).id,
    metadata: { phase: 27, op: "offer.created", key: input.key },
  });
  return data as Offer;
}

export async function setOfferActive(id: string, active: boolean): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("offers")
    .update({ active })
    .eq("id", id);
  if (error) {
    console.warn("offers: setActive", error.message);
    return false;
  }
  await logAuditEvent({
    action: "admin.tool.launched",
    target_table: "offers",
    target_id: id,
    metadata: { phase: 27, op: "offer.active.toggled", active },
  });
  return true;
}

// ─────────────────────────────────────────────────────────────
// Selection engine
// ─────────────────────────────────────────────────────────────

/**
 * Select the best offer for a context. Pure / deterministic given inputs.
 * Rules (in order):
 *  1. surface must match
 *  2. offer must be active
 *  3. audience must match (offer audience 'all' matches any)
 *  4. partner_id constraint enforced for wl_partner surface
 *  5. eligibility.new_only=true → require !isExistingCustomer
 *  6. if any provided experiment assignment matches an offer's
 *     (experiment_id, variant_key), prefer it over baselines
 *  7. prefer non-baseline with assignment, else baseline, else first eligible
 *  8. if guardrails (price_min/max) violated by metadata.declared_price_usd,
 *     skip and continue
 */
export function selectOffer(
  ctx: OfferSelectionContext,
  candidates: Offer[],
): { offer: Offer | null; reason: string } {
  const eligible = candidates.filter((o) => {
    if (!o.active) return false;
    if (o.surface !== ctx.surface) return false;
    if (o.audience !== "all" && ctx.audience && o.audience !== ctx.audience) return false;
    if (ctx.surface === "wl_partner") {
      if (!ctx.partnerId || o.partner_id !== ctx.partnerId) return false;
    }
    const newOnly = (o.eligibility as any)?.new_only === true;
    if (newOnly && ctx.isExistingCustomer) return false;
    // Guardrails
    const declared = Number((o.metadata as any)?.declared_price_usd);
    if (Number.isFinite(declared)) {
      if (o.price_min_usd != null && declared < Number(o.price_min_usd)) return false;
      if (o.price_max_usd != null && declared > Number(o.price_max_usd)) return false;
    }
    return true;
  });

  if (eligible.length === 0) return { offer: null, reason: "no_eligible_offer" };

  const assigned = new Set(
    (ctx.experimentAssignments ?? []).map((a) => `${a.experiment_id}::${a.variant_key}`),
  );

  const variantHit = eligible.find(
    (o) => o.experiment_id && o.variant_key && assigned.has(`${o.experiment_id}::${o.variant_key}`),
  );
  if (variantHit) return { offer: variantHit, reason: "experiment_variant_match" };

  const baseline = eligible.find((o) => o.is_baseline);
  if (baseline) return { offer: baseline, reason: "baseline_fallback" };

  return { offer: eligible[0], reason: "first_eligible" };
}

// ─────────────────────────────────────────────────────────────
// Exposure logging
// ─────────────────────────────────────────────────────────────
export async function recordOfferExposure(input: OfferExposureInput): Promise<boolean> {
  const { offer, event, userId, leadId, visitorKey, metadata } = input;
  const { error } = await (supabase as any).from("offer_exposures").insert({
    offer_id: offer.id,
    offer_key: offer.key,
    experiment_id: offer.experiment_id,
    variant_key: offer.variant_key,
    surface: offer.surface,
    audience: offer.audience,
    event,
    plan_key: offer.plan_key,
    stripe_price_id: offer.stripe_price_id,
    user_id: userId ?? null,
    lead_id: leadId ?? null,
    visitor_key: visitorKey ?? null,
    partner_id: offer.partner_id,
    metadata: metadata ?? {},
  });
  if (error) {
    console.warn("offers: recordExposure", error.message);
    return false;
  }
  return true;
}

/**
 * Convenience: select + log 'shown' in one call. Safe to call from checkout
 * surfaces. Returns the selected offer (or null) so callers can render it.
 */
export async function selectAndLogOffer(
  ctx: OfferSelectionContext,
  opts: { userId?: string | null; leadId?: string | null; visitorKey?: string | null } = {},
): Promise<{ offer: Offer | null; reason: string }> {
  const candidates = await fetchOffers();
  const result = selectOffer(ctx, candidates);
  if (result.offer) {
    await recordOfferExposure({
      offer: result.offer,
      event: "shown",
      userId: opts.userId,
      leadId: opts.leadId,
      visitorKey: opts.visitorKey,
      metadata: { reason: result.reason },
    });
  }
  return result;
}

export function acceptanceRate(row: OfferExposureSummary): number | null {
  if (!row.shown_count) return null;
  return row.accepted_count / row.shown_count;
}

export function completionRate(row: OfferExposureSummary): number | null {
  if (!row.shown_count) return null;
  return row.completed_count / row.shown_count;
}

// ─────────────────────────────────────────────────────────────
// Phase 28 — Bandit-aware selection
// ─────────────────────────────────────────────────────────────
import {
  fetchExperimentAllocation,
  chooseBanditVariant,
  type AllocationExperiment,
} from "./banditAllocation";

/**
 * Phase 28 wrapper around selectAndLogOffer.
 *
 * For each *bandit-mode* experiment that has live offers on this surface,
 * we pick a variant via Thompson sampling (or UCB1) and inject it into
 * `experimentAssignments`. selectOffer then prefers the offer mapped to
 * that experiment+variant — guardrails, audience and WL constraints are
 * still enforced inside selectOffer. Sequential or fixed experiments are
 * left untouched and continue to use whatever assignment the caller passes.
 *
 * Falls back gracefully on any error to plain selectAndLogOffer.
 */
export async function selectAndLogOfferAdvanced(
  ctx: OfferSelectionContext,
  opts: { userId?: string | null; leadId?: string | null; visitorKey?: string | null } = {},
): Promise<{ offer: Offer | null; reason: string; banditDecisions?: Array<{ experiment_id: string; variant_key: string; algorithm: string }> }> {
  let banditDecisions: Array<{ experiment_id: string; variant_key: string; algorithm: string }> | undefined;
  let augmentedCtx = ctx;
  try {
    const allocations: AllocationExperiment[] = await fetchExperimentAllocation();
    const banditExps = allocations.filter(
      (a) => a.allocation_mode === "bandit" && a.experiment_status === "active",
    );
    if (banditExps.length > 0) {
      banditDecisions = banditExps.map((a) => {
        const choice = chooseBanditVariant(a);
        return {
          experiment_id: a.experiment_id,
          variant_key: choice.variant_key,
          algorithm: choice.reason,
        };
      });
      const existing = ctx.experimentAssignments ?? [];
      const overlay = banditDecisions.map((d) => ({
        experiment_id: d.experiment_id,
        variant_key: d.variant_key,
      }));
      // Bandit decisions override any caller-passed assignment for the same experiment.
      const overlayIds = new Set(overlay.map((o) => o.experiment_id));
      augmentedCtx = {
        ...ctx,
        experimentAssignments: [...existing.filter((e) => !overlayIds.has(e.experiment_id)), ...overlay],
      };
    }
  } catch (err) {
    console.warn("selectAndLogOfferAdvanced: bandit layer skipped", err);
  }

  const result = await selectAndLogOffer(augmentedCtx, opts);
  if (banditDecisions && result.offer) {
    // Embed bandit decision into the shown-event metadata (next exposure call)
    // by stamping it on the offer reason for traceability.
    return { ...result, banditDecisions };
  }
  return result;
}

