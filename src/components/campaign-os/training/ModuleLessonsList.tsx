import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ClipboardList, BookOpen, CheckSquare, Play, GripVertical, Pencil } from 'lucide-react';
import { EditLessonDialog } from './EditLessonDialog';
import { toast } from 'sonner';
import {
  useModuleLessons,
  useUpsertLesson,
  useDeleteLesson,
  useReorderLessons,
  type TrainingLesson,
} from '@/hooks/campaign-os/useTrainingQuizzes';
import { QuizAuthoringDialog } from './QuizAuthoringDialog';
import { QuizRunner } from './QuizRunner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  moduleId: string;
  campaignId: string;
}

const KIND_ICON = {
  content: BookOpen,
  acknowledgement: CheckSquare,
  quiz: ClipboardList,
} as const;

interface LessonRowProps {
  lesson: TrainingLesson;
  moduleId: string;
  onAuthor: (l: TrainingLesson) => void;
  onRun: (l: TrainingLesson) => void;
  onEdit: (l: TrainingLesson) => void;
  onRequestDelete: (l: TrainingLesson) => void;
  isDeleting: boolean;
  disableDelete: boolean;
}

function SortableLessonRow({
  lesson,
  onAuthor,
  onRun,
  onEdit,
  onRequestDelete,
  isDeleting,
  disableDelete,
}: LessonRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });
  const Icon = KIND_ICON[lesson.kind];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isDeleting ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm truncate">{lesson.title}</span>
        <Badge variant="outline" className="text-[10px]">
          {lesson.kind}
        </Badge>
        {lesson.kind === 'quiz' && lesson.passing_score && (
          <Badge variant="secondary" className="text-[10px]">
            pass {lesson.passing_score}%
          </Badge>
        )}
      </div>
      <div className="flex gap-1">
        {lesson.kind === 'quiz' && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAuthor(lesson)}>
              Author
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRun(lesson)}>
              <Play className="h-3 w-3 mr-1" />
              Try
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          aria-label={`Edit lesson ${lesson.title}`}
          onClick={() => onEdit(lesson)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          aria-label={`Delete lesson ${lesson.title}`}
          disabled={disableDelete}
          onClick={() => onRequestDelete(lesson)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function ModuleLessonsList({ moduleId, campaignId }: Props) {
  const lessonsQ = useModuleLessons(moduleId);
  const upsert = useUpsertLesson();
  const del = useDeleteLesson();
  const reorder = useReorderLessons();

  const [showCreate, setShowCreate] = useState(false);
  const [newKind, setNewKind] = useState<TrainingLesson['kind']>('content');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newPassing, setNewPassing] = useState(80);

  const [authoringLesson, setAuthoringLesson] = useState<TrainingLesson | null>(null);
  const [runningLesson, setRunningLesson] = useState<TrainingLesson | null>(null);
  const [editingLesson, setEditingLesson] = useState<TrainingLesson | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TrainingLesson | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const create = async () => {
    if (!newTitle.trim()) return toast.error('Title required');
    try {
      await upsert.mutateAsync({
        module_id: moduleId,
        kind: newKind,
        title: newTitle.trim(),
        body_md: newKind === 'quiz' ? null : newBody,
        passing_score: newKind === 'quiz' ? newPassing : null,
        sort_order: (lessonsQ.data?.length ?? 0) + 1,
      });
      toast.success('Lesson added');
      setShowCreate(false);
      setNewTitle('');
      setNewBody('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const lessons = lessonsQ.data ?? [];
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(lessons, oldIndex, newIndex);
    reorder.mutate(
      { module_id: moduleId, ordered_ids: next.map((l) => l.id) },
      {
        onError: (e: any) => toast.error(e.message ?? 'Failed to reorder'),
      }
    );
  };

  const lessons = lessonsQ.data ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Lessons
        </h4>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
          <Plus className="h-3 w-3 mr-1" />
          Add lesson
        </Button>
      </div>

      {lessonsQ.isLoading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : lessons.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          No lessons yet. Add a content section, acknowledgement, or quiz.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {lessons.map((l) => (
                <SortableLessonRow
                  key={l.id}
                  lesson={l}
                  moduleId={moduleId}
                  onAuthor={setAuthoringLesson}
                  onRun={setRunningLesson}
                  onEdit={setEditingLesson}
                  onRequestDelete={setPendingDelete}
                  isDeleting={del.isPending && pendingDelete?.id === l.id}
                  disableDelete={del.isPending || reorder.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Kind</Label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as TrainingLesson['kind'])}
              >
                <option value="content">Content</option>
                <option value="acknowledgement">Acknowledgement</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            {newKind !== 'quiz' && (
              <div>
                <Label>Body (markdown)</Label>
                <Textarea rows={6} value={newBody} onChange={(e) => setNewBody(e.target.value)} />
              </div>
            )}
            {newKind === 'quiz' && (
              <div>
                <Label>Passing score (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={newPassing}
                  onChange={(e) => setNewPassing(Number(e.target.value))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={upsert.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {authoringLesson && (
        <QuizAuthoringDialog
          open={!!authoringLesson}
          onOpenChange={(o) => !o && setAuthoringLesson(null)}
          lesson={authoringLesson}
        />
      )}

      {runningLesson && (
        <Dialog open={!!runningLesson} onOpenChange={(o) => !o && setRunningLesson(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Take quiz: {runningLesson.title}</DialogTitle>
            </DialogHeader>
            <QuizRunner lesson={runningLesson} campaignId={campaignId} />
          </DialogContent>
        </Dialog>
      )}

      {editingLesson && (
        <EditLessonDialog
          open={!!editingLesson}
          onOpenChange={(o) => !o && setEditingLesson(null)}
          lesson={editingLesson}
        />
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o && !del.isPending) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? (
                <>
                  &ldquo;<span className="font-medium">{pendingDelete.title}</span>&rdquo; will be
                  permanently removed
                  {pendingDelete.kind === 'quiz' &&
                    ', along with its questions and any attempt history'}
                  . This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={del.isPending}
              onClick={async (e) => {
                e.preventDefault();
                if (!pendingDelete) return;
                try {
                  await del.mutateAsync({ id: pendingDelete.id, module_id: moduleId });
                  toast.success('Lesson deleted');
                  setPendingDelete(null);
                } catch (err: any) {
                  toast.error(err?.message ?? 'Failed to delete lesson');
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {del.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
