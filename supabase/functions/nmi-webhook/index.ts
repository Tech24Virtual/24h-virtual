import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseNmiResponse } from "../_shared/nmi.ts";

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[nmi-webhook] ${step}${d}`);
};

Deno.serve(async (req) => {
  // Always return 200 to NMI for processing errors — NMI retries on non-200.
  // Only 403 is intentional (bad secret).
  try {
    // ── 1. Verify shared secret ──────────────────────────────────────────
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const expectedSecret = Deno.env.get("NMI_WEBHOOK_SECRET");

    if (!expectedSecret || secret !== expectedSecret) {
      log("Unauthorized — bad or missing secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // NMI health-check GETs or OPTIONS — acknowledge and exit
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 2. Parse URL-encoded body ─────────────────────────────────────────
    const bodyText = await req.text();
    const data = parseNmiResponse(bodyText);

    const response       = data.response;            // "1" approved, "2" declined, "3" error
    const transactionId  = data.transactionid;
    const orderId        = data.order_id;            // lead_id we set on the original charge
    const amount         = data.amount;
    const responseText   = data.responsetext;
    const responseCode   = data.response_code;

    log("Payload received", { response, transactionId, orderId, condition: data.condition });

    if (!orderId) {
      log("No order_id — cannot identify lead");
      return new Response(JSON.stringify({ received: true, warning: "no_order_id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 3. Init Supabase (service role — no RLS) ──────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 4. Look up lead ───────────────────────────────────────────────────
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, name, email, payment_failure_count")
      .eq("id", orderId)
      .maybeSingle();

    if (leadErr || !lead) {
      log("Lead not found", { orderId, error: leadErr?.message });
      return new Response(JSON.stringify({ received: true, warning: "lead_not_found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clientLabel  = lead.name || lead.email || orderId;
    const amountLabel  = amount ? `$${Number(amount).toFixed(2)}` : "payment";

    // ── 5. Get admin/billing user IDs for notifications ───────────────────
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "billing"]);

    // ─────────────────────────────────────────────────────────────────────
    if (response === "1") {
      // ── APPROVED ────────────────────────────────────────────────────────
      log("Approved", { transactionId, clientLabel });

      // Mark the most-recent pending billing_summary as paid
      const { data: summary } = await supabase
        .from("billing_summaries")
        .select("id")
        .eq("client_id", orderId)
        .eq("payment_status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (summary) {
        await supabase
          .from("billing_summaries")
          .update({ payment_status: "paid", nmi_transaction_id: transactionId })
          .eq("id", summary.id);
        log("Billing summary marked paid", { summaryId: summary.id });
      }

      // Resolve open payment_failure for this exact transaction (if it was
      // previously recorded as a decline and then retried successfully)
      if (transactionId) {
        await supabase
          .from("payment_failures")
          .update({ resolved_at: new Date().toISOString(), resolution_type: "paid", status: "resolved" })
          .eq("lead_id", orderId)
          .is("resolved_at", null)
          .eq("nmi_transaction_id", transactionId);
      }

      // Clear any open failures on the lead
      await supabase
        .from("leads")
        .update({ last_payment_status: "paid", payment_failure_count: 0 })
        .eq("id", orderId);

      // Notify admin/billing
      for (const u of adminUsers || []) {
        await supabase.from("notifications").insert({
          user_id: u.user_id,
          title: "NMI Payment Confirmed",
          message: `${amountLabel} confirmed — ${clientLabel}`,
          category: "billing",
          action_url: `/admin/leads/${orderId}`,
        });
      }

      log("Approval handling complete");

    } else if (response === "2" || response === "3") {
      // ── DECLINED / ERROR ─────────────────────────────────────────────────
      const isError = response === "3";
      log(isError ? "Error" : "Declined", { transactionId, responseText, responseCode });

      // Insert failure — unique constraint on nmi_transaction_id prevents dupes
      if (transactionId) {
        const { error: insErr } = await supabase
          .from("payment_failures")
          .insert({
            lead_id: orderId,
            nmi_transaction_id: transactionId,
            payment_processor: "nmi",
            failure_code: responseCode || (isError ? "error" : "declined"),
            failure_message: responseText || (isError ? "Transaction error" : "Card declined"),
            attempt_number: 1,
            amount: amount ? Number(amount) : null,
          });

        // code 23505 = unique_violation — already recorded, silently skip
        if (insErr && insErr.code !== "23505") {
          log("payment_failures insert error", { error: insErr.message });
        }
      }

      // Mark any pending billing_summary as failed
      const { data: pendingSummary } = await supabase
        .from("billing_summaries")
        .select("id")
        .eq("client_id", orderId)
        .eq("payment_status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingSummary) {
        await supabase
          .from("billing_summaries")
          .update({ payment_status: "failed", nmi_transaction_id: transactionId ?? null })
          .eq("id", pendingSummary.id);
      }

      // Increment failure count on lead
      const currentCount = typeof lead.payment_failure_count === "number"
        ? lead.payment_failure_count
        : 0;
      await supabase
        .from("leads")
        .update({
          last_payment_status: "failed",
          payment_failure_count: currentCount + 1,
        })
        .eq("id", orderId);

      // Notify admin/billing
      const reason = responseText || (isError ? "Gateway error" : "Card declined");
      for (const u of adminUsers || []) {
        await supabase.from("notifications").insert({
          user_id: u.user_id,
          title: "NMI Payment Failed",
          message: `${amountLabel} failed — ${clientLabel}: ${reason}`,
          category: "billing",
          action_url: `/admin/leads/${orderId}`,
        });
      }

      // Fire payment-failed email to the client (non-blocking, best-effort)
      if (lead.email) {
        const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
        const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const cardUpdateUrl = `${Deno.env.get("SITE_URL") ?? "https://app.24hvirtual.com"}/client-dashboard/billing`;

        fetch(`${supabaseUrl}/functions/v1/send-payment-failed-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            recipientEmail: lead.email,
            recipientName: lead.name ?? undefined,
            amount: amountLabel,
            updateCardUrl: cardUpdateUrl,
          }),
        }).catch((err: unknown) =>
          log("Email send failed (non-fatal)", { error: String(err) })
        );
      }

      log("Decline/error handling complete");

    } else {
      log("Unrecognised response code", { response, condition: data.condition });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    // Return 200 so NMI does not retry due to our own bug
    console.error("[nmi-webhook] Unhandled error:", err);
    return new Response(JSON.stringify({ received: true, internal_error: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
