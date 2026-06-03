import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Service overage rates
const serviceOverageRates: Record<string, number> = {
  'ai-receptionist': 0.75,
  'message-assistant': 1.75,
  'virtual-receptionist': 2.00,
  'virtual-secretary': 2.50,
};

// Service pricing tiers (price in dollars)
const servicePricingTiers: Record<string, Record<number, number>> = {
  'ai-receptionist': {
    50: 49, 100: 99, 250: 199, 500: 399, 750: 499,
    1000: 599, 1250: 699, 1500: 799, 2000: 999, 2500: 1299, 5000: 1999,
  },
  'message-assistant': {
    50: 89, 100: 149, 250: 349, 500: 649, 750: 949,
    1000: 1249, 1250: 1549, 1500: 1849, 2000: 2449, 2500: 2949, 5000: 5749,
  },
  'virtual-receptionist': {
    50: 149, 100: 249, 250: 499, 500: 799, 750: 1199,
    1000: 1499, 1250: 1799, 1500: 2199, 2000: 2799, 2500: 3299, 5000: 6499,
  },
  'virtual-secretary': {
    50: 199, 100: 299, 250: 699, 500: 1299, 750: 1799,
    1000: 1999, 1250: 2299, 1500: 2599, 2000: 3199, 2500: 3799, 5000: 7499,
  },
};

interface DynamicBillingResult {
  optimalTier: { minutes: number; price: number };
  originalTier: { minutes: number; price: number };
  totalCost: number;
  staticCost: number;
  savings: number;
  overageMinutes: number;
  overageCost: number;
}

