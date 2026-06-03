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

    const { partner_id, report_month } = await req.json();
    if (!partner_id || !report_month) throw new Error("partner_id and report_month are required");

    // Get partner info
    const { data: partner } = await supabaseAdmin
      .from("white_label_partners")
      .select("company_name, services_offered, target_location")
      .eq("id", partner_id)
      .single();

    // Calculate month boundaries
    const monthStart = new Date(report_month + "-01");
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const monthStartStr = monthStart.toISOString();
    const monthEndStr = monthEnd.toISOString();

    // Get blog stats for the month
    const { data: blogItems } = await supabaseAdmin
      .from("wl_blog_queue")
      .select("status, created_at")
      .eq("partner_id", partner_id)
      .gte("created_at", monthStartStr)
      .lt("created_at", monthEndStr);

    // Get all-time keyword stats
    const { data: keywords } = await supabaseAdmin
      .from("wl_keyword_tracker")
      .select("content_status")
      .eq("partner_id", partner_id);

    const stats = {
      posts_generated: (blogItems || []).filter(b => ["generated", "published", "publishing"].includes(b.status)).length,
      posts_published: (blogItems || []).filter(b => b.status === "published").length,
      total_posts_queued: (blogItems || []).length,
      keywords_tracked: (keywords || []).length,
      keywords_with_content: (keywords || []).filter(k => k.content_status !== "not_started").length,
      coverage_rate: (keywords || []).length > 0
        ? Math.round(((keywords || []).filter(k => k.content_status !== "not_started").length / (keywords || []).length) * 100)
        : 0,
    };

    // Generate narrative
    const companyName = partner?.company_name || "Your Company";
    const monthName = monthStart.toLocaleString("en-US", { month: "long", year: "numeric" });

    const prompt = `Write a 200-word executive summary for ${companyName}'s content marketing report for ${monthName}.

Stats:
- Blog posts generated this month: ${stats.posts_generated}
- Blog posts published this month: ${stats.posts_published}
- Total keywords tracked: ${stats.keywords_tracked}
- Keywords with content: ${stats.keywords_with_content}
- Keyword coverage rate: ${stats.coverage_rate}%

Company: ${companyName}
Services: ${partner?.services_offered || "virtual receptionist services"}
Location: ${partner?.target_location || ""}

Write a professional, encouraging summary highlighting achievements and suggesting next steps. Do NOT use markdown formatting. Write in plain paragraphs.`;

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

    // Upsert report
    const { data: existing } = await supabaseAdmin
      .from("wl_seo_reports")
      .select("id")
      .eq("partner_id", partner_id)
      .eq("report_month", report_month + "-01")
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from("wl_seo_reports").update({
        stats_json: stats,
        narrative,
      }).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("wl_seo_reports").insert({
        partner_id,
        report_month: report_month + "-01",
        stats_json: stats,
        narrative,
      });
    }

    return new Response(JSON.stringify({ success: true, stats, narrative }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("wl-generate-seo-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
