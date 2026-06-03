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

    const { draft_month } = await req.json();
    if (!draft_month) throw new Error("draft_month is required");

    const monthStart = new Date(draft_month + "-01");
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const { data: posts } = await supabaseAdmin
      .from("blog_posts")
      .select("id, title, excerpt, content, slug")
      .eq("status", "published")
      .gte("published_at", monthStart.toISOString())
      .lt("published_at", monthEnd.toISOString())
      .order("published_at", { ascending: false })
      .limit(5);

    if (!posts || posts.length === 0) {
      throw new Error("No published blog posts found for this month.");
    }

    const postSummaries = posts.map((p, i) =>
      `${i + 1}. Title: ${p.title}
   Excerpt: ${p.excerpt || (p.content || "").substring(0, 150)}
   URL: /blog/${p.slug}`
    ).join("\n\n");

    const monthName = monthStart.toLocaleString("en-US", { month: "long", year: "numeric" });
    const brandColor = "#2563eb";

    const prompt = `Create an email newsletter for 24H Virtual for ${monthName}.

Blog posts to feature:
${postSummaries}

Company: 24H Virtual - 24/7 virtual receptionist and answering services

Return valid JSON (no markdown fences):
{
  "subject_line": "Compelling email subject line under 60 chars",
  "html_content": "Complete HTML email with inline styles. Use ${brandColor} as primary color. Include: header with company name, intro paragraph, each blog post as a section with title, excerpt, and 'Read More' link. End with a CTA and footer.",
  "plain_text": "Plain text version of the same newsletter"
}

HTML requirements:
- Use inline CSS only (email compatible)
- Max width 600px, centered
- Clean, professional design
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
      throw new Error("Failed to parse AI response");
    }

    const { error: insertError } = await supabaseAdmin
      .from("admin_newsletter_drafts")
      .insert({
        draft_month: draft_month + "-01",
        subject_line: newsletter.subject_line,
        html_content: newsletter.html_content,
        plain_text: newsletter.plain_text,
        created_by: user.id,
      });

    if (insertError) throw new Error("Failed to save newsletter: " + insertError.message);

    return new Response(JSON.stringify({ success: true, newsletter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-generate-newsletter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
