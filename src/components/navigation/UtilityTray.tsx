import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface UtilityTrayProps {
  roleLabel?: string;
  className?: string;
  compact?: boolean;
  /** Optional slot rendered above the user/sign-out row (e.g. System popover trigger). */
  extra?: React.ReactNode;
}

/**
 * Compact, non-scrolling footer cluster shared by every dashboard sidebar.
 * Holds theme toggle, user identity chip, sign out, and optional extras
 * (e.g. System popover trigger). Lives outside the primary rail so the rail
 * itself stays short and never scrolls on desktop.
 */
export function UtilityTray({ roleLabel = 'Admin', className, compact = false, extra }: UtilityTrayProps) {
  const { signOut, user } = useAuth();

  if (compact) {
    return (
      <div className={cn('p-2 pb-16 border-t flex flex-col items-center gap-2', className)}>
        {extra}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0" title={user?.email}>
          <span className="text-sm font-medium text-primary">
            {user?.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={signOut}
          aria-label="Sign Out"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('p-3 pb-16 border-t space-y-2', className)}>
      {extra}
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-primary">
            {user?.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{user?.email}</p>
          <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
        </div>
        <ThemeToggle />
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
  );
}
