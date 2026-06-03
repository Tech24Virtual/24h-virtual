import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing Supabase configuration");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { dashboardContext, currentStep, userName, partnerId } = await req.json();

    // Get onboarding steps from platform_knowledge
    const { data: steps } = await supabase
      .from('platform_knowledge')
      .select('title, description, onboarding_step')
      .eq('dashboard', dashboardContext)
      .eq('content_type', 'onboarding')
      .eq('is_active', true)
      .order('onboarding_step');

    if (!steps || steps.length === 0) {
      return new Response(JSON.stringify({ response: "No onboarding content available for this dashboard.", totalSteps: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stepIndex = Math.min(currentStep || 0, steps.length - 1);
    const currentStepData = steps[stepIndex];
    const totalSteps = steps.length;

    // WL branding isolation
    let assistantName = "PiP";
    let brandContext = "24H Virtual";
    if (dashboardContext === 'white_label' && partnerId) {
      const { data: branding } = await supabase
        .from('white_label_branding')
        .select('company_name')
        .eq('partner_id', partnerId)
        .maybeSingle();
      if (branding?.company_name) {
        assistantName = `${branding.company_name} Assistant`;
        brandContext = branding.company_name;
      }
    }

    const dashboardLabel = dashboardContext.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const firstName = userName?.split(' ')[0] || 'there';

    const isWL = dashboardContext === 'white_label' && partnerId;
    const brandInstruction = isWL
      ? `Never mention "24H Virtual", "PiP", or any parent platform. You represent ${brandContext} exclusively.`
      : `You are PiP, the AI assistant for 24H Virtual.`;

    const systemPrompt = `You are ${assistantName}, guiding ${firstName} through their first time using the ${dashboardLabel} Dashboard.
${brandInstruction}

Current step: ${stepIndex + 1} of ${totalSteps}
Step title: ${currentStepData.title}
Step content: ${currentStepData.description}

Instructions:
- Be encouraging, concise, and specific
- Tell them exactly what to click and where to navigate
- Use bold formatting for navigation paths like **Sidebar Item**
- If this is NOT the last step, end with a brief preview of what's coming next
- If this IS the last step, congratulate them and encourage them to explore
- Do NOT mention features from other dashboards
- Keep your response under 200 words
- Use a warm, friendly tone`;

    const userPrompt = `Please guide me through step ${stepIndex + 1} of the onboarding: "${currentStepData.title}"`;

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
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Unable to generate guidance for this step.";

    return new Response(JSON.stringify({
      response: aiResponse,
      currentStep: stepIndex,
      totalSteps,
      stepTitle: currentStepData.title,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ONBOARDING-ASSISTANT] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
