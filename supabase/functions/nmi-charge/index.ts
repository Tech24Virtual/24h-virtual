import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";
import { nmiDirectCharge } from "../_shared/nmi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Hoisted so the outer catch can log a best-effort error transaction —
  // any of these may still be undefined if the failure happened before
  // that particular assignment ran.
  let auth: Awaited<ReturnType<typeof authenticateAgent>> | undefined;
  let supabase: ReturnType<typeof createClient> | undefined;
  let lead_id: string | undefined;
  let amount: number | undefined;
  let description: string | undefined;
  let currency = "usd";

  try {
    auth = await authenticateAgent(req, ["admin", "billing"]);
    if (auth.error) return auth.error;

    const nmiKey = Deno.env.get("NMI_API_KEY");
    if (!nmiKey) throw new Error("NMI_API_KEY is not configured");

    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    lead_id = body.lead_id;
    amount = body.amount;
    description = body.description;
    currency = body.currency || "usd";

    if (!lead_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "lead_id and a positive amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, name, nmi_customer_vault_id, payment_processor")
      .eq("id", lead_id)
      .single();

    if (leadErr || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lead.nmi_customer_vault_id) {
      return new Response(
        JSON.stringify({ error: "No NMI vault ID on file for this client" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await nmiDirectCharge({
      nmiKey,
      customerVaultId: lead.nmi_customer_vault_id,
      amount,
      currency,
      description: description || "Subscription charge",
      order_id: lead_id,
    });

    if (!result.success) {
      // Record failure — non-blocking, ignore insert errors
      await supabase.from("payment_failures").insert({
        lead_id,
        nmi_transaction_id: result.transaction_id || null,
        failure_code: result.response_code || "declined",
        failure_message: result.message,
        payment_processor: "nmi",
        attempt_number: 1,
        amount,
      });

      const { error: logError } = await supabase.from("payment_transactions").insert({
        lead_id,
        processor: "nmi",
        transaction_id: result.transaction_id || null,
        amount,
        currency: currency.toUpperCase(),
        status: "failed",
        description: description || "Subscription charge",
        initiated_by: auth.user.id,
      });
      if (logError) console.error("[nmi-charge] failed to log transaction:", logError);

      const { data: adminUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "billing"]);

      for (const u of adminUsers || []) {
        await supabase.from("notifications").insert({
          user_id: u.user_id,
          title: "NMI Payment Failed",
          message: `Charge of $${Number(amount).toFixed(2)} failed for ${lead.name || lead_id}: ${result.message}`,
          category: "billing",
          action_url: `/admin/leads/${lead_id}`,
        });
      }

      // Return 200 so the Supabase client can read the body.
      // Payment declines are application-level events, not HTTP errors.
      return new Response(
        JSON.stringify({ success: false, message: result.message, response_code: result.response_code }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: logError } = await supabase.from("payment_transactions").insert({
      lead_id,
      processor: "nmi",
      transaction_id: result.transaction_id || null,
      amount,
      currency: currency.toUpperCase(),
      status: "success",
      description: description || "Subscription charge",
      initiated_by: auth.user.id,
    });
    if (logError) console.error("[nmi-charge] failed to log transaction:", logError);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: result.transaction_id,
        amount,
        message: result.message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[nmi-charge] unexpected error:", err);

    // Best-effort logging only — skip if we don't even have enough state
    // to satisfy the table's NOT NULL amount column, or never got a
    // Supabase client to write with.
    if (supabase && amount != null) {
      try {
        const { error: logError } = await supabase.from("payment_transactions").insert({
          lead_id: lead_id ?? null,
          processor: "nmi",
          transaction_id: null,
          amount,
          currency: currency.toUpperCase(),
          status: "error",
          description: description || "Subscription charge",
          initiated_by: auth?.user?.id ?? null,
        });
        if (logError) console.error("[nmi-charge] failed to log transaction:", logError);
      } catch (logErr) {
        console.error("[nmi-charge] failed to log error transaction:", logErr);
      }
    }

    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
