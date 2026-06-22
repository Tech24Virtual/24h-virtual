import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UtilityTray } from '@/components/navigation/UtilityTray';
import { findActiveGroup, type NavGroup } from '@/components/navigation/types';
import logoBlue from '@/assets/logos/logo-blue.png';
import { Skeleton } from '@/components/ui/skeleton';

interface DrilldownSidebarProps {
  groups: NavGroup[];
  rootPath?: string;
  /** Label shown in the utility tray (e.g. "Agent", "HR"). */
  roleLabel?: string;
  /** Optional small badge rendered next to the wordmark when expanded (e.g. Partner). */
  logoBadge?: ReactNode;
  /** Optional custom logo (defaults to 24H Virtual). For tenant branding. */
  logoSrc?: string;
  /** Alt text for custom logo. */
  logoAlt?: string;
  /** Optional brand tag rendered under the wordmark. */
  brandTag?: string;
  /** Optional renderer for extra content inside an active rail row (e.g. shift timer). */
  renderGroupExtra?: (group: NavGroup) => ReactNode;
  /** Optional renderer for a badge overlay on the group icon (e.g. notification counts). */
  renderGroupBadge?: (group: NavGroup) => ReactNode;
  /** When true and no logoSrc is provided, suppress the default 24H logo entirely. */
  suppressDefaultLogo?: boolean;
  /** When true, renders a shimmer skeleton in the logo area instead of the logo or default. */
  logoLoading?: boolean;
  /** Optional back link rendered above the nav items (e.g. "Back to Admin"). */
  backLink?: { label: string; href: string };
  /** When set, renders a "Preview client portal" footer link in the section panel. */
  portalPreviewUrl?: string;
}

