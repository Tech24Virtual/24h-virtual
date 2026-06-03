import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple markdown to HTML converter
function markdownToHtml(md: string): string {
  let html = md;
  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  // Paragraphs
  html = html.replace(/\n\n([^<])/g, "\n\n<p>$1");
  html = html.replace(/([^>])\n\n/g, "$1</p>\n\n");
  return html;
}

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

    const { queue_id } = await req.json();
    if (!queue_id) throw new Error("queue_id is required");

    // Get the queue item
    const { data: queueItem, error: queueError } = await supabase
      .from("wl_blog_queue")
      .select("*")
      .eq("id", queue_id)
      .single();

    if (queueError || !queueItem) throw new Error("Queue item not found");
    if (!queueItem.generated_content) throw new Error("No generated content to publish");

    // Get partner's WP connection
    const { data: wpConn, error: wpError } = await supabase
      .from("wl_wordpress_connections")
      .select("*")
      .eq("partner_id", queueItem.partner_id)
      .single();

    if (wpError || !wpConn) throw new Error("WordPress connection not configured");
    if (wpConn.status !== "connected") throw new Error("WordPress connection is not active");

    // Update status to publishing
    await supabase.from("wl_blog_queue").update({ status: "publishing" }).eq("id", queue_id);

    // Convert markdown to HTML
    const htmlContent = markdownToHtml(queueItem.generated_content);

    // Post to WordPress
    const baseUrl = wpConn.site_url.replace(/\/+$/, "");
    const credentials = btoa(`${wpConn.wp_username}:${wpConn.app_password}`);

    const wpPayload: Record<string, any> = {
      title: queueItem.generated_title || queueItem.keyword_text,
      content: htmlContent,
      status: wpConn.auto_publish ? "publish" : "draft",
      excerpt: queueItem.generated_excerpt || "",
    };

    if (wpConn.default_category) {
      // Try to find category by name
      try {
        const catRes = await fetch(`${baseUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(wpConn.default_category)}`, {
          headers: { "Authorization": `Basic ${credentials}` },
        });
        if (catRes.ok) {
          const cats = await catRes.json();
          if (cats.length > 0) {
            wpPayload.categories = [cats[0].id];
          }
        }
      } catch {
        // Ignore category lookup errors
      }
    }

    const wpResponse = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wpPayload),
    });

    if (!wpResponse.ok) {
      const errText = await wpResponse.text();
      console.error("WP publish error:", wpResponse.status, errText);
      await supabase.from("wl_blog_queue").update({
        status: "failed",
        error_message: `WordPress error: ${wpResponse.status}`,
      }).eq("id", queue_id);

      return new Response(JSON.stringify({ success: false, error: `WordPress returned ${wpResponse.status}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wpPost = await wpResponse.json();

    // Update queue with success
    await supabase.from("wl_blog_queue").update({
      status: "published",
      wp_post_id: wpPost.id,
      wp_post_url: wpPost.link,
    }).eq("id", queue_id);

    // Update keyword status if linked
    if (queueItem.keyword_id) {
      await supabase.from("wl_keyword_tracker").update({
        content_status: "published",
      }).eq("id", queueItem.keyword_id);
    }

    return new Response(JSON.stringify({ success: true, wp_post_id: wpPost.id, wp_post_url: wpPost.link }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-to-wordpress error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
