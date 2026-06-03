import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  getBrandingForPartner,
  renderLeadAlertEmail,
  renderApplicationEmail,
} from "../_shared/email-templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "hello@24hvirtual.com";
const SITE_BASE = "https://24hv.io";

const sourceLabels: Record<string, string> = {
  wizard: "Get Started Wizard",
  cost_calculator: "Cost Calculator",
  live_chat: "Live Chat",
  demo: "Live Demo",
  exit_intent: "Exit Intent",
  blog_newsletter: "Blog Newsletter",
  call_advisor: "Call Advisor",
  gpt_advisor: "GPT Advisor",
  contact: "Contact Form",
  referral: "Referral",
  partner: "Partner",
  organic: "Organic",
};

interface LeadPayload {
  type: "new_lead";
  record: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    service_type?: string;
    source?: string;
    notes?: string;
    plan_minutes?: number;
    score?: number;
  };
}

interface ApplicationPayload {
  type: "new_application";
  record: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    cover_letter?: string;
    job_posting_id?: string;
    status?: string;
  };
}

type NotificationPayload = LeadPayload | ApplicationPayload;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log("[ADMIN-NOTIFICATION] Type:", payload.type);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const branding = await getBrandingForPartner(supabase, null);

    let subject: string;
    let html: string;

    if (payload.type === "new_lead") {
      const r = payload.record;
      const sourceLabel = sourceLabels[r.source || ""] || r.source || "Direct";
      const rendered = renderLeadAlertEmail({
        branding,
        lead: r,
        sourceLabel,
        adminUrl: `${SITE_BASE}/admin/leads/${r.id}`,
      });
      subject = rendered.subject;
      html = rendered.html;
    } else if (payload.type === "new_application") {
      const rendered = renderApplicationEmail({
        branding,
        application: payload.record,
        adminUrl: `${SITE_BASE}/admin/agents`,
      });
      subject = rendered.subject;
      html = rendered.html;
    } else {
      throw new Error("Invalid notification type");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: branding.fromAddress,
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();
    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("[ADMIN-NOTIFICATION] Email sent:", emailResult.id);
    return new Response(JSON.stringify({ success: true, emailId: emailResult.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("[ADMIN-NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
