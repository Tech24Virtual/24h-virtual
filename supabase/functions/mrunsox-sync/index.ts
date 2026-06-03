import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-mrunsox-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate shared secret
  const secret = req.headers.get("x-mrunsox-key");
  const expectedSecret = Deno.env.get("MRUNSOX_WEBHOOK_KEY");
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      title,
      slug,
      content,
      excerpt,
      author,
      category,
      tags,
      meta_title,
      meta_description,
      featured_image_url,
      primary_path,
      primary_offer,
      published_at,
    } = body;

    if (!title || !slug) {
      return new Response(
        JSON.stringify({ error: "title and slug are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const wordCount = content
      ? content.split(/\s+/).filter(Boolean).length
      : null;
    const readingTime = wordCount ? Math.ceil(wordCount / 200) : null;

    const { data, error } = await supabase
      .from("blog_posts")
      .upsert(
        {
          slug,
          title,
          content: content || null,
          excerpt: excerpt || null,
          author: author || "Mrunsox",
          category: category || null,
          tags: tags || null,
          meta_title: meta_title || null,
          meta_description: meta_description || null,
          featured_image_url: featured_image_url || null,
          primary_path: primary_path || null,
          primary_offer: primary_offer || null,
          source: "mrunsox",
          status: published_at ? "published" : "draft",
          published_at: published_at || null,
          ai_generated: false,
          content_word_count: wordCount,
          reading_time: readingTime,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" }
      )
      .select("id, slug")
      .single();

    if (error) {
      console.error("Upsert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id, slug: data.slug }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Parse error:", err);
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
