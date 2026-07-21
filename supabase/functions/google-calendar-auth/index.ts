import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, state } = await req.json();

    if (action === "get-url") {
      const auth = await authenticateAgent(req, ["agent"]);
      if (auth.error) return auth.error;

      const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
      const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI");
      if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
        return new Response(
          JSON.stringify({ error: "Google OAuth is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: CALENDAR_SCOPE,
        access_type: "offline",
        prompt: "consent",
        state: auth.user.id,
      });

      return new Response(
        JSON.stringify({ url: `${GOOGLE_AUTH_URL}?${params.toString()}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "callback") {
      if (!code || !state) {
        return new Response(
          JSON.stringify({ error: "Missing code or state" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
      const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
      const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI");
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
        return new Response(
          JSON.stringify({ error: "Google OAuth is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return new Response(
          JSON.stringify({ error: tokenData.error_description || tokenData.error || "Failed to exchange code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { access_token, refresh_token, expires_in } = tokenData;
      if (!access_token || !refresh_token) {
        return new Response(
          JSON.stringify({ error: "Google did not return a refresh token — reconnect and grant offline access" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const userinfo = await userinfoRes.json();
      if (!userinfoRes.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch Google account info" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const google_email = userinfo.email;
      const token_expiry = new Date(Date.now() + expires_in * 1000).toISOString();

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { error: upsertErr } = await supabase
        .from("agent_google_tokens")
        .upsert(
          {
            agent_id: state,
            access_token,
            refresh_token,
            token_expiry,
            google_email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "agent_id" },
        );

      if (upsertErr) throw upsertErr;

      return new Response(
        JSON.stringify({ success: true, google_email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action — expected 'get-url' or 'callback'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[google-calendar-auth]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
