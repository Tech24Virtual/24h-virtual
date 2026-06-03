// Public edge function: returns sitemap-blog.xml dynamically from blog_posts.
// Deployed at: https://<project-ref>.functions.supabase.co/generate-blog-sitemap
// The sitemap-index in public/sitemap.xml points to https://24hv.io/sitemap-blog.xml.
// Cloudflare (or hosting layer) must proxy /sitemap-blog.xml to this function URL.
// If no proxy is set up, search engines should be pointed directly at the function URL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SITE_URL } from "../_shared/site-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, updated_at, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    return new Response(`Error: ${error.message}`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const urls = (data || [])
    .filter((p) => !!p.slug)
    .map((p) => {
      const lastmod = (p.updated_at || p.published_at || new Date().toISOString()).split("T")[0];
      return `  <url>
    <loc>${SITE_URL}/blog/${escapeXml(p.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
