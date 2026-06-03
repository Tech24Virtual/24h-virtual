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
  console.log(`[SEND-CARD-UPDATE-LINK] ${step}${detailsStr}`);
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
    const { leadId, paymentFailureId } = await req.json();
    if (!leadId) throw new Error("leadId is required");
    logStep("Request parsed", { leadId, paymentFailureId });

    // Fetch lead details
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError) throw new Error(`Lead not found: ${leadError.message}`);
    if (!lead.stripe_customer_id) throw new Error("Lead has no Stripe customer ID");
    logStep("Lead fetched", { name: lead.name, customerId: lead.stripe_customer_id });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create Customer Portal session for updating payment method
    const origin = req.headers.get("origin") || "https://24hv.io";
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: lead.stripe_customer_id,
      return_url: `${origin}/dashboard/billing?updated=true`,
      flow_data: {
        type: 'payment_method_update',
      },
    });
    logStep("Portal session created", { url: portalSession.url });

    // Create notification for the client
    const { error: notificationError } = await supabaseClient
      .from("notifications")
      .insert({
        user_id: lead.id, // This might need adjustment based on user_id mapping
        title: "Payment Method Update Required",
        message: "Your payment method needs to be updated. Please click to update your card.",
        type: "warning",
        category: "billing",
        action_url: portalSession.url,
      });

    if (notificationError) {
      logStep("Warning: Failed to create notification", { error: notificationError.message });
    }

    // If paymentFailureId is provided, mark the link as sent
    if (paymentFailureId) {
      await supabaseClient
        .from("payment_failures")
        .update({
          retry_scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        })
        .eq("id", paymentFailureId);
    }

    // Send email with portal link via Resend
    let emailSent = false;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        await resend.emails.send({
          from: "24H Virtual <noreply@24hvirtual.com>",
          to: [lead.email],
          subject: "Action Required: Update Your Payment Method",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc2626; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .header h1 { color: white; margin: 0; font-size: 24px; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #0B60B0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; padding-top: 20px; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⚠️ Payment Method Update Required</h1>
                </div>
                <div class="content">
                  <p>Hi ${lead.name},</p>
                  <p>We were unable to process your recent payment. To avoid any interruption to your service, please update your payment method.</p>
                  
                  <p style="text-align: center;">
                    <a href="${portalSession.url}" class="button" style="color: white;">Update Payment Method →</a>
                  </p>
                  
                  <p>If you have any questions or need assistance, please reply to this email or call us.</p>
                  
                  <div class="footer">
                    <p>Best regards,<br><strong>The 24H Virtual Team</strong></p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        
        emailSent = true;
        logStep("Email sent successfully");
        
        // Log email as CRM activity
        await supabaseClient.from('crm_activities').insert({
          lead_id: leadId,
          activity_type: 'email',
          title: 'Card update email sent',
          description: `Automated card update email sent to ${lead.email}`,
          metadata: {
            email_type: 'card_update',
            recipient: lead.email,
            subject: 'Action Required: Update Your Payment Method',
            sent_at: new Date().toISOString(),
          },
        });
        logStep("CRM activity logged for email");
      } catch (emailError) {
        logStep("Warning: Failed to send email", { 
          error: emailError instanceof Error ? emailError.message : String(emailError) 
        });
      }
    } else {
      logStep("Skipping email - RESEND_API_KEY not configured");
    }

    return new Response(JSON.stringify({
      portal_url: portalSession.url,
      email_sent: emailSent,
      message: "Card update link generated successfully",
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
