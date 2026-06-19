import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[bookii-webhook] ${step}${d}`);
};

async function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const buf = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return signatureHeader === `sha256=${hex}`;
  } catch {
    return false;
  }
}

function calcDurationMinutes(startIso: string, endIso: string): number {
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
  const mins = Math.round(diff / 60000);
  return mins > 0 ? mins : 30;
}

interface BookiiBookingData {
  id: string;
  guest_name?: string;
  guest_email?: string;
  start_time: string;
  end_time?: string;
  meeting_type?: string;
  meeting_url?: string | null;
  status?: string;
  timezone?: string;
}

interface BookiiPayload {
  event: string;
  data: BookiiBookingData;
}

Deno.serve(async (req) => {
  // Bookii retries on non-200 — only return 403 for invalid signatures.

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "content-type, x-bookii-signature, x-bookii-delivery",
      },
    });
  }

  const rawBody = await req.text();
  const deliveryId = req.headers.get("x-bookii-delivery") ?? "";
  const signatureHeader = req.headers.get("x-bookii-signature") ?? "";

  // ── 1. Verify HMAC-SHA256 signature ──────────────────────────────────────
  const bookiiSecret = Deno.env.get("BOOKII_WEBHOOK_SECRET");

  if (!bookiiSecret) {
    // Misconfigured on our end — return 200 so Bookii does not retry forever
    log("ERROR: BOOKII_WEBHOOK_SECRET not configured");
    return new Response(
      JSON.stringify({ received: true, warning: "secret_not_configured" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const signatureValid = await verifyHmacSignature(
    rawBody,
    signatureHeader,
    bookiiSecret
  );

  if (!signatureValid) {
    log("Invalid signature", { signatureHeader: signatureHeader.slice(0, 20), deliveryId });
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  log("Signature verified", { deliveryId });

  // ── 2. Parse payload ──────────────────────────────────────────────────────
  let payload: BookiiPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    log("Invalid JSON body");
    return new Response(
      JSON.stringify({ received: true, warning: "invalid_json" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const { event, data } = payload;

  if (!data?.id || !data?.start_time) {
    log("Missing required fields in payload", { event, hasId: !!data?.id });
    return new Response(
      JSON.stringify({ received: true, warning: "missing_required_fields" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Bookii's booking UUID stored as "bookii_{uuid}" to namespace from Calendly IDs
  const bookingKey = `bookii_${data.id}`;
  log("Event received", { event, bookingKey, deliveryId });

  // ── 3. Init Supabase (service role) ──────────────────────────────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ─────────────────────────────────────────────────────────────────────
    // booking.created
    // ─────────────────────────────────────────────────────────────────────
    if (event === "booking.created") {
      // Idempotency: skip if already ingested (same booking ID)
      const { data: existing } = await supabase
        .from("meetings")
        .select("id")
        .eq("calendly_event_id", bookingKey)
        .limit(1)
        .maybeSingle();

      if (existing) {
        log("Duplicate booking skipped", { bookingKey });
        return new Response(
          JSON.stringify({
            received: true,
            action: "skipped_duplicate",
            meeting_id: existing.id,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Lead matching via attendee email
      let leadId: string | null = null;
      if (data.guest_email) {
        const { data: lead } = await supabase
          .from("leads")
          .select("id")
          .eq("email", data.guest_email)
          .limit(1)
          .maybeSingle();

        if (lead) {
          leadId = lead.id;
          log("Found lead via email", { leadId });
        }
      }

      const duration = data.end_time
        ? calcDurationMinutes(data.start_time, data.end_time)
        : 30;

      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          lead_id: leadId,
          event_type: data.meeting_type || "Meeting",
          scheduled_at: data.start_time,
          duration_minutes: duration,
          status: "scheduled",
          attendee_name: data.guest_name || null,
          attendee_email: data.guest_email || null,
          calendly_event_id: bookingKey,
          meeting_link: data.meeting_url || null,
          location: "virtual",
          metadata: payload,
        })
        .select("id")
        .single();

      if (meetingError) {
        log("Insert error", { error: meetingError.message });
        throw new Error(meetingError.message);
      }

      log("Meeting created", { meetingId: meeting.id, leadId });

      if (leadId) {
        await supabase.from("crm_activities").insert({
          lead_id: leadId,
          activity_type: "meeting",
          title: `Meeting scheduled: ${data.meeting_type || "Meeting"}`,
          description: `${data.meeting_type || "Meeting"} with ${
            data.guest_name || data.guest_email || "attendee"
          } scheduled for ${data.start_time}.`,
          metadata: {
            meeting_id: meeting.id,
            event_type: data.meeting_type,
            scheduled_at: data.start_time,
            duration_minutes: duration,
            meeting_link: data.meeting_url,
            attendee_name: data.guest_name,
            attendee_email: data.guest_email,
            bookii_booking_id: data.id,
          },
        });
        log("CRM activity logged", { leadId });
      }

      return new Response(
        JSON.stringify({
          received: true,
          action: "created",
          meeting_id: meeting.id,
          lead_id: leadId,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // booking.cancelled
    // ─────────────────────────────────────────────────────────────────────
    if (event === "booking.cancelled") {
      const { data: existing } = await supabase
        .from("meetings")
        .select("id, lead_id")
        .eq("calendly_event_id", bookingKey)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        log("Cancelled booking not found — ignoring", { bookingKey });
        return new Response(
          JSON.stringify({ received: true, warning: "not_found" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("meetings")
        .update({ status: "cancelled" })
        .eq("id", existing.id);

      if (existing.lead_id) {
        await supabase.from("crm_activities").insert({
          lead_id: existing.lead_id,
          activity_type: "meeting",
          title: "Meeting cancelled",
          description: `${data.meeting_type || "Meeting"} with ${
            data.guest_name || data.guest_email || "attendee"
          } has been cancelled.`,
          metadata: {
            meeting_id: existing.id,
            event_type: data.meeting_type,
            scheduled_at: data.start_time,
            attendee_name: data.guest_name,
            attendee_email: data.guest_email,
            action: "cancelled",
            bookii_booking_id: data.id,
          },
        });
      }

      log("Meeting cancelled", { meetingId: existing.id });
      return new Response(
        JSON.stringify({
          received: true,
          action: "cancelled",
          meeting_id: existing.id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // booking.rescheduled
    // ─────────────────────────────────────────────────────────────────────
    if (event === "booking.rescheduled") {
      const { data: existing } = await supabase
        .from("meetings")
        .select("id, lead_id")
        .eq("calendly_event_id", bookingKey)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        log("Rescheduled booking not found — ignoring", { bookingKey });
        return new Response(
          JSON.stringify({ received: true, warning: "not_found" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const duration = data.end_time
        ? calcDurationMinutes(data.start_time, data.end_time)
        : 30;

      await supabase
        .from("meetings")
        .update({
          scheduled_at: data.start_time,
          duration_minutes: duration,
          status: "scheduled",
          meeting_link: data.meeting_url || null,
          metadata: payload,
        })
        .eq("id", existing.id);

      if (existing.lead_id) {
        await supabase.from("crm_activities").insert({
          lead_id: existing.lead_id,
          activity_type: "meeting",
          title: "Meeting rescheduled",
          description: `${data.meeting_type || "Meeting"} rescheduled to ${
            data.start_time
          }.`,
          metadata: {
            meeting_id: existing.id,
            event_type: data.meeting_type,
            scheduled_at: data.start_time,
            duration_minutes: duration,
            attendee_name: data.guest_name,
            attendee_email: data.guest_email,
            action: "rescheduled",
            bookii_booking_id: data.id,
          },
        });
      }

      log("Meeting rescheduled", { meetingId: existing.id });
      return new Response(
        JSON.stringify({
          received: true,
          action: "rescheduled",
          meeting_id: existing.id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Unhandled event type — ack and return 200
    // ─────────────────────────────────────────────────────────────────────
    log("Unhandled event type", { event });
    return new Response(
      JSON.stringify({ received: true, warning: "unhandled_event", event }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Return 200 so Bookii does not retry due to our own internal error
    const msg = err instanceof Error ? err.message : String(err);
    log("Unhandled error", { error: msg });
    return new Response(
      JSON.stringify({ received: true, internal_error: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});
