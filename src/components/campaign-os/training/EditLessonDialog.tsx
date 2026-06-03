import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  useUpsertLesson,
  type TrainingLesson,
} from '@/hooks/campaign-os/useTrainingQuizzes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: TrainingLesson;
}

export function EditLessonDialog({ open, onOpenChange, lesson }: Props) {
  const upsert = useUpsertLesson();
  const [title, setTitle] = useState(lesson.title);
  const [body, setBody] = useState(lesson.body_md ?? '');
  const [passing, setPassing] = useState(lesson.passing_score ?? 80);

  // Reset local state whenever the dialog is opened against a (potentially
  // different) lesson so we always edit the current values.
  useEffect(() => {
    if (open) {
      setTitle(lesson.title);
      setBody(lesson.body_md ?? '');
      setPassing(lesson.passing_score ?? 80);
    }
  }, [open, lesson]);

  const isQuiz = lesson.kind === 'quiz';
  const showBody = lesson.kind === 'content' || lesson.kind === 'acknowledgement';

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error('Title required');
      return;
    }
    if (isQuiz && (!Number.isFinite(passing) || passing < 1 || passing > 100)) {
      toast.error('Passing score must be between 1 and 100');
      return;
    }
    try {
      await upsert.mutateAsync({
        id: lesson.id,
        module_id: lesson.module_id,
        kind: lesson.kind,
        title: trimmed,
        body_md: showBody ? body : null,
        passing_score: isQuiz ? passing : null,
        sort_order: lesson.sort_order,
      });
      toast.success('Lesson updated');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update lesson');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && upsert.isPending) return;
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit lesson</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Kind</Label>
            <div className="text-sm text-muted-foreground capitalize">{lesson.kind}</div>
          </div>
          <div>
            <Label htmlFor="edit-lesson-title">Title</Label>
            <Input
              id="edit-lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          {showBody && (
            <div>
              <Label htmlFor="edit-lesson-body">Body (markdown)</Label>
              <Textarea
                id="edit-lesson-body"
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          )}
          {isQuiz && (
            <div>
              <Label htmlFor="edit-lesson-pass">Passing score (%)</Label>
              <Input
                id="edit-lesson-pass"
                type="number"
                min={1}
                max={100}
                value={passing}
                onChange={(e) => setPassing(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Questions and choices are managed in the quiz authoring dialog.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={upsert.isPending}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={upsert.isPending}>
            {upsert.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
