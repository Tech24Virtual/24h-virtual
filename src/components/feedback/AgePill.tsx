import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict } from 'date-fns';
import { ageBand, firstResponseAgeRatio } from '@/lib/feedback/sla';

interface Props {
  createdAt: string;
  status: string;
  type: string | null;
  priority: string;
}

/**
 * Color-coded first-response aging pill. V1: visual signal only, no actions.
 * Hidden once the row leaves "new" (first response considered satisfied).
 */
export function AgePill({ createdAt, status, type, priority }: Props) {
  const ratio = firstResponseAgeRatio(createdAt, status, type ?? 'feedback', priority);
  const band = ageBand(ratio);
  const ageText = formatDistanceToNowStrict(new Date(createdAt), { addSuffix: false });

  if (band === 'inactive') {
    return <span className="text-xs text-muted-foreground">{ageText}</span>;
  }

  const className =
    band === 'over' ? 'bg-destructive/15 text-destructive border-destructive/30'
    : band === 'approaching' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';

  const title =
    band === 'over' ? 'Past first-response target'
    : band === 'approaching' ? 'Approaching first-response target'
    : 'Within first-response target';

  return (
    <Badge variant="outline" className={className} title={title}>
      {ageText}
    </Badge>
  );
}
