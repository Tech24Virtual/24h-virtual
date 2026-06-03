import { Check, Clock, Eye, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WLPartnerProposal } from '@/hooks/wl/useWLPartnerProposals';

interface Props {
  proposal: WLPartnerProposal;
}

interface Step {
  label: string;
  ts: string | null;
  icon: typeof Check;
  tone: 'neutral' | 'positive' | 'negative';
}

function fmt(ts: string | null) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return null;
  }
}

export function WLProposalStatusTimeline({ proposal }: Props) {
  const steps: Step[] = [
    { label: 'Created', ts: proposal.created_at, icon: Clock, tone: 'neutral' },
    { label: 'Sent', ts: proposal.sent_at, icon: Send, tone: 'neutral' },
    { label: 'Viewed', ts: proposal.viewed_at, icon: Eye, tone: 'neutral' },
  ];

  if (proposal.accepted_at) {
    steps.push({
      label: 'Accepted',
      ts: proposal.accepted_at,
      icon: ThumbsUp,
      tone: 'positive',
    });
  }
  if (proposal.declined_at) {
    steps.push({
      label: 'Declined',
      ts: proposal.declined_at,
      icon: ThumbsDown,
      tone: 'negative',
    });
  }

  return (
    <ol className="space-y-4">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const done = !!step.ts;
        return (
          <li key={idx} className="flex gap-3">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                done && step.tone === 'positive' && 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300',
                done && step.tone === 'negative' && 'bg-destructive/10 border-destructive/30 text-destructive',
                done && step.tone === 'neutral' && 'bg-primary/10 border-primary/30 text-primary',
                !done && 'bg-muted border-border text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 pt-1">
              <div className={cn('text-sm font-medium', !done && 'text-muted-foreground')}>
                {step.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {fmt(step.ts) ?? 'Pending'}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
