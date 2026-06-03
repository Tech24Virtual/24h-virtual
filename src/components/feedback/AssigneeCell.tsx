import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Handler { user_id: string; full_name: string }

interface Props {
  assignedTo: string | null;
  currentUserId: string | undefined;
  /** When true, picker shows admin handler list. When false, only Claim is offered (partner V1). */
  pickerMode: 'admin_handlers' | 'self_only';
  busy?: boolean;
  onAssign: (userId: string | null) => void | Promise<void>;
  onClaim: () => void | Promise<void>;
}

const cache: { admin: Handler[] | null; loaded: boolean } = { admin: null, loaded: false };

export function AssigneeCell({ assignedTo, currentUserId, pickerMode, busy, onAssign, onClaim }: Props) {
  const [open, setOpen] = useState(false);
  const [handlers, setHandlers] = useState<Handler[]>(cache.admin ?? []);
  const isMine = !!assignedTo && assignedTo === currentUserId;

  useEffect(() => {
    if (pickerMode !== 'admin_handlers' || cache.loaded || !open) return;
    supabase.rpc('list_feedback_admin_handlers').then(({ data }) => {
      const list = (data ?? []) as Handler[];
      cache.admin = list;
      cache.loaded = true;
      setHandlers(list);
    });
  }, [open, pickerMode]);

  if (assignedTo) {
    const handler = handlers.find(h => h.user_id === assignedTo);
    const label = isMine ? 'Mine' : (handler?.full_name?.trim() || 'Assigned');
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant={isMine ? 'default' : 'secondary'} className="gap-1">
          <UserCheck className="h-3 w-3" />{label}
        </Badge>
        {pickerMode === 'admin_handlers' && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">Reassign</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <AssignList handlers={handlers} currentUserId={currentUserId} busy={busy}
                onPick={(uid) => { setOpen(false); onAssign(uid); }} allowUnassign />
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">Unassigned</Badge>
      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={onClaim}>
        Claim
      </Button>
      {pickerMode === 'admin_handlers' && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"><UserPlus className="h-3 w-3 mr-1" />Assign</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <AssignList handlers={handlers} currentUserId={currentUserId} busy={busy}
              onPick={(uid) => { setOpen(false); onAssign(uid); }} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function AssignList({
  handlers, currentUserId, busy, onPick, allowUnassign,
}: {
  handlers: Handler[]; currentUserId?: string; busy?: boolean;
  onPick: (uid: string | null) => void; allowUnassign?: boolean;
}) {
  if (handlers.length === 0) {
    return <div className="text-xs text-muted-foreground p-2">Loading admin handlers…</div>;
  }
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 pt-1">Admin handlers</div>
      {handlers.map(h => (
        <button
          key={h.user_id}
          disabled={busy}
          onClick={() => onPick(h.user_id)}
          className="w-full text-left text-sm rounded px-2 py-1.5 hover:bg-muted disabled:opacity-50"
        >
          {h.user_id === currentUserId ? 'Me' : (h.full_name?.trim() || h.user_id.slice(0, 8))}
        </button>
      ))}
      {allowUnassign && (
        <>
          <div className="border-t my-1" />
          <button
            disabled={busy}
            onClick={() => onPick(null)}
            className="w-full text-left text-sm rounded px-2 py-1.5 hover:bg-muted text-muted-foreground disabled:opacity-50"
          >
            Unassign
          </button>
        </>
      )}
    </div>
  );
}
