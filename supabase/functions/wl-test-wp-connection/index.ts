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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { site_url, wp_username, app_password } = await req.json();
    if (!site_url || !wp_username || !app_password) {
      throw new Error("site_url, wp_username, and app_password are required");
    }

    // Normalize URL
    const baseUrl = site_url.replace(/\/+$/, "");
    const apiUrl = `${baseUrl}/wp-json/wp/v2/posts?per_page=1&status=any`;

    // Test connection by fetching posts
    const credentials = btoa(`${wp_username}:${app_password}`);
    const wpResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    if (!wpResponse.ok) {
      const errText = await wpResponse.text();
      console.error("WP API error:", wpResponse.status, errText);

      if (wpResponse.status === 401) {
        return new Response(JSON.stringify({ success: false, error: "Invalid credentials. Check your username and application password." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (wpResponse.status === 404) {
        return new Response(JSON.stringify({ success: false, error: "WordPress REST API not found. Make sure the URL is correct and the REST API is enabled." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: `WordPress returned status ${wpResponse.status}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also fetch categories for later use
    let categories: { id: number; name: string }[] = [];
    try {
      const catResponse = await fetch(`${baseUrl}/wp-json/wp/v2/categories?per_page=100`, {
        headers: { "Authorization": `Basic ${credentials}` },
      });
      if (catResponse.ok) {
        const catData = await catResponse.json();
        categories = catData.map((c: any) => ({ id: c.id, name: c.name }));
      }
    } catch {
      // Non-critical, ignore
    }

    return new Response(JSON.stringify({ success: true, categories }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("wl-test-wp-connection error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
