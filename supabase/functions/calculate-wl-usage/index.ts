import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALC-WL-USAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Missing config" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const partnerId = body.partner_id || null;

    // Determine billing period (current month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    logStep("Calculating usage", { periodStart, periodEnd, partnerId });

    // Get partners to process
    let partnersQuery = supabase.from("white_label_partners").select("id").eq("status", "active");
    if (partnerId) partnersQuery = partnersQuery.eq("id", partnerId);
    const { data: partners } = await partnersQuery;

    if (!partners || partners.length === 0) {
      return new Response(JSON.stringify({ message: "No active partners found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const results = [];

    for (const partner of partners) {
      logStep("Processing partner", { partnerId: partner.id });

      // Get wholesale pricing
      const { data: pricing } = await supabase
        .from("wl_wholesale_pricing")
        .select("*")
        .eq("partner_id", partner.id)
        .maybeSingle();

      if (!pricing) {
        logStep("No pricing config for partner, skipping", { partnerId: partner.id });
        continue;
      }

      // Get active clients
      const { data: clients } = await supabase
        .from("white_label_clients")
        .select("id, service_type, language_support, num_campaigns")
        .eq("partner_id", partner.id)
        .eq("status", "active");

      const activeClientCount = clients?.length || 0;

      // Get total minutes for all clients this period
      const { data: allCalls } = await supabase
        .from("wl_call_logs")
        .select("wl_client_id, billable_minutes")
        .eq("partner_id", partner.id)
        .gte("call_date", periodStart)
        .lte("call_date", periodEnd);

      // Aggregate minutes per client
      const clientMinutes: Record<string, number> = {};
      const clientCalls: Record<string, number> = {};
      let totalMinutesAllClients = 0;

      for (const call of allCalls || []) {
        const cid = call.wl_client_id;
        const mins = Number(call.billable_minutes) || 0;
        clientMinutes[cid] = (clientMinutes[cid] || 0) + mins;
        clientCalls[cid] = (clientCalls[cid] || 0) + 1;
        totalMinutesAllClients += mins;
      }

      // Determine base rate: volume discount or tiered
      let baseRate: number;
      let volumeDiscountActive = false;
      let volumeDiscountRate: number | null = null;

      const meetsMinuteThreshold = totalMinutesAllClients >= (pricing.volume_discount_min_minutes || 10000);

      if (meetsMinuteThreshold && pricing.volume_discount_fixed_rate) {
        baseRate = Number(pricing.volume_discount_fixed_rate);
        volumeDiscountActive = true;
        volumeDiscountRate = baseRate;
        logStep("Volume discount active", { baseRate, totalMinutes: totalMinutesAllClients, activeClients: activeClientCount });
      } else {
        // Tiered rate based on total partner volume
        if (totalMinutesAllClients < 100) baseRate = Number(pricing.tier_under_100_rate);
        else if (totalMinutesAllClients < 500) baseRate = Number(pricing.tier_under_500_rate);
        else if (totalMinutesAllClients < 1000) baseRate = Number(pricing.tier_under_1000_rate);
        else baseRate = Number(pricing.tier_over_1000_rate);
        logStep("Tiered rate applied", { baseRate, totalMinutes: totalMinutesAllClients });
      }

      // Calculate per-client usage records
      let totalWholesaleCost = 0;
      let totalCallsAllClients = 0;
      let totalCampaignFees = 0;

      for (const client of clients || []) {
        const mins = clientMinutes[client.id] || 0;
        const calls = clientCalls[client.id] || 0;
        totalCallsAllClients += calls;

        // Calculate surcharges
        let secretarySurcharge = 0;
        let languageSurcharge = 0;

        if (client.service_type === "virtual_secretary") {
          secretarySurcharge = Number(pricing.secretary_surcharge) || 0.05;
        }

        const lang = client.language_support;
        if (lang === "spanish") languageSurcharge = Number(pricing.spanish_surcharge) || 0.05;
        else if (lang === "french") languageSurcharge = Number(pricing.french_surcharge) || 0.05;
        else if (lang === "both") languageSurcharge = Number(pricing.both_languages_surcharge) || 0.07;

        const effectiveRate = baseRate + secretarySurcharge + languageSurcharge;
        const wholesaleCost = mins * effectiveRate;
        totalWholesaleCost += wholesaleCost;

        // Campaign fees
        const numCampaigns = client.num_campaigns || 1;
        const campaignFee = Number(pricing.campaign_setup_fee) + (Math.max(0, numCampaigns - 1) * Number(pricing.additional_campaign_fee));
        totalCampaignFees += campaignFee;

        // Upsert usage record
        await supabase
          .from("wl_usage_records")
          .upsert({
            partner_id: partner.id,
            wl_client_id: client.id,
            billing_period_start: periodStart,
            billing_period_end: periodEnd,
            total_minutes_used: mins,
            total_calls: calls,
            base_rate_applied: baseRate,
            secretary_surcharge_applied: secretarySurcharge,
            language_surcharge_applied: languageSurcharge,
            effective_rate: effectiveRate,
            wholesale_cost: wholesaleCost,
          }, { onConflict: "partner_id,wl_client_id,billing_period_start" });
      }

      // Upsert partner usage summary
      await supabase
        .from("wl_partner_usage_summary")
        .upsert({
          partner_id: partner.id,
          billing_period_start: periodStart,
          billing_period_end: periodEnd,
          total_minutes_all_clients: totalMinutesAllClients,
          total_calls_all_clients: totalCallsAllClients,
          active_client_count: activeClientCount,
          volume_discount_active: volumeDiscountActive,
          volume_discount_rate: volumeDiscountRate,
          total_campaign_fees: totalCampaignFees,
          total_wholesale_cost: totalWholesaleCost,
        }, { onConflict: "partner_id,billing_period_start" });

      results.push({
        partner_id: partner.id,
        total_minutes: totalMinutesAllClients,
        total_calls: totalCallsAllClients,
        active_clients: activeClientCount,
        volume_discount_active: volumeDiscountActive,
        base_rate: baseRate,
        total_wholesale_cost: totalWholesaleCost,
        total_campaign_fees: totalCampaignFees,
      });

      logStep("Partner usage calculated", results[results.length - 1]);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
