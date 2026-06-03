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

    const { period_start, period_end } = await req.json();

    if (!period_start || !period_end) {
      return new Response(
        JSON.stringify({ error: "period_start and period_end are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check agent config
    const { data: config } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("agent_name", "PayrollAgent")
      .single();

    if (!config || !config.enabled) {
      const { data: mission } = await supabase
        .from("missions")
        .insert({
          mission_type: "payroll_run",
          status: "blocked",
          period_start,
          period_end,
          initiated_by: auth.user.id,
          summary: "Agent is disabled",
        })
        .select()
        .single();

      if (mission) {
        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "PayrollAgent",
          event_type: "blocked",
          message: "PayrollAgent is currently disabled in agent configs.",
        });
      }

      return new Response(
        JSON.stringify({ status: "blocked", message: "Agent is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mode, wasOverridden } = await getEffectiveMode(supabase, config.mode);
    const thresholds = config.safety_thresholds || {};

    // 2. Create mission
    const { data: mission, error: missionErr } = await supabase
      .from("missions")
      .insert({
        mission_type: "payroll_run",
        status: "running",
        period_start,
        period_end,
        initiated_by: auth.user.id,
        summary: `Payroll run (${mode} mode)`,
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
      agent_name: "PayrollAgent",
      event_type: "started",
      message: `Payroll run started in ${mode} mode for ${period_start} to ${period_end}`,
    });

    if (wasOverridden) {
      await supabase.from("mission_control_events").insert({
        mission_id: mission.id,
        agent_name: "PayrollAgent",
        event_type: "override",
        message: "Global Emergency Simulation Mode is active. Agent forced into simulation mode.",
      });
    }

    // 3. Get shift data
    let shifts: any[] = [];

    if (mode === "simulation") {
      const { data: agents } = await supabase
        .from("agent_banking")
        .select("agent_id, hourly_rate, currency, employment_type");

      for (const agent of agents || []) {
        const hoursWorked = Math.round((Math.random() * 40 + 20) * 100) / 100;
        shifts.push({
          agent_id: agent.agent_id,
          hourly_rate: agent.hourly_rate || 15,
          currency: agent.currency || "USD",
          hours_worked: hoursWorked,
          simulated: true,
        });
      }
    } else {
      const { data: invoices } = await supabase
        .from("shift_invoices")
        .select("*")
        .eq("status", "supervisor_approved")
        .gte("period_start", period_start)
        .lte("period_end", period_end);

      for (const inv of invoices || []) {
        const { data: banking } = await supabase
          .from("agent_banking")
          .select("hourly_rate, currency")
          .eq("agent_id", inv.agent_id)
          .single();

        shifts.push({
          agent_id: inv.agent_id,
          invoice_id: inv.id,
          hourly_rate: banking?.hourly_rate || inv.hourly_rate || 15,
          currency: banking?.currency || "USD",
          hours_worked: inv.total_hours || 0,
          simulated: false,
        });
      }
    }

    let hasErrors = false;
    let totalPayroll = 0;
    const processedAgents: string[] = [];

    for (const shift of shifts) {
      try {
        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "PayrollAgent",
          step_name: "fetch_work_logs",
          input_snapshot: { agent_id: shift.agent_id, period_start, period_end },
          success: true,
        });

        const basePay = Math.round(shift.hours_worked * shift.hourly_rate * 100) / 100;
        const bonuses = 0;
        const deductions = 0;
        const netPay = basePay + bonuses - deductions;

        if (shift.hours_worked < 0 || shift.hours_worked > 200) {
          throw new Error(`Invalid hours: ${shift.hours_worked}`);
        }

        // Per-agent threshold check
        const maxSinglePayout = thresholds.max_single_agent_payout;
        if (mode === "live" && maxSinglePayout && netPay > maxSinglePayout) {
          hasErrors = true;
          await supabase.from("mission_control_events").insert({
            mission_id: mission.id,
            agent_name: "PayrollAgent",
            event_type: "threshold_exceeded",
            message: `Agent ${shift.agent_id.slice(0, 8)}… net pay $${netPay.toFixed(2)} exceeds per-agent threshold $${maxSinglePayout}.`,
          });
        }

        let transferId = null;
        if (mode === "simulation") {
          transferId = `sim_txn_${crypto.randomUUID().slice(0, 8)}`;
        }

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "PayrollAgent",
          step_name: "compute_pay",
          input_snapshot: { agent_id: shift.agent_id, hours_worked: shift.hours_worked, hourly_rate: shift.hourly_rate },
          output_snapshot: { base_pay: basePay, net_pay: netPay, transfer_created: !!transferId },
          success: true,
        });

        totalPayroll += netPay;
        processedAgents.push(shift.agent_id);

        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "PayrollAgent",
          event_type: "step",
          message: `Agent ${shift.agent_id.slice(0, 8)}…: ${shift.hours_worked}h @ $${shift.hourly_rate}/h = $${netPay}`,
        });
      } catch (err) {
        hasErrors = true;
        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "PayrollAgent",
          step_name: "process_agent",
          input_snapshot: { agent_id: shift.agent_id },
          success: false,
          error_message: String(err),
        });
        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "PayrollAgent",
          event_type: "error",
          message: `Error for agent ${shift.agent_id.slice(0, 8)}…: ${String(err)}`,
        });
      }
    }

    // Aggregate safety threshold check for live mode
    const maxPayroll = thresholds.max_total_payroll;
    if (mode === "live" && maxPayroll && totalPayroll > maxPayroll) {
      await supabase
        .from("missions")
        .update({
          status: "needs_review",
          error_flag: true,
          summary: `THRESHOLD EXCEEDED: $${totalPayroll.toFixed(2)} exceeds max $${maxPayroll}. ${processedAgents.length} agents computed but NOT paid. Requires admin review.`,
        })
        .eq("id", mission.id);

      await supabase.from("mission_control_events").insert({
        mission_id: mission.id,
        agent_name: "PayrollAgent",
        event_type: "threshold_exceeded",
        message: `Total payroll $${totalPayroll.toFixed(2)} exceeds threshold $${maxPayroll}. Mission paused.`,
      });

      return new Response(
        JSON.stringify({ status: "needs_review", mission_id: mission.id, total_payroll: totalPayroll, threshold: maxPayroll }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Complete mission
    const finalStatus = hasErrors ? "error" : "completed";
    await supabase
      .from("missions")
      .update({
        status: finalStatus,
        error_flag: hasErrors,
        completed_at: new Date().toISOString(),
        summary: `Payroll (${mode}): ${processedAgents.length} agents, $${totalPayroll.toFixed(2)} total. ${hasErrors ? "Some errors." : "All successful."}`,
      })
      .eq("id", mission.id);

    await supabase
      .from("agent_configs")
      .update({ last_run_at: new Date().toISOString(), error_count: hasErrors ? (config.error_count || 0) + 1 : config.error_count })
      .eq("agent_name", "PayrollAgent");

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "PayrollAgent",
      event_type: "finished",
      message: `Payroll run ${finalStatus}. ${processedAgents.length} agents, $${totalPayroll.toFixed(2)} total.`,
    });

    // 5. Cross-dashboard notifications
    const { data: notifyUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "hr", "supervisor"]);

    for (const u of notifyUsers || []) {
      await supabase.from("notifications").insert({
        user_id: u.user_id,
        title: `Payroll Run ${finalStatus === "completed" ? "Complete" : "Has Errors"}`,
        message: `Payroll (${mode}): ${processedAgents.length} agents, $${totalPayroll.toFixed(2)} total.`,
        category: "payroll",
        action_url: "/admin/mission-control",
      });
    }

    return new Response(
      JSON.stringify({
        status: finalStatus,
        mission_id: mission.id,
        agents_processed: processedAgents.length,
        total_payroll: totalPayroll,
        mode,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
