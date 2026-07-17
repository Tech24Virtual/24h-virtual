import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";

const TRACKABI_API = "https://api.trackabi.com/api/v1";

interface TrackabiMember {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateAgent(req, ["admin"]);
    if (auth.error) return auth.error;

    const trackabiApiKey = Deno.env.get("TRACKABI_API_KEY");
    if (!trackabiApiKey) {
      return new Response(
        JSON.stringify({ error: "Trackabi is not configured (missing TRACKABI_API_KEY)." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(`${TRACKABI_API}/members`, {
      headers: { Authorization: `Bearer ${trackabiApiKey}` },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[TRACKABI-MEMBERS] Trackabi API error", res.status, body);
      return new Response(
        JSON.stringify({ error: "Failed to fetch Trackabi members" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const members: TrackabiMember[] = await res.json();

    return new Response(
      JSON.stringify({ members }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[TRACKABI-MEMBERS] Unhandled error", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
