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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUPPORT-ASSISTANT] ${step}${detailsStr}`);
};

function buildPersonalizationInstructions(userName?: string, isWL = false, brandName?: string): string {
  const nameToUse = userName?.split(' ')[0] || 'there';
  const assistantIdentity = isWL && brandName
    ? `You are the AI assistant for **${brandName}**. Never mention "24H Virtual", "PiP", or any parent platform. You represent ${brandName} exclusively.`
    : `You are **PiP**, the AI assistant for 24H Virtual. Always introduce yourself as PiP in your first response.`;

  return `
## Your Identity
${assistantIdentity}

## Tone & Personalization
- Address the user as "${nameToUse}" naturally throughout your response
- Use a warm, conversational tone — like a knowledgeable colleague helping out
- Be direct and get straight to the solution — no filler phrases
- Keep explanations concise but thorough

## Navigation Guidance (CRITICAL)
- For EVERY feature you reference, include the exact navigation path using bold formatting: "Navigate to **[Sidebar Item]** in the sidebar"
- If a feature has tabs, specify the tab: "Navigate to **Onboarding** > **Templates** tab"
- Always provide step-by-step numbered instructions for how-to questions
- Proactively suggest related features the user might not know about`;
}

const FALLBACK_PROMPT = `You are PiP, a friendly, knowledgeable AI assistant for 24H Virtual, a virtual receptionist and call answering service platform.

When users ask questions or report issues, provide:
1. **What's Happening** — A clear, plain-language summary
2. **Why This Might Be Occurring** — 2-3 likely causes (if reporting an issue)
3. **Step-by-Step Solution** — Numbered actionable instructions with navigation paths
4. **Pro Tip** — Suggest a related feature they might find useful

Be specific and actionable. Use markdown with clear headings and spacing between sections.`;

async function buildDynamicPrompt(supabase: any, dashboardContext?: string, partnerId?: string): Promise<{ prompt: string; isWL: boolean; brandName?: string }> {
  let knowledgeEntries: { title: string; description: string; content_type: string }[] = [];
  let isWL = false;
  let brandName: string | undefined;

  // Query platform_knowledge for the specific dashboard
  if (dashboardContext) {
    const { data, error } = await supabase
      .from('platform_knowledge')
      .select('title, description, content_type')
      .eq('dashboard', dashboardContext)
      .eq('is_active', true)
      .order('sort_order')
      .order('title');

    if (!error && data) {
      knowledgeEntries = data;
    }
    logStep("Knowledge entries loaded", { dashboard: dashboardContext, count: knowledgeEntries.length });
  }

  // For White Label: fetch partner branding + partner's own KB
  let wlKnowledge: { title: string; content: string }[] = [];
  if (dashboardContext === 'white_label' && partnerId) {
    isWL = true;

    // Get partner branding
    const { data: branding } = await supabase
      .from('white_label_branding')
      .select('company_name')
      .eq('partner_id', partnerId)
      .maybeSingle();

    if (branding?.company_name) {
      brandName = branding.company_name;
    }

    // Get partner's own knowledge base
    const { data: wlKB } = await supabase
      .from('wl_knowledge_base')
      .select('title, content')
      .eq('partner_id', partnerId)
      .eq('is_published', true);

    if (wlKB) {
      wlKnowledge = wlKB;
    }
    logStep("WL context loaded", { brandName, wlKBCount: wlKnowledge.length });
  }

  if (knowledgeEntries.length === 0 && !dashboardContext) {
    return { prompt: FALLBACK_PROMPT, isWL: false };
  }

  // Group by content type
  const features = knowledgeEntries.filter(e => e.content_type === 'feature');
  const procedures = knowledgeEntries.filter(e => e.content_type === 'procedure');
  const faqs = knowledgeEntries.filter(e => ['faq', 'troubleshooting'].includes(e.content_type));

  const featuresSection = features.length > 0
    ? features.map(e => `- **${e.title}**: ${e.description}`).join('\n')
    : 'No specific feature documentation available.';

  const proceduresSection = procedures.length > 0
    ? procedures.map(e => `- **${e.title}**: ${e.description}`).join('\n')
    : '';

  const faqSection = faqs.length > 0
    ? faqs.map(e => `- **${e.title}**: ${e.description}`).join('\n')
    : '';

  const dashboardLabel = dashboardContext
    ? dashboardContext.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Platform';

  // Build WL-specific or standard prompt
  const identity = isWL && brandName
    ? `You are the AI assistant for ${brandName}'s partner portal. Never mention "24H Virtual", "PiP", or any parent platform name. You represent ${brandName} exclusively.`
    : `You are PiP, a friendly, knowledgeable AI assistant for 24H Virtual's ${dashboardLabel} Dashboard.`;

  let wlSection = '';
  if (wlKnowledge.length > 0) {
    wlSection = `\n\n## ${brandName || 'Partner'}'s Custom Knowledge Base\n` +
      wlKnowledge.map(e => `- **${e.title}**: ${e.content}`).join('\n');
  }

  const prompt = `${identity}

## Your Role
Help users of the **${dashboardLabel} Dashboard** resolve issues and answer questions. Only reference features available in this specific dashboard.

## Available Features
${featuresSection}
${proceduresSection ? `\n## Step-by-Step Procedures\n${proceduresSection}` : ''}
${faqSection ? `\n## FAQs & Troubleshooting\n${faqSection}` : ''}
${wlSection}

