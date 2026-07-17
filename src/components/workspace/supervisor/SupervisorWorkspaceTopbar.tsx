import { Link } from 'react-router-dom';
import { Bell, MessagesSquare, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { MockModeToggle } from '@/components/workspace/MockModeToggle';

interface Props {
  messagesHref: string;
}

export function SupervisorWorkspaceTopbar({ messagesHref }: Props) {
  const { profile, user } = useAuth();
  const name = profile?.full_name || user?.email?.split('@')[0] || 'Supervisor';

  return (
    <header className="h-10 shrink-0 flex items-center justify-between px-3 border-b bg-card text-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Supervisor Workspace
          </span>
        </div>
        <span className="hidden md:inline text-xs text-muted-foreground truncate">
          · {name}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <MockModeToggle />
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          On duty
        </span>

        <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Team messages">
          <Link to={messagesHref}>
            <MessagesSquare className="h-4 w-4" />
          </Link>
        </Button>

        <Button variant="ghost" size="icon" className="h-7 w-7" title="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" asChild>
          <Link to="/staff/supervisor">
            <X className="h-3.5 w-3.5" />
            Exit
          </Link>
        </Button>
      </div>
    </header>
  );
}
