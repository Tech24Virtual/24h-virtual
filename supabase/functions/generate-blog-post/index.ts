import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { keyword, content_length = "medium", tone = "professional", angle, queue_id } = await req.json();
    if (!keyword) throw new Error("keyword is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch existing posts for interlinking
    const { data: existingPosts } = await supabase
      .from("blog_posts")
      .select("slug, title, category")
      .eq("status", "published")
      .limit(50);

    const existingLinks = (existingPosts || []).map(p => `- [${p.title}](/blog/${p.slug})`).join("\n");

    const wordTarget = content_length === "short" ? "800-1000" : content_length === "long" ? "2000-2500" : "1400-1800";

    const systemPrompt = `You are an expert SEO content writer for 24H Virtual, a virtual receptionist company serving US and Canada businesses.

COMPANY CONTEXT:
- Services: AI Receptionist ($49-$2,499/mo), Message Assistant ($89-$3,499/mo), Virtual Receptionist ($149-$5,999/mo), Virtual Secretary ($199-$7,499/mo), Virtual Assistants ($1,899-$4,899/mo), Hybrid Receptionist (from $99/mo)
- Differentiators: 24/7/365, trilingual (English/Spanish/French), no contracts, HIPAA compliant, launch in 24 hours, 5.0 Clutch rating, 1000+ businesses served
- Competitors: Ruby Receptionist, Abby Connect, ReceptionHQ, LEX Reception, Smith.ai

SERVICE PAGES (link to these naturally):
- /solutions/virtual-receptionist - Live professional receptionists
- /solutions/ai-receptionist - AI-powered call answering
- /solutions/virtual-secretary - Full admin support
- /solutions/message-assistant - Smart message handling
- /solutions/virtual-assistants - Dedicated remote assistants
- /solutions/hybrid-receptionist - AI + Human combined
- /pricing - Transparent pricing
- /cost-calculator - ROI calculator
- /get-started - Free consultation
- /how-it-works - Process explanation

INDUSTRY PAGES (link when relevant):
- /industries/medical-practices, /industries/legal-services, /industries/real-estate
- /industries/home-services, /industries/financial-services, /industries/beauty-wellness
- /industries/it-tech-support, /industries/veterinary, /industries/counseling-therapy
- /industries/emergency-services, /industries/event-planning, /industries/nonprofits

EXISTING BLOG POSTS (cross-link to these):
${existingLinks || "No existing posts yet."}

WRITING STYLE:
- Tone: ${tone}
- Use the Outcome-First framework: lead with the benefit, then explain
- Short paragraphs (max 4 sentences each)
- H2 sections every 200-300 words
- Use bold for key terms
- Include bullet point lists where natural
- ${angle ? `Custom angle: ${angle}` : ""}`;

    const userPrompt = `Write a ${wordTarget} word blog post targeting the keyword "${keyword}".

REQUIREMENTS:
1. Title: Include the keyword naturally. Make it compelling and click-worthy.
2. First paragraph: Directly answer the search intent (for featured snippets and AI search). 2-3 sentences max.
3. Structure: Use H2 and H3 headings. Each section 200-300 words max.
4. Internal links: Include 3-5 links to relevant service/industry pages from the lists above. Use varied, natural anchor text.
5. Blog cross-links: Link to 2-3 existing blog posts if relevant.
6. Callout boxes: Use blockquotes for tips or important notes (> **Tip:** or > **Did you know?**)
7. Comparison: If the keyword involves comparison, include a Markdown comparison table.
8. FAQ section: End with 4-6 FAQs using ## Frequently Asked Questions, then ### for each question.
9. CTA: End with a "Next Steps" section that encourages readers to book a free consultation at /get-started or use the ROI calculator at /cost-calculator.
10. SEO: Meta title under 60 chars, meta description under 160 chars.

OUTPUT FORMAT: Return valid JSON only (no markdown code fences):
{
  "title": "...",
  "slug": "...",
  "excerpt": "100-150 char summary",
  "content": "Full markdown content",
  "meta_title": "Under 60 chars",
  "meta_description": "Under 160 chars",
  "category": "Tips & Guides|Industry Insights|Comparisons|Case Studies",
  "tags": ["tag1", "tag2"],
  "reading_time": 6
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (queue_id) {
        await supabase.from("autoblog_queue").update({ status: "failed", error_message: `AI error: ${response.status}` }).eq("id", queue_id);
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response (strip code fences if present)
    let postData;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      postData = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawContent.substring(0, 500));
      if (queue_id) {
        await supabase.from("autoblog_queue").update({ status: "failed", error_message: "Failed to parse AI response" }).eq("id", queue_id);
      }
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Count words and internal links
    const wordCount = postData.content?.split(/\s+/).filter(Boolean).length || 0;
    const internalLinks = (postData.content?.match(/\]\(\//g) || []).length;

    // Insert blog post
    const { data: newPost, error: insertError } = await supabase.from("blog_posts").insert({
      title: postData.title,
      slug: postData.slug,
      excerpt: postData.excerpt,
      content: postData.content,
      meta_title: postData.meta_title,
      meta_description: postData.meta_description,
      category: postData.category || "Tips & Guides",
      tags: postData.tags || [],
      reading_time: postData.reading_time || Math.ceil(wordCount / 250),
      content_word_count: wordCount,
      internal_link_count: internalLinks,
      ai_generated: true,
      status: "draft",
      author: "24H Virtual",
    }).select().single();

    if (insertError) {
      console.error("Insert error:", insertError);
      if (queue_id) {
        await supabase.from("autoblog_queue").update({ status: "failed", error_message: insertError.message }).eq("id", queue_id);
      }
      throw insertError;
    }

    // Extract and store internal links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    const links = [];
    while ((match = linkRegex.exec(postData.content || "")) !== null) {
      if (match[2].startsWith("/")) {
        links.push({
          blog_post_id: newPost.id,
          target_url: match[2],
          anchor_text: match[1],
        });
      }
    }
    if (links.length > 0) {
      await supabase.from("blog_internal_links").insert(links);
    }

    // Update queue item if provided
    if (queue_id) {
      await supabase.from("autoblog_queue").update({
        status: "generated",
        generated_post_id: newPost.id,
      }).eq("id", queue_id);
    }

    return new Response(JSON.stringify({ success: true, post: newPost }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
