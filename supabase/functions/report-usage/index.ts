import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REPORT-USAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { leadId, minutes, callId } = await req.json();
    if (!leadId || minutes === undefined) {
      throw new Error("leadId and minutes are required");
    }
    logStep("Request parsed", { leadId, minutes, callId });

    // Fetch lead to get Stripe customer ID
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("stripe_customer_id, stripe_subscription_id, service_type, plan_minutes")
      .eq("id", leadId)
      .single();

    if (leadError) throw new Error(`Lead not found: ${leadError.message}`);
    if (!lead.stripe_customer_id) throw new Error("Lead has no Stripe customer");
    if (!lead.stripe_subscription_id) throw new Error("Lead has no active subscription");
    logStep("Lead found", { customerId: lead.stripe_customer_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Map service type to meter event name
    const meterEventNames: Record<string, string> = {
      'ai-receptionist': 'ai_receptionist_minutes',
      'message-assistant': 'message_assistant_minutes',
      'virtual-receptionist': 'virtual_receptionist_minutes',
      'virtual-secretary': 'virtual_secretary_minutes',
    };

    const eventName = meterEventNames[lead.service_type || ''];
    if (!eventName) {
      logStep("Warning: No meter event name for service type, skipping meter event", { service_type: lead.service_type });
      // For now, just update local usage records without Stripe meter
    }

    // Get or create current billing period usage record
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Overage rates by service type
    const overageRates: Record<string, number> = {
      'ai-receptionist': 0.75,
      'message-assistant': 1.75,
      'virtual-receptionist': 2.00,
      'virtual-secretary': 2.50,
    };

    const { data: existingRecord, error: recordError } = await supabaseClient
      .from("usage_records")
      .select("*")
      .eq("lead_id", leadId)
      .gte("billing_period_start", periodStart.toISOString().split('T')[0])
      .lte("billing_period_end", periodEnd.toISOString().split('T')[0])
      .single();

    if (existingRecord) {
      // Update existing record
      const newMinutesUsed = (existingRecord.minutes_used || 0) + minutes;
      await supabaseClient
        .from("usage_records")
        .update({ 
          minutes_used: newMinutesUsed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id);
      logStep("Updated usage record", { recordId: existingRecord.id, newMinutesUsed });
    } else {
      // Create new record
      await supabaseClient
        .from("usage_records")
        .insert({
          lead_id: leadId,
          client_id: null, // Will be set when we have auth
          billing_period_start: periodStart.toISOString().split('T')[0],
          billing_period_end: periodEnd.toISOString().split('T')[0],
          minutes_included: lead.plan_minutes || 0,
          minutes_used: minutes,
          overage_rate: overageRates[lead.service_type || ''] || 0,
        });
      logStep("Created new usage record");
    }

    // Report to Stripe Meter (if we have meter events set up)
    // Note: This requires Stripe Billing Meters to be configured
    // For now, we'll skip this and rely on manual/cron-based reporting
    /*
    if (eventName) {
      try {
        await stripe.billing.meterEvents.create({
          event_name: eventName,
          payload: {
            value: minutes.toString(),
            stripe_customer_id: lead.stripe_customer_id,
          },
          identifier: callId || `${leadId}-${Date.now()}`,
          timestamp: Math.floor(Date.now() / 1000),
        });
        logStep("Reported to Stripe meter", { eventName, minutes });
      } catch (meterError) {
        logStep("Warning: Failed to report to Stripe meter", { error: meterError });
      }
    }
    */

    return new Response(
      JSON.stringify({ success: true, minutesReported: minutes }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
