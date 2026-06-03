import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-SUBSCRIPTION-ADDONS] ${step}${detailsStr}`);
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
    const { action, leadId, addonSlug, addonName, price, billingType, quantity = 1, stripePriceId, notes } = await req.json();
    logStep("Request parsed", { action, leadId, addonSlug });

    if (!leadId || !action) {
      throw new Error("leadId and action are required");
    }

    // Fetch lead details
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError) throw new Error(`Lead not found: ${leadError.message}`);
    logStep("Lead fetched", { name: lead.name, subscriptionId: lead.stripe_subscription_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Handle add action
    if (action === 'add') {
      if (!addonSlug || !addonName || !price || !billingType) {
        throw new Error("addonSlug, addonName, price, and billingType are required for add action");
      }

      let stripeSubscriptionItemId: string | null = null;

      // If recurring and has subscription, add to Stripe
      if (billingType === 'recurring' && lead.stripe_subscription_id && stripePriceId) {
        const subscriptionItem = await stripe.subscriptionItems.create({
          subscription: lead.stripe_subscription_id,
          price: stripePriceId,
          quantity,
        });
        stripeSubscriptionItemId = subscriptionItem.id;
        logStep("Added to Stripe subscription", { itemId: subscriptionItem.id });
      }

      // Create or update client_addons record
      const { data: existingAddon } = await supabaseClient
        .from("client_addons")
        .select("id")
        .eq("lead_id", leadId)
        .eq("addon_slug", addonSlug)
        .single();

      if (existingAddon) {
        // Reactivate existing addon
        const { error: updateError } = await supabaseClient
          .from("client_addons")
          .update({
            is_active: true,
            started_at: new Date().toISOString(),
            ended_at: null,
            price,
            quantity,
            stripe_subscription_item_id: stripeSubscriptionItemId,
            notes,
          })
          .eq("id", existingAddon.id);

        if (updateError) throw new Error(`Failed to update addon: ${updateError.message}`);
        logStep("Reactivated existing addon", { addonId: existingAddon.id });
      } else {
        // Create new addon record
        const { error: insertError } = await supabaseClient
          .from("client_addons")
          .insert({
            lead_id: leadId,
            addon_slug: addonSlug,
            addon_name: addonName,
            price,
            billing_type: billingType,
            quantity,
            is_active: true,
            stripe_subscription_item_id: stripeSubscriptionItemId,
            notes,
          });

        if (insertError) throw new Error(`Failed to create addon: ${insertError.message}`);
        logStep("Created new addon record");
      }

      return new Response(
        JSON.stringify({ success: true, action: 'added', addonSlug }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Handle remove action
    if (action === 'remove') {
      if (!addonSlug) {
        throw new Error("addonSlug is required for remove action");
      }

      // Get the addon record
      const { data: addon, error: addonError } = await supabaseClient
        .from("client_addons")
        .select("*")
        .eq("lead_id", leadId)
        .eq("addon_slug", addonSlug)
        .eq("is_active", true)
        .single();

      if (addonError) throw new Error(`Active addon not found: ${addonError.message}`);

      // If has Stripe subscription item, remove it
      if (addon.stripe_subscription_item_id) {
        try {
          await stripe.subscriptionItems.del(addon.stripe_subscription_item_id, {
            proration_behavior: 'create_prorations',
          });
          logStep("Removed from Stripe subscription", { itemId: addon.stripe_subscription_item_id });
        } catch (stripeError) {
          logStep("Warning: Failed to remove from Stripe", { error: stripeError });
        }
      }

      // Update addon record
      const { error: updateError } = await supabaseClient
        .from("client_addons")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq("id", addon.id);

      if (updateError) throw new Error(`Failed to update addon: ${updateError.message}`);
      logStep("Deactivated addon", { addonId: addon.id });

      return new Response(
        JSON.stringify({ success: true, action: 'removed', addonSlug }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Handle charge action (one-time)
    if (action === 'charge') {
      if (!addonSlug || !addonName || !price) {
        throw new Error("addonSlug, addonName, and price are required for charge action");
      }

      if (!lead.stripe_customer_id) {
        throw new Error("Lead has no Stripe customer ID");
      }

      // Create invoice item and invoice
      const invoiceItem = await stripe.invoiceItems.create({
        customer: lead.stripe_customer_id,
        amount: Math.round(price * 100), // Convert to cents
        currency: 'usd',
        description: addonName,
      });
      logStep("Created invoice item", { itemId: invoiceItem.id });

      const invoice = await stripe.invoices.create({
        customer: lead.stripe_customer_id,
        auto_advance: true, // Auto-finalize
        collection_method: 'charge_automatically',
      });
      logStep("Created invoice", { invoiceId: invoice.id });

      // Finalize and pay
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
      logStep("Finalized invoice", { status: finalizedInvoice.status });

      // Record in client_addons
      const { error: insertError } = await supabaseClient
        .from("client_addons")
        .insert({
          lead_id: leadId,
          addon_slug: addonSlug,
          addon_name: addonName,
          price,
          billing_type: 'one_time',
          quantity,
          is_active: false, // One-time charges aren't "active"
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          notes: `Invoice: ${invoice.id}`,
        });

      if (insertError) {
        logStep("Warning: Failed to record addon", { error: insertError.message });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'charged', 
          addonSlug,
          invoiceId: invoice.id,
          amount: price,
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
