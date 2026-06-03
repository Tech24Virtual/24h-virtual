import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent, getEffectiveMode } from "../_shared/agent-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateAgent(req, ["admin"]);
    if (auth.error) return auth.error;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await req.json().catch(() => ({}));

    // Check agent config
    const { data: config } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("agent_name", "FabricIdentitySyncAgent")
      .single();

    // Create mission
    const { data: mission, error: mErr } = await supabase
      .from("missions")
      .insert({
        mission_type: "identity_sync_fabric",
        status: config?.enabled === false ? "blocked" : "running",
        initiated_by: auth.user.id,
        summary: "Identity sync started",
      })
      .select()
      .single();

    if (mErr) throw mErr;

    if (config?.enabled === false) {
      await supabase.from("mission_control_events").insert({
        mission_id: mission.id,
        agent_name: "FabricIdentitySyncAgent",
        event_type: "blocked",
        message: "Agent is disabled in config.",
      });
      return new Response(
        JSON.stringify({ status: "blocked", mission_id: mission.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mode, wasOverridden } = await getEffectiveMode(supabase, config?.mode);

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "FabricIdentitySyncAgent",
      event_type: "started",
      message: `Identity sync started in ${mode} mode.`,
    });

    if (wasOverridden) {
      await supabase.from("mission_control_events").insert({
        mission_id: mission.id,
        agent_name: "FabricIdentitySyncAgent",
        event_type: "override",
        message: "Global Emergency Simulation Mode is active. Agent forced into simulation mode.",
      });
    }

    let agentsSynced = 0;
    let clientsSynced = 0;
    let merged = 0;

    // Step 1: Sync profiles (agents/staff) into people
    const { data: agentRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "agent");

    const agentIds = (agentRoles || []).map((r: any) => r.user_id);

    if (agentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", agentIds);

      for (const profile of profiles || []) {
        const email = `agent-${profile.id.slice(0, 8)}@24hvirtual.internal`;

        const { data: existing } = await supabase
          .from("people")
          .select("id, type_tags")
          .eq("primary_email", email)
          .maybeSingle();

        if (existing) {
          const tags = existing.type_tags || [];
          if (!tags.includes("agent")) {
            await supabase
              .from("people")
              .update({
                type_tags: [...tags, "agent"],
                profile_id: profile.id,
                full_name: profile.full_name || "Unknown",
              })
              .eq("id", existing.id);
            merged++;
          }
        } else {
          await supabase.from("people").insert({
            primary_email: email,
            full_name: profile.full_name || "Unknown",
            type_tags: ["agent"],
            profile_id: profile.id,
          });
          agentsSynced++;
        }
      }
    }

    await supabase.from("agent_runs").insert({
      mission_id: mission.id,
      agent_name: "FabricIdentitySyncAgent",
      step_name: "sync_agents",
      input_snapshot: { agent_count: agentIds.length },
      output_snapshot: { synced: agentsSynced, merged },
      success: true,
    });

    // Step 2: Sync leads (clients) into people
    const { data: leads } = await supabase
      .from("leads")
      .select("id, name, email")
      .not("email", "is", null);

    for (const lead of leads || []) {
      if (!lead.email) continue;

      const { data: existing } = await supabase
        .from("people")
        .select("id, type_tags")
        .eq("primary_email", lead.email)
        .maybeSingle();

      if (existing) {
        const tags = existing.type_tags || [];
        if (!tags.includes("client")) {
          await supabase
            .from("people")
            .update({
              type_tags: [...tags, "client"],
              lead_id: lead.id,
            })
            .eq("id", existing.id);
          merged++;
        }
      } else {
        await supabase.from("people").insert({
          primary_email: lead.email,
          full_name: lead.name || "Unknown",
          type_tags: ["client"],
          lead_id: lead.id,
        });
        clientsSynced++;
      }
    }

    await supabase.from("agent_runs").insert({
      mission_id: mission.id,
      agent_name: "FabricIdentitySyncAgent",
      step_name: "sync_clients",
      input_snapshot: { lead_count: (leads || []).length },
      output_snapshot: { synced: clientsSynced, merged },
      success: true,
    });

    const summary = `Synced ${agentsSynced} agents, ${clientsSynced} clients, ${merged} merged. Mode: ${mode}.`;

    await supabase
      .from("missions")
      .update({ status: "completed", summary, completed_at: new Date().toISOString() })
      .eq("id", mission.id);

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "FabricIdentitySyncAgent",
      event_type: "finished",
      message: summary,
    });

    await supabase
      .from("agent_configs")
      .update({ last_run_at: new Date().toISOString() })
      .eq("agent_name", "FabricIdentitySyncAgent");

    // Notify admin
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    for (const admin of admins || []) {
      await supabase.from("notifications").insert({
        user_id: admin.user_id,
        title: "Identity Sync Complete",
        message: summary,
        category: "system",
        action_url: "/admin/mission-control",
      });
    }

    return new Response(
      JSON.stringify({ status: "completed", mission_id: mission.id, agents_synced: agentsSynced, clients_synced: clientsSynced, merged }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("FabricIdentitySyncAgent error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
