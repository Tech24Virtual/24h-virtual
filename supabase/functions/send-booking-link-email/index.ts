import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  getBrandingForPartner,
  renderBookingLinkEmail,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MEETING_DURATIONS: Record<string, number> = {
  "Quick Intro": 15,
  "Discovery": 30,
  "Client Onboarding": 60,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, name, booking_url, host_name, meeting_type, message, partnerId } =
      await req.json();

    if (!to || !booking_url || !host_name || !meeting_type) {
      return new Response(
        JSON.stringify({
          error: "Missing to, booking_url, host_name, or meeting_type",
        }),
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

    const rendered = renderBookingLinkEmail({
      branding,
      recipientName: name || "there",
      hostName: host_name,
      bookingUrl: booking_url,
      meetingType: meeting_type,
      durationMinutes: MEETING_DURATIONS[meeting_type],
      message: message || undefined,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: branding.fromAddress,
        to: [to],
        subject: rendered.subject,
        html: rendered.html,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to send");

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-booking-link-email]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
