import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface UtilityTrayProps {
  roleLabel?: string;
  className?: string;
  compact?: boolean;
  /** Optional slot rendered above the user row (e.g. System popover trigger). */
  extra?: React.ReactNode;
}

/**
 * Bottom section shared by every dashboard sidebar.
 * compact=true → rail (56 px): shows avatar + toggle icon; labels appear on group-hover/rail.
 * compact=false → expanded panel: shows avatar + name + role + theme toggle + sign-out.
 */
export function UtilityTray({ roleLabel = 'Admin', className, compact = false, extra }: UtilityTrayProps) {
  const { signOut, user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  if (compact) {
    return (
      <div className={cn('border-t shrink-0 p-2 flex flex-col gap-1', className)}>
        {extra}

        {/* Avatar row — name + role slide in on rail hover */}
        <div className="flex items-center gap-2 overflow-hidden rounded-lg px-1 py-1">
          <div
            className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center"
            title={user?.email}
          >
            <span className="text-xs font-semibold text-primary">{initial}</span>
          </div>
          <div className="min-w-0 opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150">
            <p className="truncate text-xs font-medium leading-none">{displayName}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>

        {/* Theme toggle always visible; "Sign Out" label appears on hover */}
        <div className="flex items-center">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start px-2 text-xs text-muted-foreground opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150"
            onClick={signOut}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border-t shrink-0 p-3 space-y-1', className)}>
      {extra}

      {/* User identity row */}
      <div className="flex items-center gap-2 rounded-lg px-2 py-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-semibold text-primary">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-xs font-medium leading-none">{displayName}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{roleLabel}</p>
        </div>
        <ThemeToggle />
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-destructive"
        onClick={signOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
