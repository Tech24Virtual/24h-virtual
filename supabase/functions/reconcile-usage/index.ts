import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";

function defaultPeriod(): { start: string; end: string } {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);
  const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { start: fmt(firstOfPrevMonth), end: fmt(lastOfPrevMonth) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateAgent(req, ["admin", "billing"]);
    if (auth.error) return auth.error;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const defaults = defaultPeriod();
    const period_start: string = body.period_start || defaults.start;
    const period_end: string = body.period_end || defaults.end;
    const clientIdFilter: string | null = body.client_id || null;

    // Respect agent config if present; treat missing config as enabled
    const { data: agentConfig } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("agent_name", "UsageReconciliationAgent")
      .maybeSingle();

    if (agentConfig && agentConfig.enabled === false) {
      const { data: blockedMission } = await supabase
        .from("missions")
        .insert({
          mission_type: "usage_reconciliation",
          status: "blocked",
          period_start,
          period_end,
          initiated_by: auth.user.id,
          summary: "UsageReconciliationAgent is disabled",
        })
        .select()
        .single();

      if (blockedMission) {
        await supabase.from("mission_control_events").insert({
          mission_id: blockedMission.id,
          agent_name: "UsageReconciliationAgent",
          event_type: "blocked",
          message: "UsageReconciliationAgent is currently disabled in agent configs.",
        });
      }

      return new Response(
        JSON.stringify({ status: "blocked", message: "Agent is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create mission
    const { data: mission, error: missionErr } = await supabase
      .from("missions")
      .insert({
        mission_type: "usage_reconciliation",
        status: "running",
        period_start,
        period_end,
        initiated_by: auth.user.id,
        summary: `Usage reconciliation for ${period_start} to ${period_end}`,
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
      agent_name: "UsageReconciliationAgent",
      event_type: "started",
      message: `Reconciliation started for ${period_start} to ${period_end}`,
    });

    // Active clients (optionally filtered to one)
    let clientQuery = supabase
      .from("leads")
      .select("id, name, company, custom_minute_rate")
      .eq("pipeline_stage", "active");

    if (clientIdFilter) {
      clientQuery = clientQuery.eq("id", clientIdFilter);
    }

    const { data: clients } = await clientQuery;

    let totalVariances = 0;
    let hasErrors = false;
    const processedClients: string[] = [];

    for (const client of clients || []) {
      try {
        const variancesToInsert: object[] = [];
        const clientLabel = (client.name || client.company || "").slice(0, 40);
        const overageRate: number = client.custom_minute_rate || 1.39;

        // ── Check 1: call_logs minutes vs usage_records.minutes_used ──────────
        const { data: callLogs } = await supabase
          .from("call_logs")
          .select("id, billable_minutes, external_call_id")
          .eq("client_id", client.id)
          .gte("call_date", period_start)
          .lte("call_date", period_end);

        const callLogMinutes: number = (callLogs || []).reduce(
          (sum: number, cl: any) => sum + (Number(cl.billable_minutes) || 0),
          0
        );

        const { data: usageRecord } = await supabase
          .from("usage_records")
          .select("id, minutes_used")
          .eq("lead_id", client.id)
          .gte("billing_period_start", period_start)
          .lte("billing_period_end", period_end)
          .maybeSingle();

        if (usageRecord) {
          const usageMinutes: number = Number(usageRecord.minutes_used) || 0;
          const delta = callLogMinutes - usageMinutes;
          const pct =
            usageMinutes > 0
              ? Math.abs(delta / usageMinutes) * 100
              : callLogMinutes > 0
              ? 100
              : 0;

          if (pct > 5) {
            variancesToInsert.push({
              client_id: client.id,
              period_start,
              period_end,
              variance_type: "call_log_vs_usage_record",
              expected_minutes: usageMinutes,
              actual_minutes: callLogMinutes,
              delta_minutes: delta,
              delta_pct: Math.round(pct * 100) / 100,
              mission_id: mission.id,
              raw_details: {
                client_name: clientLabel,
                usage_record_id: usageRecord.id,
                call_log_count: callLogs?.length || 0,
                overage_rate: overageRate,
              },
            });
          }

          // ── Check 2: usage_records.minutes_used vs billing_summaries.total_minutes ──
          const { data: billingSummary } = await supabase
            .from("billing_summaries")
            .select("id, total_minutes")
            .eq("client_id", client.id)
            .gte("period_start", period_start)
            .lte("period_end", period_end + "T23:59:59")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (billingSummary) {
            const billingMinutes: number = Number(billingSummary.total_minutes) || 0;
            const delta2 = usageMinutes - billingMinutes;
            const pct2 =
              billingMinutes > 0
                ? Math.abs(delta2 / billingMinutes) * 100
                : usageMinutes > 0
                ? 100
                : 0;

            if (pct2 > 5) {
              variancesToInsert.push({
                client_id: client.id,
                period_start,
                period_end,
                variance_type: "usage_record_vs_billing_summary",
                expected_minutes: billingMinutes,
                actual_minutes: usageMinutes,
                delta_minutes: delta2,
                delta_pct: Math.round(pct2 * 100) / 100,
                mission_id: mission.id,
                raw_details: {
                  client_name: clientLabel,
                  usage_record_id: usageRecord.id,
                  billing_summary_id: billingSummary.id,
                  overage_rate: overageRate,
                },
              });
            }
          }
        }

        // ── Check 3: duplicate external_call_id within the period ─────────────
        if (callLogs && callLogs.length > 0) {
          const idCounts: Record<string, number> = {};
          for (const cl of callLogs) {
            if (cl.external_call_id) {
              idCounts[cl.external_call_id] = (idCounts[cl.external_call_id] || 0) + 1;
            }
          }

          const dupeEntries = Object.entries(idCounts).filter(([, n]) => n > 1);
          if (dupeEntries.length > 0) {
            // Excess minutes = minutes from every occurrence after the first
            let excessMinutes = 0;
            const dupeSets: object[] = [];
            for (const [extId, count] of dupeEntries) {
              const rows = callLogs.filter((cl: any) => cl.external_call_id === extId);
              const excess = rows.slice(1).reduce((s: number, cl: any) => s + (Number(cl.billable_minutes) || 0), 0);
              excessMinutes += excess;
              dupeSets.push({ external_call_id: extId, count, excess_minutes: excess });
            }

            variancesToInsert.push({
              client_id: client.id,
              period_start,
              period_end,
              variance_type: "duplicate_call_id",
              expected_minutes: callLogMinutes - excessMinutes,
              actual_minutes: callLogMinutes,
              delta_minutes: excessMinutes,
              delta_pct:
                callLogMinutes > 0
                  ? Math.round((excessMinutes / callLogMinutes) * 10000) / 100
                  : 0,
              mission_id: mission.id,
              raw_details: {
                client_name: clientLabel,
                duplicate_sets: dupeSets,
                overage_rate: overageRate,
              },
            });
          }
        }

        if (variancesToInsert.length > 0) {
          await supabase.from("variance_queue").insert(variancesToInsert);
          totalVariances += variancesToInsert.length;
        }

        processedClients.push(client.id);

        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "UsageReconciliationAgent",
          event_type: "step",
          message: `Processed ${clientLabel}: ${variancesToInsert.length} variance(s) found`,
        });
      } catch (err) {
        hasErrors = true;
        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "UsageReconciliationAgent",
          event_type: "error",
          message: `Error processing client ${client.id}: ${String(err)}`,
        });
      }
    }

    const finalStatus = hasErrors
      ? "error"
      : totalVariances > 0
      ? "needs_review"
      : "completed";

    await supabase
      .from("missions")
      .update({
        status: finalStatus,
        error_flag: hasErrors || totalVariances > 0,
        completed_at: new Date().toISOString(),
        summary: `Reconciliation complete. ${processedClients.length} client(s) checked, ${totalVariances} variance(s) found.`,
      })
      .eq("id", mission.id);

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "UsageReconciliationAgent",
      event_type: "finished",
      message: `${finalStatus === "completed" ? "Clean" : `${totalVariances} variance(s) queued for review`}.`,
    });

    if (totalVariances > 0) {
      const { data: notifyUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "billing"]);

      for (const u of notifyUsers || []) {
        await supabase.from("notifications").insert({
          user_id: u.user_id,
          title: "Usage Reconciliation — Variances Found",
          message: `${totalVariances} variance(s) detected for ${period_start} → ${period_end}. Review in the Reconciliation queue.`,
          category: "billing",
          action_url: "/staff/billing/reconciliation",
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: finalStatus,
        mission_id: mission.id,
        clients_processed: processedClients.length,
        variances_found: totalVariances,
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
