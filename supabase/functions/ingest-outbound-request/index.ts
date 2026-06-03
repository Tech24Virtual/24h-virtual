import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-pabbly-secret, x-reach59-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[INGEST-OUTBOUND-REQUEST] ${step}${detailsStr}`);
};

interface OutboundRequestPayload {
  // Pabbly format
  client_email?: string;
  // Reach59 format
  client_account_code?: string;
  request_id?: string;
  delivery_type?: string;
  timestamp?: string;
  // Common fields
  contact_name: string;
  contact_phone: string;
  reason?: string;
  source?: string;
  urgency?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase config" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    logStep("Function started");

    // Dual authentication: accept either Pabbly or Reach59 secret
    const pabblySecret = Deno.env.get("PABBLY_WEBHOOK_SECRET");
    const reach59Secret = Deno.env.get("REACH59_WEBHOOK_SECRET");
    const providedPabbly = req.headers.get("x-pabbly-secret");
    const providedReach59 = req.headers.get("x-reach59-secret");

    const pabblyMatch = pabblySecret && providedPabbly && providedPabbly === pabblySecret;
    const reach59Match = reach59Secret && providedReach59 && providedReach59 === reach59Secret;

    if (!pabblyMatch && !reach59Match) {
      // Check if at least one secret is configured
      if (!pabblySecret && !reach59Secret) {
        logStep("ERROR: No webhook secrets configured");
        return new Response(
          JSON.stringify({ error: "Webhook authentication not configured. Please set PABBLY_WEBHOOK_SECRET or REACH59_WEBHOOK_SECRET." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      logStep("Invalid or missing webhook secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    logStep("Webhook secret verified", { source: pabblyMatch ? "pabbly" : "reach59" });

    // Parse payload
    const payload: OutboundRequestPayload = await req.json();
    logStep("Payload received", {
      clientEmail: payload.client_email,
      clientAccountCode: payload.client_account_code,
      contactName: payload.contact_name,
      source: payload.source,
    });

    // Validate required fields
    if (!payload.contact_name || !payload.contact_phone) {
      return new Response(
        JSON.stringify({ error: "contact_name and contact_phone are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!payload.client_email && !payload.client_account_code) {
      return new Response(
        JSON.stringify({ error: "Either client_email or client_account_code is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Look up lead by account_code or email
    let leadId: string | null = null;
    let accountCode: string | null = payload.client_account_code || null;

    if (payload.client_account_code) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, account_code")
        .eq("account_code", payload.client_account_code)
        .limit(1)
        .single();

      if (lead) {
        leadId = lead.id;
        logStep("Found lead via account_code", { leadId, accountCode: payload.client_account_code });
      } else {
        logStep("No lead found for account_code", { accountCode: payload.client_account_code });
      }
    } else if (payload.client_email) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, account_code")
        .eq("email", payload.client_email)
        .limit(1)
        .single();

      if (lead) {
        leadId = lead.id;
        accountCode = lead.account_code || null;
        logStep("Found lead via email", { leadId });
      } else {
        logStep("No lead found for email", { email: payload.client_email });
      }
    }

    // Insert outbound call request
    const { data: request, error: insertError } = await supabase
      .from("outbound_call_requests")
      .insert({
        lead_id: leadId,
        contact_name: payload.contact_name,
        contact_phone: payload.contact_phone,
        reason: payload.reason || null,
        source: payload.source || "email",
        urgency: payload.urgency || "normal",
        external_request_id: payload.request_id || null,
        client_account_code: accountCode,
      })
      .select("id")
      .single();

    if (insertError) {
      logStep("Error inserting request", { error: insertError.message });
      throw new Error(`Failed to insert request: ${insertError.message}`);
    }

    logStep("Outbound call request created", { requestId: request.id, leadId, accountCode });

    return new Response(
      JSON.stringify({
        success: true,
        request_id: request.id,
        lead_id: leadId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
