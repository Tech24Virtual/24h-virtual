import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Five9's browser-based connector opens this URL directly in the agent's
// browser as a plain GET request with no auth headers and no request body —
// all call data arrives as query string parameters. This endpoint mirrors
// the routing logic in ingest-five9-call but is shaped for that transport:
// GET only, secret passed as ?key=, and a blank HTML response so agents
// never see a raw JSON payload.

const BLANK_HTML = "<html><body></body></html>";

function htmlResponse(status: number): Response {
  return new Response(BLANK_HTML, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[FIVE9-CONNECTOR-WEBHOOK] ${step}${detailsStr}`);
};

function parseTimeToSeconds(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  if (timeStr.includes(":")) {
    const parts = timeStr.trim().split(":").map((p) => parseInt(p, 10));
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  }
  const seconds = parseInt(timeStr, 10);
  return isNaN(seconds) ? 0 : seconds;
}

function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  return cleaned || null;
}

function extractCallFields(params: URLSearchParams) {
  const callId = params.get("call_id");
  const campaignName = params.get("campaign_name");
  const agentName = params.get("agent_name") || null;
  const agentUsername = params.get("agent_username") || null;
  const callerPhone = params.get("caller_phone") || null;
  const callerNumber = params.get("caller_number") || null;
  const disposition = params.get("disposition") || null;
  const callType = params.get("call_type") || null;

  const handleTimeSeconds = parseTimeToSeconds(params.get("call_duration"));
  const billableMinutes = handleTimeSeconds > 0 ? Math.ceil(handleTimeSeconds / 60) : 0;
  const status = handleTimeSeconds === 0 ? "missed" : "completed";

  const now = new Date();
  const callDate = now.toISOString().split("T")[0];
  const callTime = now.toTimeString().split(" ")[0];

  const notes = agentUsername ? `Agent username: ${agentUsername}` : null;
  const callDirection = callType && callType.toLowerCase().includes("outbound") ? "outbound" : "inbound";

  return {
    callId, campaignName, agentName, callerPhone, callerNumber,
    disposition, callType, callDirection, handleTimeSeconds, billableMinutes,
    status, callDate, callTime, notes,
  };
}

async function processCall(supabase: ReturnType<typeof createClient>, fields: ReturnType<typeof extractCallFields>) {
  if (!fields.campaignName) {
    logStep("Missing campaign_name, cannot identify client");
    return;
  }

  const { data: mapping } = await supabase
    .from("client_report_mappings")
    .select("lead_id, match_type, wl_client_id, partner_id")
    .eq("match_value", fields.campaignName)
    .eq("is_active", true)
    .in("match_type", ["campaign", "wl_campaign"])
    .maybeSingle();

  if (!mapping) {
    logStep("No mapping found for campaign", { campaignName: fields.campaignName });
    return;
  }

  // ---- ROUTE: White Label Campaign ----
  if (mapping.match_type === "wl_campaign" && mapping.wl_client_id) {
    logStep("WL campaign detected", { wlClientId: mapping.wl_client_id, partnerId: mapping.partner_id });

    if (fields.callId) {
      const { data: existing } = await supabase
        .from("wl_call_logs")
        .select("id")
        .eq("external_call_id", fields.callId)
        .maybeSingle();

      if (existing) {
        logStep("Duplicate WL call skipped", { callId: fields.callId });
        return;
      }
    }

    const { error: insertError } = await supabase
      .from("wl_call_logs")
      .insert({
        partner_id: mapping.partner_id,
        wl_client_id: mapping.wl_client_id,
        external_call_id: fields.callId,
        agent_name: fields.agentName,
        caller_phone: normalizePhoneNumber(fields.callerPhone),
        caller_number: fields.callerNumber,
        call_date: fields.callDate,
        call_time: fields.callTime,
        handle_time_seconds: fields.handleTimeSeconds,
        billable_minutes: fields.billableMinutes,
        call_duration: fields.handleTimeSeconds,
        campaign_name: fields.campaignName,
        disposition: fields.disposition,
        notes: fields.notes,
        call_direction: fields.callDirection,
        call_type: fields.callType,
        status: fields.status,
      });

    if (insertError) {
      logStep("WL insert error", { error: insertError.message });
      return;
    }

    logStep("WL call inserted successfully", { callId: fields.callId, wlClientId: mapping.wl_client_id });
    return;
  }

  // ---- ROUTE: Regular Campaign ----
  const clientId = mapping.lead_id;
  if (!clientId) {
    logStep("Mapping found but no lead_id assigned", { campaignName: fields.campaignName });
    return;
  }

  if (fields.callId) {
    const { data: existing } = await supabase
      .from("call_logs")
      .select("id")
      .eq("external_call_id", fields.callId)
      .maybeSingle();

    if (existing) {
      logStep("Duplicate call skipped", { callId: fields.callId });
      return;
    }
  }

  const { error: insertError } = await supabase
    .from("call_logs")
    .insert({
      client_id: clientId,
      external_call_id: fields.callId,
      agent_name: fields.agentName,
      caller_phone: normalizePhoneNumber(fields.callerPhone),
      caller_number: fields.callerNumber,
      call_date: fields.callDate,
      call_time: fields.callTime,
      handle_time_seconds: fields.handleTimeSeconds,
      billable_minutes: fields.billableMinutes,
      call_duration: fields.handleTimeSeconds,
      campaign_name: fields.campaignName,
      disposition: fields.disposition,
      notes: fields.notes,
      call_direction: fields.callDirection,
      call_type: fields.callType,
      status: fields.status,
    });

  if (insertError) {
    logStep("Insert error", { error: insertError.message });
    return;
  }

  logStep("Call inserted successfully", { callId: fields.callId, clientId });
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return htmlResponse(405);
  }

  const url = new URL(req.url);

  const webhookKey = Deno.env.get("FIVE9_CONNECTOR_WEBHOOK_KEY");
  const providedKey = url.searchParams.get("key");

  if (!webhookKey || !providedKey || providedKey !== webhookKey) {
    logStep("Invalid or missing webhook key");
    return htmlResponse(401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    logStep("ERROR: Missing Supabase config");
    return htmlResponse(500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const fields = extractCallFields(url.searchParams);

  logStep("Received connector hit", {
    callId: fields.callId,
    campaignName: fields.campaignName,
    agentName: fields.agentName,
  });

  // Respond immediately so the agent's browser never sees a delay or a raw
  // JSON body; the actual DB write happens after the response is sent.
  const task = processCall(supabase, fields).catch((error) => {
    logStep("ERROR processing call", { message: error instanceof Error ? error.message : String(error) });
  });

  // deno-lint-ignore no-explicit-any
  const edgeRuntime = (globalThis as any).EdgeRuntime;
  if (edgeRuntime?.waitUntil) {
    edgeRuntime.waitUntil(task);
  } else {
    await task;
  }

  return htmlResponse(200);
});
