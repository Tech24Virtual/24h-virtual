 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const PROMO_CODE = "VIRTUALEXIT10FOR3";
 const CONSULTATION_URL = "https://24hv.io/get-started";
 const GUIDE_URL = "https://24hv.io/guides/5-signs-need-virtual-receptionist";
 
 interface RequestBody {
   leadId: string;
   variant: "10_off" | "guide";
 }
 
 const logStep = (step: string, details?: unknown) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
   console.log(`[SEND-EXIT-INTENT-EMAIL] ${step}${detailsStr}`);
 };
 
 // Email templates
 const emailTemplates = {
   "10_off": (email: string) => ({
     subject: "Your 10% Discount is Confirmed! 🎉",
     html: `
       <!DOCTYPE html>
       <html>
       <head>
         <meta charset="utf-8">
         <style>
           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
           .header { background: linear-gradient(135deg, #0B60B0, #40A578); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
           .header h1 { color: white; margin: 0; font-size: 28px; }
           .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
           .highlight-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #40A578; }
           .highlight-box li { margin: 10px 0; }
           .promo-code { background: #0B60B0; color: white; padding: 12px 24px; border-radius: 6px; font-size: 18px; font-weight: bold; display: inline-block; margin: 10px 0; letter-spacing: 1px; }
           .button { display: inline-block; background: #40A578; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
           .footer { text-align: center; padding-top: 20px; color: #666; font-size: 14px; border-top: 1px solid #e5e7eb; margin-top: 30px; }
         </style>
       </head>
       <body>
         <div class="container">
           <div class="header">
             <h1>🎉 Your Discount is Reserved!</h1>
           </div>
           <div class="content">
             <p>Hi there!</p>
             <p>Great news — your <strong>exclusive 10% discount</strong> is confirmed!</p>
             
             <div class="highlight-box">
               <strong>Here's what you get:</strong>
               <ul style="list-style: none; padding-left: 0;">
                 <li>✓ <strong>10% off</strong> your first 3 months</li>
                 <li>✓ Any service plan you choose</li>
                 <li>✓ No minimum commitment</li>
               </ul>
             </div>
             
             <p><strong>What's next?</strong></p>
             <p>Book your free consultation, and our team will apply your discount when setting up your account.</p>
             
             <p style="text-align: center;">
               <a href="${CONSULTATION_URL}" class="button">Book Free Consultation →</a>
             </p>
             
             <p style="text-align: center;">
               <span style="color: #666; font-size: 14px;">Your promo code:</span><br>
               <span class="promo-code">${PROMO_CODE}</span>
             </p>
             
             <p style="font-size: 14px; color: #666;">This offer is linked to your email (${email}) and will be applied automatically during onboarding.</p>
             
             <div class="footer">
               <p>— Team 24H Virtual</p>
               <p>© ${new Date().getFullYear()} 24H Virtual. All rights reserved.</p>
             </div>
           </div>
         </div>
       </body>
       </html>
     `,
   }),
 
   guide: () => ({
     subject: "Your Free Guide is Ready 📘",
     html: `
       <!DOCTYPE html>
       <html>
       <head>
         <meta charset="utf-8">
         <style>
           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
           .header { background: linear-gradient(135deg, #0B60B0, #40A578); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
           .header h1 { color: white; margin: 0; font-size: 28px; }
           .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
           .guide-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #0B60B0; }
           .guide-icon { font-size: 48px; margin-bottom: 10px; }
           .button { display: inline-block; background: #0B60B0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
           .button-secondary { display: inline-block; background: #40A578; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
           .footer { text-align: center; padding-top: 20px; color: #666; font-size: 14px; border-top: 1px solid #e5e7eb; margin-top: 30px; }
         </style>
       </head>
       <body>
         <div class="container">
           <div class="header">
             <h1>📘 Your Guide is Ready!</h1>
           </div>
           <div class="content">
             <p>Hi there!</p>
             <p>Thanks for your interest! Here's your free guide:</p>
             
             <div class="guide-box">
               <div class="guide-icon">📘</div>
               <h2 style="margin: 10px 0; color: #0B60B0;">5 Signs You Need a Virtual Receptionist</h2>
               <a href="${GUIDE_URL}" class="button">Download Guide →</a>
             </div>
             
             <p style="text-align: center;"><strong>Ready to take the next step?</strong></p>
             
             <p style="text-align: center;">
               <a href="${CONSULTATION_URL}" class="button-secondary">Get Your Free Consultation →</a>
             </p>
             
             <div class="footer">
               <p>— Team 24H Virtual</p>
               <p>© ${new Date().getFullYear()} 24H Virtual. All rights reserved.</p>
             </div>
           </div>
         </div>
       </body>
       </html>
     `,
   }),
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     logStep("Function started");
 
     const resendApiKey = Deno.env.get("RESEND_API_KEY");
     if (!resendApiKey) {
       throw new Error("RESEND_API_KEY is not configured");
     }
 
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
       { auth: { persistSession: false } }
     );
 
     const { leadId, variant }: RequestBody = await req.json();
     logStep("Request received", { leadId, variant });
 
     if (!leadId || !variant) {
       throw new Error("Missing required fields: leadId and variant");
     }
 
     // Fetch lead by ID
     const { data: lead, error: leadError } = await supabase
       .from("leads")
       .select("id, email, name")
       .eq("id", leadId)
       .single();
 
     if (leadError || !lead) {
       throw new Error(`Lead not found: ${leadError?.message || "Unknown error"}`);
     }
 
     logStep("Lead found", { email: lead.email });
 
     // Get email template
     const template = variant === "10_off" 
       ? emailTemplates["10_off"](lead.email)
       : emailTemplates.guide();
 
     // Send email via Resend
     const resend = new Resend(resendApiKey);
     const emailResponse = await resend.emails.send({
       from: "24H Virtual <noreply@24hvirtual.com>",
       to: [lead.email],
       subject: template.subject,
       html: template.html,
     });
 
     logStep("Email sent", { emailId: emailResponse.data?.id });
 
     // Update lead with promo_code if 10_off variant
     if (variant === "10_off") {
       const { error: updateError } = await supabase
         .from("leads")
         .update({ promo_code: PROMO_CODE })
         .eq("id", leadId);
 
       if (updateError) {
         logStep("Warning: Failed to update promo_code", { error: updateError.message });
       } else {
         logStep("Lead promo_code updated", { promo_code: PROMO_CODE });
       }
     }
 
     // Log CRM activity
     const { error: activityError } = await supabase.from("crm_activities").insert({
       lead_id: leadId,
       activity_type: "email",
       title: `Email sent: ${template.subject}`,
       description: `Exit intent ${variant} confirmation email sent`,
       metadata: {
         email_type: `exit_intent_${variant}`,
         recipient: lead.email,
         subject: template.subject,
         sent_at: new Date().toISOString(),
         promo_code: variant === "10_off" ? PROMO_CODE : null,
       },
     });
 
     if (activityError) {
       logStep("Warning: Failed to log CRM activity", { error: activityError.message });
     } else {
       logStep("CRM activity logged");
     }
 
     return new Response(
       JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
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