function calculateDynamicBilling(
  serviceSlug: string,
  minutesUsed: number,
  originalPlanMinutes: number
): DynamicBillingResult | null {
  const tiers = servicePricingTiers[serviceSlug];
  const overageRate = serviceOverageRates[serviceSlug];

  if (!tiers || !overageRate) {
    return null;
  }

  const tierMinutes = Object.keys(tiers).map(Number).sort((a, b) => a - b);
  
  // Find original tier price
  const originalPrice = tiers[originalPlanMinutes] || tiers[tierMinutes[0]];
  const originalTierMinutes = tiers[originalPlanMinutes] ? originalPlanMinutes : tierMinutes[0];

  // Calculate optimal tier
  let optimalTier = { minutes: originalTierMinutes, price: originalPrice };
  let lowestCost = Infinity;

  for (const minutes of tierMinutes) {
    const price = tiers[minutes];
    const overageMinutes = Math.max(0, minutesUsed - minutes);
    const overageCost = overageMinutes * overageRate;
    const totalCost = price + overageCost;

    if (totalCost < lowestCost) {
      lowestCost = totalCost;
      optimalTier = { minutes, price };
    }
  }

  // Calculate static billing
  const staticOverageMinutes = Math.max(0, minutesUsed - originalTierMinutes);
  const staticOverageCost = staticOverageMinutes * overageRate;
  const staticCost = originalPrice + staticOverageCost;

  // Calculate optimal billing
  const optimalOverageMinutes = Math.max(0, minutesUsed - optimalTier.minutes);
  const optimalOverageCost = optimalOverageMinutes * overageRate;

  return {
    optimalTier,
    originalTier: { minutes: originalTierMinutes, price: originalPrice },
    totalCost: lowestCost,
    staticCost,
    savings: staticCost - lowestCost,
    overageMinutes: optimalOverageMinutes,
    overageCost: optimalOverageCost,
  };
}

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.text();
    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        throw new Error("Missing stripe-signature header");
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } else {
      // Parse without verification (for development)
      event = JSON.parse(body);
      logStep("Warning: Webhook signature not verified (no secret configured)");
    }

    logStep("Event type", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          subscriptionId: session.subscription,
        });

        // Get lead ID from metadata
        const leadId = session.metadata?.lead_id;
        if (leadId) {
          // Update lead with subscription info
          const { error } = await supabaseClient
            .from("leads")
            .update({
              stripe_subscription_id: session.subscription as string,
              subscription_started_at: new Date().toISOString(),
              pipeline_stage: "active",
            })
            .eq("id", leadId);

          if (error) {
            logStep("Error updating lead", { error: error.message });
          } else {
            logStep("Lead updated to active", { leadId });
          }
        }
        break;
      }

      case "invoice.created": {
        // Dynamic billing adjustment
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice created - checking for dynamic billing", {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
        });

        if (!invoice.subscription) {
          logStep("No subscription on invoice, skipping dynamic billing");
          break;
        }

        // Find lead by subscription ID
        const { data: leads } = await supabaseClient
          .from("leads")
          .select("*")
          .eq("stripe_subscription_id", invoice.subscription);

        if (!leads || leads.length === 0) {
          logStep("No lead found for subscription");
          break;
        }

        const lead = leads[0];
        logStep("Found lead for dynamic billing", {
          leadId: lead.id,
          serviceType: lead.service_type,
          planMinutes: lead.plan_minutes,
          dynamicBillingEnabled: lead.dynamic_billing_enabled,
        });

        // Check if dynamic billing is enabled
        if (!lead.dynamic_billing_enabled) {
          logStep("Dynamic billing disabled for this lead");
          break;
        }

        // Check if service is eligible
        if (!lead.service_type || !servicePricingTiers[lead.service_type]) {
          logStep("Service not eligible for dynamic billing");
          break;
        }

        // Get billing period from invoice
        const periodStart = invoice.period_start 
          ? new Date(invoice.period_start * 1000) 
          : new Date();
        const periodEnd = invoice.period_end 
          ? new Date(invoice.period_end * 1000) 
          : new Date();

        // Get usage for this period
        const { data: callLogs } = await supabaseClient
          .from("call_logs")
          .select("call_duration")
          .eq("client_id", lead.id)
          .gte("created_at", periodStart.toISOString())
          .lte("created_at", periodEnd.toISOString());

        const totalSeconds = callLogs?.reduce((sum, log) => sum + (log.call_duration || 0), 0) || 0;
        const minutesUsed = Math.ceil(totalSeconds / 60);
        logStep("Usage calculated for period", { minutesUsed, callCount: callLogs?.length || 0 });

        // Calculate dynamic billing
        const billingResult = calculateDynamicBilling(
          lead.service_type,
          minutesUsed,
          lead.plan_minutes || 100
        );

        if (!billingResult) {
          logStep("Could not calculate dynamic billing");
          break;
        }

        logStep("Dynamic billing calculated", {
          optimalTier: billingResult.optimalTier,
          staticCost: billingResult.staticCost,
          dynamicCost: billingResult.totalCost,
          savings: billingResult.savings,
        });

        // If optimal tier is different, add adjustment invoice item
        if (billingResult.savings > 0 && billingResult.optimalTier.minutes !== billingResult.originalTier.minutes) {
          try {
            // Calculate the adjustment amount (difference between optimal and original)
            const adjustmentAmount = (billingResult.totalCost - billingResult.staticCost) * 100; // Convert to cents

            // Only add adjustment if there's a meaningful difference
            if (Math.abs(adjustmentAmount) >= 100) { // At least $1 difference
              await stripe.invoiceItems.create({
                invoice: invoice.id,
                customer: invoice.customer as string,
                amount: Math.round(adjustmentAmount),
                currency: invoice.currency || 'usd',
                description: `Dynamic tier optimization: ${billingResult.originalTier.minutes} min → ${billingResult.optimalTier.minutes} min tier (saved $${billingResult.savings.toFixed(2)})`,
              });
              logStep("Added dynamic billing adjustment to invoice", {
                adjustmentAmount: adjustmentAmount / 100,
                savings: billingResult.savings,
              });
            }
          } catch (invoiceItemError) {
            logStep("Error adding invoice item", { error: String(invoiceItemError) });
          }
        }

        // Record the billing calculation in usage_records
        const { error: usageError } = await supabaseClient
          .from("usage_records")
          .upsert({
            lead_id: lead.id,
            client_id: lead.id,
            billing_period_start: periodStart.toISOString().split('T')[0],
            billing_period_end: periodEnd.toISOString().split('T')[0],
            minutes_used: minutesUsed,
            minutes_included: billingResult.optimalTier.minutes,
            overage_rate: serviceOverageRates[lead.service_type],
            original_tier_minutes: billingResult.originalTier.minutes,
            original_tier_price: billingResult.originalTier.price,
            optimal_tier_minutes: billingResult.optimalTier.minutes,
            optimal_tier_price: billingResult.optimalTier.price,
            static_cost: billingResult.staticCost,
            dynamic_cost: billingResult.totalCost,
            dynamic_savings: billingResult.savings,
            service_type: lead.service_type,
          }, {
            onConflict: 'lead_id,billing_period_start',
          });

        if (usageError) {
          logStep("Error recording usage", { error: usageError.message });
        } else {
          logStep("Usage record created/updated");
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
        });

        // Find lead by subscription ID and update
        const { data: leads } = await supabaseClient
          .from("leads")
          .select("id")
          .eq("stripe_subscription_id", subscription.id);

        if (leads && leads.length > 0) {
          const newStage = subscription.status === "active" ? "active" : 
                          subscription.status === "canceled" ? "churned" : null;
          
          if (newStage) {
            await supabaseClient
              .from("leads")
              .update({ pipeline_stage: newStage })
              .eq("stripe_subscription_id", subscription.id);
            logStep("Updated lead stage", { newStage });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        // Mark lead as churned
        await supabaseClient
          .from("leads")
          .update({ 
            pipeline_stage: "churned",
            stripe_subscription_id: null,
          })
          .eq("stripe_subscription_id", subscription.id);
        logStep("Lead marked as churned");
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice paid", { 
          invoiceId: invoice.id, 
          customerId: invoice.customer,
          amount: invoice.amount_paid,
        });

        // Update usage records as billed
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          const { data: leads } = await supabaseClient
            .from("leads")
            .select("id")
            .eq("stripe_subscription_id", subscriptionId);

          if (leads && leads.length > 0) {
            await supabaseClient
              .from("usage_records")
              .update({ 
                billed: true, 
                stripe_invoice_id: invoice.id,
              })
              .eq("lead_id", leads[0].id)
              .eq("billed", false);
            logStep("Marked usage records as billed", { leadId: leads[0].id });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { 
          invoiceId: invoice.id, 
          customerId: invoice.customer,
          attemptCount: invoice.attempt_count,
        });

        // Find lead by subscription or customer ID
        let leadId: string | null = null;
        
        if (invoice.subscription) {
          const { data: leads } = await supabaseClient
            .from("leads")
            .select("id")
            .eq("stripe_subscription_id", invoice.subscription);
          if (leads && leads.length > 0) leadId = leads[0].id;
        }

        if (leadId) {
          // Log the payment failure
          await supabaseClient.from("payment_failures").insert({
            lead_id: leadId,
            stripe_invoice_id: invoice.id,
            failure_code: "card_declined",
            failure_message: "Payment failed",
            attempt_number: invoice.attempt_count || 1,
            retry_scheduled_at: invoice.attempt_count && invoice.attempt_count < 3
              ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
              : null,
          });

          // Update lead
          await supabaseClient.from("leads").update({
            last_payment_status: "failed",
            payment_failure_count: (invoice.attempt_count || 1),
          }).eq("id", leadId);

          logStep("Payment failure recorded", { leadId });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
