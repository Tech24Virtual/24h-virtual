import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { useFulfillmentIntakeMutations } from '@/hooks/admin/useFulfillmentIntakes';

interface SnapshotItem {
  item_key: string;
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intakeId: string;
  partnerId: string;
  handoffId: string;
  snapshotItems: SnapshotItem[];
}

const REQUEST_TYPES = [
  { value: 'missing_item', label: 'Missing info' },
  { value: 'missing_document', label: 'Missing document' },
  { value: 'clarification', label: 'Clarification' },
  { value: 'correction', label: 'Correction' },
] as const;

export function FulfillmentRequestDialog({
  open,
  onOpenChange,
  intakeId,
  partnerId,
  handoffId,
  snapshotItems,
}: Props) {
  const { requestMoreInfo } = useFulfillmentIntakeMutations();
  const [requestType, setRequestType] = useState<(typeof REQUEST_TYPES)[number]['value']>('missing_item');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetItemKey, setTargetItemKey] = useState<string>('none');

  const submit = async () => {
    if (!title.trim()) return;
    await requestMoreInfo.mutateAsync({
      intakeId,
      partnerId,
      handoffId,
      request_type: requestType,
      title,
      message: message || undefined,
      target_item_key: targetItemKey === 'none' ? null : targetItemKey,
    });
    setTitle('');
    setMessage('');
    setTargetItemKey('none');
    setRequestType('missing_item');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request more info from partner</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Request type</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as typeof requestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
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
              placeholder="Details for the partner…"
            />
          </div>
          <div className="space-y-1">
            <Label>Target item (optional)</Label>
            <Select value={targetItemKey} onValueChange={setTargetItemKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No target</SelectItem>
                {snapshotItems.map((it) => (
                  <SelectItem key={it.item_key} value={it.item_key}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim() || requestMoreInfo.isPending}>
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
