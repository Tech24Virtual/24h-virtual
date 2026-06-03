import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  getBrandingForPartner,
  renderTicketReplyEmail,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, ticketId, partnerId } = body;

    if (!type || !ticketId || !partnerId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set, skipping email");
      return new Response(JSON.stringify({ success: true, skipped: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const branding = await getBrandingForPartner(supabase, partnerId);

    // Fetch ticket details
    const { data: ticket } = await supabase
      .from("wl_client_tickets")
      .select("*, white_label_clients(client_name, email)")
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientName = (ticket as any).white_label_clients?.client_name || "Client";
    const clientEmail = (ticket as any).white_label_clients?.email;

    // Fetch partner contact email separately (branding doesn't include it)
    const { data: partnerRow } = await supabase
      .from("white_label_partners")
      .select("contact_email")
      .eq("id", partnerId)
      .maybeSingle();
    const partnerEmail = partnerRow?.contact_email;

    let toEmail: string | null = null;
    let recipientName = "";
    let authorName = "Support";
    let message = ticket.description || "";
    let isNewTicket = false;

    if (type === "wl_ticket_created" && ticket.submitted_by_type === "client") {
      toEmail = partnerEmail;
      recipientName = branding.brandName;
      authorName = clientName;
      isNewTicket = true;
    } else if (type === "wl_ticket_created" && ticket.submitted_by_type === "partner") {
      toEmail = clientEmail;
      recipientName = clientName;
      authorName = branding.brandName;
      isNewTicket = true;
    } else if (type === "wl_ticket_reply") {
      const { replyAuthorType, replyAuthorName, replyMessage } = body;
      message = replyMessage || "";
      authorName = replyAuthorName || (replyAuthorType === "client" ? clientName : "Support");
      if (replyAuthorType === "client") {
        toEmail = partnerEmail;
        recipientName = branding.brandName;
      } else {
        toEmail = clientEmail;
        recipientName = clientName;
      }
    }

    if (!toEmail) {
      return new Response(JSON.stringify({ success: true, skipped: "no_recipient" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rendered = renderTicketReplyEmail({
      branding,
      recipientName,
      ticketNumber: ticket.ticket_number,
      subject: ticket.subject,
      authorName,
      message,
      isNewTicket,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: branding.fromAddress,
        to: [toEmail],
        subject: rendered.subject,
        html: rendered.html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("WL notification error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
