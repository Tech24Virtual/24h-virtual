import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Price mapping from pricing data to Stripe price IDs
const PRICE_MAP: Record<string, { priceId: string; productId: string; minutes: number }> = {
  "ai-receptionist-250": { 
    priceId: "price_1SwpYnJ7jKy5oKiLu0ysfWuA", 
    productId: "prod_TuesgO0Q8KFBly",
    minutes: 250 
  },
  "ai-receptionist-500": { 
    priceId: "price_1SwpYoJ7jKy5oKiL3GVTUvTc", 
    productId: "prod_Tues6Muq0MU6Jw",
    minutes: 500 
  },
  "virtual-receptionist-250": { 
    priceId: "price_1SwpYpJ7jKy5oKiLmXszjYL7", 
    productId: "prod_Tues2rtELVTLjU",
    minutes: 250 
  },
  "virtual-receptionist-500": { 
    priceId: "price_1SwpYqJ7jKy5oKiLvHCgxfti", 
    productId: "prod_TuesERT5n9R32L",
    minutes: 500 
  },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { planId } = await req.json();
    if (!planId) throw new Error("Plan ID is required");
    logStep("Plan ID received", { planId });

    const priceInfo = PRICE_MAP[planId];
    if (!priceInfo) throw new Error(`Invalid plan ID: ${planId}`);
    logStep("Price info found", priceInfo);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceInfo.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/client-dashboard?subscription=success`,
      cancel_url: `${origin}/pricing?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        minutes: priceInfo.minutes.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
