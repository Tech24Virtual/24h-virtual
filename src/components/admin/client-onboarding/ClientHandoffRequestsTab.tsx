import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Inbox, ArrowRight, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useClientHandoffRequests,
  useClientHandoffItems,
  useClientHandoffMutations,
  type ClientHandoffRequest,
} from '@/hooks/admin/useClientHandoffs';

const TYPE_LABEL: Record<ClientHandoffRequest['request_type'], string> = {
  missing_item: 'Missing info',
  missing_document: 'Missing document',
  clarification: 'Clarification',
  correction: 'Correction',
};

const REQUEST_TYPES = Object.keys(TYPE_LABEL) as ClientHandoffRequest['request_type'][];

interface Props {
  handoffId: string;
  onJumpToItem: (itemKey: string) => void;
  onJumpToDocs: () => void;
}

export function ClientHandoffRequestsTab({ handoffId, onJumpToItem, onJumpToDocs }: Props) {
  const { data: requests, isLoading } = useClientHandoffRequests(handoffId);
  const { data: items } = useClientHandoffItems(handoffId);
  const { markRequestResolved, createRequest } = useClientHandoffMutations(handoffId);
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] =
    useState<ClientHandoffRequest['request_type']>('missing_item');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('none');

  const fillableItems = useMemo(
    () => (items ?? []).filter((i) => i.is_client_fillable),
    [items],
  );

  const { openList, resolved } = useMemo(() => {
    const list = requests ?? [];
    return {
      openList: list.filter((r) => r.status === 'open'),
      resolved: list.filter((r) => r.status !== 'open'),
    };
  }, [requests]);

  const submit = async () => {
    if (!title.trim()) return;
    await createRequest.mutateAsync({
      request_type: requestType,
      title,
      message,
      target_item_key: target === 'none' ? null : target,
    });
    setTitle('');
    setMessage('');
    setTarget('none');
    setRequestType('missing_item');
    setOpen(false);
  };

  const renderRow = (r: ClientHandoffRequest) => (
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
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(r.requested_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {r.target_item_key && (
          <Button size="sm" variant="outline" onClick={() => onJumpToItem(r.target_item_key!)}>
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
            onClick={() => markRequestResolved.mutate(r.id)}
            disabled={markRequestResolved.isPending}
          >
            Mark resolved
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New request
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !requests?.length ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Inbox className="w-6 h-6 mx-auto mb-2" />
          No requests yet.
        </Card>
      ) : (
        <Tabs defaultValue={openList.length > 0 ? 'open' : 'resolved'}>
          <TabsList>
            <TabsTrigger value="open">Open ({openList.length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="space-y-2 mt-4">
            {openList.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No open requests.</p>
            ) : (
              openList.map(renderRow)
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
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request more info from client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Request type</Label>
              <Select
                value={requestType}
                onValueChange={(v) => setRequestType(v as ClientHandoffRequest['request_type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                placeholder="Short summary"
              />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                rows={4}
                placeholder="Details for the client…"
              />
            </div>
            <div className="space-y-1">
              <Label>Target item (optional)</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No target</SelectItem>
                  {fillableItems.map((it) => (
                    <SelectItem key={it.item_key} value={it.item_key}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!title.trim() || createRequest.isPending}>
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
