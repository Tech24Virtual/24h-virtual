import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Phone,
  PhoneOutgoing,
  FileText,
  Calendar,
  CreditCard,
  LifeBuoy,
  Settings,
  Activity,
  Users,
  Star,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { wlClientUrl } from '@/lib/wlClientUrl';
import { isModuleEnabled, type WLModuleSlug } from '@/lib/wlModuleVisibility';

interface WLPortalMobileNavProps {
  onClose: () => void;
}

export function WLPortalMobileNav({ onClose }: WLPortalMobileNavProps) {
  const location = useLocation();
  const { slug, branding, enabledModules } = useWLPortal();
  const sidebarStyle = branding?.sidebar_style || 'light';
  const primaryColor = branding?.primary_color;

  const allLinks: Array<{ name: string; href: string; icon: typeof LayoutDashboard; module: WLModuleSlug }> = [
    { name: 'Dashboard', href: wlClientUrl(slug), icon: LayoutDashboard, module: 'dashboard' },
    { name: 'Activity', href: wlClientUrl(slug, 'activity'), icon: Activity, module: 'activity' },
    { name: 'Call Logs', href: wlClientUrl(slug, 'calls'), icon: Phone, module: 'calls' },
    { name: 'Leads', href: wlClientUrl(slug, 'leads'), icon: Users, module: 'leads' },
    { name: 'Scripts', href: wlClientUrl(slug, 'scripts'), icon: FileText, module: 'scripts' },
    { name: 'Schedule', href: wlClientUrl(slug, 'schedule'), icon: Calendar, module: 'schedule' },
    { name: 'Outbound Calls', href: wlClientUrl(slug, 'outbound-requests'), icon: PhoneOutgoing, module: 'outbound-requests' },
    { name: 'Reviews', href: wlClientUrl(slug, 'reviews'), icon: Star, module: 'reviews' },
    { name: 'Campaigns', href: wlClientUrl(slug, 'campaigns'), icon: Megaphone, module: 'campaigns' },
    { name: 'Billing', href: wlClientUrl(slug, 'billing'), icon: CreditCard, module: 'billing' },
    { name: 'Support', href: wlClientUrl(slug, 'support'), icon: LifeBuoy, module: 'support' },
    { name: 'Settings', href: wlClientUrl(slug, 'settings'), icon: Settings, module: 'settings' },
  ];

  const links = allLinks.filter(l => isModuleEnabled(enabledModules, l.module));

  return (
    <div className={cn(
      'flex flex-col h-full',
      sidebarStyle === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-card'
    )}>
      <div className={cn('p-6 border-b', sidebarStyle === 'dark' && 'border-gray-800')}>
        {branding?.logo_url ? (
          <img src={branding.logo_url} alt={branding.company_name || 'Portal'} className="h-8 max-w-[180px] object-contain" />
        ) : (
          <span className={cn('text-lg font-bold', sidebarStyle === 'dark' ? 'text-white' : 'text-heading')}>
            {branding?.company_name || 'Client Portal'}
          </span>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.name}
              to={link.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                !isActive && (sidebarStyle === 'dark'
                  ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
              )}
              style={isActive && primaryColor ? {
                backgroundColor: `${primaryColor}1a`,
                color: primaryColor,
              } : undefined}
            >
              <link.icon className="w-5 h-5" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {branding?.portal_footer_text && (
        <div className={cn('p-4 text-xs', sidebarStyle === 'dark' ? 'text-gray-500' : 'text-muted-foreground')}>
          {branding.portal_footer_text}
        </div>
      )}
    </div>
  );
}
