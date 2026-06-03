import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Phone,
  Clock,
  Calendar,
  CalendarDays,
  UserCheck,
  Bot,
  Settings,
  LogOut,
  ClipboardCheck,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAgentAvailability } from '@/hooks/useAgentAvailability';
import { cn } from '@/lib/utils';

const statusColors = {
  available: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-muted-foreground',
};

const links = [
  { to: '/staff/agent', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/staff/agent/clients', label: 'My Clients', icon: Users },
  { to: '/staff/agent/calls', label: 'Call Logs', icon: Phone },
  { to: '/staff/agent/shifts', label: 'Shifts', icon: Clock },
  { to: '/staff/agent/schedule', label: 'Schedule', icon: Calendar },
  { to: '/staff/agent/time-off', label: 'Time Off', icon: CalendarDays },
  { to: '/staff/agent/my-profile', label: 'My Profile', icon: UserCheck },
  { to: '/staff/agent/onboarding', label: 'Onboarding', icon: ClipboardCheck },
  { to: '/staff/agent/support', label: 'PiP Assistant', icon: Bot },
  { to: '/staff/agent/settings', label: 'Settings', icon: Settings },
];

export function WorkspaceIconRail() {
  const { status } = useAgentAvailability();

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="w-14 shrink-0 h-full flex flex-col border-r bg-card">
        {/* Availability indicator */}
        <div className="h-10 flex items-center justify-center border-b">
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              W
            </div>
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card',
                statusColors[status]
              )}
            />
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col items-center py-2 gap-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <Tooltip key={to}>
              <TooltipTrigger asChild>
                <Link
                  to={to}
                  className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Exit Workspace */}
        <div className="border-t p-2 flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/staff/agent"
                className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Exit Workspace</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
