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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { blog_queue_id } = await req.json();
    if (!blog_queue_id) throw new Error("blog_queue_id is required");

    // Get blog post content
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from("wl_blog_queue")
      .select("*, white_label_partners(company_name, brand_voice_notes, services_offered, target_location)")
      .eq("id", blog_queue_id)
      .single();

    if (queueError || !queueItem) throw new Error("Blog post not found");

    const partner = (queueItem as any).white_label_partners;
    const companyName = partner?.company_name || "Our Company";
    const content = queueItem.generated_content || queueItem.keyword_text;
    const title = queueItem.generated_title || queueItem.keyword_text;

    const prompt = `Generate social media posts for ${companyName} based on this blog post.

Blog Title: ${title}
Blog Content (first 2000 chars): ${(content || "").substring(0, 2000)}

Company: ${companyName}
Services: ${partner?.services_offered || "virtual receptionist services"}
Location: ${partner?.target_location || ""}

Generate exactly 5 social media posts in this JSON format (no markdown fences):
[
  {"platform": "linkedin", "content": "Professional LinkedIn post (max 3000 chars, include relevant hashtags)"},
  {"platform": "linkedin", "content": "Second LinkedIn variant"},
  {"platform": "facebook", "content": "Engaging Facebook post (conversational tone, 1-2 paragraphs)"},
  {"platform": "twitter", "content": "Tweet 1 (max 280 chars, include hashtags)"},
  {"platform": "twitter", "content": "Tweet 2 (max 280 chars, different angle)"}
]

Rules:
- LinkedIn: Professional, thought-leadership tone. Use line breaks for readability.
- Facebook: Conversational, engaging. Ask a question or share a tip.
- Twitter/X: Concise, punchy. Stay under 280 characters including hashtags.
- Never mention competitor names.
- Position ${companyName} as the expert.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI generation failed");
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";

    let snippets;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      snippets = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse:", rawContent.substring(0, 500));
      throw new Error("Failed to parse AI response");
    }

    // Delete existing snippets for this blog post
    await supabaseAdmin
      .from("wl_social_snippets")
      .delete()
      .eq("blog_queue_id", blog_queue_id)
      .eq("partner_id", queueItem.partner_id);

    // Insert new snippets
    const rows = snippets.map((s: any) => ({
      partner_id: queueItem.partner_id,
      blog_queue_id,
      platform: s.platform,
      content: s.content,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("wl_social_snippets")
      .insert(rows);

    if (insertError) throw new Error("Failed to save snippets: " + insertError.message);

    return new Response(JSON.stringify({ success: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("wl-generate-social-snippets error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
