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

    const { partner_id, draft_month } = await req.json();
    if (!partner_id || !draft_month) throw new Error("partner_id and draft_month are required");

    // Get partner info
    const { data: partner } = await supabaseAdmin
      .from("white_label_partners")
      .select("company_name, brand_voice_notes, services_offered, target_location, brand_color")
      .eq("id", partner_id)
      .single();

    const companyName = partner?.company_name || "Our Company";
    const brandColor = partner?.brand_color || "#2563eb";

    // Get recent published/generated posts
    const monthStart = new Date(draft_month + "-01");
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const { data: posts } = await supabaseAdmin
      .from("wl_blog_queue")
      .select("id, generated_title, generated_excerpt, generated_content, wp_post_url, keyword_text, status")
      .eq("partner_id", partner_id)
      .in("status", ["generated", "published"])
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    if (!posts || posts.length === 0) {
      throw new Error("No blog posts found for this month. Generate some blog content first.");
    }

    const postSummaries = posts.map((p, i) => 
      `${i + 1}. Title: ${p.generated_title || p.keyword_text}
   Excerpt: ${(p.generated_excerpt || (p.generated_content || "").substring(0, 150))}
   URL: ${p.wp_post_url || "(not yet published to WordPress)"}`
    ).join("\n\n");

    const monthName = monthStart.toLocaleString("en-US", { month: "long", year: "numeric" });

    const prompt = `Create an email newsletter for ${companyName} for ${monthName}.

Blog posts to feature:
${postSummaries}

Company: ${companyName}
Services: ${partner?.services_offered || "virtual receptionist services"}
Brand voice: ${partner?.brand_voice_notes || "professional and helpful"}

Return valid JSON (no markdown fences):
{
  "subject_line": "Compelling email subject line under 60 chars",
  "html_content": "Complete HTML email with inline styles. Use ${brandColor} as primary color. Include: header with company name, intro paragraph, each blog post as a section with title, excerpt, and 'Read More' link (use the URL if available, otherwise use '#'). End with a CTA and footer.",
  "plain_text": "Plain text version of the same newsletter"
}

HTML requirements:
- Use inline CSS only (email compatible)
- Max width 600px, centered
- Clean, professional design
- Responsive-friendly tables
- Include unsubscribe placeholder at bottom`;

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

    if (!response.ok) throw new Error("AI generation failed");

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";

    let newsletter;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      newsletter = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse:", rawContent.substring(0, 500));
      throw new Error("Failed to parse AI response");
    }

    // Save draft
    const { error: insertError } = await supabaseAdmin
      .from("wl_newsletter_drafts")
      .insert({
        partner_id,
        draft_month: draft_month + "-01",
        subject_line: newsletter.subject_line,
        html_content: newsletter.html_content,
        plain_text: newsletter.plain_text,
        post_ids: posts.map(p => p.id),
      });

    if (insertError) throw new Error("Failed to save newsletter: " + insertError.message);

    return new Response(JSON.stringify({ success: true, newsletter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("wl-generate-newsletter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
