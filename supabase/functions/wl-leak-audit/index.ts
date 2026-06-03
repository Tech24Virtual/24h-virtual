import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  getBrandingForPartner,
  renderTemplate,
  TEMPLATE_KEYS,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Strings that should NEVER appear on a partner-facing surface.
const LEAK_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /24H\s*Virtual/gi, label: "24H Virtual" },
  { pattern: /24hvirtual/gi, label: "24hvirtual" },
  { pattern: /24hv\.io/gi, label: "24hv.io" },
  { pattern: /noreply@24hvirtual\.com/gi, label: "24H from-address" },
  { pattern: /hello@24hvirtual\.com/gi, label: "24H support email" },
];

interface Finding {
  partner_id: string;
  partner_name: string;
  surface: string; // e.g. "branding.email_footer", "email:welcome.subject"
  match: string;
  preview: string;
}

function scan(text: string | null | undefined): { match: string; index: number }[] {
  if (!text) return [];
  const hits: { match: string; index: number }[] = [];
  for (const { pattern, label } of LEAK_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      hits.push({ match: label, index: m.index });
      if (!pattern.global) break;
    }
  }
  return hits;
}

function preview(text: string, index: number, radius = 60): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseService);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load all partners + branding rows
    const [{ data: partners }, { data: brandings }] = await Promise.all([
      admin.from("white_label_partners").select("id, company_name"),
      admin
        .from("white_label_branding")
        .select(
          "partner_id, company_name, email_footer, email_from_name, email_from_address, support_email, login_page_title, welcome_message, portal_footer_text"
        ),
    ]);

    const partnerMap = new Map<string, string>();
    for (const p of partners || []) {
      partnerMap.set(p.id, p.company_name || "Unnamed partner");
    }

    const findings: Finding[] = [];

    // 1. Scan branding text fields
    for (const b of brandings || []) {
      const partnerName = partnerMap.get(b.partner_id) || "Unknown";
      const fields: { key: string; value: string | null }[] = [
        { key: "company_name", value: b.company_name },
        { key: "email_footer", value: b.email_footer },
        { key: "email_from_name", value: b.email_from_name },
        { key: "email_from_address", value: b.email_from_address },
        { key: "support_email", value: b.support_email },
        { key: "login_page_title", value: b.login_page_title },
        { key: "welcome_message", value: b.welcome_message },
        { key: "portal_footer_text", value: b.portal_footer_text },
      ];
      for (const f of fields) {
        const hits = scan(f.value);
        for (const h of hits) {
          findings.push({
            partner_id: b.partner_id,
            partner_name: partnerName,
            surface: `branding.${f.key}`,
            match: h.match,
            preview: preview(f.value!, h.index),
          });
        }
      }
    }

    // 2. Render every email template for every partner and scan the output
    for (const partner of partners || []) {
      const branding = await getBrandingForPartner(admin, partner.id);
      for (const tplKey of TEMPLATE_KEYS) {
        const rendered = renderTemplate(tplKey, branding, {});
        // Scan subject + body
        const subjectHits = scan(rendered.subject);
        for (const h of subjectHits) {
          findings.push({
            partner_id: partner.id,
            partner_name: partner.company_name || "Unnamed",
            surface: `email:${tplKey}.subject`,
            match: h.match,
            preview: preview(rendered.subject, h.index),
          });
        }
        const bodyHits = scan(rendered.html);
        for (const h of bodyHits) {
          findings.push({
            partner_id: partner.id,
            partner_name: partner.company_name || "Unnamed",
            surface: `email:${tplKey}.html`,
            match: h.match,
            preview: preview(rendered.html, h.index),
          });
        }
      }
    }

    // Group for response
    const byPartner: Record<
      string,
      { partner_name: string; findings: Finding[] }
    > = {};
    for (const f of findings) {
      if (!byPartner[f.partner_id]) {
        byPartner[f.partner_id] = { partner_name: f.partner_name, findings: [] };
      }
      byPartner[f.partner_id].findings.push(f);
    }

    return new Response(
      JSON.stringify({
        scanned_partners: partners?.length || 0,
        scanned_templates: TEMPLATE_KEYS.length,
        total_findings: findings.length,
        findings,
        by_partner: byPartner,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[wl-leak-audit]", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
