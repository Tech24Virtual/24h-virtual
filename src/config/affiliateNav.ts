import {
  LayoutDashboard,
  Users,
  DollarSign,
  Megaphone,
  LifeBuoy,
  Settings,
} from 'lucide-react';
import type { NavGroup } from '@/components/navigation/types';

export const affiliateRoot = '/affiliate';

export const affiliateNavGroups: NavGroup[] = [
  {
    name: 'Overview',
    icon: LayoutDashboard,
    basePath: affiliateRoot,
    children: [{ name: 'Overview', href: affiliateRoot }],
  },
  {
    name: 'Referrals',
    icon: Users,
    basePath: `${affiliateRoot}/referrals-group`,
    children: [
      { name: 'Referrals', href: `${affiliateRoot}/referrals` },
      { name: 'Performance', href: `${affiliateRoot}/performance` },
    ],
  },
  {
    name: 'Earnings',
    icon: DollarSign,
    basePath: `${affiliateRoot}/payouts`,
    children: [{ name: 'Payouts', href: `${affiliateRoot}/payouts` }],
  },
  {
    name: 'Marketing',
    icon: Megaphone,
    basePath: `${affiliateRoot}/marketing-group`,
    children: [
      { name: 'Marketing', href: `${affiliateRoot}/marketing` },
      { name: 'Brand Assets', href: `${affiliateRoot}/brand-assets` },
    ],
  },
  {
    name: 'Support',
    icon: LifeBuoy,
    basePath: `${affiliateRoot}/support`,
    children: [{ name: 'Support', href: `${affiliateRoot}/support` }],
  },
  {
    name: 'Settings',
    icon: Settings,
    basePath: `${affiliateRoot}/settings`,
    children: [{ name: 'Settings', href: `${affiliateRoot}/settings` }],
  },
];
