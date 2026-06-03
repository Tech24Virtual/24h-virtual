import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { partner_id, focus_area } = await req.json();
    if (!partner_id) throw new Error("partner_id is required");

    // Get partner info
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: partner } = await supabaseAdmin
      .from("white_label_partners")
      .select("company_name, services_offered, target_location")
      .eq("id", partner_id)
      .single();

    // Get existing keywords to avoid duplicates
    const { data: existingKeywords } = await supabaseAdmin
      .from("wl_keyword_tracker")
      .select("keyword")
      .eq("partner_id", partner_id);

    const existingList = (existingKeywords || []).map(k => k.keyword).join(", ");

    const prompt = `Generate 15 SEO keyword suggestions for a company called "${partner?.company_name || "a virtual receptionist company"}" located in ${partner?.target_location || "the US"} offering ${partner?.services_offered || "virtual receptionist and answering services"}.

${focus_area ? `Focus area: ${focus_area}` : ""}

Already tracked keywords (DO NOT suggest these): ${existingList || "none"}

For each keyword, provide:
- keyword: The search keyword phrase
- category: One of: service, location, industry, comparison, how-to, cost
- intent: informational, commercial, transactional, or navigational

Return valid JSON array only (no code fences):
[{"keyword": "...", "category": "...", "intent": "..."}]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";

    let suggestions;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      suggestions = JSON.parse(cleaned);
    } catch {
      throw new Error("Failed to parse AI suggestions");
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("wl-suggest-keywords error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
