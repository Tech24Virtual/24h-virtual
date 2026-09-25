import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Bell, MessagesSquare, X, Clock, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAgentAvailability, type AgentAvailability } from '@/hooks/useAgentAvailability';
import { useActiveShiftTime } from '@/components/staff/ShiftClockWidget';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger,
} from '@/components/ui/sheet';
import { SlackMessenger } from '@/components/admin/crm/SlackMessenger';
import { SlackMappingBanner } from '@/components/staff/SlackMappingBanner';
import { cn } from '@/lib/utils';
import { MockModeToggle } from './MockModeToggle';

const statusColors: Record<AgentAvailability, string> = {
  available: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-muted-foreground',
};

interface WorkspaceNotification {
  id: string;
  title: string;
  message: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface Props {
  messagesHref: string;
}

export function WorkspaceTopbar({ messagesHref }: Props) {
  const { status, setStatus } = useAgentAvailability();
  const shiftTime = useActiveShiftTime();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['workspace-notifications-unread-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      return count ?? 0;
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const { data: recentNotifications = [] } = useQuery<WorkspaceNotification[]>({
    queryKey: ['workspace-notifications-recent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, action_url, is_read, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-notifications-unread-count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-notifications-recent', user?.id] });
    },
  });

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

        {/* Messages — Team Messages slide-over */}
        <Sheet open={messagesOpen} onOpenChange={setMessagesOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Team messages">
              <MessagesSquare className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col gap-0">
            <SheetHeader className="p-6 pb-4 border-b text-left space-y-1">
              <SheetTitle>Team Messages</SheetTitle>
              <SheetDescription>Communicate with your team via Slack</SheetDescription>
              <Link
                to={messagesHref}
                onClick={() => setMessagesOpen(false)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit"
              >
                Open full page <ExternalLink className="h-3 w-3" />
              </Link>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <SlackMappingBanner />
              <SlackMessenger />
            </div>
          </SheetContent>
        </Sheet>

        {/* Notifications */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 relative" title="Notifications">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="px-3 py-2 border-b">
              <p className="text-sm font-semibold">Notifications</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No notifications yet
                </p>
              ) : (
                recentNotifications.map((n) => {
                  const content = (
                    <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors">
                      <span
                        className={cn(
                          'mt-1.5 h-1.5 w-1.5 rounded-full shrink-0',
                          n.is_read ? 'bg-transparent' : 'bg-primary'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                  return n.action_url ? (
                    <Link
                      key={n.id}
                      to={n.action_url}
                      onClick={() => setNotifOpen(false)}
                      className="block border-b last:border-b-0"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={n.id} className="border-b last:border-b-0">
                      {content}
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-1.5 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs gap-1.5"
                disabled={unreadCount === 0 || markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            </div>
          </PopoverContent>
        </Popover>

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
