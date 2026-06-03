import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateClientRequest {
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  serviceType: string;
  planMinutes: number;
  billingPeriod: "monthly" | "annual";
  country: "US" | "CA";
  billingCurrency: "usd" | "cad";
  sendPaymentLink?: boolean;
}

// USD Price mappings (from stripePriceMap.ts)
const usdPriceMap: Record<string, Record<number, string>> = {
  "ai-receptionist": {
    50: "price_1RWLUsBxL8Wz4rnaJ52ikdTb",
    100: "price_1RWLUqBxL8Wz4rnaSc8QyT5P",
    150: "price_1RWLUpBxL8Wz4rnaIjqVHpGe",
    250: "price_1RWLUoBxL8Wz4rnasNPx1WYL",
    500: "price_1RWLUnBxL8Wz4rnaAdKyQzJD",
    750: "price_1RWLUlBxL8Wz4rnaJmCfcVTd",
    1000: "price_1RWLUkBxL8Wz4rnaz5iVY9mP",
    2000: "price_1RWLUjBxL8Wz4rnaVS0rQkbl",
    3000: "price_1RWLUhBxL8Wz4rna0WR5WfN6",
    4000: "price_1RWLUgBxL8Wz4rnaQBOHhqgU",
    5000: "price_1RWLUfBxL8Wz4rnaGSqRQPqN",
  },
  "message-assistant": {
    50: "price_1RWLVCBxL8Wz4rnaCODbVxWn",
    100: "price_1RWLVBBxL8Wz4rnaEyLH5b61",
    150: "price_1RWLVABxL8Wz4rnaEMFfFy1F",
    250: "price_1RWLVABxL8Wz4rnaNdxO7a4L",
    500: "price_1RWLV9BxL8Wz4rna2F9pSjJj",
    750: "price_1RWLV7BxL8Wz4rna4TLRIRp3",
    1000: "price_1RWLV6BxL8Wz4rnakTxA0xsJ",
    2000: "price_1RWLV6BxL8Wz4rnaovFCGbVB",
    3000: "price_1RWLV4BxL8Wz4rnaYD9qbCZu",
    4000: "price_1RWLV3BxL8Wz4rnapfE4gwO1",
    5000: "price_1RWLV2BxL8Wz4rna6oOQFkrZ",
  },
  "virtual-receptionist": {
    50: "price_1RWLTdBxL8Wz4rnaXftWLJba",
    100: "price_1RWLTcBxL8Wz4rnac4FKQ1Kp",
    150: "price_1RWLTbBxL8Wz4rnaLPAXQb2F",
    250: "price_1RWLTaBxL8Wz4rnaKifMSgVY",
    500: "price_1RWLTZBxL8Wz4rna8ZJpnzNx",
    750: "price_1RWLTYBxL8Wz4rnaJPB4Fxl7",
    1000: "price_1RWLTWBxL8Wz4rnaYHBCT5u1",
    2000: "price_1RWLTVBxL8Wz4rna55kgq2Fe",
    3000: "price_1RWLTUBxL8Wz4rnaXbGEOYbl",
    4000: "price_1RWLTTBxL8Wz4rnafSB03eeW",
    5000: "price_1RWLTRBxL8Wz4rnaIe3oYXst",
  },
  "virtual-secretary": {
    50: "price_1RWLVfBxL8Wz4rnaVd8cDfrr",
    100: "price_1RWLVeBxL8Wz4rnaKhEvIAGe",
    150: "price_1RWLVdBxL8Wz4rnaXu1FGy7N",
    250: "price_1RWLVbBxL8Wz4rnaH1Y58Kfq",
    500: "price_1RWLVaBxL8Wz4rnaPkJJTGCo",
    750: "price_1RWLVZBxL8Wz4rnaLPt1FhQQ",
    1000: "price_1RWLVYBxL8Wz4rnaZWU3RCJG",
    2000: "price_1RWLVWBxL8Wz4rnasKPQrwwj",
    3000: "price_1RWLVVBxL8Wz4rna1XpbYm7Q",
    4000: "price_1RWLVUBxL8Wz4rnawcCwJAqh",
    5000: "price_1RWLVTBxL8Wz4rnaVwVP1oGH",
  },
};