## Response Format
For **how-to questions**, provide:
1. **Quick Answer** — One-sentence summary
2. **Step-by-Step Instructions** — Numbered steps with exact navigation paths
3. **Pro Tip** — Suggest a related feature or shortcut

For **bug reports or issues**, provide:
1. **What's Happening** — Clear summary
2. **Why This Might Be Occurring** — 2-3 likely causes
3. **Step-by-Step Solution** — Numbered actionable instructions
4. **Still Stuck?** — Suggest escalating if the issue persists

Use markdown with clear headings and spacing.`;

  return { prompt, isWL, brandName };
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
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep("User authenticated", { userId: userData.user.id });

    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { requestId, description, issueType, pageUrl, dashboardContext, userName, partnerId } = await req.json();
    logStep("Request received", { requestId, issueType, dashboardContext, partnerId });

    if (!description) {
      throw new Error("Description is required");
    }

    const MAX_DESCRIPTION_LENGTH = 5000;
    const MAX_URL_LENGTH = 2000;
    
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Description too long. Maximum ${MAX_DESCRIPTION_LENGTH} characters.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (pageUrl && pageUrl.length > MAX_URL_LENGTH) {
      return new Response(
        JSON.stringify({ error: `URL too long. Maximum ${MAX_URL_LENGTH} characters.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build dynamic system prompt with WL isolation
    const { prompt: basePrompt, isWL, brandName } = await buildDynamicPrompt(supabase, dashboardContext, partnerId);
    const personalization = buildPersonalizationInstructions(userName, isWL, brandName);
    const systemPrompt = basePrompt + '\n' + personalization;

    const sanitizedIssueType = typeof issueType === 'string' ? issueType.slice(0, 50) : 'bug';
    const sanitizedPageUrl = typeof pageUrl === 'string' ? pageUrl.slice(0, MAX_URL_LENGTH) : 'Unknown';
    const sanitizedUserName = typeof userName === 'string' ? userName.slice(0, 100) : '';
    
    const userPrompt = `${sanitizedUserName ? `User: ${sanitizedUserName}\n` : ''}Issue Type: ${sanitizedIssueType}
Page: ${sanitizedPageUrl}
Dashboard: ${dashboardContext || 'unknown'}

Description:
${description.slice(0, MAX_DESCRIPTION_LENGTH)}`;

    logStep("Calling AI Gateway");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("AI Gateway error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    logStep("AI response received", { length: aiResponse.length });

    return new Response(
      JSON.stringify({ response: aiResponse, requestId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
