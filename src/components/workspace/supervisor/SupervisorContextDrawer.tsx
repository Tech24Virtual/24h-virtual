import { useState, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface Props {
  title?: string;
  children?: ReactNode;
  emptyHint?: string;
}

/**
 * Collapsible context drawer for Supervisor Workspace.
 * In-memory state only — no localStorage per Phase 1 plan.
 */
export function SupervisorContextDrawer({ title = 'Context', children, emptyHint }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <aside className="w-10 shrink-0 h-full border-l bg-card flex flex-col items-center py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCollapsed(false)}
          title="Expand context"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Info className="h-4 w-4 text-muted-foreground mt-2" />
      </aside>
    );
  }

  return (
    <aside className="w-80 shrink-0 h-full border-l bg-card flex flex-col overflow-hidden">
      <div className="h-9 px-3 flex items-center justify-between border-b shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setCollapsed(true)}
          title="Collapse"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {children ?? (
            <p className="text-xs text-muted-foreground">
              {emptyHint || 'Select an item to see details and actions.'}
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

export function DrawerSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="text-xs">{children}</div>
    </div>
  );
}
