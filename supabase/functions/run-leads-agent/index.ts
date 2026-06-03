import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent, getEffectiveMode } from "../_shared/agent-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateAgent(req, ["admin", "sales"]);
    if (auth.error) return auth.error;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await req.json().catch(() => ({}));

    // 1. Check agent config
    const { data: config } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("agent_name", "LeadsAgent")
      .single();

    if (!config || !config.enabled) {
      const { data: mission } = await supabase
        .from("missions")
        .insert({
          mission_type: "leads_agent",
          status: "blocked",
          initiated_by: auth.user.id,
          summary: "LeadsAgent is disabled",
        })
        .select()
        .single();

      if (mission) {
        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "LeadsAgent",
          event_type: "blocked",
          message: "LeadsAgent is currently disabled in agent configs.",
        });
      }

      return new Response(
        JSON.stringify({ status: "blocked", message: "Agent is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mode, wasOverridden } = await getEffectiveMode(supabase, config.mode);

    // 2. Create mission
    const { data: mission, error: missionErr } = await supabase
      .from("missions")
      .insert({
        mission_type: "leads_agent",
        status: "running",
        initiated_by: auth.user.id,
        summary: `Leads scoring and routing (${mode} mode)`,
      })
      .select()
      .single();

    if (missionErr || !mission) {
      return new Response(
        JSON.stringify({ error: "Failed to create mission", details: missionErr }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "LeadsAgent",
      event_type: "started",
      message: `Leads agent started in ${mode} mode`,
    });

    if (wasOverridden) {
      await supabase.from("mission_control_events").insert({
        mission_id: mission.id,
        agent_name: "LeadsAgent",
        event_type: "override",
        message: "Global Emergency Simulation Mode is active. Agent forced into simulation mode.",
      });
    }

    let hasErrors = false;
    let scored = 0;
    let assigned = 0;
    let stageUpdated = 0;

    // 3. Fetch unscored / new leads
    const { data: leads } = await supabase
      .from("leads")
      .select("id, name, email, company, service_type, source, plan_minutes, score, pipeline_stage, assigned_sales_rep, status")
      .or("score.is.null,status.eq.new");

    await supabase.from("agent_runs").insert({
      mission_id: mission.id,
      agent_name: "LeadsAgent",
      step_name: "fetch_leads",
      input_snapshot: { filter: "score IS NULL or status = new" },
      output_snapshot: { count: leads?.length || 0 },
      success: true,
    });

    // 4. Score and route each lead
    for (const lead of leads || []) {
      try {
        let computedScore = 0;
        if (lead.plan_minutes && lead.plan_minutes >= 500) computedScore += 40;
        else if (lead.plan_minutes && lead.plan_minutes >= 100) computedScore += 25;
        else computedScore += 10;

        if (lead.company && lead.company.trim().length > 0) computedScore += 15;
        if (lead.service_type) computedScore += 10;
        if (lead.source === "referral") computedScore += 20;
        else if (lead.source === "website" || lead.source === "web") computedScore += 10;
        else computedScore += 5;

        let newStage = lead.pipeline_stage;
        if (computedScore >= 60) newStage = "qualified";
        else if (computedScore >= 30) newStage = "nurturing";
        else newStage = "new";

        const updates: Record<string, any> = { score: computedScore };
        if (newStage !== lead.pipeline_stage) {
          updates.pipeline_stage = newStage;
          stageUpdated++;
        }

        if (computedScore >= 60 && !lead.assigned_sales_rep) {
          const { data: salesReps } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "sales");

          if (salesReps && salesReps.length > 0) {
            const repIndex = assigned % salesReps.length;
            updates.assigned_sales_rep = salesReps[repIndex].user_id;
            assigned++;
          }
        }

        await supabase.from("leads").update(updates).eq("id", lead.id);
        scored++;

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "LeadsAgent",
          step_name: "score_lead",
          input_snapshot: { lead_id: lead.id, name: lead.name },
          output_snapshot: { score: computedScore, stage: newStage, assigned: !!updates.assigned_sales_rep },
          success: true,
        });
      } catch (err) {
        hasErrors = true;
        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "LeadsAgent",
          step_name: "score_lead",
          input_snapshot: { lead_id: lead.id },
          success: false,
          error_message: String(err),
        });
        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "LeadsAgent",
          event_type: "error",
          message: `Error scoring lead ${lead.name}: ${String(err)}`,
        });
      }
    }

    // 5. Complete mission
    const finalStatus = hasErrors ? "error" : "completed";
    await supabase
      .from("missions")
      .update({
        status: finalStatus,
        error_flag: hasErrors,
        completed_at: new Date().toISOString(),
        summary: `Scored ${scored} leads, updated ${stageUpdated} stages, assigned ${assigned} reps. Mode: ${mode}.`,
      })
      .eq("id", mission.id);

    await supabase
      .from("agent_configs")
      .update({ last_run_at: new Date().toISOString(), error_count: hasErrors ? (config.error_count || 0) + 1 : config.error_count })
      .eq("agent_name", "LeadsAgent");

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "LeadsAgent",
      event_type: "finished",
      message: `Leads agent ${finalStatus}. ${scored} scored, ${assigned} assigned.`,
    });

    // 6. Notify sales + admin
    const { data: notifyUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "sales"]);

    for (const u of notifyUsers || []) {
      await supabase.from("notifications").insert({
        user_id: u.user_id,
        title: `Leads Agent ${finalStatus === "completed" ? "Complete" : "Has Errors"}`,
        message: `Scored ${scored} leads, assigned ${assigned} reps (${mode} mode).`,
        category: "leads",
        action_url: "/admin/mission-control",
      });
    }

    return new Response(
      JSON.stringify({ status: finalStatus, mission_id: mission.id, scored, assigned, stageUpdated, mode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
