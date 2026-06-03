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

    const { queue_id } = await req.json();
    if (!queue_id) throw new Error("queue_id is required");

    // Get the queue item (via admin to bypass potential timing issues)
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from("wl_blog_queue")
      .select("*")
      .eq("id", queue_id)
      .single();

    if (queueError || !queueItem) throw new Error("Queue item not found");

    // Get partner info for branding
    const { data: partner } = await supabaseAdmin
      .from("white_label_partners")
      .select("company_name, brand_color, services_offered, target_location, brand_voice_notes")
      .eq("id", queueItem.partner_id)
      .single();

    const companyName = partner?.company_name || "Our Company";
    const services = partner?.services_offered || "virtual receptionist, answering service, call handling";
    const location = partner?.target_location || "United States and Canada";
    const voiceNotes = partner?.brand_voice_notes || "";

    // Update status to generating
    await supabaseAdmin.from("wl_blog_queue").update({ status: "generating" }).eq("id", queue_id);

    const wordTarget = queueItem.content_length === "short" ? "800-1000" : queueItem.content_length === "long" ? "2000-2500" : "1400-1800";

    const systemPrompt = `You are an expert SEO content writer for ${companyName}, a company offering ${services} in ${location}.

IMPORTANT: You are writing as ${companyName}, NOT as any other brand. All content should position ${companyName} as the expert.

WRITING STYLE:
- Tone: ${queueItem.tone || "professional"}
${voiceNotes ? `- Brand voice notes: ${voiceNotes}` : ""}
- Use the Outcome-First framework: lead with the benefit, then explain
- Short paragraphs (max 4 sentences each)
- H2 sections every 200-300 words
- Use bold for key terms
- Include bullet point lists where natural`;

    const userPrompt = `Write a ${wordTarget} word blog post targeting the keyword "${queueItem.keyword_text}".
${queueItem.angle ? `\nAngle/focus: ${queueItem.angle}` : ""}

REQUIREMENTS:
1. Title: Include the keyword naturally. Make it compelling and click-worthy.
2. First paragraph: Directly answer the search intent. 2-3 sentences max.
3. Structure: Use H2 and H3 headings. Each section 200-300 words max.
4. Callout boxes: Use blockquotes for tips (> **Tip:** or > **Did you know?**)
5. If the keyword involves comparison, include a Markdown comparison table.
6. FAQ section: End with 4-6 FAQs using ## Frequently Asked Questions, then ### for each question.
7. CTA: End with a "Next Steps" section encouraging readers to contact ${companyName}.
8. SEO: Meta title under 60 chars, meta description under 160 chars.
9. Do NOT mention any competitor names or other brands.

OUTPUT FORMAT: Return valid JSON only (no markdown code fences):
{
  "title": "...",
  "excerpt": "100-150 char summary",
  "content": "Full markdown content",
  "meta_title": "Under 60 chars",
  "meta_description": "Under 160 chars"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      await supabaseAdmin.from("wl_blog_queue").update({
        status: "failed",
        error_message: `AI error: ${response.status}`,
      }).eq("id", queue_id);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";

    let postData;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      postData = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawContent.substring(0, 500));
      await supabaseAdmin.from("wl_blog_queue").update({
        status: "failed",
        error_message: "Failed to parse AI response",
      }).eq("id", queue_id);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update queue with generated content
    await supabaseAdmin.from("wl_blog_queue").update({
      status: "generated",
      generated_title: postData.title,
      generated_content: postData.content,
      generated_meta_title: postData.meta_title,
      generated_meta_description: postData.meta_description,
      generated_excerpt: postData.excerpt,
    }).eq("id", queue_id);

    // Update keyword status if linked
    if (queueItem.keyword_id) {
      await supabaseAdmin.from("wl_keyword_tracker").update({
        content_status: "generated",
      }).eq("id", queueItem.keyword_id);
    }

    return new Response(JSON.stringify({ success: true, title: postData.title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("wl-generate-blog-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
