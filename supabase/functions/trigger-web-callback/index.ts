import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[TRIGGER-WEB-CALLBACK] ${step}${detailsStr}`);
};

// Queue → Five9 campaign mapping (configured per-tenant)
const QUEUE_CAMPAIGN_MAP: Record<string, string> = {
  "24H-WEB-SALES": "24H_Outbound_Sales",
  "24H-AI-SALES": "24H_AI_Sales",
  "24H-WEB-SUPPORT": "24H_Outbound_Support",
  "24H-WEB-PARTNER": "24H_Outbound_Partner",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing config" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    logStep("Function invoked");

    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(
        JSON.stringify({ error: "request_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch the callback request
    const { data: request, error: fetchError } = await supabase
      .from("outbound_call_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (fetchError || !request) {
      logStep("Request not found", { request_id, error: fetchError?.message });
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    logStep("Request loaded", {
      id: request.id,
      intent: request.intent,
      routing_mode: request.routing_mode,
      target_queue: request.target_queue,
      callback_type: request.callback_type,
    });

    // Determine the Five9 campaign
    const queue = request.target_queue || "24H-WEB-SALES";
    const campaignName = QUEUE_CAMPAIGN_MAP[queue] || "24H_Outbound_Sales";

    logStep("Mapped to campaign", { queue, campaignName });

    // TODO: Actual Five9 API integration
    // For now, we update the record with the campaign mapping and set dial_status
    // When Five9 credentials and API integration are ready, this will:
    // 1. Create a contact in Five9
    // 2. Add to the outbound campaign list
    // 3. Trigger immediate dial (instant) or schedule (scheduled)

    const { error: updateError } = await supabase
      .from("outbound_call_requests")
      .update({
        five9_campaign_id: campaignName,
        dial_status: request.callback_type === "instant" ? "queued" : "scheduled",
        status: "pending",
      } as any)
      .eq("id", request_id);

    if (updateError) {
      logStep("Failed to update request", { error: updateError.message });
      throw new Error(`Update failed: ${updateError.message}`);
    }

    logStep("Request processed", {
      request_id,
      campaign: campaignName,
      dial_status: request.callback_type === "instant" ? "queued" : "scheduled",
    });

    return new Response(
      JSON.stringify({
        success: true,
        request_id,
        campaign: campaignName,
        dial_status: request.callback_type === "instant" ? "queued" : "scheduled",
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
