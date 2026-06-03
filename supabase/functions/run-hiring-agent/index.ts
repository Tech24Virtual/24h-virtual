import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent, getEffectiveMode } from "../_shared/agent-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateAgent(req, ["admin", "hr"]);
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
      .eq("agent_name", "HiringAgent")
      .single();

    if (!config || !config.enabled) {
      const { data: mission } = await supabase
        .from("missions")
        .insert({
          mission_type: "hiring_agent",
          status: "blocked",
          initiated_by: auth.user.id,
          summary: "HiringAgent is disabled",
        })
        .select()
        .single();

      if (mission) {
        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "HiringAgent",
          event_type: "blocked",
          message: "HiringAgent is currently disabled in agent configs.",
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
        mission_type: "hiring_agent",
        status: "running",
        initiated_by: auth.user.id,
        summary: `Hiring screening run (${mode} mode)`,
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
      agent_name: "HiringAgent",
      event_type: "started",
      message: `Hiring agent started in ${mode} mode`,
    });

    if (wasOverridden) {
      await supabase.from("mission_control_events").insert({
        mission_id: mission.id,
        agent_name: "HiringAgent",
        event_type: "override",
        message: "Global Emergency Simulation Mode is active. Agent forced into simulation mode.",
      });
    }

    let hasErrors = false;
    let screened = 0;
    let shortlisted = 0;
    let rejected = 0;

    // 3. Fetch applications to screen
    const { data: applications } = await supabase
      .from("job_applications")
      .select("id, name, email, phone, cover_letter, status, job_posting_id, workflow_stage")
      .in("status", ["new", "reviewing"]);

    const postingIds = [...new Set((applications || []).map(a => a.job_posting_id).filter(Boolean))];
    let postingsMap: Record<string, any> = {};
    if (postingIds.length > 0) {
      const { data: postings } = await supabase
        .from("job_postings")
        .select("id, title, requirements, department")
        .in("id", postingIds);
      for (const p of postings || []) {
        postingsMap[p.id] = p;
      }
    }

    await supabase.from("agent_runs").insert({
      mission_id: mission.id,
      agent_name: "HiringAgent",
      step_name: "fetch_applications",
      input_snapshot: { filter: "status IN (new, reviewing)" },
      output_snapshot: { count: applications?.length || 0, postings: postingIds.length },
      success: true,
    });

    // 4. Screen each application
    for (const app of applications || []) {
      try {
        let score = 0;
        const posting = app.job_posting_id ? postingsMap[app.job_posting_id] : null;

        const coverLen = (app.cover_letter || "").length;
        if (coverLen > 500) score += 30;
        else if (coverLen > 200) score += 20;
        else if (coverLen > 50) score += 10;

        if (app.phone && app.phone.trim().length > 0) score += 10;

        if (posting?.requirements && app.cover_letter) {
          const coverWords = (app.cover_letter as string).toLowerCase();
          const keywords = ["experience", "customer service", "phone", "virtual", "receptionist", "bilingual", "communication"];
          let matchCount = 0;
          for (const kw of keywords) {
            if (coverWords.includes(kw)) matchCount++;
          }
          score += Math.min(matchCount * 5, 30);
        }

        let newStatus = app.status;
        let newWorkflowStage = app.workflow_stage;
        if (score >= 50) {
          newStatus = "reviewing";
          newWorkflowStage = "shortlisted";
          shortlisted++;
        } else if (score < 20 && app.status === "reviewing") {
          newStatus = "rejected";
          newWorkflowStage = "rejected";
          rejected++;
        }

        await supabase
          .from("job_applications")
          .update({ status: newStatus, workflow_stage: newWorkflowStage, updated_at: new Date().toISOString() })
          .eq("id", app.id);

        screened++;

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "HiringAgent",
          step_name: "screen_applicant",
          input_snapshot: { app_id: app.id, name: app.name, posting: posting?.title },
          output_snapshot: { score, status: newStatus, workflow_stage: newWorkflowStage },
          success: true,
        });
      } catch (err) {
        hasErrors = true;
        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "HiringAgent",
          step_name: "screen_applicant",
          input_snapshot: { app_id: app.id },
          success: false,
          error_message: String(err),
        });
        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "HiringAgent",
          event_type: "error",
          message: `Error screening ${app.name}: ${String(err)}`,
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
        summary: `Screened ${screened} applicants: ${shortlisted} shortlisted, ${rejected} rejected. Mode: ${mode}.`,
      })
      .eq("id", mission.id);

    await supabase
      .from("agent_configs")
      .update({ last_run_at: new Date().toISOString(), error_count: hasErrors ? (config.error_count || 0) + 1 : config.error_count })
      .eq("agent_name", "HiringAgent");

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "HiringAgent",
      event_type: "finished",
      message: `Hiring agent ${finalStatus}. ${screened} screened, ${shortlisted} shortlisted, ${rejected} rejected.`,
    });

    // 6. Notify HR + admin
    const { data: notifyUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "hr"]);

    for (const u of notifyUsers || []) {
      await supabase.from("notifications").insert({
        user_id: u.user_id,
        title: `Hiring Agent ${finalStatus === "completed" ? "Complete" : "Has Errors"}`,
        message: `Screened ${screened} applicants, ${shortlisted} shortlisted (${mode} mode).`,
        category: "hr",
        action_url: "/admin/mission-control",
      });
    }

    return new Response(
      JSON.stringify({ status: finalStatus, mission_id: mission.id, screened, shortlisted, rejected, mode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
