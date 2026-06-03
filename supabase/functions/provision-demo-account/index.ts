import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRESET_ROLES: Record<string, string[]> = {
  business: ["client", "sales", "agent", "supervisor", "billing", "tech"],
  affiliate: ["affiliate"],
  white_label: ["white_label"],
  all: ["admin", "client", "sales", "agent", "supervisor", "billing", "tech", "white_label", "affiliate", "referrer"],
};

const ROLE_PORTAL_MAP: Record<string, { label: string; url: string }> = {
  admin: { label: "Admin Portal", url: "https://virtual-rep.lovable.app/admin" },
  client: { label: "Client Dashboard", url: "https://virtual-rep.lovable.app/client-dashboard" },
  sales: { label: "Sales Portal", url: "https://virtual-rep.lovable.app/sales" },
  agent: { label: "Agent Portal", url: "https://virtual-rep.lovable.app/staff/agent" },
  supervisor: { label: "Supervisor Portal", url: "https://virtual-rep.lovable.app/staff/supervisor" },
  billing: { label: "Billing Portal", url: "https://virtual-rep.lovable.app/staff/billing" },
  tech: { label: "Tech Portal", url: "https://virtual-rep.lovable.app/staff/tech" },
  white_label: { label: "White Label Portal", url: "https://virtual-rep.lovable.app/white-label-dashboard" },
  affiliate: { label: "Affiliate Portal", url: "https://virtual-rep.lovable.app/affiliate-dashboard" },
  referrer: { label: "Referrer", url: "https://virtual-rep.lovable.app/login" },
};

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function dateOnly(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

async function seedBusinessData(supabase: any, userId: string) {
  // 8 leads
  const leads = [
    { name: "Sarah Mitchell", email: "sarah@techflow.io", company: "TechFlow Inc", pipeline_stage: "active", score: 92, service_type: "virtual_receptionist", status: "active", account_code: "demo_TF001", assigned_to: userId, plan_minutes: 500, custom_minute_rate: 1.39 },
    { name: "James Chen", email: "james@meridianlaw.com", company: "Meridian Law Group", pipeline_stage: "ready_for_billing", score: 85, service_type: "after_hours", status: "active", account_code: "demo_ML002", assigned_to: userId, plan_minutes: 300 },
    { name: "Lisa Park", email: "lisa@sunrisedental.com", company: "Sunrise Dental", pipeline_stage: "qualified", score: 78, service_type: "bilingual", status: "new", account_code: "demo_SD003", assigned_to: userId, plan_minutes: 200 },
    { name: "Omar Hassan", email: "omar@peakrealty.com", company: "Peak Realty", pipeline_stage: "contacted", score: 65, service_type: "virtual_receptionist", status: "new", account_code: "demo_PR004", assigned_to: userId },
    { name: "Rachel Torres", email: "rachel@cloudsync.io", company: "CloudSync", pipeline_stage: "proposal_sent", score: 88, service_type: "after_hours", status: "new", account_code: "demo_CS005", assigned_to: userId, plan_minutes: 400 },
    { name: "David Kim", email: "david@metroplumbing.com", company: "Metro Plumbing", pipeline_stage: "new", score: 45, service_type: "virtual_receptionist", status: "new", account_code: "demo_MP006", assigned_to: userId },
    { name: "Maria Gonzalez", email: "maria@brightsmile.com", company: "Bright Smile Ortho", pipeline_stage: "onboarding", score: 90, service_type: "bilingual", status: "active", account_code: "demo_BS007", assigned_to: userId, plan_minutes: 350 },
    { name: "Kevin Wright", email: "kevin@atlasconsulting.com", company: "Atlas Consulting", pipeline_stage: "nurture", score: 55, service_type: "virtual_receptionist", status: "new", account_code: "demo_AC008", assigned_to: userId },
  ];

  const { data: insertedLeads } = await supabase.from("leads").insert(leads).select("id, name");
  if (!insertedLeads || insertedLeads.length === 0) return;

  const leadIds = insertedLeads.map((l: any) => l.id);
  const activeLeadId = leadIds[0]; // Sarah Mitchell - active client

  // 15 call logs for the active lead
  const dispositions = ["message_taken", "transferred", "appointment_scheduled", "info_provided", "voicemail"];
  const agents = ["Alex Rivera", "Jordan Lee", "Casey Morgan", "Sam Taylor", "Robin Wells"];
  const callLogs = [];
  for (let i = 0; i < 15; i++) {
    callLogs.push({
      client_id: activeLeadId,
      call_date: dateOnly(i % 14),
      call_time: `${9 + (i % 8)}:${i % 2 === 0 ? "00" : "30"}:00`,
      call_duration: 120 + Math.floor(Math.random() * 900),
      caller_name: `Caller ${i + 1}`,
      caller_phone: `555-${String(1000 + i).padStart(4, "0")}`,
      agent_name: agents[i % agents.length],
      disposition: dispositions[i % dispositions.length],
      call_direction: i % 3 === 0 ? "outbound" : "inbound",
      notes: `Demo call log entry #${i + 1}`,
      status: "completed",
      billable_minutes: Math.ceil((120 + Math.floor(Math.random() * 900)) / 60),
    });
  }
  await supabase.from("call_logs").insert(callLogs);

  // 5 support tickets
  const ticketStatuses = ["open", "in_progress", "resolved", "open", "in_progress"];
  const ticketTitles = [
    "Call forwarding not working",
    "Need to update greeting script",
    "Billing question about overage",
    "Add new team member to account",
    "After-hours schedule change request",
  ];
  const tickets = ticketTitles.map((title, i) => ({
    title,
    description: `Demo support ticket: ${title}. This is a sample ticket for demonstration purposes.`,
    status: ticketStatuses[i],
    priority: i === 0 ? "high" : i < 3 ? "medium" : "low",
    submitted_by: userId,
    source: "client",
    ticket_number: `DEMO-${1001 + i}`,
  }));
  const { data: insertedTickets } = await supabase.from("support_tickets").insert(tickets).select("id");

  // 4 ticket replies on first 2 tickets
  if (insertedTickets && insertedTickets.length >= 2) {
    const replies = [
      { ticket_id: insertedTickets[0].id, message: "We've identified the issue with your call forwarding. Our tech team is working on it.", author_name: "Support Team", author_id: userId, is_internal: false },
      { ticket_id: insertedTickets[0].id, message: "The forwarding has been fixed. Please test and confirm.", author_name: "Support Team", author_id: userId, is_internal: false },
      { ticket_id: insertedTickets[1].id, message: "I'd like to update my greeting to include holiday hours.", author_name: "Demo User", author_id: userId, is_internal: false },
      { ticket_id: insertedTickets[1].id, message: "Your new greeting script has been uploaded and is now active.", author_name: "Support Team", author_id: userId, is_internal: false },
    ];
    await supabase.from("ticket_replies").insert(replies);
  }

  // 3 client scripts
  const scripts = [
    { client_id: activeLeadId, name: "Main Greeting", greeting: "Thank you for calling TechFlow Inc, this is [Agent Name], how may I help you today?", is_active: true },
    { client_id: activeLeadId, name: "After Hours", greeting: "Thank you for calling TechFlow Inc. Our office is currently closed. I can take a message or help you with urgent matters.", is_active: true },
    { client_id: activeLeadId, name: "Holiday Greeting", greeting: "Happy holidays from TechFlow Inc! Our office hours are limited this week. How can I assist you?", is_active: false },
  ];
  await supabase.from("client_scripts").insert(scripts);

  // 5 CRM tasks
  const tasks = [
    { title: "Follow up with Meridian Law", description: "Send proposal revision by Friday", status: "pending", priority: "high", assigned_to: userId, created_by: userId, lead_id: leadIds[1], due_date: dateOnly(-2) },
    { title: "Schedule onboarding call with Bright Smile", description: "Set up initial training session", status: "pending", priority: "medium", assigned_to: userId, created_by: userId, lead_id: leadIds[6], due_date: dateOnly(-5) },
    { title: "Review CloudSync proposal", description: "Finalize pricing and terms", status: "in_progress", priority: "high", assigned_to: userId, created_by: userId, lead_id: leadIds[4], due_date: dateOnly(-1) },
    { title: "Send welcome packet to Sarah Mitchell", description: "Include service guide and FAQ", status: "completed", priority: "low", assigned_to: userId, created_by: userId, lead_id: leadIds[0], completed_at: daysAgo(3) },
    { title: "Update Metro Plumbing contact info", description: "New phone number provided", status: "pending", priority: "low", assigned_to: userId, created_by: userId, lead_id: leadIds[5], due_date: dateOnly(-7) },
  ];
  await supabase.from("crm_tasks").insert(tasks);

  // 3 agent shifts
  const shifts = [
    { agent_id: userId, clock_in: daysAgo(1), clock_out: new Date(Date.now() - 86400000 + 28800000).toISOString(), status: "approved", total_break_minutes: 30, manual_deduction_minutes: 0 },
    { agent_id: userId, clock_in: daysAgo(2), clock_out: new Date(Date.now() - 172800000 + 32400000).toISOString(), status: "approved", total_break_minutes: 45, manual_deduction_minutes: 0 },
    { agent_id: userId, clock_in: daysAgo(0), status: "active", total_break_minutes: 0, manual_deduction_minutes: 0 },
  ];
  await supabase.from("agent_shifts").insert(shifts);

  // 1 time-off request
  await supabase.from("time_off_requests").insert({
    agent_id: userId,
    start_date: dateOnly(-14),
    end_date: dateOnly(-12),
    request_type: "vacation",
    reason: "Family trip",
    status: "pending",
  });

  // 1 sales commission
  await supabase.from("sales_commissions").insert({
    sales_rep_id: userId,
    lead_id: leadIds[0],
    base_amount: 695.00,
    commission_rate: 0.10,
    commission_amount: 69.50,
    status: "pending",
  });
}

async function seedAffiliateData(supabase: any, userId: string, email: string, name: string) {
  // 1 affiliate record
  const { data: affiliate } = await supabase.from("affiliates").insert({
    user_id: userId,
    email: email,
    name: name,
    affiliate_code: "DEMO2024",
    commission_rate: 0.15,
    tier: "gold",
    total_earnings: 2340.00,
    lifetime_referrals: 12,
    status: "active",
  }).select("id").single();

  if (!affiliate) return;

  // 6 referrals
  const referrals = [
    { affiliate_id: affiliate.id, referred_name: "Tom Bradley", referred_email: "tom@bradleyco.com", status: "converted", commission_amount: 150.00, converted_at: daysAgo(5) },
    { affiliate_id: affiliate.id, referred_name: "Nina Patel", referred_email: "nina@patelsolutions.com", status: "converted", commission_amount: 200.00, converted_at: daysAgo(12) },
    { affiliate_id: affiliate.id, referred_name: "Marcus Johnson", referred_email: "marcus@jconsult.com", status: "pending", commission_amount: null },
    { affiliate_id: affiliate.id, referred_name: "Emily Wang", referred_email: "emily@wangdesign.com", status: "pending", commission_amount: null },
    { affiliate_id: affiliate.id, referred_name: "Carlos Ruiz", referred_email: "carlos@ruizlaw.com", status: "converted", commission_amount: 175.00, converted_at: daysAgo(20) },
    { affiliate_id: affiliate.id, referred_name: "Diana Foster", referred_email: "diana@fosterrealty.com", status: "expired", commission_amount: null },
  ];
  await supabase.from("affiliate_referrals").insert(referrals);

  // 2 payouts
  const payouts = [
    { affiliate_id: affiliate.id, amount: 525.00, status: "paid", requested_at: daysAgo(30), processed_at: daysAgo(25), payment_method: "paypal" },
    { affiliate_id: affiliate.id, amount: 350.00, status: "pending", requested_at: daysAgo(3), payment_method: "bank_transfer" },
  ];
  await supabase.from("affiliate_payouts").insert(payouts);
}

async function seedWhiteLabelData(supabase: any, userId: string) {
  // 1 WL partner
  const { data: partner } = await supabase.from("white_label_partners").insert({
    user_id: userId,
    company_name: "Pinnacle Communications",
    contact_name: "Demo Partner",
    contact_email: "demo@pinnaclecoms.com",
    tier: "premium",
    status: "active",
    commission_rate: 0.20,
  }).select("id").single();

  if (!partner) return;

  // 1 WL branding
  await supabase.from("white_label_branding").insert({
    partner_id: partner.id,
    company_name: "Pinnacle Communications",
    primary_color: "#1e3a5f",
    secondary_color: "#c5a347",
    logo_url: null,
    support_email: "support@pinnaclecoms.com",
    support_phone: "1-800-PINNACLE",
    custom_domain: "pinnacle.24hvirtual.com",
  });

  // 3 WL clients
  const wlClients = [
    { partner_id: partner.id, client_name: "Harrison & Associates Law", contact_name: "Robert Harrison", contact_email: "robert@harrisonlaw.com", status: "active", service_type: "virtual_receptionist", monthly_minutes: 400 },
    { partner_id: partner.id, client_name: "Greenfield Medical Center", contact_name: "Dr. Amy Chen", contact_email: "achen@greenfieldmed.com", status: "active", service_type: "after_hours", monthly_minutes: 250 },
    { partner_id: partner.id, client_name: "Apex Real Estate Group", contact_name: "Mark Silva", contact_email: "mark@apexrealestate.com", status: "active", service_type: "virtual_receptionist", monthly_minutes: 300 },
  ];
  const { data: insertedClients } = await supabase.from("white_label_clients").insert(wlClients).select("id");

  if (insertedClients && insertedClients.length > 0) {
    // WL service configs
    const configs = insertedClients.map((c: any, i: number) => ({
      wl_client_id: c.id,
      partner_id: partner.id,
      greeting_script: `Thank you for calling ${wlClients[i].client_name}, a Pinnacle Communications partner. How may I direct your call?`,
      operating_hours: { weekdays: "8:00-18:00", weekends: i === 1 ? "9:00-13:00" : "closed" },
      call_handling_rules: { transfer_priority: "urgent_first", voicemail_enabled: true },
    }));
    await supabase.from("white_label_service_configs").insert(configs);

    // 8 WL call logs spread across clients
    const wlCallLogs = [];
    for (let i = 0; i < 8; i++) {
      wlCallLogs.push({
        wl_client_id: insertedClients[i % insertedClients.length].id,
        partner_id: partner.id,
        caller_name: `WL Caller ${i + 1}`,
        caller_phone: `555-${String(2000 + i).padStart(4, "0")}`,
        call_date: dateOnly(i % 7),
        duration_seconds: 60 + Math.floor(Math.random() * 600),
        disposition: ["message_taken", "transferred", "appointment_scheduled", "info_provided"][i % 4],
        agent_name: ["Alex R.", "Jordan L.", "Casey M."][i % 3],
      });
    }
    await supabase.from("white_label_call_logs").insert(wlCallLogs);

    // 1 usage summary
    const now = new Date();
    await supabase.from("white_label_usage_summaries").insert({
      partner_id: partner.id,
      period_start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
      period_end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0],
      total_minutes: 487,
      total_calls: 156,
      total_clients: 3,
    });
  }

  // 3 WL knowledge base articles
  const articles = [
    { partner_id: partner.id, title: "Getting Started with Your White Label Portal", content: "Welcome to your Pinnacle Communications partner portal. This guide walks you through setting up your first client.", category: "onboarding", is_published: true },
    { partner_id: partner.id, title: "Managing Client Service Configurations", content: "Learn how to customize greeting scripts, operating hours, and call handling rules for each client.", category: "configuration", is_published: true },
    { partner_id: partner.id, title: "Understanding Your Wholesale Billing", content: "This article explains how wholesale pricing works, usage tracking, and invoice generation.", category: "billing", is_published: true },
  ];
  await supabase.from("white_label_knowledge_base").insert(articles);
}

