/**
 * Shared client-safe status timeline.
 * Renders the canonical lifecycle using audience='client' labels only.
 * Used by both WL partner client portal and direct 24H client dashboard.
 */
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import {
  CLIENT_TIMELINE_PHASES,
  audienceLabel,
  type Phase,
} from '@/lib/wl/fulfillmentLifecycle';

interface Props {
  /** Canonical phase for the active step. Falls back to 'proposal_accepted'. */
  phase: Phase | null;
  /** Whether the client has acknowledged next steps. Defaults to false. */
  acknowledged?: boolean;
}

const ORDER: Phase[] = [...CLIENT_TIMELINE_PHASES];

export function ClientStatusTimeline({ phase, acknowledged = false }: Props) {
  const activePhase: Phase = phase ?? 'proposal_accepted';
  const activeIdx = ORDER.indexOf(activePhase);
  const isNeedsInfo = phase === 'needs_more_info';

  return (
    <div className="space-y-3">
      {ORDER.map((p, idx) => {
        const completed = !isNeedsInfo && idx < activeIdx;
        const isActive = !isNeedsInfo && idx === activeIdx;
        const showCheck =
          completed || (isActive && p === 'proposal_accepted' && acknowledged);
        return (
          <div key={p} className="flex items-start gap-3">
            <div className="mt-0.5">
              {showCheck ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : isActive ? (
                <Circle className="w-5 h-5 text-primary fill-primary/20" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1">
              <p
                className={
                  isActive
                    ? 'text-sm font-medium'
                    : completed
                      ? 'text-sm text-muted-foreground line-through'
                      : 'text-sm text-muted-foreground'
                }
              >
                {audienceLabel(p, 'client')}
              </p>
            </div>
          </div>
        );
      })}
      {isNeedsInfo && (
        <div className="flex items-start gap-3 rounded-md bg-destructive/10 border border-destructive/30 p-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <p className="text-sm font-medium">
              {audienceLabel('needs_more_info', 'client')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Please contact your provider to complete the next step.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
