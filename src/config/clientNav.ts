import {
  LayoutDashboard,
  ClipboardList,
  Phone,
  FileText,
  Calendar,
  CreditCard,
  LifeBuoy,
  Settings,
  PhoneOutgoing,
  Gift,
  MessageSquare,
  Layers,
} from 'lucide-react';
import type { NavGroup } from '@/components/navigation/types';

export const clientRoot = '/client-dashboard';

export const clientNavGroups: NavGroup[] = [
  {
    name: 'Overview',
    icon: LayoutDashboard,
    basePath: clientRoot,
    children: [{ name: 'Overview', href: clientRoot }],
  },
  {
    name: 'Account Setup',
    icon: ClipboardList,
    basePath: `${clientRoot}/setup`,
    children: [{ name: 'Account Setup', href: `${clientRoot}/setup` }],
  },
  {
    name: 'Calls',
    icon: Phone,
    basePath: `${clientRoot}/calls`,
    children: [
      { name: 'Call Logs',  href: `${clientRoot}/calls` },
      { name: 'Outbound',   href: `${clientRoot}/calls/outbound` },
      { name: 'Campaigns',  href: `${clientRoot}/calls/campaigns` },
    ],
  },
  {
    name: 'Scripts',
    icon: FileText,
    basePath: `${clientRoot}/scripts`,
    children: [{ name: 'Scripts', href: `${clientRoot}/scripts` }],
  },
  {
    name: 'Schedule',
    icon: Calendar,
    basePath: `${clientRoot}/schedule`,
    children: [{ name: 'Schedule', href: `${clientRoot}/schedule` }],
  },
  {
    name: 'Billing',
    icon: CreditCard,
    basePath: `${clientRoot}/billing-group`,
    children: [
      { name: 'Billing', href: `${clientRoot}/billing` },
      { name: 'Referrals', href: `${clientRoot}/referrals` },
    ],
  },
  {
    name: 'Support',
    icon: LifeBuoy,
    basePath: `${clientRoot}/support`,
    children: [{ name: 'Support', href: `${clientRoot}/support` }],
  },
  {
    name: 'Feedback',
    icon: MessageSquare,
    basePath: `${clientRoot}/feedback`,
    children: [{ name: 'My Feedback', href: `${clientRoot}/feedback` }],
  },
  {
    name: 'Settings',
    icon: Settings,
    basePath: `${clientRoot}/settings`,
    children: [{ name: 'Settings', href: `${clientRoot}/settings` }],
  },
];
