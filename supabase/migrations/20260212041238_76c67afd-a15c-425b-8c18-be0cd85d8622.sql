
-- Create platform_knowledge table
CREATE TABLE public.platform_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_knowledge ENABLE ROW LEVEL SECURITY;

-- Read for authenticated users
CREATE POLICY "Authenticated users can read platform knowledge"
ON public.platform_knowledge FOR SELECT
TO authenticated
USING (true);

-- Write for admins only
CREATE POLICY "Admins can insert platform knowledge"
ON public.platform_knowledge FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update platform knowledge"
ON public.platform_knowledge FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete platform knowledge"
ON public.platform_knowledge FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_platform_knowledge_updated_at
BEFORE UPDATE ON public.platform_knowledge
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add dashboard_context to support_requests
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS dashboard_context TEXT;

-- Seed knowledge data
INSERT INTO public.platform_knowledge (dashboard, title, description) VALUES
-- Client Dashboard
('client', 'Dashboard Overview', 'View call statistics, usage summary, and account status at a glance. Shows total calls, minutes used, and recent activity.'),
('client', 'Call Logs', 'Search and filter your call history by date, duration, caller name, and disposition. Export call data for your records.'),
('client', 'Scripts', 'Create and edit answering scripts that agents follow when handling your calls. Set greetings, FAQs, and call handling rules. Request script changes that go through a review process.'),
('client', 'Schedule', 'Set your business hours and holiday schedules. Agents will know when to follow after-hours vs business-hours scripts.'),
('client', 'Billing', 'View your current plan usage, invoices, and payment history. Manage your subscription and payment method through the billing portal.'),
('client', 'Outbound Calls', 'Request callbacks to your contacts. Submit outbound call requests with contact details, reason, and urgency level.'),
('client', 'Referrals', 'Share your unique referral link and earn credits when referred businesses sign up. Track your referral status and earnings.'),
('client', 'Support Tickets', 'Submit and track support tickets. View ticket status, add replies, and communicate with the support team.'),
('client', 'Settings', 'Update your profile information, notification preferences, and account settings.'),

-- Agent Portal
('agent', 'Dashboard', 'View your active shift status, pending tasks summary, and quick actions. See your assigned clients and upcoming schedule at a glance.'),
('agent', 'Clients', 'View assigned client scripts and call handling instructions. Access greeting text, FAQs, and special handling rules for each client.'),
('agent', 'Call Logs', 'Search call records by client, date, disposition, and handle time. View detailed call information including talk time, ACW, and notes.'),
('agent', 'Tickets', 'View and respond to support tickets assigned to you or your department. Submit new tickets for issues you encounter.'),
('agent', 'Messages', 'Slack-integrated messaging for client communication. Send and receive messages, view message threads, and manage client conversations.'),
('agent', 'Tasks', 'Priority task queue with due dates and status tracking. View assigned tasks, mark them complete, and add notes.'),
('agent', 'Outbound Calls', 'Process the callback queue. View pending outbound call requests, log attempt details, and update call status.'),
('agent', 'Shifts', 'Clock in and out of shifts. View your shift history, break times, and pay period summary. Submit hours for supervisor approval.'),
('agent', 'Schedule', 'View your upcoming schedule, request time off, and see open shifts available for pickup.'),
('agent', 'Onboarding', 'Complete your onboarding checklist including training modules, banking setup, contract signing, and system access provisioning.'),
('agent', 'Settings', 'Update your profile, banking information, notification preferences, and skills.'),

-- Sales Portal
('sales', 'Dashboard', 'Sales performance overview with conversion metrics, pipeline value, and recent activity.'),
('sales', 'Leads', 'Pipeline management with lead scoring, status tracking, and conversion analytics. View lead details, contact history, and score breakdown.'),
('sales', 'Tickets', 'Sales-specific support tickets. Submit and track issues related to sales operations.'),
('sales', 'Meetings', 'Calendar integration for scheduling sales meetings. Track meeting outcomes, no-shows, and follow-up actions.'),
('sales', 'Pipeline', 'Visual deal stages showing leads at each conversion point. Track revenue forecasting and conversion rates.'),
('sales', 'Settings', 'Update your sales profile and notification preferences.'),

