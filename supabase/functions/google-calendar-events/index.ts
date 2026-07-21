import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateAgent(req, ["agent"]);
    if (auth.error) return auth.error;

    const { date_start, date_end } = await req.json();
    if (!date_start || !date_end) {
      return new Response(
        JSON.stringify({ error: "Missing date_start or date_end" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokenRow, error: tokenErr } = await supabase
      .from("agent_google_tokens")
      .select("access_token, refresh_token, token_expiry, google_email")
      .eq("agent_id", auth.user.id)
      .maybeSingle();

    if (tokenErr) throw tokenErr;

    if (!tokenRow) {
      return new Response(
        JSON.stringify({ connected: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let accessToken = tokenRow.access_token;
    const expiresInMs = new Date(tokenRow.token_expiry).getTime() - Date.now();

    if (expiresInMs < REFRESH_THRESHOLD_MS) {
      const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
      const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return new Response(
          JSON.stringify({ error: "Google OAuth is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenRow.refresh_token,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
        }),
      });

      const refreshData = await refreshRes.json();

      if (!refreshRes.ok) {
        // Refresh token invalid/revoked — agent must reconnect their account.
        return new Response(
          JSON.stringify({
            connected: false,
            needs_reconnect: true,
            error: "Google Calendar connection expired — please reconnect your account.",
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      accessToken = refreshData.access_token;
      const token_expiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

      const { error: updateErr } = await supabase
        .from("agent_google_tokens")
        .update({ access_token: accessToken, token_expiry, updated_at: new Date().toISOString() })
        .eq("agent_id", auth.user.id);

      if (updateErr) throw updateErr;
    }

    const params = new URLSearchParams({
      timeMin: new Date(date_start).toISOString(),
      timeMax: new Date(date_end).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });

    const eventsRes = await fetch(`${GOOGLE_EVENTS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (eventsRes.status === 401) {
      return new Response(
        JSON.stringify({
          connected: false,
          needs_reconnect: true,
          error: "Google Calendar connection expired — please reconnect your account.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const eventsData = await eventsRes.json();
    if (!eventsRes.ok) {
      return new Response(
        JSON.stringify({ error: eventsData.error?.message || "Failed to fetch calendar events" }),
        { status: eventsRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // deno-lint-ignore no-explicit-any
    const events = (eventsData.items || []).map((ev: any) => ({
      id: ev.id,
      summary: ev.summary || "(No title)",
      start: ev.start,
      end: ev.end,
      location: ev.location || null,
      description: ev.description || null,
    }));

    return new Response(
      JSON.stringify({ connected: true, google_email: tokenRow.google_email, events }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[google-calendar-events]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
