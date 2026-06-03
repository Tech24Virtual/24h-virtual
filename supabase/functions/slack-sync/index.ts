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
        JSON.stringify({ error: "Slack bot token not configured. Add SLACK_BOT_TOKEN secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate JWT - admin only
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

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check admin or supervisor role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "supervisor"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin or supervisor access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { channels_synced: 0, users_fetched: 0 };

    // 1. Fetch all conversations (channels, groups, DMs)
    let cursor: string | undefined;
    const allChannels: any[] = [];

    do {
      const params = new URLSearchParams({
        types: "public_channel,private_channel,im,mpim",
        limit: "200",
        ...(cursor ? { cursor } : {}),
      });

      const resp = await fetch(`https://slack.com/api/conversations.list?${params}`, {
        headers: { Authorization: `Bearer ${slackBotToken}` },
      });
      const data = await resp.json();
      if (!data.ok) {
        console.error("conversations.list error:", data.error);
        break;
      }

      allChannels.push(...(data.channels || []));
      cursor = data.response_metadata?.next_cursor;
    } while (cursor);

    // 2. For each channel, fetch members and upsert
    for (const ch of allChannels) {
      let members: string[] = [];
      try {
        const membersResp = await fetch(
          `https://slack.com/api/conversations.members?channel=${ch.id}&limit=1000`,
          { headers: { Authorization: `Bearer ${slackBotToken}` } }
        );
        const membersData = await membersResp.json();
        if (membersData.ok) {
          members = membersData.members || [];
        }
      } catch (e) {
        console.error(`Failed to fetch members for ${ch.id}:`, e);
      }

      const isDm = ch.is_im === true || ch.is_mpim === true;
      const channelName = ch.name || (isDm ? `DM-${ch.user || ch.id}` : ch.id);

      await supabase.from("slack_channels").upsert(
        {
          slack_channel_id: ch.id,
          name: channelName,
          is_dm: isDm,
          is_private: ch.is_private === true || ch.is_group === true,
          topic: ch.topic?.value || null,
          members,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "slack_channel_id" }
      );
      results.channels_synced++;
    }

    // 3. Fetch Slack users for display name mapping
    const slackUsers: any[] = [];
    let userCursor: string | undefined;
    do {
      const params = new URLSearchParams({
        limit: "200",
        ...(userCursor ? { cursor: userCursor } : {}),
      });

      const resp = await fetch(`https://slack.com/api/users.list?${params}`, {
        headers: { Authorization: `Bearer ${slackBotToken}` },
      });
      const data = await resp.json();
      if (!data.ok) break;

      slackUsers.push(...(data.members || []));
      userCursor = data.response_metadata?.next_cursor;
    } while (userCursor);

    results.users_fetched = slackUsers.length;

    // Return Slack users so the admin UI can offer mapping
    const userList = slackUsers
      .filter((u: any) => !u.is_bot && !u.deleted && u.id !== "USLACKBOT")
      .map((u: any) => ({
        slack_user_id: u.id,
        display_name: u.profile?.display_name || u.profile?.real_name || u.name,
        email: u.profile?.email || null,
      }));

    // 4. Auto-match Slack users to CRM users by email
    let autoMapped = 0;
    const slackUsersWithEmail = userList.filter((u: any) => u.email);
    if (slackUsersWithEmail.length > 0) {
      // Get all auth users via admin API
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (authUsers && authUsers.length > 0) {
        const emailToAuthUser = new Map(authUsers.map((u: any) => [u.email?.toLowerCase(), u.id]));

        for (const su of slackUsersWithEmail) {
          const crmUserId = emailToAuthUser.get(su.email.toLowerCase());
          if (crmUserId) {
            const { error: mapErr } = await supabase.from("slack_user_mappings").upsert(
              {
                user_id: crmUserId,
                slack_user_id: su.slack_user_id,
                slack_display_name: su.display_name,
              },
              { onConflict: "user_id" }
            );
            if (!mapErr) autoMapped++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, ...results, auto_mapped: autoMapped, slack_users: userList }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("slack-sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
