import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Inbox, ArrowRight } from 'lucide-react';
import {
  useWLHandoffRequests,
  useWLHandoffRequestMutations,
  type WLHandoffRequest,
} from '@/hooks/wl/useWLHandoffRequests';
import { formatDistanceToNow } from 'date-fns';

const TYPE_LABEL: Record<WLHandoffRequest['request_type'], string> = {
  missing_item: 'Missing info',
  missing_document: 'Missing document',
  clarification: 'Clarification',
  correction: 'Correction',
};

interface Props {
  handoffId: string;
  onJumpToItem: (itemKey: string) => void;
  onJumpToDocs: () => void;
}

export function WLHandoffRequestsTab({ handoffId, onJumpToItem, onJumpToDocs }: Props) {
  const { data: requests, isLoading } = useWLHandoffRequests(handoffId);
  const { markResolved } = useWLHandoffRequestMutations(handoffId);

  const { open, resolved } = useMemo(() => {
    const list = requests ?? [];
    return {
      open: list.filter((r) => r.status === 'open'),
      resolved: list.filter((r) => r.status !== 'open'),
    };
  }, [requests]);

  const renderRow = (r: WLHandoffRequest) => (
    <Card key={r.id} className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{r.title}</p>
            <Badge variant="outline" className="text-xs">
              {TYPE_LABEL[r.request_type]}
            </Badge>
            <Badge
              variant={r.status === 'open' ? 'destructive' : 'secondary'}
              className="text-xs capitalize"
            >
              {r.status}
            </Badge>
          </div>
          {r.message && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {r.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(r.requested_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {r.target_item_key && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onJumpToItem(r.target_item_key!)}
          >
            Go to field <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
        {r.request_type === 'missing_document' && (
          <Button size="sm" variant="outline" onClick={onJumpToDocs}>
            Go to documents <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
        {r.status === 'open' && (
          <Button
            size="sm"
            onClick={() => markResolved.mutate(r.id)}
            disabled={markResolved.isPending}
          >
            Mark resolved
          </Button>
        )}
      </div>
    </Card>
  );

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!requests?.length) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        <Inbox className="w-6 h-6 mx-auto mb-2" />
        No requests yet.
      </Card>
    );
  }

  return (
    <Tabs defaultValue={open.length > 0 ? 'open' : 'resolved'}>
      <TabsList>
        <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
        <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="open" className="space-y-2 mt-4">
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">No open requests.</p>
        ) : (
          open.map(renderRow)
        )}
      </TabsContent>
      <TabsContent value="resolved" className="space-y-2 mt-4">
        {resolved.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">No resolved requests yet.</p>
        ) : (
          resolved.map(renderRow)
        )}
      </TabsContent>
    </Tabs>
  );
}
