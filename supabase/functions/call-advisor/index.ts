import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Simple in-memory rate limiting (per-instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per IP (stricter for AI)

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
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a Call Advisor for 24H Virtual, an expert in analyzing business call handling needs.

Based on the user's session data, generate a personalized call handling audit. Be specific, actionable, and persuasive but not pushy.

Format your response in markdown with these sections:

## 📊 Current Situation Analysis
(2-3 sentences summarizing their current setup and its limitations)

## ⚠️ Key Issues Identified
(3 bullet points of specific problems based on their answers)

## ✅ Recommended Solution
(Recommend the most appropriate 24H Virtual service based on their needs:
- AI Receptionist: For businesses needing 24/7 coverage at lowest cost
- Virtual Message Assistant: For message-heavy workflows
- Virtual Receptionist: For businesses needing live human touch with call transfers
- Virtual Secretary: For full administrative support needs
- Hybrid: For businesses that want AI + human backup)

## 💰 Expected Benefits
(3 specific improvements they can expect, with estimated metrics where appropriate)

Keep the total response under 300 words. Be encouraging and solution-focused.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      console.log(`[CALL-ADVISOR] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before generating another audit." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { sessionData } = body;

    // Validate sessionData
    if (!sessionData || typeof sessionData !== 'object') {
      return new Response(
        JSON.stringify({ error: "Session data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize session data fields
    const MAX_FIELD_LENGTH = 1000;
    const sanitizedSessionData = {
      setup: Array.isArray(sessionData.setup) 
        ? sessionData.setup.slice(0, 10).map((s: unknown) => String(s).slice(0, MAX_FIELD_LENGTH))
        : [],
      goals: Array.isArray(sessionData.goals)
        ? sessionData.goals.slice(0, 10).map((g: unknown) => String(g).slice(0, MAX_FIELD_LENGTH))
        : [],
      hasIvr: typeof sessionData.hasIvr === 'string' ? sessionData.hasIvr.slice(0, 50) : 'Not specified',
      holdTime: typeof sessionData.holdTime === 'string' ? sessionData.holdTime.slice(0, 50) : 'Not specified',
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userMessage = `Please generate a call handling audit based on this business data:
    
Current Setup: ${sanitizedSessionData.setup.join(", ") || "Not specified"}
Main Challenges: ${sanitizedSessionData.goals.join(", ") || "Not specified"}
Has IVR: ${sanitizedSessionData.hasIvr}
Typical Hold Time: ${sanitizedSessionData.holdTime}

Generate a personalized audit with actionable recommendations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        stream: true,
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate audit" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Call advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
