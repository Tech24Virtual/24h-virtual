import type { LucideIcon } from 'lucide-react';

export interface NavChild {
  name: string;
  href: string;
}

export interface NavGroup {
  name: string;
  icon: LucideIcon;
  basePath: string;
  /** When set, sidebar group click jumps to this href instead of children[0].href */
  defaultHref?: string;
  children: NavChild[];
}

/**
 * Find the active group by longest matching child href.
 * `rootPath` is the dashboard's bare base (e.g. /admin, /hr-portal) which maps to first group.
 */
export function findActiveGroup(
  pathname: string,
  groups: NavGroup[],
  rootPath?: string
): NavGroup | null {
  if (rootPath && (pathname === rootPath || pathname === `${rootPath}/`)) {
    return groups[0] ?? null;
  }

  let bestMatch: { group: NavGroup; length: number } | null = null;

  for (const group of groups) {
    for (const child of group.children) {
      // Skip a child that equals the rootPath (would match everything)
      if (rootPath && child.href === rootPath) continue;
      if (pathname === child.href || pathname.startsWith(child.href + '/')) {
        if (!bestMatch || child.href.length > bestMatch.length) {
          bestMatch = { group, length: child.href.length };
        }
      }
    }
  }

  return bestMatch?.group ?? null;
}
