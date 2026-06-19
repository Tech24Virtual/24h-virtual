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
  Inbox,
  GraduationCap,
  LifeBuoy,
  Share2,
  ClipboardCheck,
  GitCompare,
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
          basePath: `${root}/pipeline-group`,
          children: [
            { name: 'Leads', href: `${root}/leads` },
            { name: 'Pipeline', href: `${root}/pipeline` },
          ],
        },
        {
          name: 'Activity',
          icon: Calendar,
          basePath: `${root}/activity-group`,
          children: [
            { name: 'Meetings', href: `${root}/meetings` },
            { name: 'Proposals', href: `${root}/proposals` },
          ],
        },
        { name: 'Performance', icon: TrendingUp, basePath: `${root}/performance`, children: [{ name: 'Performance', href: `${root}/performance` }] },
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

    case 'agent':
      return [
        { name: 'Overview', icon: LayoutDashboard, basePath: root, children: [{ name: 'Overview', href: root }] },
        {
          name: 'Workspace',
          icon: MessageSquareText,
          basePath: `${root}/workspace-group`,
          children: [
            { name: 'Workspace', href: `${root}/workspace` },
            { name: 'Messages', href: `${root}/messages` },
            { name: 'Tasks', href: `${root}/tasks` },
          ],
        },
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
            { name: 'Calendar', href: `${root}/calendar` },
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
          name: 'Team',
          icon: Users,
          basePath: `${root}/team-group`,
          children: [
            { name: 'Agents', href: `${root}/agents` },
            { name: 'Onboarding', href: `${root}/agent-onboarding` },
            { name: 'Assignments', href: `${root}/client-assignments` },
            { name: 'Schedule', href: `${root}/schedule` },
          ],
        },
        {
          name: 'Quality',
          icon: TrendingUp,
          basePath: `${root}/quality-group`,
          children: [
            { name: 'Performance', href: `${root}/performance` },
            { name: 'Shift Reviews', href: `${root}/shift-reviews` },
            { name: 'Script Reviews', href: `${root}/script-reviews` },
            { name: 'Escalations', href: `${root}/escalations` },
          ],
        },
        {
          name: 'Training',
          icon: GraduationCap,
          basePath: `${root}/training-group`,
          children: [
            { name: 'Signoffs', href: `${root}/training-signoffs` },
            { name: 'Go-Live Approvals', href: `${root}/go-live` },
          ],
        },
        {
          name: 'Fulfillment',
          icon: Inbox,
          basePath: `${root}/fulfillment`,
          children: [{ name: 'Fulfillment', href: `${root}/fulfillment` }],
        },
        {
          name: 'Comms',
          icon: MessagesSquare,
          basePath: `${root}/comms-group`,
          children: [
            { name: 'Tickets', href: `${root}/tickets` },
            { name: 'Messages', href: `${root}/messages` },
            { name: 'Tasks', href: `${root}/tasks` },
            { name: 'Outbound', href: `${root}/outbound-calls` },
          ],
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
