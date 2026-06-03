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

    const body = await req.json().catch(() => ({}));
    const action = body.action || "onboard";
    const agentData = body.agent_data || {};
    const agentId = body.agent_id || null;

    // Check agent config
    const { data: config } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("agent_name", "LifecycleAgent")
      .single();

    const thresholds = config?.safety_thresholds || {};
    const missionType = action === "offboard" ? "offboarding" : "onboarding";

    const { data: mission, error: mErr } = await supabase
      .from("missions")
      .insert({
        mission_type: missionType,
        status: config?.enabled === false ? "blocked" : "running",
        initiated_by: auth.user.id,
        summary: `${missionType} started`,
      })
      .select()
      .single();

    if (mErr) throw mErr;

    if (config?.enabled === false) {
      await supabase.from("mission_control_events").insert({
        mission_id: mission.id,
        agent_name: "LifecycleAgent",
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
      agent_name: "LifecycleAgent",
      event_type: "started",
      message: `${missionType} process started in ${mode} mode.`,
    });

    if (wasOverridden) {
      await supabase.from("mission_control_events").insert({
        mission_id: mission.id,
        agent_name: "LifecycleAgent",
        event_type: "override",
        message: "Global Emergency Simulation Mode is active. Agent forced into simulation mode.",
      });
    }

    // Action count threshold check (for future batch mode)
    const maxActions = thresholds.max_actions_per_mission;
    // Currently single-action, but guard against batch payloads
    const actionCount = 1;
    if (maxActions && actionCount > maxActions) {
      await supabase
        .from("missions")
        .update({
          status: "needs_review",
          error_flag: true,
          summary: `THRESHOLD: ${actionCount} actions exceeds max ${maxActions}. Requires admin review.`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", mission.id);

      await supabase.from("mission_control_events").insert({
        mission_id: mission.id,
        agent_name: "LifecycleAgent",
        event_type: "threshold_exceeded",
        message: `Action count ${actionCount} exceeds threshold ${maxActions}. Mission paused.`,
      });

      return new Response(
        JSON.stringify({ status: "needs_review", mission_id: mission.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let summary = "";

    if (action === "onboard") {
      const { full_name, email, phone, hourly_rate, employment_type } = agentData;

      if (!full_name || !email) {
        await supabase
          .from("missions")
          .update({ status: "error", error_flag: true, summary: "Missing required fields: full_name and email.", completed_at: new Date().toISOString() })
          .eq("id", mission.id);
        return new Response(
          JSON.stringify({ status: "error", message: "full_name and email are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("agent_runs").insert({
        mission_id: mission.id,
        agent_name: "LifecycleAgent",
        step_name: "validate_profile",
        input_snapshot: { full_name, has_email: true, has_phone: !!phone },
        output_snapshot: { valid: true },
        success: true,
      });

      if (mode === "simulation") {
        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "LifecycleAgent",
          step_name: "create_auth_user",
          input_snapshot: { full_name },
          output_snapshot: { simulated: true, message: "Would create auth user and profile." },
          success: true,
        });

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "LifecycleAgent",
          step_name: "create_people_record",
          input_snapshot: { full_name },
          output_snapshot: { simulated: true, message: "Would create people directory entry with agent tag." },
          success: true,
        });

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "LifecycleAgent",
          step_name: "assign_role",
          input_snapshot: { role: "agent" },
          output_snapshot: { simulated: true, message: "Would assign agent role." },
          success: true,
        });

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "LifecycleAgent",
          step_name: "notify_supervisors",
          input_snapshot: { full_name },
          output_snapshot: { simulated: true, message: "Would notify supervisors and HR." },
          success: true,
        });

        summary = `Onboarding simulated for ${full_name}. No real accounts created.`;
      } else {
        await supabase.from("people").upsert({
          primary_email: email,
          full_name,
          type_tags: ["agent"],
        }, { onConflict: "primary_email" });

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "LifecycleAgent",
          step_name: "create_people_record",
          input_snapshot: { full_name },
          output_snapshot: { created: true },
          success: true,
        });

        const { data: staffToNotify } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["supervisor", "hr", "admin"]);

        for (const staff of staffToNotify || []) {
          await supabase.from("notifications").insert({
            user_id: staff.user_id,
            title: "New Agent Onboarding",
            message: `${full_name} is being onboarded.`,
            category: "hr",
            action_url: "/admin/agents",
          });
        }

        summary = `Onboarded ${full_name}. People record created, notifications sent.`;
      }
    } else if (action === "offboard") {
      if (!agentId) {
        await supabase
          .from("missions")
          .update({ status: "error", error_flag: true, summary: "Missing agent_id for offboarding.", completed_at: new Date().toISOString() })
          .eq("id", mission.id);
        return new Response(
          JSON.stringify({ status: "error", message: "agent_id is required for offboarding." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", agentId)
        .single();

      const agentName = profile?.full_name || "Unknown";

      if (mode === "simulation") {
        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "LifecycleAgent",
          step_name: "deactivate_agent",
          input_snapshot: { agent_id: agentId.slice(0, 8), name: agentName },
          output_snapshot: { simulated: true, message: "Would deactivate agent accounts and update people record." },
          success: true,
        });

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "LifecycleAgent",
          step_name: "notify_teams",
          input_snapshot: { agent_id: agentId.slice(0, 8) },
          output_snapshot: { simulated: true, message: "Would notify HR and supervisors." },
          success: true,
        });

        summary = `Offboarding simulated for ${agentName}. No real deactivations performed.`;
      } else {
        await supabase
          .from("people")
          .update({ type_tags: ["agent_inactive"], notes: "Offboarded via LifecycleAgent" })
          .eq("profile_id", agentId);

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "LifecycleAgent",
          step_name: "deactivate_agent",
          input_snapshot: { agent_id: agentId.slice(0, 8) },
          output_snapshot: { deactivated: true },
          success: true,
        });

        const { data: staffToNotify } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["supervisor", "hr", "admin"]);

        for (const staff of staffToNotify || []) {
          await supabase.from("notifications").insert({
            user_id: staff.user_id,
            title: "Agent Offboarded",
            message: `${agentName} has been offboarded.`,
            category: "hr",
            action_url: "/admin/agents",
          });
        }

        summary = `Offboarded ${agentName}. People record updated, notifications sent.`;
      }
    }

    await supabase
      .from("missions")
      .update({ status: "completed", summary, completed_at: new Date().toISOString() })
      .eq("id", mission.id);

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "LifecycleAgent",
      event_type: "finished",
      message: summary,
    });

    await supabase
      .from("agent_configs")
      .update({ last_run_at: new Date().toISOString() })
      .eq("agent_name", "LifecycleAgent");

    return new Response(
      JSON.stringify({ status: "completed", mission_id: mission.id, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("LifecycleAgent error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
