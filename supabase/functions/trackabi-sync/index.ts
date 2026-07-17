// trackabi-sync — posts completed work-block time entries to Trackabi.
//
// Trackabi's /time-entries API only supports create (POST) and list (GET) —
// there is no working update/close-by-id or pause/break concept (confirmed by
// probing: PATCH errors server-side, PUT/DELETE by id both 404 despite CORS
// preflight claiming otherwise). So instead of "open an entry at clock-in,
// close it at clock-out", each work BLOCK is posted as one complete entry
// once it ends:
//   - clock_in / break_end: no-op — nothing has ended yet, nothing to post.
//   - break_start: posts the work block from (last break's end, or shift
//     clock_in if no prior break) to now.
//   - clock_out: posts the work block from (last break's end, or shift
//     clock_in) to now.
//
// Body: { action, agent_id, agent_email, shift_id, timestamp, break_type? }
// agent_id/agent_email are informational only — the caller's identity is
// taken from their verified JWT, never trusted from the request body.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRACKABI_API = "https://api.trackabi.com/api/v1";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const logStep = (step: string, details?: unknown) => {
  console.log(`[TRACKABI-SYNC] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

type Action = "clock_in" | "clock_out" | "break_start" | "break_end";

interface SyncBody {
  action: Action;
  agent_id?: string;
  agent_name?: string;
  agent_email?: string;
  shift_id: string;
  timestamp: string;
  break_type?: "bathroom" | "lunch";
}

function hhmm(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16);
}

function dateOf(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Identity strictly from the verified JWT — never trust agent_id from the body.
    const { data: userRes, error: userErr } = await anon.auth.getUser();
    const authedUser = userRes?.user;
    if (userErr || !authedUser) return jsonResponse({ error: "Unauthorized" }, 401);

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json().catch(() => null)) as SyncBody | null;
    if (!body || !body.action || !body.shift_id || !body.timestamp) {
      return jsonResponse({ error: "action, shift_id and timestamp are required" }, 400);
    }

    logStep("Request received", { action: body.action, shiftId: body.shift_id, agent: authedUser.id });

    // clock_in / break_end have nothing to close in Trackabi — no-op.
    if (body.action === "clock_in" || body.action === "break_end") {
      return jsonResponse({ success: true, skipped: true, reason: "no work block ended" });
    }

    if (body.action !== "clock_out" && body.action !== "break_start") {
      return jsonResponse({ error: `Unknown action: ${body.action}` }, 400);
    }

    // Verify the shift belongs to the authenticated agent — never trust shift_id blindly.
    const { data: shift, error: shiftErr } = await admin
      .from("agent_shifts")
      .select("id, agent_id, clock_in")
      .eq("id", body.shift_id)
      .maybeSingle();
    if (shiftErr) throw shiftErr;
    if (!shift || shift.agent_id !== authedUser.id) {
      return jsonResponse({ error: "Shift not found for this agent" }, 403);
    }

    const trackabiApiKey = Deno.env.get("TRACKABI_API_KEY");
    if (!trackabiApiKey) {
      logStep("TRACKABI_API_KEY not configured — skipping sync");
      return jsonResponse({ success: true, skipped: true, reason: "Trackabi not configured" });
    }

    // Resolve (or auto-match + persist) the agent's Trackabi member id.
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, full_name, trackabi_user_id")
      .eq("id", authedUser.id)
      .maybeSingle();
    if (profileErr) throw profileErr;

    let memberId: number | null = profile?.trackabi_user_id ? Number(profile.trackabi_user_id) : null;

    if (!memberId) {
      const agentEmail = authedUser.email ?? body.agent_email ?? null;
      if (agentEmail) {
        const membersRes = await fetch(`${TRACKABI_API}/members`, {
          headers: { Authorization: `Bearer ${trackabiApiKey}` },
        });
        if (membersRes.ok) {
          const members = (await membersRes.json()) as Array<{ id: number; email: string }>;
          const match = members.find((m) => m.email?.toLowerCase() === agentEmail.toLowerCase());
          if (match) {
            memberId = match.id;
            await admin
              .from("profiles")
              .update({ trackabi_user_id: String(match.id) })
              .eq("id", authedUser.id);
            logStep("Auto-matched Trackabi member", { agentEmail, memberId });
          }
        } else {
          logStep("Trackabi /members lookup failed", { status: membersRes.status });
        }
      }
    }

    if (!memberId) {
      logStep("No Trackabi member mapping — skipping sync", { agentId: authedUser.id });
      return jsonResponse({ success: true, skipped: true, reason: "No Trackabi member mapping for this agent" });
    }

    // Work-block start = end of the last completed break on this shift, else shift clock-in.
    const { data: lastBreak, error: breakErr } = await admin
      .from("agent_shift_breaks")
      .select("ended_at")
      .eq("shift_id", body.shift_id)
      .not("ended_at", "is", null)
      .order("ended_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (breakErr) throw breakErr;

    const workStartIso = lastBreak?.ended_at ?? shift.clock_in;
    const workEndIso = body.timestamp;

    if (new Date(workEndIso).getTime() <= new Date(workStartIso).getTime()) {
      logStep("Zero/negative-length work block — skipping", { workStartIso, workEndIso });
      return jsonResponse({ success: true, skipped: true, reason: "Zero-length work block" });
    }

    const agentLabel = body.agent_name || profile?.full_name || authedUser.email || "Agent";
    const description =
      body.action === "clock_out"
        ? `${agentLabel} — 24H Virtual shift (final work block)`
        : `${agentLabel} — 24H Virtual shift (work block before ${body.break_type ?? ""} break)`.trim();

    const entryPayload = {
      member_id: memberId,
      date_logged: dateOf(workStartIso),
      start_time: hhmm(workStartIso),
      end_time: hhmm(workEndIso),
      description,
      time_type: "Normal",
      billable: false,
    };

    const trackabiRes = await fetch(`${TRACKABI_API}/time-entries`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${trackabiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entryPayload),
    });
    const trackabiData = await trackabiRes.json().catch(() => null);

    if (!trackabiRes.ok) {
      logStep("Trackabi POST failed", { status: trackabiRes.status, body: trackabiData });
      return jsonResponse({ success: false, error: "Trackabi API error", details: trackabiData }, 502);
    }

    logStep("Trackabi entry created", { entryId: trackabiData?.id, memberId });
    return jsonResponse({ success: true, entry: trackabiData });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return jsonResponse({ error: message }, 500);
  }
});
