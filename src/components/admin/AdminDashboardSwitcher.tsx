import { Link, useLocation } from 'react-router-dom';
import { Grid, Shield, User, Share2, FileText, TrendingUp, Headphones, Users, CreditCard, Wrench, Building2, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// Real role-surface dashboards
const dashboards = [
  { name: 'Admin', href: '/admin', icon: Shield },
  { name: 'Clients', href: '/client-dashboard', icon: User },
  { name: 'White Label', href: '/white-label-dashboard', icon: Building2 },
  { name: 'Affiliates', href: '/affiliate', icon: Share2 },
  { name: 'HR', href: '/hr-portal', icon: FileText },
  { name: 'Sales Team', href: '/staff/sales', icon: TrendingUp },
  { name: 'Supervisors', href: '/staff/supervisor', icon: Users },
  { name: 'Agents', href: '/staff/agent', icon: Headphones },
  { name: 'Billing', href: '/staff/billing', icon: CreditCard },
  { name: 'Tech Support', href: '/staff/tech', icon: Wrench },
];

// Admin-only impersonation / helper tools (NOT real dashboards)
const tools = [
  { name: 'WL Portals (Impersonation)', href: '/admin/wl-portals', icon: Monitor },
];

export function AdminDashboardSwitcher() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAdmin) return null;

  const renderItem = (item: { name: string; href: string; icon: typeof Shield }) => {
    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => setIsOpen(false)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        )}
      >
        <item.icon className="w-4 h-4" />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button size="lg" className="rounded-full w-14 h-14 shadow-lg">
            <Grid className="w-6 h-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 p-2">
          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dashboards
          </div>
          <div className="space-y-1">
            {dashboards.map(renderItem)}
          </div>

          <div className="my-2 border-t" />

          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Admin Tools
          </div>
          <div className="space-y-1">
            {tools.map(renderItem)}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
