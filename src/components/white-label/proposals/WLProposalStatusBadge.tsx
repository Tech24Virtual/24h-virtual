import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WLProposalStatus } from '@/hooks/wl/wlProposalTransitions';
import { isDerivedExpired } from '@/hooks/wl/wlProposalTransitions';

const STATUS_STYLES: Record<WLProposalStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-transparent',
  sent: 'bg-primary/10 text-primary border-primary/20',
  viewed: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  accepted: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20',
  declined: 'bg-destructive/10 text-destructive border-destructive/20',
  expired: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
};

interface Props {
  status: WLProposalStatus;
  validUntil?: string | null;
  className?: string;
}

export function WLProposalStatusBadge({ status, validUntil, className }: Props) {
  const derivedExpired = isDerivedExpired(status, validUntil ?? null);

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Badge variant="outline" className={cn('capitalize border', STATUS_STYLES[status])}>
        {status}
      </Badge>
      {derivedExpired && (
        <Badge variant="outline" className={cn('capitalize border', STATUS_STYLES.expired)}>
          Past due
        </Badge>
      )}
    </div>
  );
}
