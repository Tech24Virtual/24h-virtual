import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-slack-signature, x-slack-request-timestamp",
};

async function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const baseString = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));
  const hexSig =
    "v0=" +
    Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  return hexSig === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const parsed = JSON.parse(body);

    // Handle Slack URL verification challenge
    if (parsed.type === "url_verification") {
      return new Response(JSON.stringify({ challenge: parsed.challenge }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify Slack signature
    const signingSecret = Deno.env.get("SLACK_SIGNING_SECRET");
    if (signingSecret) {
      const timestamp = req.headers.get("x-slack-request-timestamp") || "";
      const signature = req.headers.get("x-slack-signature") || "";

      // Reject if timestamp is older than 5 minutes
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - parseInt(timestamp)) > 300) {
        return new Response("Request too old", { status: 403, headers: corsHeaders });
      }

      const valid = await verifySlackSignature(body, timestamp, signature, signingSecret);
      if (!valid) {
        return new Response("Invalid signature", { status: 403, headers: corsHeaders });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const event = parsed.event;
    if (!event) {
      return new Response("No event", { status: 200, headers: corsHeaders });
    }

    // Handle message events
    if (event.type === "message" && !event.subtype && event.text && !event.bot_id) {
      // Resolve sender display name with fallbacks
      let senderName = event.user_profile?.display_name || event.user_profile?.real_name;

      // Fallback 1: check slack_user_mappings table
      if (!senderName && event.user) {
        const { data: mapping } = await supabase
          .from("slack_user_mappings")
          .select("slack_display_name")
          .eq("slack_user_id", event.user)
          .single();
        if (mapping?.slack_display_name) senderName = mapping.slack_display_name;
      }

      // Fallback 2: call Slack users.info API
      const slackBotToken = Deno.env.get("SLACK_BOT_TOKEN");
      if (!senderName && event.user && slackBotToken) {
        try {
          const resp = await fetch(
            `https://slack.com/api/users.info?user=${event.user}`,
            { headers: { Authorization: `Bearer ${slackBotToken}` } }
          );
          const userData = await resp.json();
          if (userData.ok) {
            senderName = userData.user?.profile?.display_name
              || userData.user?.profile?.real_name
              || userData.user?.name;
          }
        } catch (e) {
          console.error("Failed to fetch Slack user info:", e);
        }
      }

      // Extract file metadata from Slack message files
      let messageContent = event.text;
      if (event.files && Array.isArray(event.files) && event.files.length > 0) {
        const fileRefs = event.files.map((f: any) => {
          const url = f.permalink_public || f.permalink || f.url_private || '';
          const name = f.name || f.title || 'file';
          const mimetype = f.mimetype || '';
          // If it's an image, use markdown image syntax
          if (mimetype.startsWith('image/') && url) {
            return `![${name}](${url})`;
          }
          return `[File: ${name}](${url})`;
        });
        messageContent = messageContent + '\n' + fileRefs.join('\n');
      }

      const { error } = await supabase.from("slack_messages").upsert(
        {
          slack_channel_id: event.channel,
          slack_message_ts: event.ts,
          slack_user_id: event.user || null,
          sender_name: senderName || event.user || null,
          content: messageContent,
          is_from_crm: false,
          created_at: new Date(parseFloat(event.ts) * 1000).toISOString(),
        },
        { onConflict: "slack_channel_id,slack_message_ts" }
      );

      if (error) console.error("Error inserting message:", error);
    }

    // Handle member joined channel
    if (event.type === "member_joined_channel") {
      const { data: channel } = await supabase
        .from("slack_channels")
        .select("members")
        .eq("slack_channel_id", event.channel)
        .single();

      if (channel) {
        const members = channel.members || [];
        if (!members.includes(event.user)) {
          members.push(event.user);
          await supabase
            .from("slack_channels")
            .update({ members })
            .eq("slack_channel_id", event.channel);
        }
      }
    }

    // Handle member left channel
    if (event.type === "member_left_channel") {
      const { data: channel } = await supabase
        .from("slack_channels")
        .select("members")
        .eq("slack_channel_id", event.channel)
        .single();

      if (channel) {
        const members = (channel.members || []).filter(
          (m: string) => m !== event.user
        );
        await supabase
          .from("slack_channels")
          .update({ members })
          .eq("slack_channel_id", event.channel);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("slack-events error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
