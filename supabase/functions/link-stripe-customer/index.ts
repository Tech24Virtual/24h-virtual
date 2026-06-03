import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LINK-STRIPE-CUSTOMER] ${step}${detailsStr}`);
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
    const { email, leadId, createLead, action = 'search' } = await req.json();
    logStep("Request parsed", { email, leadId, createLead, action });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Search for customer by email
    if (action === 'search') {
      if (!email) throw new Error("Email is required for search");
      
      const customers = await stripe.customers.list({ email, limit: 1 });
      
      if (customers.data.length === 0) {
        return new Response(
          JSON.stringify({ found: false, customer: null, subscriptions: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const customer = customers.data[0];
      logStep("Customer found", { customerId: customer.id });

      // Get active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        expand: ['data.items.data.price.product'],
      });

      const subscriptionDetails = subscriptions.data.map((sub: Stripe.Subscription) => ({
        id: sub.id,
        status: sub.status,
        currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        items: sub.items.data.map((item: Stripe.SubscriptionItem) => ({
          id: item.id,
          priceId: item.price.id,
          productId: typeof item.price.product === 'string' ? item.price.product : (item.price.product as Stripe.Product)?.id,
          productName: typeof item.price.product === 'object' ? (item.price.product as Stripe.Product)?.name : null,
          amount: item.price.unit_amount,
          interval: item.price.recurring?.interval,
        })),
      }));

      return new Response(
        JSON.stringify({
          found: true,
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            created: new Date(customer.created * 1000).toISOString(),
          },
          subscriptions: subscriptionDetails,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Link customer to lead
    if (action === 'link') {
      if (!email) throw new Error("Email is required");

      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length === 0) {
        throw new Error("No Stripe customer found with this email");
      }

      const customer = customers.data[0];
      logStep("Customer found for linking", { customerId: customer.id });

      // Get active subscription details
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1,
      });

      let finalLeadId = leadId;

      if (createLead) {
        // Create new lead from Stripe customer data
        const { data: newLead, error: createError } = await supabaseClient
          .from("leads")
          .insert({
            name: customer.name || email.split('@')[0],
            email: customer.email || email,
            company: customer.metadata?.company || null,
            stripe_customer_id: customer.id,
            status: subscriptions.data.length > 0 ? 'active' : 'new',
            pipeline_stage: subscriptions.data.length > 0 ? 'active_client' : 'new',
            source: 'stripe_import',
          })
          .select()
          .single();

        if (createError) throw new Error(`Failed to create lead: ${createError.message}`);
        finalLeadId = newLead.id;
        logStep("New lead created", { leadId: finalLeadId });
      } else if (leadId) {
        // Update existing lead with Stripe customer ID
        const { error: updateError } = await supabaseClient
          .from("leads")
          .update({
            stripe_customer_id: customer.id,
            status: subscriptions.data.length > 0 ? 'active' : 'new',
          })
          .eq("id", leadId);

        if (updateError) throw new Error(`Failed to update lead: ${updateError.message}`);
        logStep("Lead updated", { leadId });
      }

      // If there's an active subscription, update lead with subscription details
      if (subscriptions.data.length > 0 && finalLeadId) {
        const sub = subscriptions.data[0];
        const { error: subUpdateError } = await supabaseClient
          .from("leads")
          .update({
            stripe_subscription_id: sub.id,
            subscription_started_at: new Date(sub.start_date * 1000).toISOString(),
          })
          .eq("id", finalLeadId);

        if (subUpdateError) {
          logStep("Warning: Failed to update subscription info", { error: subUpdateError.message });
        }
      }

      return new Response(
        JSON.stringify({
          linked: true,
          leadId: finalLeadId,
          customerId: customer.id,
          hasActiveSubscription: subscriptions.data.length > 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
