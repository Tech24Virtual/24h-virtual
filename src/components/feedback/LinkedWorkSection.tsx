import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Link2, Plus, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  type FeedbackTable,
  type FeedbackHandoff,
  type HandoffKind,
  linkHandoff,
  unlinkHandoff,
  listHandoffs,
} from '@/lib/feedback/api';

const KIND_OPTIONS: { value: HandoffKind; label: string }[] = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'billing', label: 'Billing' },
  { value: 'ops_task', label: 'Ops Task' },
  { value: 'support_ticket', label: 'Support Ticket' },
  { value: 'external', label: 'External' },
];

const KIND_LABEL: Record<HandoffKind, string> = Object.fromEntries(
  KIND_OPTIONS.map((o) => [o.value, o.label])
) as Record<HandoffKind, string>;

interface Props {
  table: FeedbackTable;
  feedbackId: string;
  /** True if the current viewer can add/remove links. */
  canEdit: boolean;
}

export function LinkedWorkSection({ table, feedbackId, canEdit }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<FeedbackHandoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<HandoffKind>('engineering');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listHandoffs(table, feedbackId);
      setItems(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [table, feedbackId]);

  const submit = async () => {
    if (!label.trim()) return;
    setBusy(true);
    try {
      const trimmedUrl = url.trim();
      await linkHandoff({
        table,
        id: feedbackId,
        kind,
        label: label.trim(),
        url: trimmedUrl ? trimmedUrl : null,
      });
      setOpen(false);
      setLabel('');
      setUrl('');
      setKind('engineering');
      load();
    } catch (e: any) {
      toast({ title: 'Could not add link', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (h: FeedbackHandoff) => {
    if (!canEdit) return;
    setBusy(true);
    try {
      await unlinkHandoff({ table, id: feedbackId, handoff_id: h.id });
      load();
    } catch (e: any) {
      toast({ title: 'Could not remove link', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="text-sm font-medium mb-2 flex items-center gap-2">
        <Link2 className="h-4 w-4" />Linked Work
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted-foreground mb-2">No linked work yet.</div>
      ) : (
        <ul className="space-y-1.5 mb-2">
          {items.map((h) => (
            <li key={h.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <Badge variant="secondary" className="capitalize">{KIND_LABEL[h.kind] ?? h.kind}</Badge>
              <span className="font-medium truncate flex-1">{h.label}</span>
              {h.url && (
                <a
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center"
                  aria-label="Open external link"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
              </span>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  disabled={busy}
                  onClick={() => remove(h)}
                  aria-label="Remove link"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={busy}>
          <Plus className="h-3.5 w-3.5 mr-1" />Add link
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add linked work</DialogTitle>
            <DialogDescription>
              Reference an external work item. Bookkeeping only, this does not change feedback status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kind</label>
              <Select value={kind} onValueChange={(v) => setKind(v as HandoffKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Label</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. TICK-1042"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">URL (optional)</label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={!label.trim() || busy}>
              {busy ? 'Adding…' : 'Add link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
