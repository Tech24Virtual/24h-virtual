import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useIntakeActivity } from '@/hooks/admin/useFulfillmentIntakes';

interface Props {
  intakeId: string;
}

export function FulfillmentActivityList({ intakeId }: Props) {
  const { data: activity } = useIntakeActivity(intakeId);

  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-semibold">Activity</h3>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {!activity?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No activity yet.</p>
        ) : (
          activity.map((a) => (
            <div key={a.id} className="text-sm border-l-2 border-muted pl-3 py-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {a.event_type.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">{a.actor_type}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
