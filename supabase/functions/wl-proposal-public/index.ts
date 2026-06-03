// Phase 3+4: Public proposal viewer endpoint.
// Resolves opaque share tokens to a sanitized payload via service-role.
// Phase 4: Logs activity for viewed/accepted/declined into wl_partner_proposal_activity.
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

// In-memory soft rate limiter (per-instance). Adequate for Phase 3.
const RATE_BUCKET = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 30; // requests
const RATE_WINDOW_MS = 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_BUCKET.get(ip);
  if (!entry || entry.reset < now) {
    RATE_BUCKET.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
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

interface PublicProposal {
  proposal_number: string;
  title: string;
  offering_name: string | null;
  scope_summary: string | null;
  amount: number | null;
  currency: string | null;
  valid_until: string | null;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  accepted_by_name: string | null;
  declined_reason: string | null;
}

interface PublicBranding {
  company_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  support_email: string | null;
  support_phone: string | null;
  portal_footer_text: string | null;
  powered_by_visible: boolean;
  font_heading: string | null;
  font_body: string | null;
}

function projectProposal(row: Record<string, unknown>): PublicProposal {
  return {
    proposal_number: String(row.proposal_number ?? ""),
    title: String(row.title ?? ""),
    offering_name: (row.offering_name as string | null) ?? null,
    scope_summary: (row.scope_summary as string | null) ?? null,
    amount: (row.amount as number | null) ?? null,
    currency: (row.currency as string | null) ?? null,
    valid_until: (row.valid_until as string | null) ?? null,
    status: String(row.status ?? "draft"),
    sent_at: (row.sent_at as string | null) ?? null,
    viewed_at: (row.viewed_at as string | null) ?? null,
    accepted_at: (row.accepted_at as string | null) ?? null,
    declined_at: (row.declined_at as string | null) ?? null,
    accepted_by_name: (row.accepted_by_name as string | null) ?? null,
    declined_reason: (row.declined_reason as string | null) ?? null,
  };
}

async function logPublicActivity(
  partnerId: string,
  proposalId: string,
  shareId: string | null,
  eventType: string,
  metadata: Record<string, unknown>,
  actorLabel: string | null,
): Promise<void> {
  try {
    await admin.from("wl_partner_proposal_activity").insert({
      partner_id: partnerId,
      proposal_id: proposalId,
      share_id: shareId,
      event_type: eventType,
      actor_user_id: null,
      actor_label: actorLabel,
      metadata,
    });
  } catch (e) {
    console.warn(`activity insert failed (${eventType}):`, e);
  }
}

async function loadShareAndProposal(token: string) {
  if (!token || typeof token !== "string" || token.length < 16 || token.length > 200) {
    return { error: "invalid" as const };
  }
  const tokenHash = await sha256Hex(token);

  const { data: share, error: shareErr } = await admin
    .from("wl_partner_proposal_shares")
    .select(
      "id, partner_id, proposal_id, expires_at, revoked_at, recipient_name, view_count",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (shareErr || !share) return { error: "not_found" as const };
  if (share.revoked_at) return { error: "revoked" as const };
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
    return { error: "expired" as const };
  }

  const { data: proposal, error: pErr } = await admin
    .from("wl_partner_proposals")
    .select(
      "id, partner_id, proposal_number, title, offering_name, scope_summary, amount, currency, valid_until, status, sent_at, viewed_at, accepted_at, declined_at, accepted_by_name, declined_reason",
    )
    .eq("id", share.proposal_id)
    .maybeSingle();

  if (pErr || !proposal) return { error: "not_found" as const };

  // Defense in depth: re-validate tenant binding
  if (proposal.partner_id !== share.partner_id) {
    return { error: "invalid" as const };
  }

  // Branding (optional)
  const { data: branding } = await admin
    .from("white_label_branding")
    .select(
      "company_name, logo_url, primary_color, accent_color, support_email, support_phone, portal_footer_text, powered_by_visible, font_heading, font_body",
    )
    .eq("partner_id", share.partner_id)
    .maybeSingle();

  // Partner fallback for company_name
  let companyName = branding?.company_name ?? null;
  if (!companyName) {
    const { data: partner } = await admin
      .from("white_label_partners")
      .select("company_name")
      .eq("id", share.partner_id)
      .maybeSingle();
    companyName = partner?.company_name ?? null;
  }

  const publicBranding: PublicBranding = {
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
  };

  return {
    share,
    proposal,
    branding: publicBranding,
  };
}

function isValidUntilExpired(validUntil: string | null): boolean {
  return !!validUntil && new Date(validUntil).getTime() < Date.now();
}

async function handleResolve(token: string) {
  const ctx = await loadShareAndProposal(token);
  if ("error" in ctx) return json({ error: ctx.error }, 200);

  const { share, proposal, branding } = ctx;

  // Status transition: sent -> viewed (first open). Log activity ONLY on this transition.
  if (proposal.status === "sent") {
    const nowIso = new Date().toISOString();
    await admin
      .from("wl_partner_proposals")
      .update({ status: "viewed", viewed_at: nowIso })
      .eq("id", proposal.id);
    proposal.status = "viewed";
    proposal.viewed_at = nowIso;

    await logPublicActivity(
      share.partner_id,
      proposal.id,
      share.id,
      "viewed",
      { view_count: (share.view_count ?? 0) + 1 },
      share.recipient_name ?? "Recipient",
    );
  }

  // Stamp share view stats (always)
  await admin
    .from("wl_partner_proposal_shares")
    .update({
      last_viewed_at: new Date().toISOString(),
      view_count: (share.view_count ?? 0) + 1,
    })
    .eq("id", share.id);

  return json({
    proposal: projectProposal(proposal as Record<string, unknown>),
    branding,
    share: {
      recipient_name: share.recipient_name,
      expires_at: share.expires_at,
    },
  });
}

async function handleAccept(
  token: string,
  acceptedByName: string,
  acceptanceNote: string | null,
) {
  if (!acceptedByName || typeof acceptedByName !== "string") {
    return json({ error: "name_required" }, 400);
  }
  const trimmedName = acceptedByName.trim().slice(0, 200);
  const trimmedNote = acceptanceNote
    ? acceptanceNote.trim().slice(0, 2000)
    : null;
  if (!trimmedName) return json({ error: "name_required" }, 400);

  const ctx = await loadShareAndProposal(token);
  if ("error" in ctx) return json({ error: ctx.error }, 200);
  const { share, proposal } = ctx;

  if (!["sent", "viewed"].includes(proposal.status)) {
    return json({ error: "not_actionable" }, 200);
  }
  if (isValidUntilExpired(proposal.valid_until)) {
    return json({ error: "expired" }, 200);
  }

  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("wl_partner_proposals")
    .update({
      status: "accepted",
      accepted_at: nowIso,
      accepted_by_name: trimmedName,
      acceptance_note: trimmedNote,
    })
    .eq("id", proposal.id)
    .in("status", ["sent", "viewed"]);

  if (error) return json({ error: "invalid" }, 200);

  await logPublicActivity(
    share.partner_id,
    proposal.id,
    share.id,
    "accepted",
    { accepted_by_name: trimmedName, has_note: !!trimmedNote },
    trimmedName,
  );

  return json({ ok: true, status: "accepted" });
}

async function handleDecline(token: string, declinedReason: string | null) {
  const trimmedReason = declinedReason
    ? declinedReason.trim().slice(0, 2000)
    : null;

  const ctx = await loadShareAndProposal(token);
  if ("error" in ctx) return json({ error: ctx.error }, 200);
  const { share, proposal } = ctx;

  if (!["sent", "viewed"].includes(proposal.status)) {
    return json({ error: "not_actionable" }, 200);
  }

  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("wl_partner_proposals")
    .update({
      status: "declined",
      declined_at: nowIso,
      declined_reason: trimmedReason,
    })
    .eq("id", proposal.id)
    .in("status", ["sent", "viewed"]);

  if (error) return json({ error: "invalid" }, 200);

  await logPublicActivity(
    share.partner_id,
    proposal.id,
    share.id,
    "declined",
    { has_reason: !!trimmedReason },
    share.recipient_name ?? "Recipient",
  );

  return json({ ok: true, status: "declined" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  // Soft IP rate limit
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return json({ error: "rate_limited" }, 429);
  }

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
    if (action === "accept") {
      return await handleAccept(
        token,
        String(body.accepted_by_name ?? ""),
        body.acceptance_note ? String(body.acceptance_note) : null,
      );
    }
    if (action === "decline") {
      return await handleDecline(
        token,
        body.declined_reason ? String(body.declined_reason) : null,
      );
    }
    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("wl-proposal-public error:", e);
    return json({ error: "server_error" }, 500);
  }
});
