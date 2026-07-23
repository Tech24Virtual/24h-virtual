import {
  LayoutDashboard,
  Users,
  Layers,
  TrendingUp,
  Settings,
} from 'lucide-react';
import type { NavGroup } from '@/components/navigation/types';

export const whiteLabelRoot = '/white-label-dashboard';

export const whiteLabelNavGroups: NavGroup[] = [
  {
    name: 'Overview',
    icon: LayoutDashboard,
    basePath: whiteLabelRoot,
    children: [
      { name: 'Overview', href: whiteLabelRoot },
    ],
  },
  {
    name: 'Clients',
    icon: Users,
    basePath: `${whiteLabelRoot}/clients`,
    children: [
      { name: 'Clients',    href: `${whiteLabelRoot}/clients` },
      { name: 'Leads',      href: `${whiteLabelRoot}/clients/leads` },
      { name: 'Pipeline',   href: `${whiteLabelRoot}/clients/pipeline` },
      { name: 'Proposals',  href: `${whiteLabelRoot}/clients/proposals` },
      { name: 'Onboarding', href: `${whiteLabelRoot}/clients/onboarding` },
      { name: 'Tasks',      href: `${whiteLabelRoot}/clients/tasks` },
      { name: 'Tickets',    href: `${whiteLabelRoot}/clients/tickets` },
      { name: 'Usage',      href: `${whiteLabelRoot}/clients/usage` },
    ],
  },
  {
    name: 'Campaigns',
    icon: Layers,
    basePath: `${whiteLabelRoot}/campaigns`,
    children: [
      { name: 'Campaigns',      href: `${whiteLabelRoot}/campaigns` },
      { name: 'Campaign OS',    href: `${whiteLabelRoot}/campaigns/campaign-os` },
      { name: 'Knowledge base', href: `${whiteLabelRoot}/campaigns/knowledge-base` },
    ],
  },
  {
    name: 'Growth',
    icon: TrendingUp,
    basePath: `${whiteLabelRoot}/growth`,
    children: [
      { name: 'Growth hub', href: `${whiteLabelRoot}/growth` },
      { name: 'Social',     href: `${whiteLabelRoot}/growth/social` },
      { name: 'Blog',       href: `${whiteLabelRoot}/growth/blog` },
      { name: 'Keywords',   href: `${whiteLabelRoot}/growth/keywords` },
      { name: 'WordPress',  href: `${whiteLabelRoot}/growth/wordpress` },
      { name: 'Newsletter', href: `${whiteLabelRoot}/growth/newsletter` },
      { name: 'Email',      href: `${whiteLabelRoot}/growth/email` },
      { name: 'Reports',    href: `${whiteLabelRoot}/growth/reports` },
    ],
  },
  {
    name: 'Account',
    icon: Settings,
    basePath: `${whiteLabelRoot}/account`,
    children: [
      { name: 'Billing',       href: `${whiteLabelRoot}/account/billing` },
      { name: 'Pricing',       href: `${whiteLabelRoot}/account/pricing` },
      { name: 'Agreements',    href: `${whiteLabelRoot}/account/agreements` },
      { name: 'Branding',      href: `${whiteLabelRoot}/account/branding` },
      { name: 'Custom domain', href: `${whiteLabelRoot}/account/branding/custom-domain` },
      { name: 'Team',          href: `${whiteLabelRoot}/account/team` },
      { name: 'Support',       href: `${whiteLabelRoot}/account/support` },
      { name: 'Feedback',      href: `${whiteLabelRoot}/account/feedback` },
      { name: 'Settings',      href: `${whiteLabelRoot}/account/settings` },
    ],
  },
];
