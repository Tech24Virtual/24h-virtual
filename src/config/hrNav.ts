import {
  LayoutDashboard,
  Users,
  GitPullRequest,
  UserMinus,
  Landmark,
  CalendarOff,
  Briefcase,
  FileSignature,
  MessageSquare,
  Bot,
  Settings,
  LifeBuoy,
} from 'lucide-react';
import type { NavGroup } from '@/components/navigation/types';

const ROOT = '/hr-portal';

export const hrRoot = ROOT;

export const hrNavGroups: NavGroup[] = [
  {
    name: 'Overview',
    icon: LayoutDashboard,
    basePath: ROOT,
    children: [{ name: 'Overview', href: ROOT }],
  },
  {
    name: 'People',
    icon: Users,
    basePath: `${ROOT}/people`,
    children: [
      { name: 'Directory',   href: `${ROOT}/people/directory` },
      { name: 'Onboarding',  href: `${ROOT}/people/onboarding` },
      { name: 'Offboarding', href: `${ROOT}/people/offboarding` },
    ],
  },
  {
    name: 'Payroll',
    icon: Landmark,
    basePath: `${ROOT}/payroll`,
    children: [
      { name: 'Payroll',  href: `${ROOT}/payroll` },
      { name: 'Time Off', href: `${ROOT}/payroll/time-off` },
    ],
  },
  {
    name: 'Hiring',
    icon: Briefcase,
    basePath: `${ROOT}/hiring`,
    children: [
      { name: 'Job Postings', href: `${ROOT}/hiring/jobs` },
      { name: 'Contracts',    href: `${ROOT}/hiring/contracts` },
    ],
  },
  {
    name: 'Comms',
    icon: MessageSquare,
    basePath: `${ROOT}/comms-group`,
    children: [
      { name: 'Communications', href: `${ROOT}/communications` },
      { name: 'Tickets', href: `${ROOT}/tickets` },
    ],
  },
  {
    name: 'Support',
    icon: LifeBuoy,
    basePath: `${ROOT}/support-group`,
    children: [
      { name: 'Support',  href: `${ROOT}/support` },
      { name: 'Settings', href: `${ROOT}/settings` },
    ],
  },
];
