// Phase 5 — Public client portal endpoint at /c/:token
// Resolves opaque client portal access tokens via service role and projects a
// safe payload (no internal IDs, no partner_id, no created_by).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RATE_BUCKET = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_BUCKET.get(ip);
  if (!entry || entry.reset < now) {
    RATE_BUCKET.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logActivity(
  partnerId: string,
  proposalId: string,
  eventType: string,
  metadata: Record<string, unknown>,
  actorLabel: string | null,
) {
  try {
    await admin.from("wl_partner_proposal_activity").insert({
      partner_id: partnerId,
      proposal_id: proposalId,
      event_type: eventType,
      actor_user_id: null,
      actor_label: actorLabel,
      metadata,
    });
  } catch (e) {
    console.warn(`activity insert failed (${eventType}):`, e);
  }
}

async function loadAccess(token: string) {
  if (!token || token.length < 16 || token.length > 200) return { error: "invalid" as const };
  const tokenHash = await sha256Hex(token);

  const { data: access } = await admin
    .from("wl_partner_client_portal_access")
    .select("id, partner_id, proposal_id, handoff_id, expires_at, revoked_at, view_count, acknowledged_at, recipient_email, first_viewed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!access) return { error: "not_found" as const };
  if (access.revoked_at) return { error: "revoked" as const };
  if (access.expires_at && new Date(access.expires_at).getTime() < Date.now()) {
    return { error: "expired" as const };
  }

  const { data: handoff } = await admin
    .from("wl_partner_onboarding_handoffs")
    .select("id, status, kickoff_due_at, handoff_notes, started_at, completed_at, partner_id, current_intake_id, submission_status")
    .eq("id", access.handoff_id)
    .maybeSingle();
  if (!handoff || handoff.partner_id !== access.partner_id) return { error: "invalid" as const };

  const { data: proposal } = await admin
    .from("wl_partner_proposals")
    .select("id, partner_id, proposal_number, title, offering_name, scope_summary, amount, currency, accepted_at")
    .eq("id", access.proposal_id)
    .maybeSingle();
  if (!proposal || proposal.partner_id !== access.partner_id) return { error: "invalid" as const };

  const { data: branding } = await admin
    .from("white_label_branding")
    .select("company_name, logo_url, primary_color, accent_color, support_email, support_phone, portal_footer_text, powered_by_visible, font_heading, font_body")
    .eq("partner_id", access.partner_id)
    .maybeSingle();

  let companyName = branding?.company_name ?? null;
  if (!companyName) {
    const { data: partner } = await admin
      .from("white_label_partners")
      .select("company_name")
      .eq("id", access.partner_id)
      .maybeSingle();
    companyName = partner?.company_name ?? null;
  }

  // Phase 7 — partner-safe enrichment: canonical phase from intake (or fallback
  // to partner submission status), and a count-only of open requests for this
  // handoff. Strictly count only — no titles, no messages, no internal IDs.
  let intakePhase: string | null = null;
  if (handoff.current_intake_id) {
    const { data: intake } = await admin
      .from("internal_fulfillment_intakes")
      .select("status")
      .eq("id", handoff.current_intake_id)
      .maybeSingle();
    if (intake?.status) {
      // Map intake status → canonical phase (mirrors phaseFromIntake).
      const map: Record<string, string> = {
        new_submission: "submitted",
        received: "received",
        under_review: "under_review",
        needs_partner_update: "needs_more_info",
        approved: "approved",
        activation_in_progress: "activation_in_progress",
        activated: "activated",
        closed: "closed",
      };
      intakePhase = map[intake.status] ?? null;
    }
  }
  if (!intakePhase && handoff.submission_status) {
    const map: Record<string, string> = {
      draft: "onboarding_started",
      collecting_info: "onboarding_started",
      ready_for_submission: "package_ready",
      submitted_to_fulfillment: "submitted",
      needs_more_info: "needs_more_info",
      resubmitted: "resubmitted",
      approved_for_activation: "approved",
      activation_in_progress: "activation_in_progress",
      activated: "activated",
    };
    intakePhase = map[handoff.submission_status] ?? null;
  }
  if (!intakePhase) intakePhase = "proposal_accepted";

  let requestsOpenCount = 0;
  {
    const { count } = await admin
      .from("wl_partner_handoff_requests")
      .select("id", { count: "exact", head: true })
      .eq("handoff_id", access.handoff_id)
      .eq("status", "open");
    requestsOpenCount = count ?? 0;
  }

  return { access, handoff, proposal, branding, companyName, intakePhase, requestsOpenCount };
}

function buildSteps(handoffStatus: string, ackAt: string | null) {
  return [
    { label: "Proposal accepted", completed: true },
    { label: "You acknowledge next steps", completed: !!ackAt },
    { label: "Onboarding kickoff scheduled", completed: ["in_progress", "completed"].includes(handoffStatus) },
    { label: "Setup in progress", completed: handoffStatus === "completed" },
    { label: "Service active", completed: handoffStatus === "completed" },
  ];
}

async function handleResolve(token: string) {
  const ctx = await loadAccess(token);
  if ("error" in ctx) return json({ error: ctx.error });
  const { access, handoff, proposal, branding, companyName, intakePhase, requestsOpenCount } = ctx;

  const nowIso = new Date().toISOString();
  const isFirstView = !access.first_viewed_at;
  await admin
    .from("wl_partner_client_portal_access")
    .update({
      first_viewed_at: access.first_viewed_at ?? nowIso,
      last_viewed_at: nowIso,
      view_count: (access.view_count ?? 0) + 1,
    })
    .eq("id", access.id);

  if (handoff.status === "pending") {
    await admin
      .from("wl_partner_onboarding_handoffs")
      .update({ status: "ready" })
      .eq("id", handoff.id);
    handoff.status = "ready";
  }

  if (isFirstView) {
    await logActivity(
      access.partner_id,
      proposal.id,
      "client_portal_viewed",
      { recipient_email: access.recipient_email },
      access.recipient_email ?? "Client",
    );
  }

  return json({
    branding: {
      company_name: companyName,
      logo_url: branding?.logo_url ?? null,
      primary_color: branding?.primary_color ?? null,
      accent_color: branding?.accent_color ?? null,
      support_email: branding?.support_email ?? null,
      support_phone: branding?.support_phone ?? null,
      portal_footer_text: branding?.portal_footer_text ?? null,
      powered_by_visible: branding?.powered_by_visible ?? true,
      font_heading: branding?.font_heading ?? null,
      font_body: branding?.font_body ?? null,
    },
    proposal: {
      proposal_number: proposal.proposal_number,
      title: proposal.title,
      offering_name: proposal.offering_name,
      scope_summary: proposal.scope_summary,
      amount: proposal.amount,
      currency: proposal.currency,
      accepted_at: proposal.accepted_at,
    },
    handoff: {
      status: handoff.status,
      kickoff_due_at: handoff.kickoff_due_at,
      handoff_notes: handoff.handoff_notes,
      started_at: handoff.started_at,
      completed_at: handoff.completed_at,
    },
    next_steps: buildSteps(handoff.status, access.acknowledged_at),
    acknowledged_at: access.acknowledged_at,
    // Phase 7 — partner-safe additions; never expose internal IDs/notes/titles.
    intake_phase: intakePhase,
    requests_open_count: requestsOpenCount,
  });
}

async function handleAcknowledge(token: string) {
  const ctx = await loadAccess(token);
  if ("error" in ctx) return json({ error: ctx.error });
  const { access, handoff, proposal } = ctx;

  if (access.acknowledged_at) return json({ ok: true, already: true });

  const nowIso = new Date().toISOString();
  await admin
    .from("wl_partner_client_portal_access")
    .update({ acknowledged_at: nowIso })
    .eq("id", access.id);

  if (handoff.status === "ready") {
    await admin
      .from("wl_partner_onboarding_handoffs")
      .update({ status: "in_progress", started_at: nowIso })
      .eq("id", handoff.id);
  }

  await logActivity(
    access.partner_id,
    proposal.id,
    "client_portal_acknowledged",
    {},
    access.recipient_email ?? "Client",
  );

  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (rateLimited(ip)) return json({ error: "rate_limited" }, 429);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const action = String(body.action ?? "");
  const token = String(body.token ?? "");

  try {
    if (action === "resolve") return await handleResolve(token);
    if (action === "acknowledge") return await handleAcknowledge(token);
    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("wl-client-portal-public error:", e);
    return json({ error: "server_error" }, 500);
  }
});
