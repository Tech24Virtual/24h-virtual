import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompts: Record<string, string> = {
  content:
    "You are a professional blog editor. Improve the selected text for clarity, grammar, tone, and persuasiveness. Keep the same general meaning and Markdown formatting. Return ONLY the improved text with no explanations.",
  structure:
    "You are a Markdown structure expert. Reorganize the selected text with proper heading hierarchy (H2/H3), break long paragraphs into shorter ones, and add bullet points or numbered lists where appropriate. Return ONLY the restructured Markdown text with no explanations.",
  spacing:
    "You are a Markdown formatting specialist. Fix spacing issues: ensure blank lines before/after headings, proper list indentation, consistent line breaks between paragraphs, and clean Markdown syntax. Return ONLY the reformatted text with no explanations.",
  all:
    "You are a senior blog editor and Markdown expert. Improve the selected text by: 1) fixing grammar, tone, and clarity, 2) reorganizing with proper H2/H3 hierarchy and shorter paragraphs, 3) fixing all Markdown spacing and formatting. Return ONLY the improved text with no explanations.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { selectedText, fixType, fullContext, userNote } = await req.json();

    if (!selectedText || !fixType) {
      return new Response(JSON.stringify({ error: "Missing selectedText or fixType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const system = systemPrompts[fixType] || systemPrompts.all;
    let userMessage = fullContext
      ? `Here is surrounding context for reference (do NOT include it in your output):\n---\n${fullContext}\n---\n\nNow improve ONLY this selected section:\n\n${selectedText}`
      : `Improve this selected section:\n\n${selectedText}`;

    if (userNote) {
      userMessage += `\n\nAdditional instructions from the editor: ${userNote}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI processing failed", status: response.status }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const improvedText = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ improvedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fix-blog-content error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
