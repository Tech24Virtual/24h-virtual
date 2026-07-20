import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";
import { nmiDirectCharge } from "../_shared/nmi.ts";

const MAX_AUTO_RETRIES = 3;
const RETRY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PaymentFailureRow {
  id: string;
  lead_id: string;
  amount: number | null;
  retry_count: number;
  nmi_transaction_id: string | null;
}

async function processIssue(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  nmiKey: string,
  issue: PaymentFailureRow,
  resolvedByUserId: string | null,
) {
  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, nmi_customer_vault_id")
    .eq("id", issue.lead_id)
    .maybeSingle();

  if (!lead?.nmi_customer_vault_id) {
    await supabase
      .from("payment_failures")
      .update({ status: "needs_attention" })
      .eq("id", issue.id);
    return { id: issue.id, success: false, message: "No payment method on file" };
  }

  if (!issue.amount || issue.amount <= 0) {
    await supabase
      .from("payment_failures")
      .update({ status: "needs_attention" })
      .eq("id", issue.id);
    return { id: issue.id, success: false, message: "No amount recorded for this issue" };
  }

  const result = await nmiDirectCharge({
    nmiKey,
    customerVaultId: lead.nmi_customer_vault_id,
    amount: issue.amount,
    currency: "usd",
    description: "Payment retry",
    order_id: issue.lead_id,
  });

  await supabase.from("payment_failure_attempts").insert({
    payment_failure_id: issue.id,
    result: result.success ? "succeeded" : "failed",
    error_message: result.success ? null : result.message,
    nmi_transaction_id: result.transaction_id ?? null,
  });

  if (result.success) {
    await supabase
      .from("payment_failures")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_type: "paid",
        resolved_by: resolvedByUserId,
        nmi_transaction_id: result.transaction_id ?? issue.nmi_transaction_id,
      })
      .eq("id", issue.id);

    await supabase
      .from("leads")
      .update({ last_payment_status: "paid", payment_failure_count: 0 })
      .eq("id", issue.lead_id);

    return { id: issue.id, success: true };
  }

  const newRetryCount = issue.retry_count + 1;
  const exhausted = newRetryCount >= MAX_AUTO_RETRIES;

  await supabase
    .from("payment_failures")
    .update({
      retry_count: newRetryCount,
      next_retry_at: exhausted ? null : new Date(Date.now() + RETRY_INTERVAL_MS).toISOString(),
      status: exhausted ? "needs_attention" : "failed",
      failure_message: result.message,
      nmi_transaction_id: result.transaction_id ?? issue.nmi_transaction_id,
    })
    .eq("id", issue.id);

  return { id: issue.id, success: false, message: result.message };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const isSchedulerCall =
      authHeader === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` ||
      req.headers.get("x-supabase-scheduled") === "true";

    let callerUserId: string | null = null;
    if (!isSchedulerCall) {
      const auth = await authenticateAgent(req, ["admin", "billing"]);
      if (auth.error) return auth.error;
      callerUserId = auth.user.id;
    }

    const nmiKey = Deno.env.get("NMI_API_KEY");
    if (!nmiKey) throw new Error("NMI_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: { batch?: boolean; payment_failure_id?: string } = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch { /* empty or non-JSON body is fine */ }

    if (body.payment_failure_id) {
      // ── Single, immediate retry ("Retry Now" button) ─────────────────────
      const { data: issue, error } = await supabase
        .from("payment_failures")
        .select("id, lead_id, amount, retry_count, nmi_transaction_id")
        .eq("id", body.payment_failure_id)
        .single();

      if (error || !issue) {
        return new Response(
          JSON.stringify({ error: "Payment issue not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Manual retry re-enables automation for this issue going forward.
      await supabase
        .from("payment_failures")
        .update({ retry_cancelled: false })
        .eq("id", issue.id);

      const outcome = await processIssue(supabase, nmiKey, issue, callerUserId);
      return new Response(JSON.stringify(outcome), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Batch mode (cron) ────────────────────────────────────────────────────
    if (!isSchedulerCall && !body.batch) {
      return new Response(
        JSON.stringify({ error: "payment_failure_id or batch:true is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: dueIssues, error: dueErr } = await supabase
      .from("payment_failures")
      .select("id, lead_id, amount, retry_count, nmi_transaction_id")
      .eq("status", "failed")
      .eq("retry_cancelled", false)
      .lt("retry_count", MAX_AUTO_RETRIES)
      .or("next_retry_at.is.null,next_retry_at.lte." + new Date().toISOString());

    if (dueErr) throw dueErr;

    const results = [];
    for (const issue of dueIssues ?? []) {
      results.push(await processIssue(supabase, nmiKey, issue, null));
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
