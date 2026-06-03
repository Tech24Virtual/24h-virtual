import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Ticket, ListTodo, PhoneOutgoing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import type { WorkspaceMode } from '@/hooks/useWorkspaceMode';

interface Props {
  mode: WorkspaceMode;
  onChange: (m: WorkspaceMode) => void;
}

export function WorkspaceModeTabs({ mode, onChange }: Props) {
  const { user } = useAuth();

  const { data: unread = 0 } = useQuery({
    queryKey: ['workspace-unread-chats', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_conversations')
        .select('unread_agent_count')
        .or(`assigned_agent_id.eq.${user!.id},and(assigned_agent_id.is.null,status.in.(queued,new))`)
        .gt('unread_agent_count', 0);
      return (data || []).reduce((sum, r: any) => sum + (r.unread_agent_count || 0), 0);
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const isChats = mode === 'chats';

  return (
    <div className="h-9 shrink-0 flex items-center justify-between border-b bg-muted/30 px-1.5">
      {/* Primary: Chats */}
      <button
        onClick={() => onChange('chats')}
        className={cn(
          'flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-semibold transition-all',
          isChats
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-foreground hover:bg-background'
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', isChats ? 'bg-primary-foreground animate-pulse' : 'bg-primary animate-pulse')} />
        <MessageCircle className="h-3.5 w-3.5" />
        Chats
        {unread > 0 && (
          <Badge
            variant={isChats ? 'secondary' : 'default'}
            className="h-4 px-1.5 text-[10px] ml-0.5"
          >
            {unread > 99 ? '99+' : unread}
          </Badge>
        )}
      </button>

      {/* Secondary cluster */}
      <div className="flex items-center gap-0.5">
        <div className="h-4 w-px bg-border mr-1" />
        {([
          { id: 'tickets' as const, label: 'Tickets', icon: Ticket },
          { id: 'tasks' as const, label: 'Tasks', icon: ListTodo },
          { id: 'outbound' as const, label: 'Outbound', icon: PhoneOutgoing },
        ]).map((t) => {
          const Icon = t.icon;
          const active = mode === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 h-7 rounded text-[11px] transition-colors',
                active
                  ? 'bg-background text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              )}
            >
              <Icon className="h-3 w-3" />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
