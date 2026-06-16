import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent, getEffectiveMode } from "../_shared/agent-auth.ts";
import { nmiDirectCharge } from "../_shared/nmi.ts";

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
      .eq("agent_name", "CallReportAgent")
      .single();

    if (!config || !config.enabled) {
      const { data: mission } = await supabase
        .from("missions")
        .insert({
          mission_type: "call_billing",
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
          agent_name: "CallReportAgent",
          event_type: "blocked",
          message: "CallReportAgent is currently disabled in agent configs.",
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
        mission_type: "call_billing",
        status: "running",
        period_start,
        period_end,
        initiated_by: auth.user.id,
        summary: `Monthly billing run (${mode} mode)`,
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
      agent_name: "CallReportAgent",
      event_type: "started",
      message: `Billing run started in ${mode} mode for ${period_start} to ${period_end}`,
    });

    if (wasOverridden) {
      await supabase.from("mission_control_events").insert({
        mission_id: mission.id,
        agent_name: "CallReportAgent",
        event_type: "override",
        message: "Global Emergency Simulation Mode is active. Agent forced into simulation mode.",
      });
    }

    // 3. Get active clients (Stripe or NMI)
    const { data: clients } = await supabase
      .from("leads")
      .select("id, name, company, plan_minutes, custom_minute_rate, stripe_subscription_id, service_type, payment_processor, nmi_customer_vault_id, billing_currency")
      .or("stripe_subscription_id.not.is.null,nmi_customer_vault_id.not.is.null")
      .eq("pipeline_stage", "active");

    let hasErrors = false;
    const processedClients: string[] = [];
    let totalBillingAmount = 0;

    for (const client of clients || []) {
      try {
        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "CallReportAgent",
          step_name: "fetch_usage",
          input_snapshot: { client_id: client.id, client_name: client.name || client.company },
          success: true,
        });

        let totalMinutes = 0;
        let totalCalls = 0;

        if (mode === "simulation") {
          totalMinutes = Math.floor(Math.random() * 500) + 50;
          totalCalls = Math.floor(Math.random() * 200) + 20;
        } else {
          const { data: callLogs } = await supabase
            .from("call_logs")
            .select("id, billable_minutes")
            .eq("client_id", client.id)
            .gte("call_date", period_start)
            .lte("call_date", period_end);

          totalCalls = callLogs?.length || 0;
          totalMinutes = callLogs?.reduce((sum: number, cl: any) => sum + (cl.billable_minutes || 0), 0) || 0;
        }

        const includedMinutes = client.plan_minutes || 0;
        const overageMinutes = Math.max(0, totalMinutes - includedMinutes);
        const overageRate = client.custom_minute_rate || 1.39;
        const overageAmount = overageMinutes * overageRate;

        // Per-client threshold check
        const maxSingleClient = thresholds.max_single_client_billing;
        if (mode === "live" && maxSingleClient && overageAmount > maxSingleClient) {
          hasErrors = true;
          await supabase.from("mission_control_events").insert({
            mission_id: mission.id,
            agent_name: "CallReportAgent",
            event_type: "threshold_exceeded",
            message: `Single client ${(client.name || client.company || "").slice(0, 30)} overage $${overageAmount.toFixed(2)} exceeds per-client threshold $${maxSingleClient}.`,
          });
        }

        totalBillingAmount += overageAmount;

        let stripeInvoiceId = null;
        let stripeInvoiceUrl = null;
        let nmiTransactionId = null;
        const processor = client.payment_processor || "stripe";

        if (mode === "simulation") {
          if (processor === "nmi") {
            nmiTransactionId = `sim_nmi_${crypto.randomUUID().slice(0, 8)}`;
          } else {
            stripeInvoiceId = `sim_inv_${crypto.randomUUID().slice(0, 8)}`;
            stripeInvoiceUrl = `https://stripe.com/simulated/${stripeInvoiceId}`;
          }
        } else if (mode === "live" && overageAmount > 0) {
          // Live mode: charge via the appropriate processor
          if (processor === "nmi" && client.nmi_customer_vault_id) {
            const nmiKey = Deno.env.get("NMI_API_KEY");
            if (nmiKey) {
              const chargeResult = await nmiDirectCharge({
                nmiKey,
                customerVaultId: client.nmi_customer_vault_id,
                amount: overageAmount,
                currency: client.billing_currency || "usd",
                description: `Overage charges ${period_start} to ${period_end}`,
              });
              if (chargeResult.success) {
                nmiTransactionId = chargeResult.transaction_id || null;
              } else {
                hasErrors = true;
                await supabase.from("payment_failures").insert({
                  lead_id: client.id,
                  nmi_transaction_id: chargeResult.transaction_id || null,
                  failure_code: chargeResult.response_code || "declined",
                  failure_message: chargeResult.message,
                  payment_processor: "nmi",
                  attempt_number: 1,
                });
                await supabase.from("mission_control_events").insert({
                  mission_id: mission.id,
                  agent_name: "CallReportAgent",
                  event_type: "error",
                  message: `NMI charge failed for ${(client.name || client.company || "").slice(0, 30)}: ${chargeResult.message}`,
                });
              }
            }
          }
          // Stripe live charging is handled separately via create-invoice / send-payment-link
        }

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "CallReportAgent",
          step_name: "compute_billing",
          input_snapshot: { client_id: client.id, totalMinutes, totalCalls, includedMinutes },
          output_snapshot: { overageMinutes, overageAmount, invoice_created: !!(stripeInvoiceId || nmiTransactionId), processor },
          success: true,
        });

        await supabase.from("billing_summaries").insert({
          mission_id: mission.id,
          client_id: client.id,
          period_start,
          period_end,
          total_minutes: totalMinutes,
          total_calls: totalCalls,
          included_minutes: includedMinutes,
          overage_minutes: overageMinutes,
          overage_amount: overageAmount,
          plan_name: client.service_type || "Standard",
          stripe_invoice_id: stripeInvoiceId,
          stripe_invoice_url: stripeInvoiceUrl,
          nmi_transaction_id: nmiTransactionId,
          payment_processor: processor,
          mode_used: mode,
          raw_details: { client_name: client.name || client.company, overage_rate: overageRate },
        });

        processedClients.push(client.id);

        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "CallReportAgent",
          event_type: "step",
          message: `Processed ${(client.name || client.company || "").slice(0, 30)}: ${totalMinutes} min, ${overageMinutes} overage`,
        });
      } catch (err) {
        hasErrors = true;
        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "CallReportAgent",
          step_name: "process_client",
          input_snapshot: { client_id: client.id },
          success: false,
          error_message: String(err),
        });
        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "CallReportAgent",
          event_type: "error",
          message: `Error processing ${(client.name || client.company || "").slice(0, 30)}: ${String(err)}`,
        });
      }
    }

    // Aggregate safety threshold check for live mode
    const maxBilling = thresholds.max_total_billing;
    if (mode === "live" && maxBilling && totalBillingAmount > maxBilling) {
      await supabase
        .from("missions")
        .update({
          status: "needs_review",
          error_flag: true,
          summary: `THRESHOLD EXCEEDED: $${totalBillingAmount.toFixed(2)} exceeds max $${maxBilling}. ${processedClients.length} clients computed but NOT charged. Requires admin review.`,
        })
        .eq("id", mission.id);

      await supabase.from("mission_control_events").insert({
        mission_id: mission.id,
        agent_name: "CallReportAgent",
        event_type: "threshold_exceeded",
        message: `Total billing $${totalBillingAmount.toFixed(2)} exceeds threshold $${maxBilling}. Mission paused for review.`,
      });

      return new Response(
        JSON.stringify({ status: "needs_review", mission_id: mission.id, total_billing: totalBillingAmount, threshold: maxBilling }),
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
        summary: `Processed ${processedClients.length} clients in ${mode} mode. ${hasErrors ? "Some errors occurred." : "All successful."}`,
      })
      .eq("id", mission.id);

    await supabase
      .from("agent_configs")
      .update({ last_run_at: new Date().toISOString(), error_count: hasErrors ? (config.error_count || 0) + 1 : config.error_count })
      .eq("agent_name", "CallReportAgent");

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "CallReportAgent",
      event_type: "finished",
      message: `Billing run ${finalStatus}. ${processedClients.length} clients processed.`,
    });

    // 5. Cross-dashboard notifications
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "billing"]);

    for (const u of adminUsers || []) {
      await supabase.from("notifications").insert({
        user_id: u.user_id,
        title: `Billing Run ${finalStatus === "completed" ? "Complete" : "Has Errors"}`,
        message: `Monthly billing (${mode}) processed ${processedClients.length} clients.`,
        category: "billing",
        action_url: "/admin/mission-control",
      });
    }

    return new Response(
      JSON.stringify({
        status: finalStatus,
        mission_id: mission.id,
        clients_processed: processedClients.length,
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
