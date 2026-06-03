import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[INGEST-FIVE9] ${step}${detailsStr}`);
};

function parseTimeToSeconds(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map(p => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  return cleaned || null;
}

function parseFormData(contentType: string, text: string): Record<string, string> {
  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }
  const params = new URLSearchParams(text);
  const data: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    data[key] = value;
  }
  return data;
}

function extractCallFields(formData: Record<string, string>) {
  const callId = formData.call_id;
  const dateTime = formData.date_time;
  const campaignName = formData.campaign_name;
  const firstName = formData.first_name || "";
  const lastName = formData.last_name || "";
  const callerName = [firstName, lastName].filter(Boolean).join(" ") || null;
  const callerEmail = formData.email || null;
  const callerNumber = formData.number1 || null;
  const dispositionName = formData.disposition_name || null;
  const ani = formData.ani || null;
  const dnis = formData.DNIS || formData.dnis || null;
  const comments = formData.comments || null;
  const handleTimeRaw = formData.handle_time || null;

  let callDate: string | null = null;
  let callTime: string | null = null;
  if (dateTime) {
    const parsed = new Date(dateTime);
    if (!isNaN(parsed.getTime())) {
      callDate = parsed.toISOString().split("T")[0];
      callTime = parsed.toTimeString().split(" ")[0];
    } else {
      const parts = dateTime.split(/[\sT]/);
      if (parts.length >= 1) callDate = parts[0];
      if (parts.length >= 2) callTime = parts[1];
    }
  }

  const handleTimeSeconds = parseTimeToSeconds(handleTimeRaw);
  const billableMinutes = handleTimeSeconds > 0 ? Math.ceil(handleTimeSeconds / 60) : 0;
  const status = handleTimeSeconds === 0 ? "missed" : "completed";

  return {
    callId, campaignName, callerName, callerEmail, callerNumber,
    dispositionName, ani, dnis, comments, callDate, callTime,
    handleTimeSeconds, billableMinutes, status,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase config" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    logStep("Function started");

    // Validate webhook secret
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get("secret");
    const webhookKey = Deno.env.get("FIVE9_WEBHOOK_KEY");

    if (!webhookKey) {
      logStep("ERROR: FIVE9_WEBHOOK_KEY not configured");
      return new Response(JSON.stringify({ error: "Webhook key not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!providedSecret || providedSecret !== webhookKey) {
      logStep("Invalid or missing webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("Webhook secret verified");

    // Parse body
    const contentType = req.headers.get("content-type") || "";
    const bodyText = await req.text();
    const formData = parseFormData(contentType, bodyText);

    logStep("Parsed form data", { fields: Object.keys(formData) });

    const fields = extractCallFields(formData);

    logStep("Mapped fields", {
      callId: fields.callId,
      campaignName: fields.campaignName,
      callerName: fields.callerName,
      handleTimeSeconds: fields.handleTimeSeconds,
      billableMinutes: fields.billableMinutes,
    });

    if (!fields.campaignName) {
      return new Response(JSON.stringify({
        error: "Missing campaign_name. Cannot identify client.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Look up campaign mapping — supports both regular and WL campaigns
    const { data: mapping } = await supabase
      .from("client_report_mappings")
      .select("lead_id, match_type, wl_client_id, partner_id")
      .eq("match_value", fields.campaignName)
      .eq("is_active", true)
      .in("match_type", ["campaign", "wl_campaign"])
      .maybeSingle();

    if (!mapping) {
      logStep("No mapping found for campaign", { campaignName: fields.campaignName });
      return new Response(JSON.stringify({
        error: `No client mapping found for campaign "${fields.campaignName}". Please create a campaign mapping in the admin panel.`,
        campaign_name: fields.campaignName,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // ---- ROUTE: White Label Campaign ----
    if (mapping.match_type === "wl_campaign" && mapping.wl_client_id) {
      logStep("WL campaign detected", { wlClientId: mapping.wl_client_id, partnerId: mapping.partner_id });

      // Deduplication check on wl_call_logs
      if (fields.callId) {
        const { data: existing } = await supabase
          .from("wl_call_logs")
          .select("id")
          .eq("external_call_id", fields.callId)
          .maybeSingle();

        if (existing) {
          logStep("Duplicate WL call skipped", { callId: fields.callId });
          return new Response(JSON.stringify({
            success: true, status: "duplicate_skipped", call_id: fields.callId,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      const { error: insertError } = await supabase
        .from("wl_call_logs")
        .insert({
          partner_id: mapping.partner_id,
          wl_client_id: mapping.wl_client_id,
          external_call_id: fields.callId,
          caller_phone: normalizePhoneNumber(fields.ani),
          caller_name: fields.callerName,
          caller_email: fields.callerEmail,
          caller_number: fields.callerNumber,
          call_date: fields.callDate,
          call_time: fields.callTime,
          handle_time_seconds: fields.handleTimeSeconds,
          billable_minutes: fields.billableMinutes,
          call_duration: fields.handleTimeSeconds,
          campaign_name: fields.campaignName,
          disposition: fields.dispositionName,
          dnis: fields.dnis,
          notes: fields.comments,
          call_direction: "inbound",
          call_type: "inbound",
          status: fields.status,
        });

      if (insertError) {
        logStep("WL insert error", { error: insertError.message });
        return new Response(JSON.stringify({ error: insertError.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      logStep("WL call inserted successfully", { callId: fields.callId, wlClientId: mapping.wl_client_id });

      return new Response(JSON.stringify({
        success: true,
        status: "inserted",
        target: "wl_call_logs",
        call_id: fields.callId,
        wl_client_id: mapping.wl_client_id,
        partner_id: mapping.partner_id,
        billable_minutes: fields.billableMinutes,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ---- ROUTE: Regular Campaign (existing behavior) ----
    const clientId = mapping.lead_id;
    if (!clientId) {
      return new Response(JSON.stringify({
        error: "Mapping found but no lead_id assigned.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Regular campaign detected", { clientId, campaignName: fields.campaignName });

    // Deduplication check on call_logs
    if (fields.callId) {
      const { data: existing } = await supabase
        .from("call_logs")
        .select("id")
        .eq("external_call_id", fields.callId)
        .maybeSingle();

      if (existing) {
        logStep("Duplicate call skipped", { callId: fields.callId });
        return new Response(JSON.stringify({
          success: true, status: "duplicate_skipped", call_id: fields.callId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const { error: insertError } = await supabase
      .from("call_logs")
      .insert({
        client_id: clientId,
        external_call_id: fields.callId,
        caller_phone: normalizePhoneNumber(fields.ani),
        caller_name: fields.callerName,
        caller_email: fields.callerEmail,
        caller_number: fields.callerNumber,
        call_date: fields.callDate,
        call_time: fields.callTime,
        handle_time_seconds: fields.handleTimeSeconds,
        billable_minutes: fields.billableMinutes,
        call_duration: fields.handleTimeSeconds,
        campaign_name: fields.campaignName,
        disposition: fields.dispositionName,
        dnis: fields.dnis,
        notes: fields.comments,
        call_direction: "inbound",
        call_type: "inbound",
        status: fields.status,
      });

    if (insertError) {
      logStep("Insert error", { error: insertError.message });
      return new Response(JSON.stringify({ error: insertError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("Call inserted successfully", { callId: fields.callId, clientId });

    return new Response(JSON.stringify({
      success: true,
      status: "inserted",
      target: "call_logs",
      call_id: fields.callId,
      client_id: clientId,
      handle_time_seconds: fields.handleTimeSeconds,
      billable_minutes: fields.billableMinutes,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
