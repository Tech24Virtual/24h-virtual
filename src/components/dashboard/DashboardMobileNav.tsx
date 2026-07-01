import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import logoBlue from '@/assets/logos/logo-blue.png';
import { clientNavGroups } from '@/config/clientNav';

// Flatten nav groups into a single list, preserving group icons
const links = clientNavGroups.flatMap(group =>
  group.children.map(child => ({
    name: child.name,
    href: child.href,
    icon: group.icon,
  }))
);

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

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <link.icon className="w-5 h-5 shrink-0" />
              {link.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
