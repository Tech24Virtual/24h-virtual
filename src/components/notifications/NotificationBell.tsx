import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { NotificationList } from './NotificationList';
import { NotificationPermissionToggle } from './NotificationPermissionToggle';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  category: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { isSupported, isEnabled, permission, toggle, showNotification } = useBrowserNotifications();

  // Calculate category counts
  const categoryCounts = notifications.reduce((acc, n) => {
    if (!n.is_read && n.category) {
      acc[n.category] = (acc[n.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    if (!user) return;

    const fetchTotalUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setTotalUnread(count || 0);
    };

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }

      await fetchTotalUnread();
    };

    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);
          setTotalUnread(prev => prev + 1);
          showNotification(newNotif.title, newNotif.message || undefined, newNotif.action_url || undefined);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const clearAll = async () => {
    if (!user) return;

    // Delete all read notifications for this user
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('is_read', true);

    setNotifications(prev => prev.filter(n => !n.is_read));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <NotificationPermissionToggle
          isSupported={isSupported}
          isEnabled={isEnabled}
          permission={permission}
          onToggle={toggle}
        />
        <NotificationList
          notifications={notifications}
          categoryCounts={categoryCounts}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClearAll={clearAll}
          onClose={() => setIsOpen(false)}
        />
        {totalUnread > 20 && (
          <div className="px-4 py-2 border-t text-center text-xs text-muted-foreground">
            Showing 20 of {totalUnread} unread notifications
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
