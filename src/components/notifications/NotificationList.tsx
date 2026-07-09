import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, ExternalLink, Trash2, MessageSquare, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

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

interface NotificationListProps {
  notifications: Notification[];
  categoryCounts: Record<string, number>;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

const getCategoryIcon = (category: string | null) => {
  switch (category) {
    case 'ticket':
      return <MessageSquare className="w-3 h-3" />;
    case 'task':
      return <ListChecks className="w-3 h-3" />;
    default:
      return <Bell className="w-3 h-3" />;
  }
};

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case 'ticket':
      return 'bg-blue-500/10 text-blue-600 border-blue-200';
    case 'task':
      return 'bg-green-500/10 text-green-600 border-green-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function NotificationList({
  notifications,
  categoryCounts,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onClose,
}: NotificationListProps) {
  const hasReadNotifications = notifications.some(n => n.is_read);
  const hasUnreadNotifications = notifications.some(n => !n.is_read);

  if (notifications.length === 0) {
    return (
      <div className="p-6 text-center">
        <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No notifications yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Notifications</h3>
          {Object.keys(categoryCounts).length > 0 && (
            <div className="flex gap-1">
              {categoryCounts.ticket && (
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getCategoryColor('ticket'))}>
                  {getCategoryIcon('ticket')}
                  <span className="ml-1">{categoryCounts.ticket}</span>
                </Badge>
              )}
              {categoryCounts.task && (
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getCategoryColor('task'))}>
                  {getCategoryIcon('task')}
                  <span className="ml-1">{categoryCounts.task}</span>
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {hasUnreadNotifications && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={onMarkAllAsRead}
            >
              <Check className="w-3 h-3 mr-1" />
              Mark read
            </Button>
          )}
          {hasReadNotifications && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive"
              onClick={onClearAll}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-80">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              'px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer',
              !notification.is_read && 'bg-primary/5'
            )}
            onClick={() => {
              if (!notification.is_read) {
                onMarkAsRead(notification.id);
              }
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-2 h-2 mt-2 rounded-full flex-shrink-0',
                  notification.is_read ? 'bg-muted' : 'bg-primary'
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {notification.category && (
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getCategoryColor(notification.category))}>
                      {getCategoryIcon(notification.category)}
                      <span className="ml-1 capitalize">{notification.category}</span>
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium">{notification.title}</p>
                {notification.message && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              {notification.action_url && (
                notification.action_url.startsWith('http') ? (
                  <a
                    href={notification.action_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </a>
                ) : (
                  <Link
                    to={notification.action_url}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </Link>
                )
              )}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
