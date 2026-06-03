import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

type EmailType = 'payment_link' | 'card_update' | 'welcome' | 'reminder' | 'invoice';

interface LogEmailActivityParams {
  leadId: string;
  subject: string;
  recipientEmail: string;
  emailType: EmailType;
  createdBy?: string;
  additionalMetadata?: Record<string, unknown>;
}

/**
 * Logs an email as a CRM activity
 * @param supabase - Supabase client instance with service role
 * @param params - Email activity parameters
 */
export async function logEmailActivity(
  supabase: SupabaseClient,
  params: LogEmailActivityParams
): Promise<{ success: boolean; error?: string }> {
  const {
    leadId,
    subject,
    recipientEmail,
    emailType,
    createdBy,
    additionalMetadata = {},
  } = params;

  try {
    const { error } = await supabase.from('crm_activities').insert({
      lead_id: leadId,
      activity_type: 'email',
      title: `Email sent: ${subject}`,
      description: `Automated ${emailType.replace('_', ' ')} email sent to ${recipientEmail}`,
      created_by: createdBy || null,
      metadata: {
        email_type: emailType,
        recipient: recipientEmail,
        subject: subject,
        sent_at: new Date().toISOString(),
        ...additionalMetadata,
      },
    });

    if (error) {
      console.error('[LOG-EMAIL-ACTIVITY] Failed to log email activity:', error.message);
      return { success: false, error: error.message };
    }

    console.log('[LOG-EMAIL-ACTIVITY] Email activity logged successfully', { leadId, emailType });
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[LOG-EMAIL-ACTIVITY] Exception:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Email templates for common email types
 */
export const emailTemplates = {
  paymentLink: (params: {
    name: string;
    serviceType: string;
    planMinutes: number;
    billingPeriod: string;
    currency: string;
    paymentUrl: string;
  }) => ({
    subject: 'Your 24H Virtual Payment Link',
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
          .plan-details li { margin: 8px 0; }
          .button { display: inline-block; background: #0B60B0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #094a8a; }
          .footer { text-align: center; padding-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to 24H Virtual!</h1>
          </div>
          <div class="content">
            <p>Hi ${params.name},</p>
            <p>Thank you for choosing 24H Virtual! We're excited to have you on board.</p>
            
            <div class="plan-details">
              <strong>Your Selected Plan:</strong>
              <ul>
                <li><strong>Service:</strong> ${formatServiceType(params.serviceType)}</li>
                <li><strong>Minutes:</strong> ${params.planMinutes}/month</li>
                <li><strong>Billing:</strong> ${params.billingPeriod === 'annual' ? 'Annual (10% discount applied)' : 'Monthly'}</li>
                <li><strong>Currency:</strong> ${params.currency.toUpperCase()}</li>
              </ul>
            </div>
            
            <p>Please complete your subscription setup by clicking the button below:</p>
            
            <p style="text-align: center;">
              <a href="${params.paymentUrl}" class="button">Complete Your Subscription →</a>
            </p>
            
            <p>This payment link will expire in 24 hours. If you have any questions, simply reply to this email or call us at 1-800-24HVIRTUAL.</p>
            
            <div class="footer">
              <p>Best regards,<br><strong>The 24H Virtual Team</strong></p>
              <p>© ${new Date().getFullYear()} 24H Virtual. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  cardUpdate: (params: { name: string; portalUrl: string }) => ({
    subject: 'Action Required: Update Your Payment Method',
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
            <p>Hi ${params.name},</p>
            <p>We were unable to process your recent payment. To avoid any interruption to your service, please update your payment method.</p>
            
            <p style="text-align: center;">
              <a href="${params.portalUrl}" class="button">Update Payment Method →</a>
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
  }),
};

function formatServiceType(serviceType: string): string {
  const serviceNames: Record<string, string> = {
    'ai-receptionist': 'AI Receptionist',
    'message-assistant': 'Message Assistant',
    'virtual-receptionist': 'Virtual Receptionist',
    'virtual-secretary': 'Virtual Secretary',
  };
  return serviceNames[serviceType] || serviceType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
