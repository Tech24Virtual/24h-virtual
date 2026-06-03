import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  getBrandingForPartner,
  renderPaymentFailedEmail,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      recipientEmail,
      recipientName,
      partnerId,
      amount,
      retryDate,
      updateCardUrl,
      preview,
    } = await req.json();

    if (!recipientEmail || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing recipientEmail or amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: true, skipped: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const branding = await getBrandingForPartner(supabase, partnerId || null);

    const rendered = renderPaymentFailedEmail({
      branding,
      recipientName: recipientName || "there",
      amount,
      retryDate,
      updateCardUrl,
    });

    const subject = preview ? `[TEST] ${rendered.subject}` : rendered.subject;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: branding.fromAddress,
        to: [recipientEmail],
        subject,
        html: rendered.html,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to send");

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-payment-failed-email]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
