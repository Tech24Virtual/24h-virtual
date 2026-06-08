import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Phone,
  FileText,
  Calendar,
  CreditCard,
  LifeBuoy,
  MessageSquare,
  Settings,
  Rocket,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import logoBlue from '@/assets/logos/logo-blue.png';

const links = [
  { name: 'Dashboard', href: '/client-dashboard', icon: LayoutDashboard },
  { name: 'Account Setup', href: '/client-dashboard/setup', icon: ClipboardList },
  { name: 'Go-Live Readiness', href: '/client-dashboard/readiness', icon: Rocket },
  { name: 'Call Logs', href: '/client-dashboard/calls', icon: Phone },
  { name: 'Scripts', href: '/client-dashboard/scripts', icon: FileText },
  { name: 'Schedule', href: '/client-dashboard/schedule', icon: Calendar },
  { name: 'Billing', href: '/client-dashboard/billing', icon: CreditCard },
  { name: 'Support', href: '/client-dashboard/support', icon: LifeBuoy },
  { name: 'Feedback', href: '/client-dashboard/feedback', icon: MessageSquare },
  { name: 'Settings', href: '/client-dashboard/settings', icon: Settings },
];

interface DashboardMobileNavProps {
  onClose: () => void;
}

export function DashboardMobileNav({ onClose }: DashboardMobileNavProps) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <Link to="/" onClick={onClose}>
          <img src={logoBlue} alt="24H Virtual" className="h-8" />
        </Link>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
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
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
