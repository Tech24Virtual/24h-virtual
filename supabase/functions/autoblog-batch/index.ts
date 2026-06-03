import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { count = 2 } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch next N queued items
    const { data: queueItems, error: fetchError } = await supabase
      .from("autoblog_queue")
      .select("*")
      .eq("status", "queued")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(count);

    if (fetchError) throw fetchError;
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ generated: 0, message: "Queue is empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;
    let failed = 0;

    for (const item of queueItems) {
      try {
        // Call generate-blog-post function
        const baseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const genResponse = await fetch(`${baseUrl}/functions/v1/generate-blog-post`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            keyword: item.keyword_text,
            content_length: item.content_length,
            tone: item.tone,
            angle: item.angle,
            queue_id: item.id,
          }),
        });

        if (genResponse.ok) {
          generated++;
          // Update keyword_tracker status
          if (item.keyword_id) {
            await supabase
              .from("keyword_tracker")
              .update({ content_status: "draft" })
              .eq("id", item.keyword_id);
          }
        } else {
          failed++;
          const errText = await genResponse.text();
          console.error(`Failed to generate for "${item.keyword_text}":`, errText);
        }
      } catch (e) {
        failed++;
        console.error(`Error generating "${item.keyword_text}":`, e);
        await supabase
          .from("autoblog_queue")
          .update({ status: "failed", error_message: e instanceof Error ? e.message : "Unknown error" })
          .eq("id", item.id);
      }
    }

    return new Response(JSON.stringify({ generated, failed, total: queueItems.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("autoblog-batch error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
