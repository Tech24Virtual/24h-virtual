import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface SectionTab {
  name: string;
  href: string;
}

interface SectionHeaderProps {
  title?: string;
  description?: string;
  tabs?: SectionTab[];
  /** Active tab matcher; defaults to startsWith comparison. */
  isActive?: (href: string) => boolean;
  className?: string;
}

/**
 * Page-level section header with optional horizontal tab strip.
 * Currently used by nav shell; pages may opt-in for in-page sub-tabs.
 */
export function SectionHeader({
  title,
  description,
  tabs,
  isActive,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('border-b bg-card', className)}>
      {(title || description) && (
        <div className="px-6 lg:px-8 pt-5 pb-3">
          {title && <h1 className="text-xl font-semibold text-heading">{title}</h1>}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {tabs && tabs.length > 1 && (
        <nav className="flex gap-1 px-6 lg:px-8 overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => (
            <NavLink
              key={tab.href}
              to={tab.href}
              className={({ isActive: navActive }) => {
                const active = isActive ? isActive(tab.href) : navActive;
                return cn(
                  'whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                );
              }}
            >
              {tab.name}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
