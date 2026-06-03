import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { findActiveGroup, type NavGroup } from './types';

interface DashboardSubNavProps {
  groups: NavGroup[];
  rootPath?: string;
}

export function DashboardSubNav({ groups, rootPath }: DashboardSubNavProps) {
  const location = useLocation();
  const activeGroup = findActiveGroup(location.pathname, groups, rootPath);

  if (!activeGroup || activeGroup.children.length <= 1) {
    return null;
  }

  return (
    <div className="border-b bg-card">
      <nav className="flex gap-1 px-6 lg:px-8 overflow-x-auto scrollbar-thin">
        {activeGroup.children.map((child) => {
          const isActive =
            location.pathname === child.href ||
            location.pathname.startsWith(child.href + '/');
          return (
            <NavLink
              key={child.href}
              to={child.href}
              className={cn(
                'whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {child.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
