import { useMemo } from 'react';
import {
  LayoutDashboard,
  Activity,
  Phone,
  PhoneOutgoing,
  FileText,
  Calendar,
  CreditCard,
  LifeBuoy,
  Settings,
  Users,
  Star,
  Megaphone,
  MessageSquare,
} from 'lucide-react';
import { DrilldownSidebar } from '@/components/navigation/DrilldownSidebar';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { wlClientUrl } from '@/lib/wlClientUrl';
import { isModuleEnabled, type WLModuleSlug } from '@/lib/wlModuleVisibility';
import type { NavGroup, NavChild } from '@/components/navigation/types';

export function WLPortalSidebar() {
  const { slug, branding, enabledModules, loading } = useWLPortal();

  const groups = useMemo<NavGroup[]>(() => {
    const root = wlClientUrl(slug);
    const enabled = (m: WLModuleSlug) => isModuleEnabled(enabledModules, m);

    // Build per-IA: Activity · Calls · Scripts · Schedule · Billing (+ Support, Settings)
    const callsChildren: NavChild[] = [];
    if (enabled('calls')) callsChildren.push({ name: 'Call Logs', href: wlClientUrl(slug, 'calls') });
    if (enabled('outbound-requests')) callsChildren.push({ name: 'Outbound', href: wlClientUrl(slug, 'outbound-requests') });
    if (enabled('leads')) callsChildren.push({ name: 'Leads', href: wlClientUrl(slug, 'leads') });

    const scriptsChildren: NavChild[] = [];
    if (enabled('scripts')) scriptsChildren.push({ name: 'Scripts', href: wlClientUrl(slug, 'scripts') });
    if (enabled('campaigns')) scriptsChildren.push({ name: 'Campaigns', href: wlClientUrl(slug, 'campaigns') });

    const billingChildren: NavChild[] = [];
    if (enabled('billing')) billingChildren.push({ name: 'Billing', href: wlClientUrl(slug, 'billing') });
    if (enabled('reviews')) billingChildren.push({ name: 'Reviews', href: wlClientUrl(slug, 'reviews') });

    const groups: NavGroup[] = [];

    if (enabled('dashboard')) {
      groups.push({ name: 'Overview', icon: LayoutDashboard, basePath: root, children: [{ name: 'Overview', href: root }] });
    }
    if (enabled('activity')) {
      groups.push({ name: 'Activity', icon: Activity, basePath: wlClientUrl(slug, 'activity'), children: [{ name: 'Activity', href: wlClientUrl(slug, 'activity') }] });
    }
    if (callsChildren.length) {
      groups.push({ name: 'Calls', icon: Phone, basePath: `${root}/calls-group`, children: callsChildren });
    }
    if (scriptsChildren.length) {
      groups.push({ name: 'Scripts', icon: FileText, basePath: `${root}/scripts-group`, children: scriptsChildren });
    }
    if (enabled('schedule')) {
      groups.push({ name: 'Schedule', icon: Calendar, basePath: wlClientUrl(slug, 'schedule'), children: [{ name: 'Schedule', href: wlClientUrl(slug, 'schedule') }] });
    }
    if (billingChildren.length) {
      groups.push({ name: 'Billing', icon: CreditCard, basePath: `${root}/billing-group`, children: billingChildren });
    }
    if (enabled('support')) {
      groups.push({ name: 'Support', icon: LifeBuoy, basePath: wlClientUrl(slug, 'support'), children: [{ name: 'Support', href: wlClientUrl(slug, 'support') }] });
    }
    groups.push({ name: 'Feedback', icon: MessageSquare, basePath: wlClientUrl(slug, 'feedback'), children: [{ name: 'Feedback', href: wlClientUrl(slug, 'feedback') }] });
    
    if (enabled('settings')) {
      groups.push({ name: 'Settings', icon: Settings, basePath: wlClientUrl(slug, 'settings'), children: [{ name: 'Settings', href: wlClientUrl(slug, 'settings') }] });
    }

    return groups;
  }, [slug, enabledModules]);

  return (
    <DrilldownSidebar
      groups={groups}
      rootPath={wlClientUrl(slug)}
      brandTag={branding?.company_name || 'Client Portal'}
      roleLabel="Client"
      logoSrc={branding?.logo_url || undefined}
      logoAlt={branding?.company_name || 'Client Portal'}
      suppressDefaultLogo
      logoLoading={loading}
    />
  );
}
