import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-INVOICE] ${step}${detailsStr}`);
};

// Invoice terms to days mapping
const invoiceTermsDays: Record<string, number> = {
  'net_7': 7,
  'net_15': 15,
  'net_20': 20,
  'net_25': 25,
  'net_30': 30,
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
    const { leadId, lineItems, description } = await req.json();
    if (!leadId) throw new Error("leadId is required");
    logStep("Request parsed", { leadId, lineItemCount: lineItems?.length });

    // Fetch lead details
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError) throw new Error(`Lead not found: ${leadError.message}`);
    logStep("Lead fetched", { 
      name: lead.name, 
      paymentMethodType: lead.payment_method_type,
      invoiceTerms: lead.invoice_terms,
      currency: lead.billing_currency,
    });

    // Validate payment method type
    if (lead.payment_method_type !== 'invoice') {
      throw new Error("Lead is not set up for invoice billing. Update payment_method_type to 'invoice'.");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create Stripe customer
    let customerId = lead.stripe_customer_id;
    
    if (!customerId) {
      const customers = await stripe.customers.list({ email: lead.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: lead.email,
          name: lead.name,
          metadata: {
            lead_id: leadId,
            company: lead.company || '',
          },
        });
        customerId = customer.id;
      }

      // Update lead with customer ID
      await supabaseClient
        .from("leads")
        .update({ stripe_customer_id: customerId })
        .eq("id", leadId);
      
      logStep("Stripe customer created/found", { customerId });
    }

    // Determine currency
    const currency = lead.billing_currency || (lead.country === 'CA' ? 'cad' : 'usd');

    // Determine days until due
    const daysUntilDue = invoiceTermsDays[lead.invoice_terms] || 15;
    logStep("Invoice terms", { terms: lead.invoice_terms, daysUntilDue });

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      currency,
      collection_method: 'send_invoice',
      days_until_due: daysUntilDue,
      description: description || `Invoice for ${lead.company || lead.name}`,
      metadata: {
        lead_id: leadId,
        service_type: lead.service_type || '',
        billing_period: lead.billing_period || 'monthly',
        billing_currency: currency,
      },
    });
    logStep("Invoice created", { invoiceId: invoice.id });

    // Add line items
    if (lineItems && Array.isArray(lineItems)) {
      for (const item of lineItems) {
        if (item.price_id) {
          // Use existing price
          await stripe.invoiceItems.create({
            customer: customerId,
            invoice: invoice.id,
            price: item.price_id,
            quantity: item.quantity || 1,
          });
        } else if (item.amount && item.description) {
          // Create one-off line item
          await stripe.invoiceItems.create({
            customer: customerId,
            invoice: invoice.id,
            amount: Math.round(item.amount * 100), // Convert to cents
            currency,
            description: item.description,
          });
        }
      }
      logStep("Line items added", { count: lineItems.length });
    }

    // Finalize invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    logStep("Invoice finalized", { 
      invoiceId: finalizedInvoice.id, 
      hostedUrl: finalizedInvoice.hosted_invoice_url 
    });

    // Update lead
    await supabaseClient
      .from("leads")
      .update({
        payment_link_sent_at: new Date().toISOString(),
        pipeline_stage: 'ready_for_billing',
      })
      .eq("id", leadId);

    return new Response(JSON.stringify({
      invoice_id: finalizedInvoice.id,
      hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
      invoice_pdf: finalizedInvoice.invoice_pdf,
      amount_due: finalizedInvoice.amount_due / 100,
      currency,
      due_date: finalizedInvoice.due_date 
        ? new Date(finalizedInvoice.due_date * 1000).toISOString() 
        : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