// CAD Price mappings (from stripePriceMapCAD.ts)
const cadPriceMap: Record<string, Record<number, string>> = {
  "ai-receptionist": {
    50: "price_1RWLz5BxL8Wz4rnaFa2b9HqC",
    100: "price_1RWLz5BxL8Wz4rnaYO6AQ0Y5",
    150: "price_1RWLz5BxL8Wz4rnaCbhd0bLT",
    250: "price_1RWLz5BxL8Wz4rnaV2cxYN1S",
    500: "price_1RWLz5BxL8Wz4rnaVJzFmAqy",
    750: "price_1RWLz5BxL8Wz4rnapB0IqYZl",
    1000: "price_1RWLz5BxL8Wz4rnaXv2X8mDq",
    2000: "price_1RWLz5BxL8Wz4rnaLpKmG5H9",
    3000: "price_1RWLz5BxL8Wz4rnaaF6vT8qK",
    4000: "price_1RWLz5BxL8Wz4rna7YdKn3Wm",
    5000: "price_1RWLz5BxL8Wz4rnaMk9R4fJs",
  },
  "message-assistant": {
    50: "price_1RWM0zBxL8Wz4rnaN1xP7qGc",
    100: "price_1RWM0zBxL8Wz4rnaC5qV8kLt",
    150: "price_1RWM0zBxL8Wz4rnaYT3bHmQj",
    250: "price_1RWM0zBxL8Wz4rnaR8gD5pNw",
    500: "price_1RWM0zBxL8Wz4rnaZ2sE9qRa",
    750: "price_1RWM0zBxL8Wz4rnaB4tF7rTn",
    1000: "price_1RWM0zBxL8Wz4rnaJ6vH3sVx",
    2000: "price_1RWM0zBxL8Wz4rnaL8xK5uXz",
    3000: "price_1RWM0zBxL8Wz4rnaN9yM7vZb",
    4000: "price_1RWM0zBxL8Wz4rnaP0zN8wAd",
    5000: "price_1RWM0zBxL8Wz4rnaR2aP9xCf",
  },
  "virtual-receptionist": {
    50: "price_1RWLxGBxL8Wz4rnaT4bQ0yCh",
    100: "price_1RWLxGBxL8Wz4rnaV6cR1zDj",
    150: "price_1RWLxGBxL8Wz4rnaX8dS2aEk",
    250: "price_1RWLxGBxL8Wz4rnaZ0eT3bFl",
    500: "price_1RWLxGBxL8Wz4rnab2fU4cGm",
    750: "price_1RWLxGBxL8Wz4rnad4gV5dHn",
    1000: "price_1RWLxGBxL8Wz4rnaf6hW6eIo",
    2000: "price_1RWLxGBxL8Wz4rnah8iX7fJp",
    3000: "price_1RWLxGBxL8Wz4rnaj0jY8gKq",
    4000: "price_1RWLxGBxL8Wz4rnal2kZ9hLr",
    5000: "price_1RWLxGBxL8Wz4rnan4la0iMs",
  },
  "virtual-secretary": {
    50: "price_1RWM2tBxL8Wz4rnap6mb1jNt",
    100: "price_1RWM2tBxL8Wz4rnar8nc2kOu",
    150: "price_1RWM2tBxL8Wz4rnat0od3lPv",
    250: "price_1RWM2tBxL8Wz4rnav2pe4mQw",
    500: "price_1RWM2tBxL8Wz4rnax4qf5nRx",
    750: "price_1RWM2tBxL8Wz4rnaz6rg6oSy",
    1000: "price_1RWM2tBxL8Wz4rnab8sh7pTz",
    2000: "price_1RWM2tBxL8Wz4rnad0ti8qUa",
    3000: "price_1RWM2tBxL8Wz4rnaf2uj9rVb",
    4000: "price_1RWM2tBxL8Wz4rnah4vk0sWc",
    5000: "price_1RWM2tBxL8Wz4rnaj6wl1tXd",
  },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CLIENT] ${step}${detailsStr}`);
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
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Parse request body
    const body: CreateClientRequest = await req.json();
    logStep("Request received", { email: body.email, service: body.serviceType });

    // Validate required fields
    if (!body.name || !body.email) {
      throw new Error("Name and email are required");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if Stripe customer already exists
    const existingCustomers = await stripe.customers.list({
      email: body.email,
      limit: 1,
    });

    let stripeCustomerId: string;

    if (existingCustomers.data.length > 0) {
      stripeCustomerId = existingCustomers.data[0].id;
      logStep("Found existing Stripe customer", { customerId: stripeCustomerId });
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        name: body.name,
        email: body.email,
        phone: body.phone || undefined,
        metadata: {
          company: body.company || "",
          country: body.country,
          source: "admin_dashboard",
        },
      });
      stripeCustomerId = customer.id;
      logStep("Created new Stripe customer", { customerId: stripeCustomerId });
    }

    // Create lead record in database
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .insert({
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        company: body.company || null,
        source: "admin_dashboard",
        status: "new",
        pipeline_stage: "ready_for_billing",
        service_type: body.serviceType,
        plan_minutes: body.planMinutes,
        billing_period: body.billingPeriod,
        country: body.country,
        billing_currency: body.billingCurrency,
        stripe_customer_id: stripeCustomerId,
        dynamic_billing_enabled: true,
        onboarding_checklist: {
          consultation_completed: false,
          call_flows_created: false,
          scripts_written: false,
          dispositions_configured: false,
          post_call_flow_setup: false,
          forwarding_number_assigned: false,
          test_call_completed: false,
        },
      })
      .select()
      .single();

    if (leadError) {
      logStep("Error creating lead", { error: leadError });
      throw new Error(`Failed to create lead: ${leadError.message}`);
    }

    logStep("Lead created", { leadId: lead.id });

    // Update Stripe customer with lead ID
    await stripe.customers.update(stripeCustomerId, {
      metadata: {
        lead_id: lead.id,
        company: body.company || "",
        country: body.country,
        source: "admin_dashboard",
      },
    });

    let paymentLink: string | null = null;

    // Optionally create and send payment link
    if (body.sendPaymentLink) {
      logStep("Creating payment link");

      // Get the correct price ID based on currency
      const priceMap =
        body.billingCurrency === "cad" ? cadPriceMap : usdPriceMap;
      const priceId = priceMap[body.serviceType]?.[body.planMinutes];

      if (!priceId) {
        throw new Error(
          `No price found for ${body.serviceType} at ${body.planMinutes} minutes in ${body.billingCurrency.toUpperCase()}`
        );
      }

      logStep("Found price ID", { priceId, currency: body.billingCurrency });

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.get("origin") || "https://24hv.io"}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin") || "https://24hv.io"}/pricing`,
        metadata: {
          lead_id: lead.id,
          billing_period: body.billingPeriod,
        },
        subscription_data: {
          metadata: {
            lead_id: lead.id,
            service_type: body.serviceType,
            billing_period: body.billingPeriod,
          },
        },
      });

      paymentLink = session.url;
      logStep("Created checkout session", { sessionId: session.id });

      // Update lead with payment link sent timestamp
      await supabaseAdmin
        .from("leads")
        .update({ payment_link_sent_at: new Date().toISOString() })
        .eq("id", lead.id);
    }

    // Initialize direct-client onboarding (handoff + items + internal intake).
    // Failures are non-fatal: lead/Stripe customer remain valid; admins can
    // retry from AdminLeadDetail.
    const warnings: string[] = [];
    try {
      const initResult = await applyClientActivationEffects(supabaseAdmin, {
        leadId: lead.id,
        leadUserId: null,
        leadSnapshot: {
          client_name_snapshot: body.name,
          client_name: body.name,
          email: body.email,
          phone: body.phone ?? null,
          company: body.company ?? null,
          service_type: body.serviceType,
          plan_minutes: body.planMinutes,
          country: body.country,
          billing_currency: body.billingCurrency,
        },
      });
      logStep("Onboarding initialized", {
        handoffId: initResult.handoffId,
        intakeId: initResult.intakeId,
        alreadyExisted: initResult.alreadyExisted,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logStep("Onboarding init failed (non-fatal)", { error: msg });
      warnings.push("onboarding_init_failed");
    }

    const response = {
      success: true,
      leadId: lead.id,
      stripeCustomerId,
      paymentLink,
      warnings,
    };

    logStep("Response", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
