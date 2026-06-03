import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-pabbly-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[INGEST-MEETING] ${step}${detailsStr}`);
};

interface MeetingPayload {
  event_type?: string;
  scheduled_at: string;
  duration_minutes?: number;
  status?: string;
  attendee_name?: string;
  attendee_email?: string;
  calendly_event_id?: string;
  calendly_event_url?: string;
  meeting_link?: string;
  location?: string;
  notes?: string;
  lead_id?: string;
  client_identifier?: string;
  assigned_to?: string;
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

    // Verify Pabbly webhook secret
    const pabblySecret = Deno.env.get("PABBLY_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-pabbly-secret");

    if (!pabblySecret) {
      logStep("ERROR: PABBLY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook authentication not configured. Please set PABBLY_WEBHOOK_SECRET." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!providedSecret || providedSecret !== pabblySecret) {
      logStep("Invalid or missing webhook secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    logStep("Webhook secret verified");

    // Parse payload
    const payload: MeetingPayload = await req.json();
    logStep("Payload received", {
      eventType: payload.event_type,
      calendlyEventId: payload.calendly_event_id,
      attendeeEmail: payload.attendee_email,
      status: payload.status,
    });

    // Validate required field
    if (!payload.scheduled_at) {
      return new Response(
        JSON.stringify({ error: "scheduled_at is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const meetingStatus = payload.status || "scheduled";

    // Handle cancellation: update existing meeting if calendly_event_id provided
    if (meetingStatus === "cancelled" && payload.calendly_event_id) {
      const { data: existing } = await supabase
        .from("meetings")
        .select("id, lead_id")
        .eq("calendly_event_id", payload.calendly_event_id)
        .limit(1)
        .single();

      if (existing) {
        await supabase
          .from("meetings")
          .update({ status: "cancelled" })
          .eq("id", existing.id);

        // Log cancellation activity if lead is linked
        if (existing.lead_id) {
          await supabase.from("crm_activities").insert({
            lead_id: existing.lead_id,
            activity_type: "meeting",
            title: "Meeting cancelled",
            description: `${payload.event_type || "Meeting"} with ${payload.attendee_name || payload.attendee_email || "attendee"} has been cancelled.`,
            metadata: {
              meeting_id: existing.id,
              event_type: payload.event_type,
              scheduled_at: payload.scheduled_at,
              attendee_name: payload.attendee_name,
              attendee_email: payload.attendee_email,
              action: "cancelled",
            },
          });
        }

        logStep("Meeting cancelled", { meetingId: existing.id });
        return new Response(
          JSON.stringify({ success: true, meeting_id: existing.id, action: "cancelled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      // If not found, fall through to create as cancelled
    }

    // Deduplication check
    if (payload.calendly_event_id) {
      const { data: existing } = await supabase
        .from("meetings")
        .select("id")
        .eq("calendly_event_id", payload.calendly_event_id)
        .limit(1)
        .single();

      if (existing) {
        logStep("Duplicate meeting skipped", { calendlyEventId: payload.calendly_event_id });
        return new Response(
          JSON.stringify({ success: true, meeting_id: existing.id, action: "skipped_duplicate" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Lead matching
    let leadId = payload.lead_id || null;

    if (!leadId && payload.client_identifier) {
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

    if (!leadId && payload.attendee_email) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id")
        .eq("email", payload.attendee_email)
        .limit(1)
        .single();

      if (lead) {
        leadId = lead.id;
        logStep("Found lead via attendee email", { leadId });
      }
    }

    // Insert meeting
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({
        lead_id: leadId,
        event_type: payload.event_type,
        scheduled_at: payload.scheduled_at,
        duration_minutes: payload.duration_minutes || 30,
        status: meetingStatus,
        attendee_name: payload.attendee_name,
        attendee_email: payload.attendee_email,
        calendly_event_id: payload.calendly_event_id,
        calendly_event_url: payload.calendly_event_url,
        meeting_link: payload.meeting_link,
        location: payload.location || "virtual",
        notes: payload.notes,
        assigned_to: payload.assigned_to || null,
        metadata: payload as unknown,
      })
      .select("id")
      .single();

    if (meetingError) {
      logStep("Error inserting meeting", { error: meetingError.message });
      throw new Error(`Failed to insert meeting: ${meetingError.message}`);
    }

    logStep("Meeting created", { meetingId: meeting.id, leadId });

    // Log CRM activity if lead is linked
    if (leadId) {
      const activityTitle =
        meetingStatus === "cancelled"
          ? "Meeting cancelled"
          : `Meeting scheduled: ${payload.event_type || "Meeting"}`;

      const activityDescription =
        meetingStatus === "cancelled"
          ? `${payload.event_type || "Meeting"} with ${payload.attendee_name || payload.attendee_email || "attendee"} has been cancelled.`
          : `${payload.event_type || "Meeting"} with ${payload.attendee_name || payload.attendee_email || "attendee"} scheduled for ${payload.scheduled_at}.`;

      await supabase.from("crm_activities").insert({
        lead_id: leadId,
        activity_type: "meeting",
        title: activityTitle,
        description: activityDescription,
        metadata: {
          meeting_id: meeting.id,
          event_type: payload.event_type,
          scheduled_at: payload.scheduled_at,
          duration_minutes: payload.duration_minutes,
          meeting_link: payload.meeting_link,
          attendee_name: payload.attendee_name,
          attendee_email: payload.attendee_email,
          calendly_event_url: payload.calendly_event_url,
          location: payload.location,
        },
      });

      logStep("CRM activity logged", { leadId });
    }

    return new Response(
      JSON.stringify({
        success: true,
        meeting_id: meeting.id,
        lead_id: leadId,
        action: "created",
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
