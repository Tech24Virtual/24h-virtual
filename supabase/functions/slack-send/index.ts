import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const slackBotToken = Deno.env.get("SLACK_BOT_TOKEN");

    if (!slackBotToken) {
      return new Response(
        JSON.stringify({ error: "Slack bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate JWT
    const authHeader = req.headers.get("authorization") || "";
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { channel_id, text } = await req.json();
    if (!channel_id || !text) {
      return new Response(
        JSON.stringify({ error: "channel_id and text are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract plain URL from markdown image syntax for Slack (Slack auto-unfurls URLs)
    const imageMarkdownPattern = /^!\[[^\]]*\]\(([^)]+)\)$/;
    const imageMatch = text.trim().match(imageMarkdownPattern);
    const slackText = imageMatch ? imageMatch[1] : text;

    // Get user's Slack mapping and profile
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const [{ data: mapping }, { data: profile }] = await Promise.all([
      supabase
        .from("slack_user_mappings")
        .select("slack_user_id, slack_display_name")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single(),
    ]);

    // Post to Slack
    const slackResponse = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${slackBotToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channel_id,
        text: slackText,
        username: mapping?.slack_display_name || profile?.full_name || user.email || "CRM User",
        icon_emoji: ":speech_balloon:",
      }),
    });

    const slackResult = await slackResponse.json();
    if (!slackResult.ok) {
      console.error("Slack API error:", slackResult.error);
      return new Response(
        JSON.stringify({ error: slackResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store the message in our DB
    await supabase.from("slack_messages").upsert(
      {
        slack_channel_id: channel_id,
        slack_message_ts: slackResult.ts,
        slack_user_id: mapping?.slack_user_id || null,
        sender_name: mapping?.slack_display_name || user.email || "CRM User",
        content: text,
        is_from_crm: true,
        created_at: new Date(parseFloat(slackResult.ts) * 1000).toISOString(),
      },
      { onConflict: "slack_channel_id,slack_message_ts" }
    );

    return new Response(JSON.stringify({ ok: true, ts: slackResult.ts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("slack-send error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
