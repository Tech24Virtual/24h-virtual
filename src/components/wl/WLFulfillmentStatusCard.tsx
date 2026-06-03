/**
 * Partner-safe fulfillment summary card.
 * Reads partner-scoped counters (RLS-bound). Never renders 24H/internal wording.
 */
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, AlertCircle, Clock, CheckCircle2, FileCheck } from 'lucide-react';
import { useFulfillmentCounters } from '@/hooks/shared/useFulfillmentCounters';

export function WLFulfillmentStatusCard() {
  const { data, isLoading } = useFulfillmentCounters({ audience: 'partner' });

  const items = [
    {
      icon: AlertCircle,
      label: 'More info required',
      value: data?.needs_info ?? 0,
      tone: 'destructive' as const,
    },
    {
      icon: Clock,
      label: 'In review',
      value: data?.under_review ?? 0,
      tone: 'default' as const,
    },
    {
      icon: FileCheck,
      label: 'Approved',
      value: data?.approved ?? 0,
      tone: 'secondary' as const,
    },
    {
      icon: CheckCircle2,
      label: 'Activated this month',
      value: data?.activated_this_month ?? 0,
      tone: 'secondary' as const,
    },
  ];

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Fulfillment status
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submitted onboarding packages and current state.
          </p>
        </div>
        <Link
          to="/white-label-dashboard/clients/onboarding"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <it.icon className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{it.label}</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <p className="text-xl font-semibold">{it.value}</p>
            )}
          </div>
        ))}
      </div>
      {(data?.needs_info ?? 0) > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-2.5">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span>
              {data?.needs_info} package{(data?.needs_info ?? 0) === 1 ? '' : 's'} need
              additional information.
            </span>
          </div>
          <Badge variant="destructive" className="text-xs">
            Action required
          </Badge>
        </div>
      )}
    </Card>
  );
}
