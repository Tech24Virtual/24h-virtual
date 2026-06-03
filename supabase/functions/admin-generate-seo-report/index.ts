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

    const { report_month } = await req.json();
    if (!report_month) throw new Error("report_month is required");

    const monthStart = new Date(report_month + "-01");
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const [blogRes, keywordRes] = await Promise.all([
      supabaseAdmin.from("blog_posts").select("status, created_at").gte("created_at", monthStart.toISOString()).lt("created_at", monthEnd.toISOString()),
      supabaseAdmin.from("keyword_tracker").select("content_status"),
    ]);

    const blogItems = blogRes.data || [];
    const keywords = keywordRes.data || [];

    const stats = {
      posts_created: blogItems.length,
      posts_published: blogItems.filter(b => b.status === "published").length,
      keywords_tracked: keywords.length,
      keywords_with_content: keywords.filter(k => k.content_status !== "not_started").length,
      coverage_rate: keywords.length > 0
        ? Math.round((keywords.filter(k => k.content_status !== "not_started").length / keywords.length) * 100)
        : 0,
    };

    const monthName = monthStart.toLocaleString("en-US", { month: "long", year: "numeric" });

    const prompt = `Write a 200-word executive summary for 24H Virtual's content marketing report for ${monthName}.

Stats:
- Blog posts created this month: ${stats.posts_created}
- Blog posts published this month: ${stats.posts_published}
- Total keywords tracked: ${stats.keywords_tracked}
- Keywords with content: ${stats.keywords_with_content}
- Keyword coverage rate: ${stats.coverage_rate}%

Company: 24H Virtual - 24/7 virtual receptionist and answering services.

Write a professional summary highlighting achievements and suggesting next steps. Do NOT use markdown formatting. Write in plain paragraphs.`;

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
    const narrative = aiResult.choices?.[0]?.message?.content || "";

    const { data: existing } = await supabaseAdmin
      .from("admin_seo_reports")
      .select("id")
      .eq("report_month", report_month + "-01")
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from("admin_seo_reports").update({
        total_posts: stats.posts_created,
        total_keywords: stats.keywords_tracked,
        keywords_covered: stats.keywords_with_content,
        narrative,
        report_data: stats,
        created_by: user.id,
      }).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("admin_seo_reports").insert({
        report_month: report_month + "-01",
        total_posts: stats.posts_created,
        total_keywords: stats.keywords_tracked,
        keywords_covered: stats.keywords_with_content,
        narrative,
        report_data: stats,
        created_by: user.id,
      });
    }

    return new Response(JSON.stringify({ success: true, stats, narrative }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-generate-seo-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
