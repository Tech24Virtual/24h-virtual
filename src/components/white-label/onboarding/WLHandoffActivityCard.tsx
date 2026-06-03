import { Card } from '@/components/ui/card';
import { useWLProposalActivity } from '@/hooks/wl/useWLProposalActivity';
import {
  WLProposalActivityLog,
  type WLActivityFilterGroup,
} from '@/components/white-label/proposals/WLProposalActivityLog';

interface Props {
  proposalId: string;
}

const RELEVANT_EVENTS = new Set([
  'accepted',
  'task_created',
  'client_portal_viewed',
  'client_portal_acknowledged',
  'submitted_to_fulfillment',
]);

const FILTER_GROUPS: WLActivityFilterGroup[] = [
  { key: 'tasks', label: 'Tasks', events: ['task_created'] },
  {
    key: 'portal',
    label: 'Portal',
    events: ['client_portal_viewed', 'client_portal_acknowledged'],
  },
  { key: 'acceptance', label: 'Acceptance', events: ['accepted'] },
  { key: 'fulfillment', label: 'Fulfillment', events: ['submitted_to_fulfillment'] },
];

export function WLHandoffActivityCard({ proposalId }: Props) {
  const { data: activity, isLoading } = useWLProposalActivity(proposalId);

  const filtered = (activity ?? []).filter((a) => RELEVANT_EVENTS.has(a.event_type));

  return (
    <Card className="p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Recent activity</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Acceptance, tasks, and client portal events.
        </p>
      </div>
      <WLProposalActivityLog
        activity={filtered}
        isLoading={isLoading}
        compact
        limit={5}
        filterable
        filterGroups={FILTER_GROUPS}
      />
    </Card>
  );
}