-- Supervisor Portal
('supervisor', 'Dashboard', 'Team performance overview with agent metrics, SLA tracking, and operational status.'),
('supervisor', 'Agents', 'Manage your team of agents. View performance stats, skill assignments, and availability.'),
('supervisor', 'Agent Onboarding', 'Manage new hire provisioning including training assignments, system access, Slack invites, and contract management.'),
('supervisor', 'Tickets', 'View and manage tickets across your team. Assign tickets to agents and track resolution.'),
('supervisor', 'Messages', 'Team messaging through Slack integration. Monitor client communications and agent responses.'),
('supervisor', 'Tasks', 'Manage team tasks. Create, assign, and track tasks across your agents.'),
('supervisor', 'Shift Reviews', 'Review and approve agent shift submissions. Edit shift times, add deductions, and void shifts when needed.'),
('supervisor', 'Script Reviews', 'Review and approve client script change requests. Compare original and proposed script changes.'),
('supervisor', 'Outbound Calls', 'Monitor the outbound call queue. View pending requests and agent progress.'),
('supervisor', 'Schedule', 'Build and manage agent schedules. Post open shifts, review time-off requests, and handle schedule conflicts.'),
('supervisor', 'Settings', 'Update your supervisor profile and team management preferences.'),

-- Billing Portal
('billing', 'Dashboard', 'Revenue overview with outstanding invoices, payment status, and billing metrics.'),
('billing', 'Tickets', 'Billing-specific support tickets for payment issues and account inquiries.'),
('billing', 'Invoices', 'Manage Stripe billing, generate invoices, and track payment status. View detailed billing breakdowns by client.'),
('billing', 'Payments', 'Monitor payment processing, handle failed payments, send card update links, and retry charges.'),
('billing', 'Settings', 'Configure billing preferences and notification settings.'),

-- Tech Portal
('tech', 'Dashboard', 'System health overview, recent errors, and technical metrics.'),
('tech', 'Tickets', 'Technical issue resolution queue. Handle system bugs, integration issues, and configuration requests.'),
('tech', 'Settings', 'Update your tech support profile and preferences.'),

-- Admin Dashboard
('admin', 'Overview', 'Full platform dashboard with KPIs, revenue metrics, active clients, and system status across all departments.'),
('admin', 'Clients', 'Manage all client accounts. View usage, billing, scripts, and account details. Create new clients and manage subscriptions.'),
('admin', 'Leads & CRM', 'Full CRM with lead management, activity timeline, email follow-ups, Slack messaging, and task management. Lead scoring with automatic and manual scoring.'),
('admin', 'Billing Management', 'Dynamic billing configuration, Stripe integration, custom plan builder, add-on management, and invoice generation. Calculate monthly billing with minute-based and fixed pricing.'),
('admin', 'User & Role Management', 'Manage user accounts and role assignments. Roles include admin, client, sales, agent, supervisor, billing, tech, white_label, and affiliate.'),
('admin', 'Blog Management', 'Create, edit, and schedule blog posts. AI-powered content generation, WordPress import, auto-blog queue, and SEO optimization.'),
('admin', 'Call Imports & Five9', 'Direct Five9 webhook integration for real-time call ingestion. Campaign-to-client mapping, call report imports, and data parsing.'),
('admin', 'Analytics', 'Platform-wide analytics including compliance charts, funnel analysis, and trend tracking.'),
('admin', 'Tickets', 'Full ticket management across all departments. Assign, escalate, and resolve support tickets.'),
('admin', 'Partners', 'Manage affiliate and white-label partner accounts, commissions, and payouts.'),
('admin', 'Settings', 'Platform-wide settings including Pabbly webhook configuration, Slack integration, and system preferences.'),
('admin', 'Agents', 'Manage all agents including onboarding, skills, schedules, and performance metrics.'),
('admin', 'Keywords & SEO', 'Keyword tracking for SEO performance. Monitor rankings, search volume, and content status.'),

-- White Label
('white_label', 'Dashboard', 'White label partner overview with client count, revenue, and account status.'),
('white_label', 'Clients', 'Manage your sub-accounts and client relationships under your white-label brand.'),
('white_label', 'Branding', 'Customize your white-label appearance including logos, colors, and domain settings.'),
('white_label', 'Billing', 'Partner invoicing and billing management for your white-label clients.'),
('white_label', 'Support', 'Submit and track support tickets with the platform team.'),
('white_label', 'Settings', 'Configure your white-label partner settings and preferences.'),

-- Affiliate
('affiliate', 'Dashboard', 'Affiliate performance overview with click tracking, conversion stats, and earnings summary.'),
('affiliate', 'Referrals', 'Track your referral clicks, conversions, and commission amounts. Share your unique affiliate link.'),
('affiliate', 'Payouts', 'Request payouts and view payment history. Track pending and processed payout requests.'),
('affiliate', 'Settings', 'Update your affiliate profile, payment details, and notification preferences.');
