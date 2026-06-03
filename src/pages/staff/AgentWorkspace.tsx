import { useRef, useState } from 'react';
import { useRealtimeChats } from '@/hooks/useRealtimeChats';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { WorkspaceModeTabs } from '@/components/workspace/WorkspaceModeTabs';
import { WorkspaceLeftRail, type ChatFolder, type OwnerFilter } from '@/components/workspace/WorkspaceLeftRail';
import { ConversationList } from '@/components/workspace/ConversationList';
import { ConversationThread, type ConversationThreadHandle } from '@/components/workspace/ConversationThread';
import { ContextDrawer } from '@/components/workspace/ContextDrawer';
import { WorkspaceTicketList } from '@/components/workspace/modes/WorkspaceTicketList';
import { WorkspaceTicketDetail } from '@/components/workspace/modes/WorkspaceTicketDetail';
import { WorkspaceTaskList } from '@/components/workspace/modes/WorkspaceTaskList';
import { WorkspaceOutboundList } from '@/components/workspace/modes/WorkspaceOutboundList';
import { useWorkspaceMode } from '@/hooks/useWorkspaceMode';
import { cn } from '@/lib/utils';

export default function AgentWorkspace() {
  useRealtimeChats();
  const { mode, setMode, itemId, setItemId } = useWorkspaceMode();
  const [folder, setFolder] = useState<ChatFolder>('my');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [ticketFilter, setTicketFilter] = useState<'mine' | 'all' | 'unassigned'>('mine');
  const threadRef = useRef<ConversationThreadHandle>(null);

  return (
    <WorkspaceShell>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <WorkspaceModeTabs mode={mode} onChange={setMode} />
        <div className="flex-1 flex overflow-hidden min-h-0">
          {mode === 'chats' && (
            <>
              <WorkspaceLeftRail
                folder={folder}
                onFolderChange={setFolder}
                ownerFilter={ownerFilter}
                onOwnerFilterChange={setOwnerFilter}
              />
              <ConversationList
                folder={folder}
                ownerFilter={ownerFilter}
                selectedId={itemId}
                onSelect={setItemId}
              />
              <ConversationThread ref={threadRef} conversationId={itemId} />
              <ContextDrawer
                conversationId={itemId}
                onCreateTicket={() => threadRef.current?.openCreateTicket()}
                onEscalate={() => threadRef.current?.escalate()}
                onClose={() => threadRef.current?.close()}
                onAssignToMe={() => threadRef.current?.assignToMe()}
              />
            </>
          )}

          {mode === 'tickets' && (
            <>
              <TicketFilterRail value={ticketFilter} onChange={setTicketFilter} />
              <WorkspaceTicketList
                filter={ticketFilter}
                selectedId={itemId}
                onSelect={setItemId}
              />
              <WorkspaceTicketDetail ticketId={itemId} />
            </>
          )}

          {mode === 'tasks' && <WorkspaceTaskList />}

          {mode === 'outbound' && <WorkspaceOutboundList />}
        </div>
      </div>
    </WorkspaceShell>
  );
}

function TicketFilterRail({ value, onChange }: { value: 'mine' | 'all' | 'unassigned'; onChange: (v: 'mine' | 'all' | 'unassigned') => void }) {
  const opts = [
    { id: 'mine', label: 'Assigned to me' },
    { id: 'unassigned', label: 'Unassigned' },
    { id: 'all', label: 'All agent tickets' },
  ] as const;
  return (
    <aside className="w-44 shrink-0 h-full flex flex-col border-r bg-card overflow-hidden">
      <div className="px-2.5 py-2 border-b shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Filter</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {opts.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              'w-full text-left px-2 py-1.5 rounded text-xs transition-colors',
              value === o.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent text-foreground'
            )}
          >
            {o.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
