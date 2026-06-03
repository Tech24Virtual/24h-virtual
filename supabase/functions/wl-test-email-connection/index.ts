import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { api_key, from_email } = await req.json();
    if (!api_key) throw new Error("api_key is required");
    if (!from_email) throw new Error("from_email is required");

    // Validate by calling Resend's domains endpoint
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${api_key}` },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error("Invalid API key or Resend error: " + err);
    }

    const data = await response.json();
    const domains = data.data || [];

    return new Response(JSON.stringify({
      success: true,
      domains: domains.map((d: any) => ({ name: d.name, status: d.status })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
