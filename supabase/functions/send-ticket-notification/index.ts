import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Admin email for ticket notifications
const ADMIN_EMAIL = "support@24hvirtual.com";
const FROM_EMAIL = "24H Virtual Support <support@24hvirtual.com>";

interface TicketCreatedPayload {
  type: "ticket_created";
  ticketId: string;
  ticketNumber: number;
  title: string;
  description: string;
  source: string;
  priority: string;
  category?: string;
  submitterEmail?: string;
  submitterName?: string;
}

interface TicketReplyPayload {
  type: "ticket_reply";
  ticketId: string;
  ticketNumber: number;
  ticketTitle: string;
  replyMessage: string;
  replierName: string;
  submitterEmail: string;
  submitterName?: string;
}

interface TicketAssignedPayload {
  type: "ticket_assigned";
  ticketId: string;
  ticketNumber: number;
  ticketTitle: string;
  assigneeId: string;
  assigneeName: string;
  assignerName: string;
}

type NotificationPayload = TicketCreatedPayload | TicketReplyPayload | TicketAssignedPayload;

const sourceLabels: Record<string, string> = {
  client_portal: "Client Portal",
  affiliate_portal: "Affiliate Portal",
  white_label_portal: "Partner Portal",
  sales: "Sales Inquiry",
};

const priorityColors: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  urgent: "#ef4444",
};

function generateTicketCreatedEmail(payload: TicketCreatedPayload): { subject: string; html: string } {
  const sourceLabel = sourceLabels[payload.source] || payload.source;
  const priorityColor = priorityColors[payload.priority] || "#6b7280";

  return {
    subject: `[#${payload.ticketNumber}] New Support Ticket: ${payload.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0B60B0, #40A578); padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 20px; }
          .content { background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-right: 8px; }
          .source-badge { background: #e0f2fe; color: #0369a1; }
          .priority-badge { color: white; }
          .ticket-details { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #0B60B0; }
          .detail-row { margin: 8px 0; }
          .detail-label { font-weight: 600; color: #374151; }
          .description { background: #f3f4f6; padding: 12px; border-radius: 6px; margin-top: 12px; }
          .button { display: inline-block; background: #0B60B0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px; }
          .footer { text-align: center; padding-top: 16px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 New Support Ticket</h1>
          </div>
          <div class="content">
            <div style="margin-bottom: 16px;">
              <span class="badge source-badge">${sourceLabel}</span>
              <span class="badge priority-badge" style="background: ${priorityColor};">${payload.priority.toUpperCase()}</span>
            </div>
            
            <div class="ticket-details">
              <div class="detail-row">
                <span class="detail-label">Ticket #:</span> ${payload.ticketNumber}
              </div>
              <div class="detail-row">
                <span class="detail-label">Subject:</span> ${payload.title}
              </div>
              <div class="detail-row">
                <span class="detail-label">From:</span> ${payload.submitterName || 'Unknown'} (${payload.submitterEmail || 'No email'})
              </div>
              ${payload.category ? `<div class="detail-row"><span class="detail-label">Category:</span> ${payload.category.replace('_', ' ')}</div>` : ''}
              
              <div class="description">
                <div class="detail-label">Description:</div>
                <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${payload.description.substring(0, 500)}${payload.description.length > 500 ? '...' : ''}</p>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="https://24hv.io/admin/tickets/${payload.ticketId}" class="button">View Ticket →</a>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from 24H Virtual Support System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

function generateTicketReplyEmail(payload: TicketReplyPayload): { subject: string; html: string } {
  return {
    subject: `[#${payload.ticketNumber}] Reply to Your Support Ticket`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0B60B0; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 20px; }
          .content { background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .ticket-ref { background: white; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #0B60B0; }
          .reply-box { background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
          .reply-header { font-weight: 600; color: #0B60B0; margin-bottom: 8px; }
          .reply-content { white-space: pre-wrap; }
          .footer { text-align: center; padding-top: 16px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 New Reply on Your Ticket</h1>
          </div>
          <div class="content">
            <p>Hi ${payload.submitterName || 'there'},</p>
            <p>There's a new reply on your support ticket:</p>
            
            <div class="ticket-ref">
              <strong>Ticket #${payload.ticketNumber}:</strong> ${payload.ticketTitle}
            </div>
            
            <div class="reply-box">
              <div class="reply-header">${payload.replierName} replied:</div>
              <div class="reply-content">${payload.replyMessage}</div>
            </div>
            
            <p style="margin-top: 16px;">You can reply to this email or log in to view the full conversation.</p>
            
            <div class="footer">
              <p>This is an automated notification from 24H Virtual Support System</p>
              <p>© ${new Date().getFullYear()} 24H Virtual. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

function generateTicketAssignedEmail(payload: TicketAssignedPayload): { subject: string; html: string } {
  return {
    subject: `[#${payload.ticketNumber}] Ticket Assigned to You`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B5CF6, #6366F1); padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 20px; }
          .content { background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .ticket-ref { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #8B5CF6; }
          .button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px; }
          .footer { text-align: center; padding-top: 16px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Ticket Assigned to You</h1>
          </div>
          <div class="content">
            <p>Hi ${payload.assigneeName},</p>
            <p><strong>${payload.assignerName}</strong> has assigned a support ticket to you:</p>
            
            <div class="ticket-ref">
              <div style="margin-bottom: 8px;"><strong>Ticket #${payload.ticketNumber}</strong></div>
              <div>${payload.ticketTitle}</div>
            </div>
            
            <p>Please review and respond to this ticket at your earliest convenience.</p>
            
            <div style="text-align: center;">
              <a href="https://24hv.io/admin/tickets/${payload.ticketId}" class="button">View Ticket →</a>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from 24H Virtual Support System</p>
              <p>© ${new Date().getFullYear()} 24H Virtual. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

async function getAssigneeEmail(assigneeId: string): Promise<string | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase.auth.admin.getUserById(assigneeId);
  
  if (error || !data?.user?.email) {
    console.log("[TICKET-NOTIFICATION] Could not find assignee email:", error?.message);
    return null;
  }
  
  return data.user.email;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log("[TICKET-NOTIFICATION] Received payload:", payload.type);

    let emailContent: { subject: string; html: string };
    let recipientEmail: string | null;

    if (payload.type === "ticket_created") {
      emailContent = generateTicketCreatedEmail(payload);
      recipientEmail = ADMIN_EMAIL;
    } else if (payload.type === "ticket_reply") {
      if (!payload.submitterEmail) {
        console.log("[TICKET-NOTIFICATION] No submitter email, skipping notification");
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "No submitter email" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      emailContent = generateTicketReplyEmail(payload);
      recipientEmail = payload.submitterEmail;
    } else if (payload.type === "ticket_assigned") {
      // Get assignee email from auth
      recipientEmail = await getAssigneeEmail(payload.assigneeId);
      
      if (!recipientEmail) {
        console.log("[TICKET-NOTIFICATION] Could not find assignee email, skipping notification");
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "Assignee email not found" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      emailContent = generateTicketAssignedEmail(payload);
    } else {
      throw new Error("Invalid notification type");
    }

    console.log("[TICKET-NOTIFICATION] Sending email to:", recipientEmail);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipientEmail],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("[TICKET-NOTIFICATION] Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[TICKET-NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
