import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const categoryColors: Record<string, string> = {
  schedule: 'bg-blue-100 text-blue-800 border-blue-200',
  urgent:   'bg-red-100 text-red-800 border-red-200',
  task:     'bg-green-100 text-green-800 border-green-200',
  ticket:   'bg-purple-100 text-purple-800 border-purple-200',
};

export default function AgentNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['agent-notifications-page', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, category, is_read, action_url, created_at')
        .eq('user_id', user!.id)
        .order('is_read', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['agent-notifications-page'] });
    queryClient.invalidateQueries({ queryKey: ['agent-unread-notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-messages-sidebar'] });
  };

  // Mark all as read the moment the agent opens this page — sidebar badge clears immediately
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(() => invalidate());
  // invalidate is stable (no deps) — intentionally excluded from dep array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user!.id);
    invalidate();
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    invalidate();
  };

  const clearRead = async () => {
    await supabase.from('notifications').delete().eq('user_id', user!.id).eq('is_read', true);
    invalidate();
  };

  const handleClick = async (n: typeof notifications[0]) => {
    if (!n.is_read) await markAsRead(n.id);
    if (n.action_url) navigate(n.action_url);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const hasRead = notifications.some(n => n.is_read);

  return (
    <StaffLayout role="agent">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> Mark all read
              </Button>
            )}
            {hasRead && (
              <Button variant="ghost" size="sm" onClick={clearRead} className="gap-1.5 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Clear read
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm mt-1 opacity-70">You're all caught up</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'border rounded-xl p-4 cursor-pointer transition-colors hover:bg-muted/50',
                  !n.is_read && 'bg-primary/5 border-primary/20'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-2 h-2 mt-1.5 rounded-full flex-shrink-0',
                    n.is_read ? 'bg-muted-foreground/30' : 'bg-primary'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {n.category && (
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 capitalize', categoryColors[n.category])}>
                          {n.category}
                        </Badge>
                      )}
                    </div>
                    <p className={cn('text-sm', !n.is_read && 'font-medium')}>{n.title}</p>
                    {n.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {n.action_url && (
                    <span className="text-xs text-primary shrink-0 mt-0.5">View →</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
