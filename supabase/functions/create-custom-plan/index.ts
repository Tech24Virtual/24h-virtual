import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CUSTOM-PLAN] ${step}${detailsStr}`);
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

    // Authenticate admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    logStep("User authenticated", { userId: userData.user?.id });

    // Parse request body
    const { 
      leadId, 
      planType, 
      planName, 
      minuteRate, 
      fixedAmount, 
      minimumMonthly,
      notes,
      createInStripe = true,
    } = await req.json();
    
    logStep("Request parsed", { leadId, planType, planName, minuteRate, fixedAmount });

    if (!leadId || !planType || !planName) {
      throw new Error("leadId, planType, and planName are required");
    }

    // Validate plan type
    if (!['per_minute', 'fixed', 'hybrid'].includes(planType)) {
      throw new Error("planType must be 'per_minute', 'fixed', or 'hybrid'");
    }

    // Fetch lead details
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError) throw new Error(`Lead not found: ${leadError.message}`);
    logStep("Lead fetched", { name: lead.name, customerId: lead.stripe_customer_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let stripeProductId: string | null = null;
    let stripePriceId: string | null = null;

    if (createInStripe) {
      // Create Stripe product for custom plan
      const product = await stripe.products.create({
        name: `Custom Plan: ${planName}`,
        description: `Custom pricing for ${lead.name}`,
        metadata: {
          lead_id: leadId,
          plan_type: planType,
        },
      });
      stripeProductId = product.id;
      logStep("Created Stripe product", { productId: product.id });

      // Create price based on plan type
      if (planType === 'per_minute') {
        if (!minuteRate) throw new Error("minuteRate is required for per_minute plan");
        
        // Create metered price for per-minute billing
        const price = await stripe.prices.create({
          product: product.id,
          currency: 'usd',
          unit_amount: Math.round(minuteRate * 100), // Convert to cents
          recurring: {
            interval: 'month',
            usage_type: 'metered',
            aggregate_usage: 'sum',
          },
          nickname: `${planName} @ $${minuteRate}/min`,
        });
        stripePriceId = price.id;
        logStep("Created metered price", { priceId: price.id });
      } else if (planType === 'fixed') {
        if (!fixedAmount) throw new Error("fixedAmount is required for fixed plan");
        
        const price = await stripe.prices.create({
          product: product.id,
          currency: 'usd',
          unit_amount: Math.round(fixedAmount * 100),
          recurring: {
            interval: 'month',
          },
          nickname: `${planName} - $${fixedAmount}/mo`,
        });
        stripePriceId = price.id;
        logStep("Created fixed price", { priceId: price.id });
      } else if (planType === 'hybrid') {
        if (!fixedAmount || !minuteRate) {
          throw new Error("fixedAmount and minuteRate are required for hybrid plan");
        }
        
        // Create fixed base price
        const basePrice = await stripe.prices.create({
          product: product.id,
          currency: 'usd',
          unit_amount: Math.round(fixedAmount * 100),
          recurring: {
            interval: 'month',
          },
          nickname: `${planName} - Base $${fixedAmount}/mo`,
        });
        stripePriceId = basePrice.id;
        logStep("Created hybrid base price", { priceId: basePrice.id });
        
        // Also create metered price for usage
        const usagePrice = await stripe.prices.create({
          product: product.id,
          currency: 'usd',
          unit_amount: Math.round(minuteRate * 100),
          recurring: {
            interval: 'month',
            usage_type: 'metered',
            aggregate_usage: 'sum',
          },
          nickname: `${planName} - Usage $${minuteRate}/min`,
        });
        logStep("Created hybrid usage price", { priceId: usagePrice.id });
      }
    }

    // Deactivate any existing custom plans for this lead
    await supabaseClient
      .from("custom_plans")
      .update({ is_active: false })
      .eq("lead_id", leadId)
      .eq("is_active", true);

    // Create custom plan record
    const { data: customPlan, error: planError } = await supabaseClient
      .from("custom_plans")
      .insert({
        lead_id: leadId,
        plan_type: planType,
        plan_name: planName,
        minute_rate: minuteRate || null,
        fixed_amount: fixedAmount || null,
        minimum_monthly: minimumMonthly || null,
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
        is_active: true,
        notes,
      })
      .select()
      .single();

    if (planError) throw new Error(`Failed to create custom plan: ${planError.message}`);
    logStep("Created custom plan record", { planId: customPlan.id });

    // Update lead with custom plan info
    const { error: updateError } = await supabaseClient
      .from("leads")
      .update({
        custom_plan_enabled: true,
        custom_plan_name: planName,
        custom_minute_rate: minuteRate || null,
      })
      .eq("id", leadId);

    if (updateError) {
      logStep("Warning: Failed to update lead", { error: updateError.message });
    }

    return new Response(
      JSON.stringify({
        success: true,
        customPlan: {
          id: customPlan.id,
          planType,
          planName,
          minuteRate,
          fixedAmount,
          stripeProductId,
          stripePriceId,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
