import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import {
  useIntakeNotes,
  useFulfillmentIntakeMutations,
} from '@/hooks/admin/useFulfillmentIntakes';

interface Props {
  intakeId: string;
}

const NOTE_TYPES = ['general', 'decision', 'blocker', 'qa'] as const;

export function FulfillmentNotesPanel({ intakeId }: Props) {
  const { data: notes } = useIntakeNotes(intakeId);
  const { addNote } = useFulfillmentIntakeMutations();
  const [body, setBody] = useState('');
  const [type, setType] = useState<(typeof NOTE_TYPES)[number]>('general');

  const submit = async () => {
    if (!body.trim()) return;
    await addNote.mutateAsync({ intakeId, body, noteType: type });
    setBody('');
  };

  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-semibold">Internal notes</h3>
      <div className="space-y-2">
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTE_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 5000))}
          placeholder="Add a note (internal only)…"
          rows={3}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={addNote.isPending || !body.trim()}>
            Add note
          </Button>
        </div>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto pt-2 border-t">
        {!notes?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No notes yet.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="text-sm border rounded-md p-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {n.note_type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{n.body}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
