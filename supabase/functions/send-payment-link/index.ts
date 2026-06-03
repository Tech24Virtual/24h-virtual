import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PAYMENT-LINK] ${step}${detailsStr}`);
};

// Service type display names
const serviceDisplayNames: Record<string, string> = {
  'ai-receptionist': 'AI Receptionist',
  'message-assistant': 'Message Assistant',
  'virtual-receptionist': 'Virtual Receptionist',
  'virtual-secretary': 'Virtual Secretary',
};

// USD Price Mappings
const priceMappingsUSD: Record<string, Record<number, { basePrice: string }>> = {
  'ai-receptionist': {
    50: { basePrice: 'price_1SwqIDJ7jKy5oKiLP9tkjPsA' },
    100: { basePrice: 'price_1SwqIEJ7jKy5oKiLonqWDLdj' },
    250: { basePrice: 'price_1SwpYnJ7jKy5oKiLu0ysfWuA' },
    500: { basePrice: 'price_1SwpYoJ7jKy5oKiL3GVTUvTc' },
    750: { basePrice: 'price_1SwqIGJ7jKy5oKiLIWMRNiXS' },
    1000: { basePrice: 'price_1SwqIHJ7jKy5oKiLLD5qXWeo' },
    1250: { basePrice: 'price_1SwqIIJ7jKy5oKiL4yhDOMn9' },
    1500: { basePrice: 'price_1SwqIJJ7jKy5oKiLHQ3geUj2' },
    2000: { basePrice: 'price_1SwqIKJ7jKy5oKiLL4yY4CrI' },
    2500: { basePrice: 'price_1SwqILJ7jKy5oKiLy4H0AcCH' },
    5000: { basePrice: 'price_1SwqIMJ7jKy5oKiLhINt9uNM' },
  },
  'message-assistant': {
    50: { basePrice: 'price_1SwqIRJ7jKy5oKiLRF2O1ZcQ' },
    100: { basePrice: 'price_1SwqISJ7jKy5oKiLBGghGfyD' },
    250: { basePrice: 'price_1SwqITJ7jKy5oKiLd7Owzwhf' },
    500: { basePrice: 'price_1SwqIUJ7jKy5oKiLBOtD61eY' },
    750: { basePrice: 'price_1SwqIVJ7jKy5oKiLLT2DBOOL' },
    1000: { basePrice: 'price_1SwqIWJ7jKy5oKiLYXJQhd70' },
    1250: { basePrice: 'price_1SwqIXJ7jKy5oKiLw59K4r8C' },
    1500: { basePrice: 'price_1SwqIYJ7jKy5oKiLMiZDze5F' },
    2000: { basePrice: 'price_1SwqIZJ7jKy5oKiLPnxo4hii' },
    2500: { basePrice: 'price_1SwqIaJ7jKy5oKiL1NEXypaa' },
    5000: { basePrice: 'price_1SwqIbJ7jKy5oKiLEmvQmnBy' },
  },
  'virtual-receptionist': {
    50: { basePrice: 'price_1SwqIgJ7jKy5oKiLdSUWxZjC' },
    100: { basePrice: 'price_1SwqIhJ7jKy5oKiL4PB529Zf' },
    250: { basePrice: 'price_1SwpYpJ7jKy5oKiLmXszjYL7' },
    500: { basePrice: 'price_1SwpYqJ7jKy5oKiLvHCgxfti' },
    750: { basePrice: 'price_1SwqIiJ7jKy5oKiLvWRLHG9v' },
    1000: { basePrice: 'price_1SwqIjJ7jKy5oKiLt7rbMbQv' },
    1250: { basePrice: 'price_1SwqIlJ7jKy5oKiLQZZrIKOu' },
    1500: { basePrice: 'price_1SwqImJ7jKy5oKiLobOxfggw' },
    2000: { basePrice: 'price_1SwqInJ7jKy5oKiLym59Y6mZ' },
    2500: { basePrice: 'price_1SwqIoJ7jKy5oKiLj7H9zLjz' },
    5000: { basePrice: 'price_1SwqIpJ7jKy5oKiLUucWIhFP' },
  },
  'virtual-secretary': {
    50: { basePrice: 'price_1SwqItJ7jKy5oKiLJeksHNVV' },
    100: { basePrice: 'price_1SwqIuJ7jKy5oKiLb4RdRhpl' },
    250: { basePrice: 'price_1SwqIvJ7jKy5oKiLRzTS4YZ1' },
    500: { basePrice: 'price_1SwqIwJ7jKy5oKiLN8KxFI0m' },
    750: { basePrice: 'price_1SwqIxJ7jKy5oKiLLG1qOXut' },
    1000: { basePrice: 'price_1SwqIyJ7jKy5oKiLHhTjtFyd' },
    1250: { basePrice: 'price_1SwqIzJ7jKy5oKiL7izvTFOr' },
    1500: { basePrice: 'price_1SwqJ0J7jKy5oKiLGN0MCoKr' },
    2000: { basePrice: 'price_1SwqJ2J7jKy5oKiL5W8mcH7A' },
    2500: { basePrice: 'price_1SwqJ3J7jKy5oKiLd5Vz4nXE' },
    5000: { basePrice: 'price_1SwqJ4J7jKy5oKiLcqh0izfj' },
  },
};

// CAD Price Mappings
const priceMappingsCAD: Record<string, Record<number, { basePrice: string }>> = {
  'ai-receptionist': {
    50: { basePrice: 'price_1SwrpCJ7jKy5oKiLfTNs5ngw' },
    100: { basePrice: 'price_1SwrpDJ7jKy5oKiLt2C8aJzT' },
    250: { basePrice: 'price_1SwrpEJ7jKy5oKiLh0e1SKRV' },
    500: { basePrice: 'price_1SwrpFJ7jKy5oKiLz3IMAjOF' },
    750: { basePrice: 'price_1SwrpGJ7jKy5oKiLMlOrelz2' },
    1000: { basePrice: 'price_1SwrpHJ7jKy5oKiL3myqbCXz' },
    1250: { basePrice: 'price_1SwrpIJ7jKy5oKiLxE3MI7uf' },
    1500: { basePrice: 'price_1SwrpJJ7jKy5oKiL8Fkh5ENw' },
    2000: { basePrice: 'price_1SwrpKJ7jKy5oKiLYJm2ow2D' },
    2500: { basePrice: 'price_1SwrpLJ7jKy5oKiLG9hiIlCp' },
    5000: { basePrice: 'price_1SwrpMJ7jKy5oKiL9ogrObf9' },
  },
  'message-assistant': {
    50: { basePrice: 'price_1SwrpUJ7jKy5oKiLbIgKoWDu' },
    100: { basePrice: 'price_1SwrpWJ7jKy5oKiLNSh3tb3J' },
    250: { basePrice: 'price_1SwrpWJ7jKy5oKiLfnBt6HKW' },
    500: { basePrice: 'price_1SwrpXJ7jKy5oKiLY2ilo5dn' },
    750: { basePrice: 'price_1SwrpYJ7jKy5oKiLo8DxdN8H' },
    1000: { basePrice: 'price_1SwrpZJ7jKy5oKiLIKeq2rSJ' },
    1250: { basePrice: 'price_1SwrpaJ7jKy5oKiLohClgveR' },
    1500: { basePrice: 'price_1SwrpbJ7jKy5oKiL4TCdRnpI' },
    2000: { basePrice: 'price_1SwrpcJ7jKy5oKiLwRCnqL9W' },
    2500: { basePrice: 'price_1SwrpdJ7jKy5oKiLKrwLv9Z9' },
    5000: { basePrice: 'price_1SwrpeJ7jKy5oKiLslHCW9DF' },
  },
  'virtual-receptionist': {
    50: { basePrice: 'price_1SwrpjJ7jKy5oKiLdA5dylJX' },
    100: { basePrice: 'price_1SwrpkJ7jKy5oKiLhFXMRMVi' },
    250: { basePrice: 'price_1SwrplJ7jKy5oKiL6vklFZlq' },
    500: { basePrice: 'price_1SwrpnJ7jKy5oKiLE0KOBMPG' },
    750: { basePrice: 'price_1SwrpoJ7jKy5oKiLnShD8XrS' },
    1000: { basePrice: 'price_1SwrppJ7jKy5oKiLCdYuBrYd' },
    1250: { basePrice: 'price_1SwrpqJ7jKy5oKiL1nh1iKwA' },
    1500: { basePrice: 'price_1SwrpsJ7jKy5oKiLZhsY3TVb' },
    2000: { basePrice: 'price_1SwrptJ7jKy5oKiLzzBN8ZMO' },
    2500: { basePrice: 'price_1SwrpuJ7jKy5oKiLxDsBsfj2' },
    5000: { basePrice: 'price_1SwrpvJ7jKy5oKiLKAFYLq24' },
  },
  'virtual-secretary': {
    50: { basePrice: 'price_1Swrq0J7jKy5oKiLSZ6uEu88' },
    100: { basePrice: 'price_1Swrq1J7jKy5oKiLQb3IPwbY' },
    250: { basePrice: 'price_1Swrq2J7jKy5oKiLu90BnJTK' },
    500: { basePrice: 'price_1Swrq3J7jKy5oKiLGZNKg510' },
    750: { basePrice: 'price_1Swrq4J7jKy5oKiLhEQyCteZ' },
    1000: { basePrice: 'price_1Swrq5J7jKy5oKiLaq5ao49t' },
    1250: { basePrice: 'price_1Swrq6J7jKy5oKiLF1pD7wnk' },
    1500: { basePrice: 'price_1Swrq7J7jKy5oKiLh7uWuMbv' },
    2000: { basePrice: 'price_1Swrq8J7jKy5oKiLSY9eDzxl' },
    2500: { basePrice: 'price_1Swrq9J7jKy5oKiLuJ7HaBiB' },
    5000: { basePrice: 'price_1SwrqAJ7jKy5oKiL6K2iHdDZ' },
  },
};

// Annual discount coupon ID - must be created in Stripe dashboard
const ANNUAL_DISCOUNT_COUPON = 'ANNUAL10';

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
    const { leadId, email: overrideEmail } = await req.json();
    if (!leadId) throw new Error("leadId is required");
    logStep("Request parsed", { leadId, overrideEmail });

    // Fetch lead details
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError) throw new Error(`Lead not found: ${leadError.message}`);
    logStep("Lead fetched", { 
      name: lead.name, 
      email: lead.email, 
      service_type: lead.service_type,
      billing_currency: lead.billing_currency,
      billing_period: lead.billing_period,
      country: lead.country,
    });

    if (!lead.service_type || !lead.plan_minutes) {
      throw new Error("Lead is missing service type or plan minutes");
    }

    // Determine currency based on lead settings
    const currency = lead.billing_currency || (lead.country === 'CA' ? 'cad' : 'usd');
    const isAnnual = lead.billing_period === 'annual';
    logStep("Billing settings", { currency, isAnnual });

    // Select correct price mapping based on currency
    const priceMappings = currency === 'cad' ? priceMappingsCAD : priceMappingsUSD;
    
    const serviceMapping = priceMappings[lead.service_type];
    if (!serviceMapping) {
      throw new Error(`Unknown service type: ${lead.service_type}`);
    }

    const priceConfig = serviceMapping[lead.plan_minutes];
    if (!priceConfig) {
      throw new Error(`No price found for ${lead.service_type} with ${lead.plan_minutes} minutes in ${currency.toUpperCase()}`);
    }
    logStep("Price config found", { ...priceConfig, currency });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer already exists
    const clientEmail = overrideEmail || lead.email;
    let customerId: string | undefined;
    
    const customers = await stripe.customers.list({ email: clientEmail, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: clientEmail,
        name: lead.name,
        metadata: {
          lead_id: leadId,
          company: lead.company || '',
          country: lead.country || '',
        },
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://24hv.io";
    
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: priceConfig.basePrice,
        quantity: 1,
      },
    ];

    // Calculate first of next month for billing anchor
    function getFirstOfNextMonth(): number {
      const now = new Date();
      const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
      return Math.floor(firstOfNextMonth.getTime() / 1000);
    }

    const billingAnchor = getFirstOfNextMonth();
    logStep("Billing anchor calculated", { 
      anchorDate: new Date(billingAnchor * 1000).toISOString(),
      anchorTimestamp: billingAnchor 
    });

    // Build subscription data with optional annual discount
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      billing_cycle_anchor: billingAnchor,
      proration_behavior: 'create_prorations',
      metadata: {
        lead_id: leadId,
        service_type: lead.service_type,
        plan_minutes: lead.plan_minutes.toString(),
        billing_period: lead.billing_period || 'monthly',
        billing_currency: currency,
      },
    };

    // Apply annual discount coupon if applicable
    if (isAnnual) {
      try {
        // Verify coupon exists before adding
        await stripe.coupons.retrieve(ANNUAL_DISCOUNT_COUPON);
        subscriptionData.coupon = ANNUAL_DISCOUNT_COUPON;
        logStep("Annual discount coupon applied", { coupon: ANNUAL_DISCOUNT_COUPON });
      } catch (couponError) {
        // Coupon doesn't exist, log warning but continue without it
        logStep("Warning: Annual discount coupon not found, proceeding without discount", { 
          coupon: ANNUAL_DISCOUNT_COUPON,
          error: couponError instanceof Error ? couponError.message : 'Unknown error'
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/get-started?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/get-started?canceled=true`,
      metadata: {
        lead_id: leadId,
        service_type: lead.service_type,
        plan_minutes: lead.plan_minutes.toString(),
        billing_period: lead.billing_period || 'monthly',
        billing_currency: currency,
      },
      subscription_data: subscriptionData,
    });
    logStep("Checkout session created with month-aligned billing", { 
      sessionId: session.id, 
      url: session.url,
      currency,
      isAnnual,
    });

    // Update lead with payment link sent timestamp and stripe customer ID
    const { error: updateError } = await supabaseClient
      .from("leads")
      .update({
        payment_link_sent_at: new Date().toISOString(),
        stripe_customer_id: customerId,
        pipeline_stage: 'ready_for_billing',
        billing_currency: currency,
      })
      .eq("id", leadId);

    if (updateError) {
      logStep("Warning: Failed to update lead", { error: updateError.message });
    }

    // Send email with payment link via Resend
    let emailSent = false;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey && session.url) {
      try {
        const resend = new Resend(resendApiKey);
        const serviceName = serviceDisplayNames[lead.service_type] || lead.service_type;
        
        const emailResponse = await resend.emails.send({
          from: "24H Virtual <noreply@24hvirtual.com>",
          to: [clientEmail],
          subject: "Your 24H Virtual Payment Link",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #0B60B0, #40A578); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .header h1 { color: white; margin: 0; font-size: 24px; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .plan-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0B60B0; }
                .plan-details li { margin: 8px 0; list-style: none; }
                .button { display: inline-block; background: #0B60B0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; padding-top: 20px; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to 24H Virtual!</h1>
                </div>
                <div class="content">
                  <p>Hi ${lead.name},</p>
                  <p>Thank you for choosing 24H Virtual! We're excited to have you on board.</p>
                  
                  <div class="plan-details">
                    <strong>Your Selected Plan:</strong>
                    <ul style="padding-left: 0;">
                      <li><strong>Service:</strong> ${serviceName}</li>
                      <li><strong>Minutes:</strong> ${lead.plan_minutes}/month</li>
                      <li><strong>Billing:</strong> ${isAnnual ? 'Annual (10% discount applied)' : 'Monthly'}</li>
                      <li><strong>Currency:</strong> ${currency.toUpperCase()}</li>
                    </ul>
                  </div>
                  
                  <p>Please complete your subscription setup by clicking the button below:</p>
                  
                  <p style="text-align: center;">
                    <a href="${session.url}" class="button" style="color: white;">Complete Your Subscription →</a>
                  </p>
                  
                  <p>This payment link will expire in 24 hours. If you have any questions, simply reply to this email or call us.</p>
                  
                  <div class="footer">
                    <p>Best regards,<br><strong>The 24H Virtual Team</strong></p>
                    <p>© ${new Date().getFullYear()} 24H Virtual. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        
        emailSent = true;
        const emailId = emailResponse?.data?.id || 'unknown';
        logStep("Email sent successfully", { emailId });
        
        // Log email as CRM activity
        await supabaseClient.from('crm_activities').insert({
          lead_id: leadId,
          activity_type: 'email',
          title: 'Payment link email sent',
          description: `Automated payment link email sent to ${clientEmail}`,
          metadata: {
            email_type: 'payment_link',
            recipient: clientEmail,
            subject: 'Your 24H Virtual Payment Link',
            sent_at: new Date().toISOString(),
            resend_id: emailId,
          },
        });
        logStep("CRM activity logged for email");
      } catch (emailError) {
        logStep("Warning: Failed to send email", { 
          error: emailError instanceof Error ? emailError.message : String(emailError) 
        });
        // Continue without failing the whole request
      }
    } else {
      logStep("Skipping email - RESEND_API_KEY not configured or no session URL");
    }

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        sessionId: session.id,
        emailSent,
        currency,
        isAnnual,
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
