import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pabbly-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[INGEST-CALL-REPORT] ${step}${detailsStr}`);
};

/**
 * Parse time string (HH:MM:SS or MM:SS) to seconds
 */
function parseTimeToSeconds(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map(p => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  return cleaned || null;
}

interface CallData {
  call_id?: string;
  caller_phone?: string;
  caller_name?: string;
  call_date?: string;
  call_time?: string;
  talk_time?: string;
  acw_time?: string;
  agent?: string;
  campaign?: string;
  notes?: string;
  direction?: string;
  status?: string;
}

interface PabblyPayload {
  pabbly_execution_id?: string;
  email?: {
    from?: string;
    subject?: string;
    received_at?: string;
  };
  client_identifier?: string;
  lead_id?: string;
  calls: CallData[];
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

    // Verify Pabbly webhook secret if configured
    const pabblySecret = Deno.env.get("PABBLY_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-pabbly-secret");
    
    // SECURITY: Webhook secret is now mandatory
    if (!pabblySecret) {
      logStep("ERROR: PABBLY_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ 
        error: "Webhook authentication not configured. Please set PABBLY_WEBHOOK_SECRET." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    if (!providedSecret || providedSecret !== pabblySecret) {
      logStep("Invalid or missing webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("Webhook secret verified");

    // Parse payload
    const payload: PabblyPayload = await req.json();
    logStep("Payload received", { 
      executionId: payload.pabbly_execution_id,
      callCount: payload.calls?.length || 0,
      clientIdentifier: payload.client_identifier,
    });

    if (!payload.calls || !Array.isArray(payload.calls) || payload.calls.length === 0) {
      return new Response(JSON.stringify({ error: "No calls in payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Identify the lead/client
    let leadId = payload.lead_id;
    
    if (!leadId && payload.client_identifier) {
      // Try to find lead by client mapping
      const { data: mapping } = await supabase
        .from("client_report_mappings")
        .select("lead_id")
        .eq("match_value", payload.client_identifier)
        .eq("is_active", true)
        .limit(1)
        .single();
      
      if (mapping) {
        leadId = mapping.lead_id;
        logStep("Found lead via client mapping", { leadId });
      }
    }

    if (!leadId && payload.email?.subject) {
      // Try to match by subject pattern
      const { data: mappings } = await supabase
        .from("client_report_mappings")
        .select("lead_id, match_value")
        .eq("match_type", "subject_pattern")
        .eq("is_active", true);
      
      if (mappings) {
        for (const mapping of mappings) {
          if (payload.email.subject.toLowerCase().includes(mapping.match_value.toLowerCase())) {
            leadId = mapping.lead_id;
            logStep("Found lead via subject pattern", { leadId, pattern: mapping.match_value });
            break;
          }
        }
      }
    }

    if (!leadId) {
      logStep("Could not identify client");
      return new Response(JSON.stringify({ 
        error: "Could not identify client. Please set up a client_report_mapping.",
        hint: "Provide lead_id in payload or set up a mapping in admin panel."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from("call_report_imports")
      .insert({
        lead_id: leadId,
        import_source: "pabbly",
        pabbly_execution_id: payload.pabbly_execution_id,
        email_subject: payload.email?.subject,
        email_from: payload.email?.from,
        received_at: payload.email?.received_at,
        import_status: "processing",
      })
      .select()
      .single();

    if (importError) {
      logStep("Error creating import record", { error: importError.message });
      throw new Error(`Failed to create import record: ${importError.message}`);
    }

    const importId = importRecord.id;
    logStep("Import record created", { importId });

    // Process each call
    let recordsImported = 0;
    let recordsFailed = 0;
    const errorLog: Array<{ call_id?: string; error: string }> = [];

    for (const call of payload.calls) {
      try {
        // Check for duplicates using external_call_id
        if (call.call_id) {
          const { data: existing } = await supabase
            .from("call_logs")
            .select("id")
            .eq("external_call_id", call.call_id)
            .limit(1)
            .single();

          if (existing) {
            logStep("Skipping duplicate call", { callId: call.call_id });
            continue; // Skip duplicate
          }
        }

        // Parse times
        const talkTimeSeconds = parseTimeToSeconds(call.talk_time);
        const acwSeconds = parseTimeToSeconds(call.acw_time);
        const handleTimeSeconds = talkTimeSeconds + acwSeconds;
        const billableMinutes = Math.ceil(handleTimeSeconds / 60);

        // Determine call status
        let status = call.status || "completed";
        if (handleTimeSeconds === 0) {
          status = "missed";
        }

        // Insert call log
        const { error: callError } = await supabase
          .from("call_logs")
          .insert({
            client_id: leadId,
            external_call_id: call.call_id,
            caller_phone: normalizePhoneNumber(call.caller_phone),
            caller_name: call.caller_name,
            call_date: call.call_date,
            call_time: call.call_time,
            talk_time_seconds: talkTimeSeconds,
            acw_seconds: acwSeconds,
            handle_time_seconds: handleTimeSeconds,
            billable_minutes: billableMinutes,
            call_duration: handleTimeSeconds, // Keep for backward compatibility
            call_direction: call.direction || "inbound",
            agent_name: call.agent,
            campaign_name: call.campaign,
            notes: call.notes,
            call_type: call.direction || "inbound",
            status,
            import_id: importId,
          });

        if (callError) {
          throw new Error(callError.message);
        }

        recordsImported++;
      } catch (callProcessError) {
        recordsFailed++;
        errorLog.push({
          call_id: call.call_id,
          error: callProcessError instanceof Error ? callProcessError.message : String(callProcessError),
        });
        logStep("Error processing call", { callId: call.call_id, error: String(callProcessError) });
      }
    }

    // Update import record with results
    const finalStatus = recordsFailed === 0 ? "completed" : 
                       recordsImported === 0 ? "failed" : "completed";

    await supabase
      .from("call_report_imports")
      .update({
        import_status: finalStatus,
        records_imported: recordsImported,
        records_failed: recordsFailed,
        error_log: errorLog.length > 0 ? errorLog : null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", importId);

    logStep("Import completed", { 
      importId, 
      recordsImported, 
      recordsFailed, 
      status: finalStatus 
    });

    return new Response(JSON.stringify({
      success: true,
      import_id: importId,
      records_imported: recordsImported,
      records_failed: recordsFailed,
      status: finalStatus,
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
