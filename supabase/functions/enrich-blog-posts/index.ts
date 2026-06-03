import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Internal pages catalog for cross-linking
const SITE_PAGES = [
  { url: "/services/virtual-receptionist", title: "Virtual Receptionist Services", keywords: ["virtual receptionist", "call answering", "live answering"] },
  { url: "/services/ai-receptionist", title: "AI Receptionist", keywords: ["ai receptionist", "automated answering", "ai phone"] },
  { url: "/services/virtual-secretary", title: "Virtual Secretary", keywords: ["virtual secretary", "admin support", "scheduling"] },
  { url: "/services/virtual-assistants", title: "Virtual Assistant Services", keywords: ["virtual assistant", "va services", "remote assistant"] },
  { url: "/services/message-assistant", title: "Message Taking Service", keywords: ["message taking", "message service", "phone messages"] },
  { url: "/services/hybrid-receptionist", title: "Hybrid Receptionist", keywords: ["hybrid receptionist", "ai and human", "blended"] },
  { url: "/pricing", title: "Pricing Plans", keywords: ["pricing", "plans", "cost", "rates", "packages"] },
  { url: "/how-it-works", title: "How It Works", keywords: ["how it works", "get started", "setup"] },
  { url: "/industries/legal-services", title: "Legal Answering Service", keywords: ["legal", "law firm", "attorney", "lawyer"] },
  { url: "/industries/medical-practices", title: "Medical Answering Service", keywords: ["medical", "doctor", "healthcare", "clinic", "patient"] },
  { url: "/industries/real-estate", title: "Real Estate Answering Service", keywords: ["real estate", "realtor", "property"] },
  { url: "/industries/financial-services", title: "Financial Services", keywords: ["financial", "accounting", "bookkeeping", "tax"] },
  { url: "/industries/home-services", title: "Home Services Answering", keywords: ["home services", "plumber", "hvac", "contractor", "electrician"] },
  { url: "/industries/it-tech-support", title: "IT & Tech Support Answering", keywords: ["it support", "tech support", "helpdesk"] },
  { url: "/industries/beauty-wellness", title: "Beauty & Wellness", keywords: ["salon", "spa", "beauty", "wellness"] },
  { url: "/industries/veterinary", title: "Veterinary Answering", keywords: ["vet", "veterinary", "animal", "pet"] },
  { url: "/industries/counseling-therapy", title: "Counseling & Therapy", keywords: ["counseling", "therapy", "therapist", "mental health"] },
  { url: "/industries/event-planning", title: "Event Planning", keywords: ["event", "wedding", "party", "conference"] },
  { url: "/industries/education", title: "Educational Services", keywords: ["education", "school", "tutoring", "training"] },
  { url: "/industries/nonprofits", title: "Nonprofit Answering", keywords: ["nonprofit", "charity", "donation"] },
  { url: "/industries/emergency-services", title: "Emergency Answering", keywords: ["emergency", "after hours", "urgent", "24/7"] },
  { url: "/industries/transportation-logistics", title: "Transportation & Logistics", keywords: ["transportation", "logistics", "shipping", "trucking"] },
  { url: "/cost-calculator", title: "Cost Savings Calculator", keywords: ["calculator", "savings", "cost comparison", "roi"] },
  { url: "/about", title: "About 24H Virtual", keywords: ["about us", "our story", "team"] },
  { url: "/get-started", title: "Get Started", keywords: ["sign up", "free trial", "get started", "try"] },
];

const SYSTEM_PROMPT = `You are an SEO and content enrichment specialist for 24H Virtual, a professional virtual receptionist and answering service company serving businesses across the US and Canada.

Your job is to enrich existing blog posts WITHOUT rewriting the original content. You will add SEO metadata, a speakable summary, FAQ section, and identify places to insert internal links.

BRAND VOICE: Professional, outcome-first, helpful. Mention specific benefits like 24/7 availability, bilingual support (English/Spanish/French), cost savings vs in-house staff.

COMPETITORS to differentiate from: Ruby Receptionist, Abby Connect, ReceptionHQ, LEX Reception, Smith.ai.

AVAILABLE INTERNAL PAGES FOR CROSS-LINKING:
${SITE_PAGES.map(p => `- ${p.title}: ${p.url} (keywords: ${p.keywords.join(", ")})`).join("\n")}

CATEGORY OPTIONS (pick the best fit):
- Tips and Guides
- Industry Insights  
- Comparisons
- Case Studies`;

