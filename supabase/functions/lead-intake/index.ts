import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Public endpoint — no JWT required (see supabase/config.toml: [functions.lead-intake]).
// Accepts POST from website contact forms and the WL partner / affiliate / referral
// application pages. Creates a row in `leads` with source + flags so every intake
// channel lands in Admin Leads and the Sales dashboard automatically.
//
// Body:
// {
//   type: 'client' | 'wl_partner' | 'affiliate' | 'referral',
//   name: string,
//   email: string,
//   phone?: string,
//   company?: string,
//   message?: string,
//   source_url?: string,
//   partner_code?: string,          // affiliate_code or WL partner_slug, for attribution
//   form_data?: Record<string, unknown>,
// }
//
// Returns { success: true, lead_id, duplicate?: true }
// Verifies an HMAC-SHA256 signature (header `x-intake-signature`) if
// INTAKE_WEBHOOK_SECRET is configured; skipped otherwise.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-intake-signature",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[lead-intake] ${step}${d}`);
};

type IntakeType = "client" | "wl_partner" | "affiliate" | "referral";

interface IntakeBody {
  type: IntakeType;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  source_url?: string;
  partner_code?: string;
  form_data?: Record<string, unknown>;
}

const TYPE_TO_SOURCE: Record<IntakeType, string> = {
  client: "website",
  wl_partner: "wl_partner_request",
  affiliate: "affiliate_request",
  referral: "referral_request",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const buf = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return signatureHeader === `sha256=${hex}`;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const rawBody = await req.text();

  // ── Optional HMAC verification ─────────────────────────────────────────
  const intakeSecret = Deno.env.get("INTAKE_WEBHOOK_SECRET");
  if (intakeSecret) {
    const signatureHeader = req.headers.get("x-intake-signature") ?? "";
    const valid = await verifyHmacSignature(rawBody, signatureHeader, intakeSecret);
    if (!valid) {
      log("Invalid signature");
      return jsonResponse({ success: false, error: "Forbidden" }, 403);
    }
  }

  let body: IntakeBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  if (!body.type || !TYPE_TO_SOURCE[body.type]) {
    return jsonResponse(
      { success: false, error: "type must be one of: client, wl_partner, affiliate, referral" },
      400,
    );
  }
  if (!body.name?.trim() || !body.email?.trim()) {
    return jsonResponse({ success: false, error: "name and email are required" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Resolve partner_code to an attribution FK, if provided ──────────────
  let referredByAffiliateId: string | null = null;
  let referredByPartnerId: string | null = null;
  if (body.partner_code?.trim()) {
    const code = body.partner_code.trim();
    const [{ data: affiliate }, { data: wlPartner }] = await Promise.all([
      supabase.from("affiliates").select("id").eq("affiliate_code", code).maybeSingle(),
      supabase.from("white_label_partners").select("id").eq("partner_slug", code).maybeSingle(),
    ]);
    referredByAffiliateId = affiliate?.id ?? null;
    referredByPartnerId = wlPartner?.id ?? null;
  }

  const intakeFormData = {
    ...(body.form_data ?? {}),
    ...(body.message ? { message: body.message } : {}),
    ...(body.source_url ? { source_url: body.source_url } : {}),
  };

  const leadPayload = {
    name: body.name.trim(),
    email: body.email.trim(),
    phone: body.phone ?? null,
    company: body.company ?? null,
    notes: body.message ?? null,
    source: TYPE_TO_SOURCE[body.type],
    status: "new",
    pipeline_stage: "new",
    is_wl_partner_request: body.type === "wl_partner",
    is_affiliate_request: body.type === "affiliate",
    is_referral_request: body.type === "referral",
    referred_by_affiliate_id: referredByAffiliateId,
    referred_by_partner_id: referredByPartnerId,
    intake_form_data: Object.keys(intakeFormData).length ? intakeFormData : null,
    intake_submitted_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(leadPayload)
    .select("id")
    .maybeSingle();

  if (error) {
    // Duplicate email (unique index on lower(email)) — enrich the existing lead
    // with this intake's flags/data instead of dropping the submission.
    if (/duplicate|already exists/i.test(error.message)) {
      const { data: existing } = await supabase
        .from("leads")
        .select("id, is_wl_partner_request, is_affiliate_request, is_referral_request")
        .ilike("email", body.email.trim())
        .maybeSingle();

      if (existing) {
        await supabase
          .from("leads")
          .update({
            is_wl_partner_request: existing.is_wl_partner_request || leadPayload.is_wl_partner_request,
            is_affiliate_request: existing.is_affiliate_request || leadPayload.is_affiliate_request,
            is_referral_request: existing.is_referral_request || leadPayload.is_referral_request,
            referred_by_affiliate_id: referredByAffiliateId ?? undefined,
            referred_by_partner_id: referredByPartnerId ?? undefined,
            intake_form_data: leadPayload.intake_form_data ?? undefined,
          })
          .eq("id", existing.id);

        log("Duplicate email — merged into existing lead", { leadId: existing.id });
        return jsonResponse({ success: true, lead_id: existing.id, duplicate: true });
      }
    }

    log("Insert error", { error: error.message });
    return jsonResponse({ success: false, error: error.message }, 500);
  }

  log("Lead created", { leadId: data?.id, type: body.type });
  return jsonResponse({ success: true, lead_id: data?.id ?? null });
});
