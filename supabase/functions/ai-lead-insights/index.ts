import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lead } = await req.json();
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead data required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a sales intelligence AI for a virtual receptionist company called 24H Virtual. Analyze this lead and provide structured sales insights.

Lead Data:
- Name: ${lead.name}
- Email: ${lead.email}
- Company: ${lead.company || "Not provided"}
- Phone: ${lead.phone || "Not provided"}
- Service Type: ${lead.service_type || "Not selected"}
- Plan Minutes: ${lead.plan_minutes || "Not selected"}
- Source: ${lead.source || "Unknown"}
- Score: ${lead.score || 0}
- Notes: ${lead.notes || "None"}

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "priority_score": <number 1-10>,
  "priority_reason": "<one sentence reason>",
  "recommended_actions": ["<action 1>", "<action 2>", "<action 3>"],
  "talking_points": ["<point 1>", "<point 2>", "<point 3>"],
  "objection_handling": [
    {"objection": "<likely objection 1>", "response": "<suggested response>"},
    {"objection": "<likely objection 2>", "response": "<suggested response>"}
  ],
  "ideal_contact_time": "<suggested time>",
  "close_probability": <number 0 to 1>,
  "next_best_action": "<single most important next step>"
}`;

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      }
    );

    if (!aiResp.ok) {
      const status = aiResp.status;
      return new Response(
        JSON.stringify({ error: `AI request failed (${status})` }),
        {
          status: status === 429 ? 429 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResp.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const insights = JSON.parse(content);

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
