import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useClientOnboardingActivity } from '@/hooks/admin/useClientHandoffs';

const EVENT_LABEL: Record<string, string> = {
  client_onboarding_started: 'Onboarding started',
  handoff_status_changed: 'Status changed',
  document_uploaded: 'Document uploaded',
  document_removed: 'Document removed',
  info_requested: 'Info requested from client',
  request_resolved: 'Request resolved',
  client_user_linked: 'Client linked account',
  item_provided: 'Item provided',
};

interface Props {
  handoffId: string;
  limit?: number;
}

export function ClientHandoffActivityCard({ handoffId, limit = 10 }: Props) {
  const { data, isLoading } = useClientOnboardingActivity(handoffId);

  return (
    <Card className="p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4" /> Recent activity
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Internal events on this onboarding.
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : !data?.length ? (
        <p className="text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="space-y-2">
          {data.slice(0, limit).map((a) => (
            <li key={a.id} className="text-xs border-l-2 border-muted pl-2">
              <p className="font-medium">{EVENT_LABEL[a.event_type] ?? a.event_type}</p>
              <p className="text-muted-foreground">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                {a.actor_label ? ` · ${a.actor_label}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