function buildDemoEmail(name: string, email: string, password: string, roles: string[]): string {
  const portalLinksHtml = roles
    .filter((r) => ROLE_PORTAL_MAP[r])
    .map((r) => {
      const p = ROLE_PORTAL_MAP[r];
      return `<tr>
        <td style="padding:8px 20px;border-bottom:1px solid #e5e7eb;">
          <a href="${p.url}" style="color:#1e40af;text-decoration:none;font-weight:600;font-size:14px;">${p.label}</a>
          <br><span style="color:#9ca3af;font-size:12px;">${p.url}</span>
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 50%,#3b82f6 100%);padding:36px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0 0 8px;font-size:26px;font-weight:800;letter-spacing:-0.5px;">24H Virtual</h1>
          <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Your Demo Account is Ready</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi <strong>${name}</strong>,</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">Your demo account has been created and pre-loaded with sample data. You can explore all features, edit records, and test the platform as if it were a live account.</p>
          
          <!-- Credentials -->
          <table width="100%" style="background-color:#f0f4ff;border-radius:8px;border:1px solid #dbeafe;margin-bottom:24px;" cellpadding="0" cellspacing="0">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #dbeafe;">
              <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Login Email</p>
              <p style="color:#111827;font-size:15px;font-weight:600;margin:0;">${email}</p>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Temporary Password</p>
              <p style="color:#111827;font-size:16px;font-weight:700;margin:0;font-family:'Courier New',monospace;letter-spacing:1px;">${password}</p>
            </td></tr>
          </table>

          <!-- Portal Links -->
          <p style="color:#374151;font-size:15px;font-weight:700;margin:0 0 12px;">🚀 Your Dashboard Access:</p>
          <table width="100%" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;" cellpadding="0" cellspacing="0">
            ${portalLinksHtml}
          </table>

          <!-- Demo callout -->
          <table width="100%" style="background-color:#fefce8;border-radius:8px;border:1px solid #fde68a;margin-bottom:28px;" cellpadding="0" cellspacing="0">
            <tr><td style="padding:16px 20px;">
              <p style="color:#92400e;font-size:14px;font-weight:600;margin:0 0 6px;">📋 This is a Demo Account</p>
              <p style="color:#a16207;font-size:13px;line-height:1.5;margin:0;">Your account comes pre-loaded with realistic sample data — leads, call logs, tickets, and more. Feel free to create, edit, and delete records to fully experience the platform.</p>
            </td></tr>
          </table>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;" width="100%">
            <tr><td align="center">
              <a href="https://virtual-rep.lovable.app/login" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;border-radius:8px;box-shadow:0 4px 12px rgba(30,64,175,0.3);">Log In Now →</a>
            </td></tr>
          </table>

          <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">We recommend changing your password after first login.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:13px;margin:0 0 4px;font-weight:600;">24H Virtual</p>
          <p style="color:#9ca3af;font-size:11px;margin:0;">Professional Answering Services & Virtual Receptionist Solutions</p>
          <p style="color:#d1d5db;font-size:11px;margin:8px 0 0;">© ${new Date().getFullYear()} 24H Virtual. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Validate caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, email, password, preset, resend_only, user_id } = await req.json();

    // --- RESEND-ONLY PATH ---
    if (resend_only === true) {
      if (!name || !email || !password || !user_id) {
        return new Response(JSON.stringify({ error: "Missing required fields: name, email, password, user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Look up user by ID directly (avoids listUsers pagination issues)
      const { data: { user: existingUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (getUserError || !existingUser) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true });
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch current roles
      const { data: userRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", existingUser.id);
      const roles = (userRoles || []).map((r: any) => r.role as string);

      // Send email
      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          const html = buildDemoEmail(name, email, password, roles);
          await resend.emails.send({
            from: "24H Virtual <noreply@24hvirtual.com>",
            to: [email],
            subject: "Your 24H Virtual Demo Account — Updated Credentials",
            html,
          });
          console.log("Resend demo email sent to", email);
        } catch (emailErr) {
          console.error("Failed to send resend demo email:", emailErr);
        }
      }

      return new Response(JSON.stringify({ userId: existingUser.id, success: true, roles }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- STANDARD PROVISION PATH ---
    if (!name || !email || !password || !preset) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, email, password, preset" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roles = PRESET_ROLES[preset];
    if (!roles) {
      return new Response(JSON.stringify({ error: "Invalid preset. Use: business, affiliate, white_label, or all" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    let userId: string;

    if (existingUser) {
      // Re-provision existing user: update password, metadata, and demo flag
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        user_metadata: { full_name: name },
        email_confirm: true,
      });
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = existingUser.id;

      // Clean up old roles before re-assigning
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;
    }

    // Update profile with demo flag
    await supabaseAdmin
      .from("profiles")
      .update({ full_name: name, is_demo_account: true })
      .eq("id", userId);

    // Assign roles
    if (existingUser) {
      await supabaseAdmin
        .from("user_roles")
        .insert(roles.map((role) => ({ user_id: userId, role })));
    } else {
      const extraRoles = roles.filter((r) => r !== "client");
      if (extraRoles.length > 0) {
        await supabaseAdmin
          .from("user_roles")
          .insert(extraRoles.map((role) => ({ user_id: userId, role })));
      }
      if (!roles.includes("client")) {
        await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "client");
      }
    }

    // Seed mock data based on preset
    console.log(`Seeding ${preset} demo data for user ${userId}...`);

    if (preset === "business" || preset === "all") {
      await seedBusinessData(supabaseAdmin, userId);
    }
    if (preset === "affiliate" || preset === "all") {
      await seedAffiliateData(supabaseAdmin, userId, email, name);
    }
    if (preset === "white_label" || preset === "all") {
      await seedWhiteLabelData(supabaseAdmin, userId);
    }

    console.log("Mock data seeded successfully");

    // Send branded demo email
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const html = buildDemoEmail(name, email, password, roles);
        await resend.emails.send({
          from: "24H Virtual <noreply@24hvirtual.com>",
          to: [email],
          subject: "Your 24H Virtual Demo Account is Ready",
          html,
        });
        console.log("Demo email sent to", email);
      } catch (emailErr) {
        console.error("Failed to send demo email:", emailErr);
      }
    }

    // Welcome notification
    const portalList = roles.map((r) => ROLE_PORTAL_MAP[r]?.label || r).join(", ");
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Welcome to Your Demo Account",
      message: `Your demo account is ready with sample data. You have access to: ${portalList}.`,
      action_url: "/login",
    });

    return new Response(JSON.stringify({ userId, success: true, roles }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("provision-demo-account error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
