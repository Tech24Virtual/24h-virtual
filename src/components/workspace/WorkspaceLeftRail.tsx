import { useQuery } from '@tanstack/react-query';
import { Inbox, Clock, MessageCircle, Archive, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ChatFolder = 'my' | 'unassigned' | 'waiting' | 'active' | 'closed';
export type OwnerFilter = 'all' | 'direct' | 'wl';

interface Props {
  folder: ChatFolder;
  onFolderChange: (f: ChatFolder) => void;
  ownerFilter: OwnerFilter;
  onOwnerFilterChange: (f: OwnerFilter) => void;
}

const folders: { id: ChatFolder; label: string; icon: typeof Inbox }[] = [
  { id: 'my', label: 'My Chats', icon: MessageCircle },
  { id: 'unassigned', label: 'Unassigned', icon: UserPlus },
  { id: 'waiting', label: 'Waiting', icon: Clock },
  { id: 'active', label: 'Active', icon: Inbox },
  { id: 'closed', label: 'Closed', icon: Archive },
];

export function WorkspaceLeftRail({ folder, onFolderChange, ownerFilter, onOwnerFilterChange }: Props) {
  const { user } = useAuth();

  const { data: counts } = useQuery({
    queryKey: ['workspace-folder-counts', user?.id],
    queryFn: async () => {
      const [my, unassigned, waiting, active] = await Promise.all([
        supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('assigned_agent_id', user!.id),
        supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).is('assigned_agent_id', null).in('status', ['queued', 'new']),
        supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
        supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      return {
        my: my.count || 0,
        unassigned: unassigned.count || 0,
        waiting: waiting.count || 0,
        active: active.count || 0,
        closed: 0,
      } as Record<ChatFolder, number>;
    },
    enabled: !!user?.id,
    refetchInterval: 20000,
  });

  return (
    <aside className="w-40 shrink-0 h-full flex flex-col border-r bg-card overflow-hidden">
      <nav className="flex-1 overflow-y-auto p-1 space-y-px">
        {folders.map((f) => {
          const Icon = f.icon;
          const active = folder === f.id;
          const count = counts?.[f.id] ?? 0;
          return (
            <button
              key={f.id}
              onClick={() => onFolderChange(f.id)}
              className={cn(
                'relative w-full flex items-center gap-2 px-2 py-1 h-7 rounded text-[11px] transition-colors',
                active
                  ? 'bg-primary/10 text-foreground font-medium'
                  : 'hover:bg-accent text-foreground'
              )}
            >
              {active && <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r" />}
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left truncate">{f.label}</span>
              {count > 0 && f.id !== 'closed' && (
                <span className={cn(
                  'text-[10px] tabular-nums px-1 rounded',
                  active ? 'text-primary font-semibold' : 'text-muted-foreground'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t shrink-0 p-1.5">
        <div className="flex bg-muted rounded p-0.5 gap-0.5">
          {(['direct', 'wl', 'all'] as const).map((o) => (
            <button
              key={o}
              onClick={() => onOwnerFilterChange(o)}
              className={cn(
                'flex-1 px-1 py-1 rounded text-[10px] font-medium transition-colors',
                ownerFilter === o
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {o === 'all' ? 'All' : o === 'direct' ? 'Direct' : 'WL'}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
