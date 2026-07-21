import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  MessageSquareText,
  MessagesSquare,
  ClipboardList,
  Phone,
  PhoneOutgoing,
  Clock,
  UserCheck,
  Bot,
  Settings,
  MessageCircle,
  KanbanSquare,
  LifeBuoy,
  Share2,
  ClipboardCheck,
  GitCompare,
  CheckSquare,
  Briefcase,
} from 'lucide-react';
import type { NavGroup } from '@/components/navigation/types';

export type StaffRole = 'sales' | 'agent' | 'supervisor' | 'billing' | 'tech';

export function getStaffRoot(role: StaffRole) {
  return `/staff/${role}`;
}

export function getStaffNav(role: StaffRole): NavGroup[] {
  const root = getStaffRoot(role);

  switch (role) {
    case 'sales':
      return [
        { name: 'Overview', icon: LayoutDashboard, basePath: root, children: [{ name: 'Overview', href: root }] },
        {
          name: 'Pipeline',
          icon: KanbanSquare,
          basePath: `${root}/pipeline`,
          children: [
            { name: 'Leads', href: `${root}/pipeline/leads` },
            { name: 'Board', href: `${root}/pipeline/board` },
          ],
        },
        {
          name: 'Activity',
          icon: Calendar,
          basePath: `${root}/activity`,
          children: [
            { name: 'Meetings', href: `${root}/activity/meetings` },
            { name: 'Proposals', href: `${root}/activity/proposals` },
          ],
        },
        { name: 'Performance', icon: TrendingUp, basePath: `${root}/performance`, children: [{ name: 'Performance', href: `${root}/performance` }] },
        { name: 'Tickets', icon: MessageSquare, basePath: `${root}/tickets`, children: [{ name: 'Tickets', href: `${root}/tickets` }] },
        {
          name: 'Support',
          icon: LifeBuoy,
          basePath: `${root}/support`,
          children: [
            { name: 'Help',      href: `${root}/support/help` },
            { name: 'Feedback',  href: `${root}/support/feedback` },
            { name: 'Settings',  href: `${root}/support/settings` },
          ],
        },
      ];

    case 'agent':
      return [
        { name: 'Overview', icon: LayoutDashboard, basePath: root, children: [{ name: 'Overview', href: root }] },
        // Single-child groups navigate directly — no section panel / Back button.
        { name: 'Workspace', icon: MessageSquareText, basePath: `${root}/workspace`, children: [{ name: 'Workspace', href: `${root}/workspace` }] },
        { name: 'Tasks', icon: CheckSquare, basePath: `${root}/tasks`, children: [{ name: 'Tasks', href: `${root}/tasks` }] },
        { name: 'Messages', icon: MessageCircle, basePath: `${root}/messages`, children: [{ name: 'Messages', href: `${root}/messages` }] },
        {
          name: 'Clients',
          icon: Users,
          basePath: `${root}/clients-group`,
          children: [
            { name: 'My Clients', href: `${root}/clients` },
            { name: 'Scripts', href: `${root}/scripts` },
            // P0-1: Campaigns nav entry hidden — placeholder page. Route still
            // resolves at `${root}/campaigns` for deep-link compatibility.
          ],
        },
        {
          name: 'Calls',
          icon: Phone,
          basePath: `${root}/calls-group`,
          children: [
            { name: 'Call Logs', href: `${root}/calls` },
            { name: 'Outbound', href: `${root}/outbound-calls` },
          ],
        },
        {
          name: 'Schedule',
          icon: Clock,
          basePath: `${root}/schedule-group`,
          children: [
            { name: 'Shifts', href: `${root}/shifts` },
            { name: 'Schedule', href: `${root}/schedule` },
            { name: 'Time Off', href: `${root}/time-off` },
            { name: 'My Calendar', href: `${root}/calendar` },
            { name: 'Appointments', href: `${root}/appointments` },
          ],
        },
        {
          name: 'Profile',
          icon: UserCheck,
          basePath: `${root}/profile-group`,
          children: [
            { name: 'My Profile', href: `${root}/my-profile` },
            { name: 'Onboarding', href: `${root}/onboarding` },
            { name: 'Training', href: `${root}/training` },
          ],
        },
        { name: 'Tickets', icon: MessageSquare, basePath: `${root}/tickets`, children: [{ name: 'Tickets', href: `${root}/tickets` }] },
        {
          name: 'Support',
          icon: LifeBuoy,
          basePath: `${root}/support-group`,
          children: [
            { name: 'Support',     href: `${root}/support` },
            { name: 'My feedback', href: `${root}/feedback` },
            { name: 'Settings',    href: `${root}/settings` },
          ],
        },
      ];

    case 'supervisor':
      return [
        { name: 'Overview', icon: LayoutDashboard, basePath: root, children: [{ name: 'Overview', href: root }] },
        { name: 'Workspace', icon: MessageSquareText, basePath: `${root}/workspace`, children: [{ name: 'Workspace', href: `${root}/workspace` }] },
        {
          name: 'Agents',
          icon: Users,
          basePath: `${root}/agents-group`,
          children: [
            { name: 'Agents', href: `${root}/agents` },
            { name: 'Onboarding', href: `${root}/agent-onboarding` },
            { name: 'Schedule', href: `${root}/schedule` },
            { name: 'Assignments', href: `${root}/client-assignments` },
            { name: 'Shift Reviews', href: `${root}/shift-reviews` },
            { name: 'Performance', href: `${root}/performance` },
            { name: 'Productivity', href: `${root}/productivity` },
            { name: 'Training Signoffs', href: `${root}/training-signoffs` },
          ],
        },
        {
          name: 'Campaigns',
          icon: Briefcase,
          basePath: `${root}/campaigns-group`,
          children: [
            { name: 'Script Reviews', href: `${root}/script-reviews` },
            { name: 'Go-Live Approvals', href: `${root}/go-live` },
            { name: 'Fulfillment', href: `${root}/fulfillment` },
            { name: 'Escalations', href: `${root}/escalations` },
          ],
        },
        {
          name: 'Comms',
          icon: MessagesSquare,
          basePath: `${root}/comms-group`,
          children: [
            { name: 'Tickets', href: `${root}/tickets` },
            { name: 'Call Logs', href: `${root}/call-logs` },
            { name: 'Tasks', href: `${root}/tasks` },
            { name: 'Outbound', href: `${root}/outbound-calls` },
          ],
        },
        { name: 'Messages', icon: MessageCircle, basePath: `${root}/messages`, children: [{ name: 'Messages', href: `${root}/messages` }] },
        {
          name: 'Support',
          icon: LifeBuoy,
          basePath: `${root}/support-group`,
          children: [
            { name: 'Support',     href: `${root}/support` },
            { name: 'My feedback', href: `${root}/feedback` },
            { name: 'Settings',    href: `${root}/settings` },
          ],
        },
      ];

    case 'billing':
      return [
        { name: 'Overview', icon: LayoutDashboard, basePath: root, children: [{ name: 'Overview', href: root }] },
        { name: 'Tickets', icon: MessageSquare, basePath: `${root}/tickets`, children: [{ name: 'Tickets', href: `${root}/tickets` }] },
        {
          name: 'Subscriptions',
          icon: CreditCard,
          basePath: `${root}/subs-group`,
          children: [
            { name: 'Subscriptions', href: `${root}/subscriptions` },
            { name: 'Payment Issues', href: `${root}/payment-issues` },
          ],
        },
        {
          name: 'Payouts',
          icon: TrendingUp,
          basePath: `${root}/payouts-group`,
          children: [
            { name: 'Agent Payouts', href: `${root}/invoices` },
            { name: 'Commissions', href: `${root}/commissions` },
          ],
        },
        {
          name: 'Clients',
          icon: Users,
          basePath: `${root}/clients-group`,
          children: [
            { name: 'Client Lookup', href: `${root}/client-lookup` },
            { name: 'WL partners',   href: `${root}/wl-partners`, icon: Share2 },
          ],
        },
        {
          name: 'Reconciliation',
          icon: GitCompare,
          basePath: `${root}/reconciliation`,
          children: [{ name: 'Reconciliation', href: `${root}/reconciliation` }],
        },
        {
          name: 'Support',
          icon: LifeBuoy,
          basePath: `${root}/support-group`,
          children: [
            { name: 'Support',     href: `${root}/support` },
            { name: 'My feedback', href: `${root}/feedback` },
            { name: 'Settings',    href: `${root}/settings` },
          ],
        },
      ];

    case 'tech':
      return [
        { name: 'Overview', icon: LayoutDashboard, basePath: root, children: [{ name: 'Overview', href: root }] },
        { name: 'Tickets', icon: MessageSquare, basePath: `${root}/tickets`, children: [{ name: 'Tickets', href: `${root}/tickets` }] },
        { name: 'Issues', icon: ClipboardList, basePath: `${root}/issues`, children: [{ name: 'System Issues', href: `${root}/issues` }] },
        { name: 'Knowledge Base', icon: FileText, basePath: `${root}/knowledge-base`, children: [{ name: 'Knowledge Base', href: `${root}/knowledge-base` }] },
        { name: 'Chat Deployments', icon: MessageCircle, basePath: `${root}/chat-deployments`, children: [{ name: 'Chat Deployments', href: `${root}/chat-deployments` }] },
        {
          name: 'Support',
          icon: LifeBuoy,
          basePath: `${root}/support-group`,
          children: [
            { name: 'Support',     href: `${root}/support` },
            { name: 'My feedback', href: `${root}/feedback` },
            { name: 'Settings',    href: `${root}/settings` },
          ],
        },
      ];
  }
}

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  sales: 'Sales Rep',
  agent: 'Agent',
  supervisor: 'Supervisor',
  billing: 'Billing Staff',
  tech: 'Tech Support',
};

export const STAFF_PORTAL_TITLES: Record<StaffRole, string> = {
  sales: 'Sales Portal',
  agent: 'Agent Portal',
  supervisor: 'Supervisor Portal',
  billing: 'Billing Portal',
  tech: 'Tech Support Portal',
};
