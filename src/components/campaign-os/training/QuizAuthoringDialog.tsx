import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useQuizQuestions,
  useUpsertQuizQuestion,
  useDeleteQuizQuestion,
  useUpsertLesson,
  type TrainingLesson,
} from '@/hooks/campaign-os/useTrainingQuizzes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: TrainingLesson;
}

interface ChoiceDraft {
  id: string;
  text: string;
  correct: boolean;
}

export function QuizAuthoringDialog({ open, onOpenChange, lesson }: Props) {
  const questionsQ = useQuizQuestions(lesson.id);
  const upsertQ = useUpsertQuizQuestion();
  const delQ = useDeleteQuizQuestion();
  const upsertLesson = useUpsertLesson();

  const [passingScore, setPassingScore] = useState(lesson.passing_score ?? 90);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftExplanation, setDraftExplanation] = useState('');
  const [draftChoices, setDraftChoices] = useState<ChoiceDraft[]>([
    { id: crypto.randomUUID(), text: '', correct: false },
    { id: crypto.randomUUID(), text: '', correct: true },
  ]);

  const addChoice = () =>
    setDraftChoices((c) => [...c, { id: crypto.randomUUID(), text: '', correct: false }]);

  const setCorrect = (id: string) =>
    setDraftChoices((c) => c.map((ch) => ({ ...ch, correct: ch.id === id })));

  const addQuestion = async () => {
    if (!draftPrompt.trim()) return toast.error('Question prompt required');
    const validChoices = draftChoices.filter((c) => c.text.trim());
    if (validChoices.length < 2) return toast.error('Need at least 2 choices');
    const correctIndex = validChoices.findIndex((c) => c.correct);
    if (correctIndex === -1) return toast.error('Mark a correct choice');
    try {
      await upsertQ.mutateAsync({
        lesson_id: lesson.id,
        question: draftPrompt.trim(),
        explanation: draftExplanation.trim() || null,
        choices: validChoices.map((c) => c.text.trim()),
        correct_index: correctIndex,
        sort_order: (questionsQ.data?.length ?? 0) + 1,
      });
      setDraftPrompt('');
      setDraftExplanation('');
      setDraftChoices([
        { id: crypto.randomUUID(), text: '', correct: false },
        { id: crypto.randomUUID(), text: '', correct: true },
      ]);
      toast.success('Question added');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const savePassing = async () => {
    try {
      await upsertLesson.mutateAsync({
        id: lesson.id,
        module_id: lesson.module_id,
        passing_score: Math.max(1, Math.min(100, passingScore)),
      });
      toast.success('Passing score saved');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quiz: {lesson.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>Passing score (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
              />
            </div>
            <Button onClick={savePassing} disabled={upsertLesson.isPending}>
              Save
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Existing questions</h4>
            {questionsQ.isLoading ? (
              <div className="text-xs text-muted-foreground">Loading…</div>
            ) : (questionsQ.data?.length ?? 0) === 0 ? (
              <div className="text-xs text-muted-foreground">No questions yet.</div>
            ) : (
              questionsQ.data!.map((q) => (
                <Card key={q.id}>
                  <CardContent className="py-3 flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-sm font-medium">{q.question}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {q.choices.map((text, idx) => (
                          <Badge key={idx} variant={idx === q.correct_index ? 'default' : 'outline'}>
                            {text}
                          </Badge>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className="text-xs text-muted-foreground">{q.explanation}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => delQ.mutate({ id: q.id, lesson_id: lesson.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Card>
            <CardContent className="py-3 space-y-3">
              <h4 className="text-sm font-medium">Add question</h4>
              <div>
                <Label>Prompt</Label>
                <Input
                  value={draftPrompt}
                  onChange={(e) => setDraftPrompt(e.target.value)}
                  placeholder="What should the agent do when…"
                />
              </div>
              <div>
                <Label>Choices (toggle the correct one)</Label>
                <div className="space-y-2">
                  {draftChoices.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <Switch checked={c.correct} onCheckedChange={() => setCorrect(c.id)} />
                      <Input
                        value={c.text}
                        onChange={(e) =>
                          setDraftChoices((arr) =>
                            arr.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)),
                          )
                        }
                        placeholder="Choice text"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDraftChoices((arr) => arr.filter((x) => x.id !== c.id))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={addChoice}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add choice
                  </Button>
                </div>
              </div>
              <div>
                <Label>Explanation (optional)</Label>
                <Textarea
                  rows={2}
                  value={draftExplanation}
                  onChange={(e) => setDraftExplanation(e.target.value)}
                />
              </div>
              <Button onClick={addQuestion} disabled={upsertQ.isPending}>
                Add question
              </Button>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