function BrandHeader({
  compact = false,
  logoSrc = logoBlue,
  logoAlt = '24H Virtual',
  badge,
  tag,
  suppressDefaultLogo = false,
  logoLoading = false,
}: {
  compact?: boolean;
  logoSrc?: string;
  logoAlt?: string;
  badge?: ReactNode;
  tag?: string;
  suppressDefaultLogo?: boolean;
  logoLoading?: boolean;
}) {
  const resolvedLogoSrc = suppressDefaultLogo && !logoSrc ? undefined : (logoSrc ?? logoBlue);
  return (
    <div
      className={cn(
        'h-[65px] border-b shrink-0 flex flex-col justify-center',
        compact ? 'items-center px-2 group-hover/rail:items-start group-hover/rail:px-3' : 'items-start px-4'
      )}
    >
      {logoLoading ? (
        <Skeleton className={cn(
          'h-7 rounded',
          compact
            ? 'w-7 group-hover/rail:w-[100px] transition-[width] duration-200 ease-out'
            : 'w-[120px]'
        )} />
      ) : (
        <>
          <Link to="/" className="flex min-w-0 items-center gap-2">
            {compact && resolvedLogoSrc && (
              <img
                src={resolvedLogoSrc}
                alt={logoAlt}
                className="h-8 w-8 shrink-0 object-contain group-hover/rail:hidden"
              />
            )}
            {resolvedLogoSrc && (
              <img
                src={resolvedLogoSrc}
                alt={compact ? '' : logoAlt}
                aria-hidden={compact}
                className={cn(
                  'h-7 max-w-[160px] shrink-0 object-contain transition-opacity duration-150',
                  compact ? 'hidden opacity-0 group-hover/rail:block group-hover/rail:opacity-100' : ''
                )}
              />
            )}
            {badge && !compact && badge}
            {badge && compact && (
              <span className="hidden group-hover/rail:inline">{badge}</span>
            )}
          </Link>
          {tag && !compact && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{tag}</span>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Generic drill-down sidebar shared by every non-admin dashboard.
 * Mirrors AdminSidebar UX:
 *   - rail (w-14) with hover-expand to w-56
 *   - click a group with >1 children to drill into a vertical submenu (w-60)
 *   - Back button sits below a persistent BrandHeader
 *   - UtilityTray docked at the bottom
 *
 * Single-child groups behave as direct navigation (no drill-down).
 */
export function DrilldownSidebar({
  groups,
  rootPath,
  roleLabel = '',
  logoBadge,
  logoSrc,
  logoAlt,
  brandTag,
  renderGroupExtra,
  renderGroupBadge,
  suppressDefaultLogo,
  logoLoading,
  backLink,
  portalPreviewUrl,
}: DrilldownSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeGroup = findActiveGroup(location.pathname, groups, rootPath);

  const [collapsedFor, setCollapsedFor] = useState<string | null>(null);

  useEffect(() => {
    if (collapsedFor && activeGroup?.name !== collapsedFor) {
      setCollapsedFor(null);
    }
  }, [activeGroup?.name, collapsedFor]);

  const hasChildren = (g: NavGroup | null | undefined) =>
    !!(g && g.children && g.children.length > 1);

  const inSection =
    !!activeGroup && hasChildren(activeGroup) && collapsedFor !== activeGroup.name;

  const isTabActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const handleRailClick = (group: NavGroup) => {
    if (hasChildren(group)) {
      setCollapsedFor(null);
      const target = group.defaultHref ?? group.children[0]?.href ?? group.basePath;
      if (target) navigate(target);
    } else {
      const target = group.defaultHref ?? group.children[0]?.href ?? group.basePath;
      if (target) navigate(target);
    }
  };

  // ---------- SECTION (drilled-in) ----------
  if (inSection && activeGroup) {
    const Icon = activeGroup.icon;
    return (
      <aside className="hidden lg:flex w-60 flex-col bg-card border-r h-screen sticky top-0">
        <BrandHeader logoSrc={logoSrc} logoAlt={logoAlt} badge={logoBadge} tag={brandTag} suppressDefaultLogo={suppressDefaultLogo} logoLoading={logoLoading} />

        {backLink && (
          <div className="px-4 pt-3 pb-1 shrink-0">
            <Link
              to={backLink.href}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {backLink.label}
            </Link>
          </div>
        )}

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
          {activeGroup.children.map((child) => (
            <Link
              key={child.href}
              to={child.href}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                isTabActive(child.href)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {child.name}
              {child.badge && child.badge > 0 ? (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold shrink-0">
                  {child.badge > 9 ? '9+' : child.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        {portalPreviewUrl && (
          <a
            href={`${portalPreviewUrl}/login`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors mx-2 mb-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview client portal
          </a>
        )}
        <UtilityTray roleLabel={roleLabel} />
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
      <BrandHeader compact logoSrc={logoSrc} logoAlt={logoAlt} badge={logoBadge} tag={brandTag} suppressDefaultLogo={suppressDefaultLogo} logoLoading={logoLoading} />

      {backLink && (
        <div className="px-2 pt-2 pb-1 shrink-0 overflow-hidden">
          <Link
            to={backLink.href}
            className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={backLink.label}
          >
            <ArrowLeft className="w-5 h-5 shrink-0" />
            <span className="whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity">
              {backLink.label}
            </span>
          </Link>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-1 overflow-hidden">
        {groups.map((group) => {
          const Icon = group.icon;
          const isActive = activeGroup?.name === group.name;
          // Auto-dot: show a red dot on the group icon when any child has a pending badge.
          // renderGroupBadge (if provided) takes precedence for custom badge content.
          const childBadgeSum = group.children.reduce((sum, c) => sum + (c.badge ?? 0), 0);
          const customBadge = renderGroupBadge?.(group);
          const groupDot = !customBadge && childBadgeSum > 0
            ? <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-card" />
            : null;
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
              <span className="relative shrink-0">
                <Icon className="w-5 h-5" />
                {customBadge ?? groupDot}
              </span>
              <span className="whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity flex-1 text-left">
                {group.name}
              </span>
              {isActive && renderGroupExtra && (
                <span className="opacity-0 group-hover/rail:opacity-100 transition-opacity">
                  {renderGroupExtra(group)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <UtilityTray roleLabel={roleLabel} compact />
    </aside>
  );
}
