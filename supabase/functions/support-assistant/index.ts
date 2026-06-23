import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX_REQUESTS = 5;

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  record.count++;
  return true;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SUPPORT-ASSISTANT] ${step}${detailsStr}`);
};

async function buildSystemPrompt(
  supabase: ReturnType<typeof createClient>,
  dashboardContext: string | undefined,
  partnerId: string | undefined,
  userName: string | undefined,
): Promise<string> {
  const firstName = userName?.split(" ")[0] || "";

  // WL isolation: detect partner branding
  let isWL = false;
  let brandName: string | undefined;
  let wlKnowledge: { title: string; content: string }[] = [];

  if (dashboardContext === "white_label" && partnerId) {
    isWL = true;
    const { data: branding } = await supabase
      .from("white_label_branding")
      .select("company_name")
      .eq("partner_id", partnerId)
      .maybeSingle();
    if (branding?.company_name) brandName = branding.company_name;

    const { data: wlKB } = await supabase
      .from("wl_knowledge_base")
      .select("title, content")
      .eq("partner_id", partnerId)
      .eq("is_published", true);
    if (wlKB) wlKnowledge = wlKB;
    logStep("WL context loaded", { brandName, wlKBCount: wlKnowledge.length });
  }

  // Load knowledge entries for this dashboard
  let knowledgeEntries: { title: string; description: string; content_type: string }[] = [];
  if (dashboardContext) {
    const { data, error } = await supabase
      .from("platform_knowledge")
      .select("title, description, content_type")
      .eq("dashboard", dashboardContext)
      .eq("is_active", true)
      .order("sort_order")
      .order("title");
    if (!error && data) knowledgeEntries = data;
    logStep("Knowledge loaded", { dashboard: dashboardContext, count: knowledgeEntries.length });
  }

  // Group by content type
  const features = knowledgeEntries.filter((e) => e.content_type === "feature");
  const procedures = knowledgeEntries.filter((e) => e.content_type === "procedure");
  const faqs = knowledgeEntries.filter((e) => ["faq", "troubleshooting"].includes(e.content_type));

  const knowledgeSection = [
    features.length > 0 &&
      `## Features\n${features.map((e) => `- **${e.title}**: ${e.description}`).join("\n")}`,
    procedures.length > 0 &&
      `## Procedures\n${procedures.map((e) => `- **${e.title}**: ${e.description}`).join("\n")}`,
    faqs.length > 0 &&
      `## FAQs & Troubleshooting\n${faqs.map((e) => `- **${e.title}**: ${e.description}`).join("\n")}`,
    wlKnowledge.length > 0 &&
      `## ${brandName || "Partner"} Knowledge Base\n${wlKnowledge.map((e) => `- **${e.title}**: ${e.content}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n") || "No specific documentation loaded — use your general knowledge of the platform.";

  const dashboardLabel = dashboardContext
    ? dashboardContext.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Platform";

  const identity =
    isWL && brandName
      ? `You are the support assistant for ${brandName}'s partner portal. Never mention "24H Virtual", "PiP", or any parent platform name. You represent ${brandName} exclusively.`
      : `You are PiP, the support assistant for 24H Virtual — an AI-powered virtual reception and answering service platform.`;

  const nameClause = firstName
    ? `The user's name is ${firstName} — use it naturally once or twice, not in every sentence.`
    : "";

  return `${identity}

Your personality:
- Warm, helpful, and conversational — like a knowledgeable colleague, not a support bot
- Speak in first person: "I can help you with that!", "Here's what I'd suggest..."
- Use natural prose rather than bullet-point lists unless a numbered sequence genuinely helps
- Get straight to the answer — no filler openers like "Great question!" or "Of course!"
- Keep responses concise but complete
- If you don't know something specific, say so honestly and suggest contacting a supervisor or the admin team
- Never say you are an AI unless directly asked
- Always end with a brief follow-up offer or question so the user knows they can continue

${nameClause}

You are helping a user of the **${dashboardLabel} Dashboard**. Only reference features available in this dashboard.

${knowledgeSection}

When answering how-to questions: give a direct answer first, then navigation steps if needed.
When someone reports a bug or issue: acknowledge it briefly, share 2–3 likely causes, and suggest the most probable fix.
Keep markdown minimal — use it only where it genuinely aids readability (navigation paths, numbered steps).`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before submitting another request." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    logStep("User authenticated", { userId: userData.user.id });

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

    const { requestId, description, issueType, pageUrl, dashboardContext, userName, partnerId } =
      await req.json();
    logStep("Request received", { requestId, issueType, dashboardContext });

    if (!description) throw new Error("Description is required");

    const MAX_DESCRIPTION_LENGTH = 5000;
    const MAX_URL_LENGTH = 2000;

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Description too long. Maximum ${MAX_DESCRIPTION_LENGTH} characters.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (pageUrl && pageUrl.length > MAX_URL_LENGTH) {
      return new Response(
        JSON.stringify({ error: `URL too long. Maximum ${MAX_URL_LENGTH} characters.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = await buildSystemPrompt(supabase, dashboardContext, partnerId, userName);

    const sanitizedIssueType =
      typeof issueType === "string" ? issueType.slice(0, 50) : "general";
    const sanitizedPageUrl =
      typeof pageUrl === "string" ? pageUrl.slice(0, MAX_URL_LENGTH) : "unknown";

    const userMessage = `Issue type: ${sanitizedIssueType}
Page: ${sanitizedPageUrl}

${description.slice(0, MAX_DESCRIPTION_LENGTH)}`;

    logStep("Calling Anthropic API");

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      logStep("Anthropic API error", { status: aiRes.status, error: errorText });
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Anthropic API error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const responseText = aiData.content?.[0]?.text ?? "I couldn't generate a response.";

    logStep("AI response received", { length: responseText.length });

    return new Response(
      JSON.stringify({ response: responseText, requestId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
