import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  adminNavGroups,
  findActiveGroup,
  type AdminNavGroup,
  type AdminNavTab,
} from '@/config/adminNav';
import { UtilityTray } from '@/components/navigation/UtilityTray';
import logoBlue from '@/assets/logos/logo-blue.png';

function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'h-[65px] border-b shrink-0 flex items-center',
        compact ? 'justify-center px-2 group-hover/rail:justify-start group-hover/rail:px-3' : 'px-4'
      )}
    >
      <Link to="/" className="flex min-w-0 items-center gap-2">
        {compact && (
          <img
            src="/logo.png"
            alt="24H Virtual"
            className="h-8 w-8 shrink-0 object-contain group-hover/rail:hidden"
          />
        )}
        <img
          src={logoBlue}
          alt={compact ? '' : '24H Virtual'}
          aria-hidden={compact}
          className={cn(
            'h-7 shrink-0 object-contain transition-opacity duration-150',
            compact ? 'hidden opacity-0 group-hover/rail:block group-hover/rail:opacity-100' : ''
          )}
        />
      </Link>
    </div>
  );
}

/**
 * Supabase-style drill-down sidebar.
 *
 * Two states:
 *   - "rail":    compact 56px icon rail, expands to labels on hover.
 *   - "section": 240px vertical submenu for the active module with a Back button.
 *
 * The sidebar enters "section" automatically when the route belongs to a module
 * with children. The user can press Back to collapse to the rail; navigating to
 * a route in another module re-drills into that module's submenu.
 */
export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeGroup = findActiveGroup(location.pathname);

  // Track the module the user has explicitly "backed out of" so we stay in rail
  // until they navigate elsewhere or click another module.
  const [collapsedFor, setCollapsedFor] = useState<string | null>(null);

  // If the active group changes, clear the collapse flag so we drill in again.
  useEffect(() => {
    if (collapsedFor && activeGroup?.name !== collapsedFor) {
      setCollapsedFor(null);
    }
  }, [activeGroup?.name, collapsedFor]);

  const hasChildren = (g: AdminNavGroup | null | undefined) =>
    !!(g && (g.tabs?.length || g.tabClusters?.length || g.systemItems?.length));

  const inSection =
    !!activeGroup &&
    hasChildren(activeGroup) &&
    collapsedFor !== activeGroup.name;

  // Collect submenu entries (flat list with optional cluster headers).
  const submenuRows = (() => {
    if (!activeGroup) return [];
    type Row =
      | { kind: 'header'; label: string }
      | { kind: 'item'; tab: AdminNavTab };
    const rows: Row[] = [];
    if (activeGroup.tabs) {
      for (const tab of activeGroup.tabs) rows.push({ kind: 'item', tab });
    }
    if (activeGroup.tabClusters) {
      for (const cluster of activeGroup.tabClusters) {
        rows.push({ kind: 'header', label: cluster.name });
        for (const tab of cluster.tabs) rows.push({ kind: 'item', tab });
      }
    }
    if (activeGroup.systemItems) {
      for (const i of activeGroup.systemItems)
        rows.push({ kind: 'item', tab: { name: i.name, href: i.href } });
    }
    return rows;
  })();

  const isTabActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const handleRailClick = (group: AdminNavGroup) => {
    // Drill in if it has children; otherwise just navigate.
    if (hasChildren(group)) {
      setCollapsedFor(null);
      if (group.href) navigate(group.href);
      else if (group.tabs?.[0]) navigate(group.tabs[0].href);
      else if (group.tabClusters?.[0]?.tabs[0])
        navigate(group.tabClusters[0].tabs[0].href);
      else if (group.systemItems?.[0]) navigate(group.systemItems[0].href);
    } else if (group.href) {
      navigate(group.href);
    }
  };

  // ---------- SECTION (drilled-in) ----------
  if (inSection && activeGroup) {
    const Icon = activeGroup.icon;
    return (
      <aside className="hidden lg:flex w-60 flex-col bg-card border-r h-screen sticky top-0">
        <BrandHeader />

        <div className="px-4 py-3 border-b shrink-0 flex items-center gap-2">
          <button
            onClick={() => setCollapsedFor(activeGroup.name)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Back to navigation"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="px-4 py-3 border-b shrink-0 flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{activeGroup.name}</span>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {submenuRows.map((row, idx) =>
            row.kind === 'header' ? (
              <div
                key={`h-${idx}`}
                className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {row.label}
              </div>
            ) : (
              <Link
                key={row.tab.href}
                to={row.tab.href}
                className={cn(
                  'block px-3 py-2 rounded-md text-sm transition-colors',
                  isTabActive(row.tab.href)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {row.tab.name}
              </Link>
            )
          )}
        </nav>

        <UtilityTray roleLabel="Admin" />
      </aside>
    );
  }

  // ---------- RAIL (default, hover-expand) ----------
  return (
    <aside
      className={cn(
        'hidden lg:flex group/rail flex-col bg-card border-r h-screen sticky top-0 overflow-hidden',
        'w-14 hover:w-56 transition-[width] duration-200 ease-out'
      )}
    >
      <BrandHeader compact />

      <nav className="flex-1 p-2 space-y-1 overflow-hidden">
        {adminNavGroups.map((group) => {
          const Icon = group.icon;
          const isActive = activeGroup?.name === group.name;
          return (
            <button
              key={group.name}
              onClick={() => handleRailClick(group)}
              className={cn(
                'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title={group.name}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity">
                {group.name}
              </span>
            </button>
          );
        })}
      </nav>

      <UtilityTray roleLabel="Admin" compact />
    </aside>
  );
}
