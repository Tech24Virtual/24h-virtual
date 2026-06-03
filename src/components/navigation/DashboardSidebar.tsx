import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import logoBlue from '@/assets/logos/logo-blue.png';
import { findActiveGroup, type NavGroup } from './types';

export interface DashboardSidebarProps {
  groups: NavGroup[];
  rootPath?: string;
  /** Small label shown under the logo (e.g. "Partner Portal", "HR Portal") */
  brandTag?: string;
  /** Role label shown next to the user email in the footer */
  footerRoleLabel?: string;
  /** Optional extra content rendered inside an active group row (e.g. shift timer) */
  renderGroupExtra?: (group: NavGroup) => ReactNode;
  /** Sidebar width Tailwind class — defaults to w-56 */
  widthClass?: string;
  /** Optional custom badge for partner branding next to logo */
  logoBadge?: ReactNode;
}

export function DashboardSidebar({
  groups,
  rootPath,
  brandTag,
  footerRoleLabel,
  renderGroupExtra,
  widthClass = 'w-56',
  logoBadge,
}: DashboardSidebarProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const activeGroup = findActiveGroup(location.pathname, groups, rootPath);

  return (
    <aside className={cn('hidden lg:flex flex-col bg-card border-r', widthClass)}>
      <div className="p-6 border-b">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoBlue} alt="24H Virtual" className="h-8" />
          {logoBadge}
        </Link>
        {brandTag && <p className="text-xs text-muted-foreground mt-2">{brandTag}</p>}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {groups.map((group) => {
          const isActive = activeGroup?.name === group.name;
          const href = group.defaultHref ?? group.children[0]?.href ?? group.basePath;
          return (
            <Link
              key={group.name}
              to={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <group.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{group.name}</span>
              {isActive && renderGroupExtra?.(group)}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-medium text-primary">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            {footerRoleLabel && (
              <p className="text-xs text-muted-foreground">{footerRoleLabel}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
