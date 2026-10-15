import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { forbiddenResponse, hasWLPartnerAccess } from "../_shared/wlPartnerAccess.ts";
import { chatCompletion } from "../_shared/aiChat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

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

    const { partner_id, draft_month, context } = await req.json();
    if (!partner_id || !draft_month) throw new Error("partner_id and draft_month are required");
    if (!(await hasWLPartnerAccess(supabaseAdmin, user.id, partner_id))) return forbiddenResponse(corsHeaders);

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

    // With no blog posts that month the newsletter is written from the sender's
    // context alone (the Context field is required in the UI).
    const featuredPosts = posts ?? [];
    if (featuredPosts.length === 0 && !context?.trim()) {
      throw new Error("No blog posts found for this month. Add context describing what the newsletter should cover.");
    }

    const postSummaries = featuredPosts.map((p, i) =>
      `${i + 1}. Title: ${p.generated_title || p.keyword_text}
   Excerpt: ${(p.generated_excerpt || (p.generated_content || "").substring(0, 150))}
   URL: ${p.wp_post_url || "(not yet published to WordPress)"}`
    ).join("\n\n");

    const monthName = monthStart.toLocaleString("en-US", { month: "long", year: "numeric" });

    const prompt = `Create an email newsletter for ${companyName} for ${monthName}.

${featuredPosts.length > 0
  ? `Blog posts to feature:\n${postSummaries}`
  : "There are no blog posts this month. Build the newsletter around the sender's context below."}

Company: ${companyName}
Services: ${partner?.services_offered || "virtual receptionist services"}
Brand voice: ${partner?.brand_voice_notes || "professional and helpful"}
${context ? `\nContext from the sender — key topics, promotions, audience, and tone to prioritize:\n${context}\n` : ""}

Return valid JSON (no markdown fences):
{
  "subject_line": "Compelling email subject line under 60 chars",
  "html_content": "Complete HTML email with inline styles. Use ${brandColor} as primary color. Include: header with company name, intro paragraph, each blog post (if any) as a section with title, excerpt, and 'Read More' link (use the URL if available, otherwise use '#'), or otherwise sections covering the sender's topics. End with a CTA and footer.",
  "plain_text": "Plain text version of the same newsletter"
}

HTML requirements:
- Use inline CSS only (email compatible)
- Max width 600px, centered
- Clean, professional design
- Responsive-friendly tables
- Include unsubscribe placeholder at bottom`;

    const response = await chatCompletion([{ role: "user", content: prompt }]);

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
        post_ids: featuredPosts.map(p => p.id),
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