const ENRICHMENT_TOOL = {
  type: "function" as const,
  function: {
    name: "enrich_blog_post",
    description: "Return all enrichment data for a blog post.",
    parameters: {
      type: "object",
      properties: {
        meta_title: {
          type: "string",
          description: "SEO meta title, under 60 characters. Include primary keyword near the start.",
        },
        meta_description: {
          type: "string",
          description: "SEO meta description, under 160 characters. Include a call-to-action or value proposition.",
        },
        category: {
          type: "string",
          enum: ["Tips and Guides", "Industry Insights", "Comparisons", "Case Studies"],
          description: "Best category for this post.",
        },
        speakable_summary: {
          type: "string",
          description: "A 2-3 sentence summary that directly answers the search intent. Written for voice assistants and AI answer engines. Start with the key takeaway.",
        },
        faq_items: {
          type: "array",
          description: "4-6 FAQ items based on the content. Use conversational, natural language. Each answer should be 2-4 sentences.",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              answer: { type: "string" },
            },
            required: ["question", "answer"],
          },
        },
        internal_links: {
          type: "array",
          description: "3-5 internal links to inject into existing content. Find natural sentences where a link fits contextually.",
          items: {
            type: "object",
            properties: {
              anchor_text: { type: "string", description: "The clickable text for the link (2-5 words)." },
              target_url: { type: "string", description: "The URL path to link to (e.g., /services/virtual-receptionist)." },
              context_sentence: {
                type: "string",
                description: "The original sentence from the content where this link should be inserted. Must be an EXACT quote from the post.",
              },
              modified_sentence: {
                type: "string",
                description: "The same sentence with the markdown link [anchor](url) inserted naturally.",
              },
            },
            required: ["anchor_text", "target_url", "context_sentence", "modified_sentence"],
          },
        },
        blog_cross_links: {
          type: "array",
          description: "2-3 suggested blog cross-link anchor texts and topic descriptions. These will be matched to existing blog posts later.",
          items: {
            type: "object",
            properties: {
              anchor_text: { type: "string" },
              topic_hint: { type: "string", description: "A short description of the ideal target blog post topic." },
            },
            required: ["anchor_text", "topic_hint"],
          },
        },
      },
      required: ["meta_title", "meta_description", "category", "speakable_summary", "faq_items", "internal_links"],
    },
  },
};

async function enrichPost(
  post: { id: string; title: string; content: string; slug: string },
  apiKey: string,
  otherPostSlugs: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const userPrompt = `Enrich this blog post. Do NOT rewrite the original content.

TITLE: ${post.title}
SLUG: ${post.slug}

OTHER BLOG POSTS ON THE SITE (for cross-linking context):
${otherPostSlugs.slice(0, 30).join("\n")}

CONTENT:
${(post.content || "").slice(0, 12000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [ENRICHMENT_TOOL],
        tool_choice: { type: "function", function: { name: "enrich_blog_post" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`AI gateway error for ${post.slug}:`, response.status, errText);
      return { success: false, error: `AI gateway ${response.status}` };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return { success: false, error: "No tool call in AI response" };
    }

    const enrichment = JSON.parse(toolCall.function.arguments);

    // Build enriched content
    let enrichedContent = post.content || "";

    // Prepend speakable summary
    if (enrichment.speakable_summary) {
      enrichedContent = `${enrichment.speakable_summary}\n\n${enrichedContent}`;
    }

    // Inject internal links into existing content
    if (enrichment.internal_links?.length) {
      for (const link of enrichment.internal_links) {
        if (link.context_sentence && link.modified_sentence) {
          enrichedContent = enrichedContent.replace(link.context_sentence, link.modified_sentence);
        }
      }
    }

    // Append FAQ section
    if (enrichment.faq_items?.length) {
      let faqMd = "\n\n---\n\n## Frequently Asked Questions\n\n";
      for (const faq of enrichment.faq_items) {
        faqMd += `### ${faq.question}\n\n${faq.answer}\n\n`;
      }
      enrichedContent += faqMd;
    }

    // Calculate word count and reading time
    const wordCount = enrichedContent.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 250));
    const linkCount = enrichment.internal_links?.length || 0;

    // Update the post
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({
        meta_title: enrichment.meta_title,
        meta_description: enrichment.meta_description,
        category: enrichment.category,
        content: enrichedContent,
        content_word_count: wordCount,
        reading_time: readingTime,
        internal_link_count: linkCount,
      })
      .eq("id", post.id);

    if (updateError) {
      console.error(`DB update error for ${post.slug}:`, updateError);
      return { success: false, error: updateError.message };
    }

    // Insert internal links into blog_internal_links table
    if (enrichment.internal_links?.length) {
      const linkRows = enrichment.internal_links.map((l: { anchor_text: string; target_url: string }) => ({
        blog_post_id: post.id,
        anchor_text: l.anchor_text,
        target_url: l.target_url,
      }));
      await supabase.from("blog_internal_links").insert(linkRows);
    }

    return { success: true };
  } catch (err) {
    console.error(`Error enriching ${post.slug}:`, err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch un-enriched posts
    const { data: posts, error: fetchError } = await supabase
      .from("blog_posts")
      .select("id, title, content, slug")
      .is("meta_title", null)
      .order("created_at", { ascending: true });

    if (fetchError) throw fetchError;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ enriched: 0, total: 0, errors: [], message: "All posts already enriched" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all post slugs for cross-linking context
    const { data: allPosts } = await supabase.from("blog_posts").select("slug, title").neq("slug", "");
    const otherPostSlugs = (allPosts || []).map((p) => `- ${p.title} (/blog/${p.slug})`);

    const total = posts.length;
    let enriched = 0;
    const errors: { slug: string; error: string }[] = [];

    // Process in batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < posts.length; i += BATCH_SIZE) {
      const batch = posts.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map((p) => enrichPost(p, apiKey, otherPostSlugs)));

      for (let j = 0; j < results.length; j++) {
        if (results[j].success) {
          enriched++;
        } else {
          errors.push({ slug: batch[j].slug, error: results[j].error || "Unknown" });
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < posts.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return new Response(JSON.stringify({ enriched, total, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-blog-posts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
