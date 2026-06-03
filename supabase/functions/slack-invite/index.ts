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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { slack_user_id, channel_ids } = await req.json();

    if (!slack_user_id || !Array.isArray(channel_ids) || channel_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "slack_user_id and channel_ids[] are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const slackToken = Deno.env.get("SLACK_BOT_TOKEN");
    if (!slackToken) {
      return new Response(
        JSON.stringify({ error: "Slack bot token not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const succeeded: string[] = [];
    const failed: { channel: string; error: string }[] = [];

    for (const channelId of channel_ids) {
      const slackRes = await fetch("https://slack.com/api/conversations.invite", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${slackToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: channelId,
          users: slack_user_id,
        }),
      });

      const slackData = await slackRes.json();

      if (slackData.ok || slackData.error === "already_in_channel") {
        succeeded.push(channelId);

        // Update members array in slack_channels table
        const { data: channel } = await adminClient
          .from("slack_channels")
          .select("members")
          .eq("slack_channel_id", channelId)
          .single();

        if (channel) {
          const currentMembers: string[] = channel.members || [];
          if (!currentMembers.includes(slack_user_id)) {
            await adminClient
              .from("slack_channels")
              .update({ members: [...currentMembers, slack_user_id] })
              .eq("slack_channel_id", channelId);
          }
        }
      } else {
        failed.push({ channel: channelId, error: slackData.error || "unknown_error" });
      }
    }

    return new Response(
      JSON.stringify({ succeeded, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
