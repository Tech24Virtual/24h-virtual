import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useRetrainingStatus } from '@/hooks/campaign-os/useRetrainingStatus';

interface Props {
  campaignId: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  current: 'default',
  expiring_soon: 'secondary',
  expired: 'destructive',
  needs_refresh: 'destructive',
};

export function RetrainingStatusCard({ campaignId }: Props) {
  const { data, isLoading } = useRetrainingStatus(campaignId);

  const counts = (data ?? []).reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Retraining status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="text-xs text-muted-foreground">No signoffs recorded yet.</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(counts).map(([status, n]) => (
                <Badge key={status} variant={STATUS_VARIANT[status] ?? 'outline'}>
                  {status.replace('_', ' ')}: {n}
                </Badge>
              ))}
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {data!.map((row) => (
                <div
                  key={`${row.module_id}-${row.agent_id}`}
                  className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0"
                >
                  <div className="font-mono truncate">
                    agent {row.agent_id.slice(0, 8)}… · module {row.module_id.slice(0, 8)}…
                  </div>
                  <Badge variant={STATUS_VARIANT[row.status] ?? 'outline'}>
                    {row.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
