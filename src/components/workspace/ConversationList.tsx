import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMockableQuery } from '@/hooks/useMockableQuery';
import { MOCK_CONVERSATIONS } from '@/lib/mockData';
import type { ChatFolder, OwnerFilter } from './WorkspaceLeftRail';

type SortMode = 'recent' | 'oldest' | 'unread';

interface Props {
  folder: ChatFolder;
  ownerFilter: OwnerFilter;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ folder, ownerFilter, selectedId, onSelect }: Props) {
  const { user } = useAuth();
  const [sort, setSort] = useState<SortMode>('recent');

  const { data: rows, isLoading } = useMockableQuery({
    queryKey: ['chat-conversations', folder, ownerFilter, user?.id],
    queryFn: async () => {
      let q = supabase
        .from('chat_conversations')
        .select('id, status, ai_state, ownership_mode, assigned_agent_id, last_message_at, unread_agent_count, ai_summary, direct_client_id, wl_partner_id, deployment_id, chat_visitors(name)')
        .order('last_message_at', { ascending: false })
        .limit(100);

      if (folder === 'my') q = q.eq('assigned_agent_id', user!.id);
      else if (folder === 'unassigned') q = q.is('assigned_agent_id', null).in('status', ['queued', 'new']);
      else if (folder === 'waiting') q = q.eq('status', 'waiting');
      else if (folder === 'active') q = q.eq('status', 'active');
      else if (folder === 'closed') q = q.eq('status', 'closed');

      if (ownerFilter !== 'all') q = q.eq('ownership_mode', ownerFilter);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    mockData: () => {
      let arr = [...MOCK_CONVERSATIONS];
      if (folder === 'my') arr = arr.filter(c => c.assigned_agent_id);
      else if (folder === 'unassigned') arr = arr.filter(c => !c.assigned_agent_id && ['queued', 'new'].includes(c.status));
      else if (folder === 'waiting') arr = arr.filter(c => c.status === 'waiting');
      else if (folder === 'active') arr = arr.filter(c => c.status === 'active');
      else if (folder === 'closed') arr = arr.filter(c => c.status === 'closed');
      if (ownerFilter !== 'all') arr = arr.filter(c => c.ownership_mode === ownerFilter);
      return arr as any;
    },
  });

  const sorted = (() => {
    if (!rows) return rows;
    const arr = [...rows];
    if (sort === 'oldest') arr.reverse();
    else if (sort === 'unread') arr.sort((a, b) => (b.unread_agent_count || 0) - (a.unread_agent_count || 0));
    return arr;
  })();

  return (
    <div className="w-72 shrink-0 border-r bg-card flex flex-col overflow-hidden">
      <div className="px-2 h-9 flex items-center justify-between gap-2 border-b shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground tabular-nums">
          {sorted?.length || 0}
        </span>
        <div className="flex bg-muted rounded p-0.5 gap-0.5">
          {(['recent', 'oldest', 'unread'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors capitalize',
                sort === s
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1 space-y-px">
          {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          {!isLoading && sorted?.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">No conversations</div>
          )}
          {sorted?.map((c: any) => {
            const isSelected = selectedId === c.id;
            const isWL = c.ownership_mode === 'wl';
            const visitorName = c.chat_visitors?.name || 'Visitor';
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={cn(
                  'relative w-full text-left px-2 py-1.5 pl-3 rounded transition-colors group',
                  isSelected ? 'bg-primary/10' : 'hover:bg-accent'
                )}
              >
                {/* Ownership color stripe */}
                <span
                  className={cn(
                    'absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r',
                    isWL ? 'bg-secondary' : 'bg-primary'
                  )}
                />
                {isSelected && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}

                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-xs font-medium truncate">{visitorName}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1 leading-tight">
                  {c.ai_summary || 'No summary yet'}
                </p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground capitalize">
                    {c.status}
                  </span>
                  {c.unread_agent_count > 0 && (
                    <Badge variant="default" className="h-3.5 px-1 text-[9px] tabular-nums">
                      {c.unread_agent_count}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
