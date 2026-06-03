import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  TrendingUp,
  Calendar,
  Bot,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const links = [
  { to: '/staff/supervisor', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/staff/supervisor/agents', label: 'Agents', icon: Users },
  { to: '/staff/supervisor/client-assignments', label: 'Client Assignments', icon: ClipboardList },
  { to: '/staff/supervisor/performance', label: 'Performance', icon: TrendingUp },
  { to: '/staff/supervisor/schedule', label: 'Schedule', icon: Calendar },
  { to: '/staff/supervisor/support', label: 'PiP Assistant', icon: Bot },
  { to: '/staff/supervisor/settings', label: 'Settings', icon: Settings },
];

export function SupervisorWorkspaceIconRail() {
  return (
    <TooltipProvider delayDuration={200}>
      <aside className="w-14 shrink-0 h-full flex flex-col border-r bg-card">
        <div className="h-10 flex items-center justify-center border-b">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
        </div>

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

        <div className="border-t p-2 flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/staff/supervisor"
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
