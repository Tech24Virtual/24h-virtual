import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[TRIGGER-POST-CALL] ${step}${detailsStr}`);
};

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
    // Verify JWT auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    logStep("Authenticated", { userId: user.id });

    const reach59Url = Deno.env.get("REACH59_POST_CALL_URL");
    const reach59Secret = Deno.env.get("REACH59_WEBHOOK_SECRET");

    if (!reach59Url || !reach59Secret) {
      logStep("Reach59 not configured, skipping notification");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Reach59 not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { request_id } = await req.json();

    if (!request_id) {
      return new Response(
        JSON.stringify({ error: "request_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch the outbound call request with its details
    const { data: request, error: fetchError } = await supabase
      .from("outbound_call_requests")
      .select("*, lead:leads(account_code, name, company)")
      .eq("id", request_id)
      .single();

    if (fetchError || !request) {
      logStep("Request not found", { request_id });
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const accountCode = request.client_account_code || request.lead?.account_code;
    if (!accountCode) {
      logStep("No account code for this client, skipping Reach59 notification");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No account code linked" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Split contact name into first/last
    const nameParts = (request.contact_name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const now = new Date();
    const dateTime = now.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const postCallPayload = {
      client_account_code: accountCode,
      disposition_name: "Message Delivered",
      first_name: firstName,
      last_name: lastName,
      number1: request.contact_phone,
      comments: request.outcome_notes || request.reason || "Callback completed",
      date_time: dateTime,
    };

    logStep("Sending post-call notification to Reach59", { accountCode });

    const reach59Response = await fetch(reach59Url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": reach59Secret,
      },
      body: JSON.stringify(postCallPayload),
    });

    const reach59Result = await reach59Response.text();
    logStep("Reach59 response", { status: reach59Response.status, body: reach59Result });

    return new Response(
      JSON.stringify({
        success: true,
        reach59_status: reach59Response.status,
        account_code: accountCode,
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
