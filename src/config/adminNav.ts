import {
  LayoutDashboard,
  Building2,
  Layers,
  BarChart3,
  Share2,
  Settings,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavTab {
  name: string;
  href: string;
}

export interface AdminNavTabCluster {
  name: string;
  tabs: AdminNavTab[];
}

export interface AdminSystemItem {
  name: string;
  href: string;
  /** Short hint shown in System popover. */
  hint?: string;
}

export interface AdminNavGroup {
  name: string;
  icon: LucideIcon;
  /** Where the rail item navigates on click. Omit for tray-only entries. */
  href?: string;
  /** Simple horizontal tabs (used when tabClusters is unset). */
  tabs?: AdminNavTab[];
  /** Two-row clustered tabs: cluster row + secondary tabs of active cluster. */
  tabClusters?: AdminNavTabCluster[];
  /** When true, rail item is a popover trigger (System tray) — no navigation. */
  isSystemTray?: boolean;
  systemItems?: AdminSystemItem[];
  /** Extra hrefs that should keep this rail item active (e.g. detail routes). */
  extraActiveHrefs?: string[];
}

/**
 * Final 6-item Admin rail (Supabase-style hybrid shell).
 * - No URL renames; every existing /admin/* route is reachable.
 * - System is a tray popover, not a content destination.
 * - Campaign OS uses clustered horizontal tabs to avoid one bloated row.
 */
export const adminNavGroups: AdminNavGroup[] = [
  {
    name: 'Overview',
    icon: LayoutDashboard,
    href: '/admin',
  },
  {
    name: 'Accounts',
    icon: Building2,
    href: '/admin/clients',
    tabs: [
      { name: 'Active', href: '/admin/clients' },
      { name: 'Leads', href: '/admin/leads' },
      { name: 'CRM', href: '/admin/crm' },
      { name: 'Outbound', href: '/admin/outbound-calls' },
      { name: 'Billing', href: '/admin/billing' },
      { name: 'Tickets', href: '/admin/tickets' },
      { name: 'Fulfillment', href: '/admin/fulfillment-intake' },
      { name: 'Agents', href: '/admin/agents' },
      { name: 'Users', href: '/admin/users' },
      { name: 'Support', href: '/admin/support' },
    ],
  },
  {
    name: 'Campaign OS',
    icon: Layers,
    href: '/admin/campaign-os',
    tabClusters: [
      {
        name: 'Catalog',
        tabs: [
          { name: 'Overview', href: '/admin/campaign-os' },
          { name: 'Active Accounts', href: '/admin/campaign-os/clients' },
          { name: 'Locations', href: '/admin/campaign-os/locations' },
          { name: 'Campaigns', href: '/admin/campaign-os/campaigns' },
          { name: 'Templates', href: '/admin/campaign-os/templates' },
        ],
      },
      {
        name: 'Operations',
        tabs: [
          { name: 'Call Flows', href: '/admin/campaign-os/call-flows' },
          { name: 'Drafts Review', href: '/admin/campaign-os/drafts' },
          { name: 'Defaults Catalog', href: '/admin/campaign-os/defaults' },
          { name: 'Readiness', href: '/admin/campaign-os/readiness' },
        ],
      },
      {
        name: 'Reporting',
        tabs: [
          { name: 'Reporting', href: '/admin/campaign-os/reporting' },
        ],
      },
      {
        name: 'Integrations',
        tabs: [
          { name: 'Five9 Mappings', href: '/admin/campaign-os/five9' },
          { name: 'Fields', href: '/admin/campaign-os/fields' },
          { name: 'FAQs', href: '/admin/campaign-os/faqs' },
          { name: 'Policies', href: '/admin/campaign-os/policies' },
        ],
      },
    ],
    extraActiveHrefs: ['/admin/campaigns'],
  },
  {
    name: 'Insights',
    icon: BarChart3,
    href: '/admin/intelligence',
    tabs: [
      { name: 'Intelligence', href: '/admin/intelligence' },
      { name: 'Analytics', href: '/admin/analytics' },
      { name: 'Growth Hub', href: '/admin/growth-hub' },
      { name: 'Blog', href: '/admin/blog' },
      { name: 'Keywords', href: '/admin/keywords' },
      { name: 'Discoverability', href: '/admin/discoverability' },
    ],
  },
  {
    name: 'Partners',
    icon: Share2,
    href: '/admin/partners',
    tabs: [
      { name: 'WL Partners', href: '/admin/partners' },
      { name: 'WL Health', href: '/admin/wl-health' },
      { name: 'WL Leak Audit', href: '/admin/wl-leak-audit' },
      { name: 'WL Config Diff', href: '/admin/wl-config-diff' },
      { name: 'WL Preview', href: '/admin/wl-preview' },
      { name: 'Impersonate', href: '/admin/wl-portals' },
    ],
  },
  {
    name: 'HR Portal',
    icon: UserCheck,
    href: '/hr-portal',
  },
  {
    name: 'System',
    icon: Settings,
    isSystemTray: true,
    systemItems: [
      { name: 'Settings', href: '/admin/settings', hint: 'Platform configuration' },
      { name: 'Launch Controls', href: '/admin/launch-controls', hint: 'Feature flags & gates' },
      { name: 'Mission Control', href: '/admin/mission-control', hint: 'Cross-cutting ops view' },
      { name: 'Launch Checklist', href: '/admin/launch-checklist', hint: 'Pre-launch verification' },
      { name: 'Audit Log', href: '/admin/audit-log', hint: 'System-wide activity trail' },
      { name: 'Feedback Queue', href: '/admin/feedback', hint: 'Cross-dashboard product feedback intake' },
      { name: 'Product Testing', href: '/admin/settings/product-testing', hint: 'QA harness, seed_qa_state' },
      { name: 'Architecture', href: '/admin/architecture', hint: 'System architecture map' },
    ],
  },
];

/**
 * Collect every href that should highlight a given rail item.
 */
function hrefsForGroup(group: AdminNavGroup): string[] {
  const out: string[] = [];
  if (group.href) out.push(group.href);
  if (group.tabs) out.push(...group.tabs.map((t) => t.href));
  if (group.tabClusters) {
    for (const c of group.tabClusters) out.push(...c.tabs.map((t) => t.href));
  }
  if (group.systemItems) out.push(...group.systemItems.map((i) => i.href));
  if (group.extraActiveHrefs) out.push(...group.extraActiveHrefs);
  return out;
}

/**
 * Find active rail item via longest-prefix match across every href the group owns.
 * Bare /admin matches Overview only when path is exactly /admin.
 */
export function findActiveGroup(pathname: string): AdminNavGroup | null {
  if (pathname === '/admin' || pathname === '/admin/') {
    return adminNavGroups[0];
  }

  let best: { group: AdminNavGroup; length: number } | null = null;
  for (const group of adminNavGroups) {
    for (const href of hrefsForGroup(group)) {
      if (href === '/admin') continue;
      if (pathname === href || pathname.startsWith(href + '/')) {
        if (!best || href.length > best.length) {
          best = { group, length: href.length };
        }
      }
    }
  }
  return best?.group ?? null;
}

/**
 * For a Campaign OS-style group, identify which cluster contains the active route.
 * Returns first cluster as fallback.
 */
/** Flatten every navigable href for the command palette. */
export function adminPaletteEntries() {
  const entries: { id: string; label: string; href: string; group: string }[] = [];
  for (const group of adminNavGroups) {
    if (group.href) {
      entries.push({ id: `${group.name}-root`, label: group.name, href: group.href, group: group.name });
    }
    if (group.tabs) {
      for (const t of group.tabs) {
        entries.push({ id: t.href, label: `${group.name} › ${t.name}`, href: t.href, group: group.name });
      }
    }
    if (group.tabClusters) {
      for (const c of group.tabClusters) {
        for (const t of c.tabs) {
          entries.push({
            id: t.href,
            label: `${group.name} › ${c.name} › ${t.name}`,
            href: t.href,
            group: group.name,
          });
        }
      }
    }
    if (group.systemItems) {
      for (const i of group.systemItems) {
        entries.push({ id: i.href, label: `System › ${i.name}`, href: i.href, group: 'System' });
      }
    }
  }
  return entries;
}
