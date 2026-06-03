/**
 * Shared 4-KPI strip used by admin and supervisor overviews.
 * Internal phrasing — never render this in partner/client surfaces.
 */
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFulfillmentCounters,
  type FulfillmentAudience,
} from '@/hooks/shared/useFulfillmentCounters';

interface Props {
  audience: Extract<FulfillmentAudience, 'admin' | 'supervisor'>;
  /** Base path for deep links (defaults derived from audience). */
  basePath?: string;
}

export function FulfillmentPulseCards({ audience, basePath }: Props) {
  const { data, isLoading } = useFulfillmentCounters({ audience });
  const root =
    basePath ??
    (audience === 'admin' ? '/admin/fulfillment-intake' : '/staff/supervisor/fulfillment');

  const cards = [
    { label: 'New', value: data?.new ?? 0, href: `${root}?status=new_submission` },
    { label: 'Under review', value: data?.under_review ?? 0, href: `${root}?status=under_review` },
    {
      label: 'Needs partner update',
      value: data?.needs_info ?? 0,
      href: `${root}?status=needs_partner_update`,
    },
    {
      label: 'Activated this month',
      value: data?.activated_this_month ?? 0,
      href: `${root}?status=activated`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Link key={c.label} to={c.href}>
          <Card className="p-4 hover:border-primary/40 transition-colors">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-12 mt-1" />
            ) : (
              <p className="text-2xl font-semibold mt-1">{c.value}</p>
            )}
          </Card>
        </Link>
      ))}
    </div>
  );
}
