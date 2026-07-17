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
    let channelsError: string | null = null;
    let channelUpsertErrors = 0;
    let mappingUpsertErrors = 0;

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
        channelsError = data.error || "conversations.list failed";
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

      const { error: channelError } = await supabase.from("slack_channels").upsert(
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
      if (channelError) {
        console.error(`slack_channels upsert error for ${ch.id}:`, channelError);
        channelUpsertErrors++;
      } else {
        results.channels_synced++;
      }
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

    // 4. Auto-match Slack users to CRM users by email, and upsert a mapping
    // row for every Slack member (user_id is null until matched/manually linked).
    let autoMapped = 0;
    const slackEmails = userList
      .map((u: any) => u.email)
      .filter((e: unknown): e is string => !!e);

    console.log("Slack emails sample:", slackEmails.slice(0, 5));

    let emailToProfileId = new Map<string, string>();
    if (slackEmails.length > 0) {
      const { data: profileMatches, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email")
        .in("email", slackEmails);
      console.log("Profile matches:", profileMatches?.length ?? 0);
      if (profilesError) {
        console.error("profiles lookup error:", profilesError);
      } else {
        emailToProfileId = new Map(
          (profileMatches || [])
            .filter((p: any) => p.email)
            .map((p: any) => [p.email.toLowerCase(), p.id])
        );
      }
    }

    const mappingRows = userList.map((u: any) => ({
      slack_user_id: u.slack_user_id,
      slack_display_name: u.display_name,
      user_id: u.email ? emailToProfileId.get(u.email.toLowerCase()) ?? null : null,
    }));

    if (mappingRows.length > 0) {
      const { error: mapErr } = await supabase
        .from("slack_user_mappings")
        .upsert(mappingRows, { onConflict: "slack_user_id" });
      if (mapErr) {
        console.error("slack_user_mappings upsert error:", mapErr);
        mappingUpsertErrors = mappingRows.length;
      } else {
        autoMapped = mappingRows.filter((r) => r.user_id !== null).length;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        ...results,
        auto_mapped: autoMapped,
        slack_users: userList,
        channels_error: channelsError,
        channel_upsert_errors: channelUpsertErrors,
        mapping_upsert_errors: mappingUpsertErrors,
      }),
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
