import { Link } from 'react-router-dom';
import { Bell, MessagesSquare, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentAvailability, type AgentAvailability } from '@/hooks/useAgentAvailability';
import { useActiveShiftTime } from '@/components/staff/ShiftClockWidget';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MockModeToggle } from './MockModeToggle';

const statusColors: Record<AgentAvailability, string> = {
  available: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-muted-foreground',
};

interface Props {
  messagesHref: string;
}

export function WorkspaceTopbar({ messagesHref }: Props) {
  const { status, setStatus } = useAgentAvailability();
  const shiftTime = useActiveShiftTime();

  return (
    <header className="h-10 shrink-0 flex items-center justify-between px-3 border-b bg-card text-sm">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </span>
        {shiftTime && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            On shift since {shiftTime}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <MockModeToggle />
        {/* Availability */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 capitalize">
              <span className={cn('w-2 h-2 rounded-full', statusColors[status])} />
              {status}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(['available', 'away', 'offline'] as const).map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatus(s)} className="capitalize gap-2">
                <span className={cn('w-2 h-2 rounded-full', statusColors[s])} />
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Messages */}
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Team messages">
          <Link to={messagesHref}>
            <MessagesSquare className="h-4 w-4" />
          </Link>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Exit */}
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" asChild>
          <Link to="/staff/agent">
            <X className="h-3.5 w-3.5" />
            Exit
          </Link>
        </Button>
      </div>
    </header>
  );
}
