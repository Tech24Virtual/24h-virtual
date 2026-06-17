import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { wl_ticket_id, partner_id, target_queue = "supervisor" } = body;

    if (!wl_ticket_id || !partner_id) {
      return new Response(JSON.stringify({ error: "Missing wl_ticket_id or partner_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller owns this partner
    const { data: partner } = await supabaseAdmin
      .from("white_label_partners")
      .select("id, company_name, user_id")
      .eq("id", partner_id)
      .single();

    if (!partner || partner.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized for this partner" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the WL ticket
    const { data: wlTicket, error: ticketError } = await supabaseAdmin
      .from("wl_client_tickets")
      .select("*, white_label_clients(client_name)")
      .eq("id", wl_ticket_id)
      .eq("partner_id", partner_id)
      .single();

    if (ticketError || !wlTicket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (wlTicket.is_escalated_to_24h) {
      return new Response(JSON.stringify({ error: "Ticket already escalated" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientName = (wlTicket as any).white_label_clients?.client_name || "Unknown Client";

    // Create System A support ticket
    const { data: supportTicket, error: createError } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        title: `[WL Escalation] ${wlTicket.subject}`,
        description: `Escalated from WL Partner: ${partner.company_name}\nClient: ${clientName}\nOriginal ticket #${wlTicket.ticket_number}\n\n${wlTicket.description || "No description provided."}`,
        priority: wlTicket.priority || "medium",
        status: "open",
        source: "white_label_escalation",
        work_queue: target_queue,
        originating_source: "white_label_escalation",
        partner_id: partner_id,
        wl_client_id: wlTicket.wl_client_id,
        linked_wl_client_ticket_id: wl_ticket_id,
        submitted_by: user.id,
        submitter_name: partner.company_name,
        submitter_email: user.email,
      })
      .select("id, ticket_number")
      .single();

    if (createError) {
      console.error("Failed to create support ticket:", createError);
      return new Response(JSON.stringify({ error: "Failed to create escalation ticket" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update WL ticket with escalation link
    await supabaseAdmin
      .from("wl_client_tickets")
      .update({
        is_escalated_to_24h: true,
        linked_support_ticket_id: supportTicket.id,
      })
      .eq("id", wl_ticket_id);

    return new Response(
      JSON.stringify({
        success: true,
        support_ticket_id: supportTicket.id,
        support_ticket_number: supportTicket.ticket_number,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Escalation error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
