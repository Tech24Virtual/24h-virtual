import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Check,
  Clock,
  Download,
  Eye,
  Link2,
  ListChecks,
  Send,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type {
  WLProposalActivity,
  WLProposalActivityEvent,
} from '@/hooks/wl/useWLProposalActivity';

export interface WLActivityFilterGroup {
  key: string;
  label: string;
  events: WLProposalActivityEvent[];
}

interface Props {
  activity: WLProposalActivity[];
  isLoading?: boolean;
  compact?: boolean;
  limit?: number;
  filterable?: boolean;
  filterGroups?: WLActivityFilterGroup[];
}

interface EventMeta {
  icon: typeof Check;
  label: string;
  tone: 'neutral' | 'positive' | 'negative' | 'muted';
}

const EVENT_META: Record<WLProposalActivityEvent, EventMeta> = {
  share_link_created:         { icon: Link2, label: 'Share link created', tone: 'neutral' },
  share_link_revoked:         { icon: XCircle, label: 'Share link revoked', tone: 'muted' },
  marked_sent:                { icon: Send, label: 'Marked as sent', tone: 'neutral' },
  viewed:                     { icon: Eye, label: 'Recipient viewed', tone: 'neutral' },
  accepted:                   { icon: ThumbsUp, label: 'Accepted', tone: 'positive' },
  declined:                   { icon: ThumbsDown, label: 'Declined', tone: 'negative' },
  exported_pdf:               { icon: Download, label: 'Exported as PDF', tone: 'neutral' },
  recipient_updated:          { icon: UserCheck, label: 'Recipient updated', tone: 'neutral' },
  task_created:               { icon: ListChecks, label: 'Task created', tone: 'neutral' },
  client_portal_viewed:       { icon: Eye, label: 'Client viewed portal', tone: 'neutral' },
  client_portal_acknowledged: { icon: UserCheck, label: 'Client acknowledged next steps', tone: 'positive' },
};

function fmtFull(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function fmtRelative(ts: string): string {
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return ts;
  }
}

function describeActor(item: WLProposalActivity): string | null {
  if (item.actor_label) return item.actor_label;
  const meta = item.metadata as Record<string, unknown>;
  if (typeof meta?.accepted_by_name === 'string') return meta.accepted_by_name as string;
  if (typeof meta?.recipient_name === 'string') return meta.recipient_name as string;
  if (typeof meta?.task_title === 'string') return meta.task_title as string;
  return null;
}

export function WLProposalActivityLog({
  activity,
  isLoading,
  compact = false,
  limit,
  filterable = false,
  filterGroups,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className={cn('rounded bg-muted/50 animate-pulse', compact ? 'h-9' : 'h-12')} />
        <div className={cn('rounded bg-muted/50 animate-pulse', compact ? 'h-9' : 'h-12')} />
      </div>
    );
  }

  // Apply group filter BEFORE limit/expand logic
  const groupFiltered = (() => {
    if (!filterable || !filterGroups || !activeGroup) return activity;
    const group = filterGroups.find((g) => g.key === activeGroup);
    if (!group) return activity;
    const set = new Set(group.events);
    return activity.filter((a) => set.has(a.event_type));
  })();

  const showFilters = filterable && filterGroups && filterGroups.length > 0;

  if (!groupFiltered.length) {
    return (
      <div className="space-y-2">
        {showFilters && (
          <FilterChips
            groups={filterGroups!}
            active={activeGroup}
            onChange={setActiveGroup}
          />
        )}
        <p className="text-xs text-muted-foreground">
          {activeGroup
            ? 'No events match this filter yet.'
            : 'No activity yet. Events appear here as the proposal is shared and acted on.'}
        </p>
      </div>
    );
  }

  const effectiveLimit = limit ?? (compact ? 5 : undefined);
  const visible =
    effectiveLimit && !expanded ? groupFiltered.slice(0, effectiveLimit) : groupFiltered;
  const hasMore = effectiveLimit ? groupFiltered.length > effectiveLimit : false;

  return (
    <div className="space-y-2">
      {showFilters && (
        <FilterChips
          groups={filterGroups!}
          active={activeGroup}
          onChange={(k) => {
            setActiveGroup(k);
            setExpanded(false);
          }}
        />
      )}
      <ol className={compact ? 'space-y-2' : 'space-y-4'}>
        {visible.map((item) => {
          const meta = EVENT_META[item.event_type] ?? {
            icon: Clock,
            label: item.event_type,
            tone: 'neutral' as const,
          };
          const Icon = meta.icon;
          const actor = describeActor(item);
          const iconBox = compact ? 'h-6 w-6' : 'h-8 w-8';
          const iconSize = compact ? 'h-3 w-3' : 'h-4 w-4';
          return (
            <li key={item.id} className={cn('flex', compact ? 'gap-2' : 'gap-3')}>
              <div
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full border',
                  iconBox,
                  meta.tone === 'positive' &&
                    'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300',
                  meta.tone === 'negative' &&
                    'bg-destructive/10 border-destructive/30 text-destructive',
                  meta.tone === 'neutral' &&
                    'bg-primary/10 border-primary/30 text-primary',
                  meta.tone === 'muted' &&
                    'bg-muted border-border text-muted-foreground',
                )}
              >
                <Icon className={iconSize} />
              </div>
              <div className={cn('flex-1 min-w-0', compact ? 'pt-0.5' : 'pt-1')}>
                <div className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
                  {meta.label}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {compact ? fmtRelative(item.created_at) : fmtFull(item.created_at)}
                  {actor ? ` · ${actor}` : ''}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : `Show all (${groupFiltered.length})`}
        </Button>
      )}
    </div>
  );
}

function FilterChips({
  groups,
  active,
  onChange,
}: {
  groups: WLActivityFilterGroup[];
  active: string | null;
  onChange: (key: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        aria-pressed={active === null}
      >
        <Badge
          variant={active === null ? 'default' : 'outline'}
          className="cursor-pointer text-xs"
        >
          All
        </Badge>
      </button>
      {groups.map((g) => (
        <button
          key={g.key}
          type="button"
          onClick={() => onChange(active === g.key ? null : g.key)}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
          aria-pressed={active === g.key}
        >
          <Badge
            variant={active === g.key ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
          >
            {g.label}
          </Badge>
        </button>
      ))}
    </div>
  );
}
