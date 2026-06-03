import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple HTML to Markdown converter
function htmlToMarkdown(html: string): string {
  let md = html;
  // Remove WP shortcodes
  md = md.replace(/\[.*?\]/g, "");
  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  // Bold/italic
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)");
  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?[uo]l[^>]*>/gi, "\n");
  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");
  // Blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "> $1\n\n");
  // Remove remaining tags
  md = md.replace(/<[^>]+>/g, "");
  // Decode entities
  md = md.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  // Clean up whitespace
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  return md;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { xml } = await req.json();
    if (!xml) throw new Error("XML content is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse WordPress XML (simplified WXR parser)
    const items: Array<{
      title: string;
      slug: string;
      content: string;
      excerpt: string;
      date: string;
      categories: string[];
      wpUrl: string;
    }> = [];

    // Extract <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(xml)) !== null) {
      const block = itemMatch[1];

      // Only import posts (not pages, attachments, etc.)
      const postType = block.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]><\/wp:post_type>/)?.[1];
      if (postType && postType !== "post") continue;

      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                    block.match(/<title>(.*?)<\/title>/)?.[1] || "Untitled";

      const slug = block.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/)?.[1] ||
                   title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const contentRaw = block.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1] || "";
      const excerptRaw = block.match(/<excerpt:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/excerpt:encoded>/)?.[1] || "";

      const date = block.match(/<wp:post_date><!\[CDATA\[(.*?)\]\]><\/wp:post_date>/)?.[1] ||
                   new Date().toISOString();

      const wpUrl = block.match(/<link>(.*?)<\/link>/)?.[1] || "";

      const categories: string[] = [];
      const catRegex = /<category domain="category"[^>]*><!\[CDATA\[(.*?)\]\]><\/category>/g;
      let catMatch;
      while ((catMatch = catRegex.exec(block)) !== null) {
        categories.push(catMatch[1]);
      }

      items.push({
        title,
        slug,
        content: htmlToMarkdown(contentRaw),
        excerpt: htmlToMarkdown(excerptRaw).substring(0, 300),
        date,
        categories,
        wpUrl,
      });
    }

    let imported = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const wordCount = item.content.split(/\s+/).filter(Boolean).length;
        const { error } = await supabase.from("blog_posts").insert({
          title: item.title,
          slug: item.slug,
          content: item.content,
          excerpt: item.excerpt || item.content.substring(0, 150),
          category: item.categories[0] || "Tips & Guides",
          tags: item.categories,
          status: "published",
          published_at: item.date,
          old_wordpress_url: item.wpUrl,
          ai_generated: false,
          content_word_count: wordCount,
          reading_time: Math.max(1, Math.ceil(wordCount / 250)),
          author: "24H Virtual",
        });

        if (error) {
          errors.push(`${item.slug}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (e) {
        errors.push(`${item.slug}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    return new Response(JSON.stringify({ imported, total: items.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-wordpress-posts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
