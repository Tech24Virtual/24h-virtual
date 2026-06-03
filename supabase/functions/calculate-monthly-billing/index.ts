import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-BILLING] ${step}${detailsStr}`);
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

interface TierCalculation {
  minutes: number;
  price: number;
  overageMinutes: number;
  overageCost: number;
  totalCost: number;
  discountedPrice?: number;
  annualDiscount?: number;
}

interface DynamicBillingResult {
  serviceSlug: string;
  serviceName: string;
  isEligible: boolean;
  tiersEvaluated: number;
  minutesUsed: number;
  originalTier: { minutes: number; price: number };
  optimalTier: { minutes: number; price: number };
  breakdown: {
    baseCost: number;
    overageMinutes: number;
    overageRate: number;
    overageCost: number;
    totalCost: number;
    annualDiscount: number; // New field for annual discount
  };
  staticBilling: {
    baseCost: number;
    overageMinutes: number;
    overageCost: number;
    totalCost: number;
  };
  savings: number;
  savingsPercentage: number;
  isAnnual: boolean; // New field to indicate annual billing
}

function calculateDynamicBilling(
  serviceSlug: string,
  minutesUsed: number,
  originalPlanMinutes: number,
  isAnnual: boolean = false
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
  let optimalTier: TierCalculation | null = null;

  // Annual discount is 10% off base tier price ONLY (not overages)
  const ANNUAL_DISCOUNT_RATE = 0.10;

  for (const minutes of tierMinutes) {
    const price = tiers[minutes];
    const overageMinutes = Math.max(0, minutesUsed - minutes);
    const overageCost = overageMinutes * overageRate;
    
    // Apply annual discount to base price only
    const discountedBasePrice = isAnnual ? price * (1 - ANNUAL_DISCOUNT_RATE) : price;
    const annualDiscount = isAnnual ? price * ANNUAL_DISCOUNT_RATE : 0;
    const totalCost = discountedBasePrice + overageCost; // Overage is NOT discounted

    if (!optimalTier || totalCost < optimalTier.totalCost) {
      optimalTier = { 
        minutes, 
        price, // Original price before discount
        overageMinutes, 
        overageCost, 
        totalCost,
        discountedPrice: discountedBasePrice,
        annualDiscount 
      };
    }
  }

  if (!optimalTier) {
    return null;
  }

  // Calculate static billing (what they'd pay staying on original tier)
  const staticBasePrice = originalPrice;
  const staticDiscountedPrice = isAnnual ? originalPrice * (1 - ANNUAL_DISCOUNT_RATE) : originalPrice;
  const staticOverageMinutes = Math.max(0, minutesUsed - originalTierMinutes);
  const staticOverageCost = staticOverageMinutes * overageRate;
  const staticTotalCost = staticDiscountedPrice + staticOverageCost;

  const savings = staticTotalCost - optimalTier.totalCost;
  const savingsPercentage = staticTotalCost > 0 ? (savings / staticTotalCost) * 100 : 0;

  const serviceNames: Record<string, string> = {
    'ai-receptionist': 'AI Receptionist',
    'message-assistant': 'Message Assistant',
    'virtual-receptionist': 'Virtual Receptionist',
    'virtual-secretary': 'Virtual Secretary',
  };

  return {
    serviceSlug,
    serviceName: serviceNames[serviceSlug] || serviceSlug,
    isEligible: true,
    tiersEvaluated: tierMinutes.length,
    minutesUsed,
    originalTier: { minutes: originalTierMinutes, price: originalPrice },
    optimalTier: { minutes: optimalTier.minutes, price: optimalTier.price },
    breakdown: {
      baseCost: optimalTier.discountedPrice || optimalTier.price,
      overageMinutes: optimalTier.overageMinutes,
      overageRate,
      overageCost: optimalTier.overageCost,
      totalCost: optimalTier.totalCost,
      annualDiscount: optimalTier.annualDiscount || 0,
    },
    staticBilling: {
      baseCost: staticDiscountedPrice,
      overageMinutes: staticOverageMinutes,
      overageCost: staticOverageCost,
      totalCost: staticTotalCost,
    },
    savings,
    savingsPercentage,
    isAnnual,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    logStep("User authenticated", { userId: userData.user?.id });

    // Parse request
    const { leadId, billingPeriodStart, billingPeriodEnd } = await req.json();
    if (!leadId) throw new Error("leadId is required");

    // Fetch lead details
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError) throw new Error(`Lead not found: ${leadError.message}`);
    logStep("Lead fetched", { 
      name: lead.name, 
      serviceType: lead.service_type, 
      planMinutes: lead.plan_minutes 
    });

    if (!lead.service_type || !lead.plan_minutes) {
      throw new Error("Lead is missing service type or plan minutes");
    }

    // Check if service is eligible for dynamic billing
    if (!servicePricingTiers[lead.service_type]) {
      return new Response(
        JSON.stringify({ 
          error: "Service not eligible for dynamic billing",
          serviceType: lead.service_type,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Determine billing period
    const now = new Date();
    const periodStart = billingPeriodStart 
      ? new Date(billingPeriodStart) 
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = billingPeriodEnd 
      ? new Date(billingPeriodEnd) 
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    logStep("Billing period", { 
      start: periodStart.toISOString(), 
      end: periodEnd.toISOString() 
    });

    // Get usage from call logs (sum call durations in seconds, convert to minutes)
    const { data: callLogs, error: callError } = await supabaseClient
      .from("call_logs")
      .select("call_duration")
      .eq("client_id", leadId)
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString());

    if (callError) {
      logStep("Warning: Could not fetch call logs", { error: callError.message });
    }

    const totalSeconds = callLogs?.reduce((sum, log) => sum + (log.call_duration || 0), 0) || 0;
    const minutesUsed = Math.ceil(totalSeconds / 60);
    logStep("Usage calculated", { totalSeconds, minutesUsed, callCount: callLogs?.length || 0 });

    // Calculate dynamic billing with annual discount if applicable
    const isAnnualBilling = lead.billing_period === 'annual';
    const billingResult = calculateDynamicBilling(
      lead.service_type,
      minutesUsed,
      lead.plan_minutes,
      isAnnualBilling
    );

    logStep("Billing mode", { isAnnual: isAnnualBilling, billingPeriod: lead.billing_period });

    if (!billingResult) {
      throw new Error("Failed to calculate dynamic billing");
    }

    logStep("Billing calculated", {
      optimalTier: billingResult.optimalTier,
      totalCost: billingResult.breakdown.totalCost,
      savings: billingResult.savings,
    });

    return new Response(
      JSON.stringify({
        leadId,
        billingPeriod: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        ...billingResult,
      }),
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
