import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RotateCcw, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  useQuizQuestions,
  useSubmitQuizAttempt,
  type TrainingLesson,
} from '@/hooks/campaign-os/useTrainingQuizzes';
import { scoreQuizAttempt, type QuizQuestion } from '@/lib/campaign-os/quizScoring';
import { cn } from '@/lib/utils';

interface Props {
  lesson: TrainingLesson;
  campaignId: string;
  /** Called once when the agent passes the quiz for the first time in this session. */
  onPass?: () => void;
}

export function QuizRunner({ lesson, campaignId, onPass }: Props) {
  const questionsQ = useQuizQuestions(lesson.id);
  const submit = useSubmitQuizAttempt();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof scoreQuizAttempt> | null>(null);

  const passingScore = lesson.passing_score ?? 80;

  // Map of question id -> explanation, preserved alongside the pure scoring shape.
  const explanationById = useMemo(() => {
    const m = new Map<string, string | null>();
    (questionsQ.data ?? []).forEach((q) => m.set(q.id, q.explanation ?? null));
    return m;
  }, [questionsQ.data]);

  const questions: QuizQuestion[] = useMemo(
    () =>
      (questionsQ.data ?? []).map((q) => ({
        id: q.id,
        prompt: q.question,
        choices: q.choices.map((text, idx) => ({
          id: String(idx),
          text,
          correct: idx === q.correct_index,
        })),
      })),
    [questionsQ.data],
  );

  const reset = () => {
    setAnswers({});
    setResult(null);
  };

  const handleSubmit = async () => {
    if (questions.length === 0) return;
    const formatted = questions.map((q) => ({
      question_id: q.id,
      choice_id: answers[q.id] ?? null,
    }));
    const score = scoreQuizAttempt(questions, formatted, passingScore);
    setResult(score);
    try {
      await submit.mutateAsync({
        lesson_id: lesson.id,
        module_id: lesson.module_id,
        campaign_id: campaignId,
        score_pct: score.scorePct,
        passed: score.passed,
        answers: formatted,
      });
      if (score.passed) {
        toast.success(`Passed with ${score.scorePct}%`);
        onPass?.();
      } else {
        toast.error(`Did not pass (${score.scorePct}%, need ${passingScore}%)`);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (questionsQ.isLoading) return <div className="text-xs text-muted-foreground">Loading quiz…</div>;
  if (questions.length === 0)
    return <div className="text-xs text-muted-foreground">No questions in this quiz.</div>;

  const submitted = !!result;

  return (
    <div className="space-y-3">
      {result && (
        <Card className={result.passed ? 'border-status-success' : 'border-status-warning'}>
          <CardContent className="py-3 flex items-center gap-3">
            {result.passed ? (
              <CheckCircle2 className="h-5 w-5 text-status-success" />
            ) : (
              <XCircle className="h-5 w-5 text-status-warning" />
            )}
            <div className="flex-1">
              <div className="font-medium">
                {result.passed ? 'Passed' : 'Did not pass'} — {result.scorePct}%
              </div>
              <div className="text-xs text-muted-foreground">
                {result.correct} of {result.total} correct (passing: {passingScore}%)
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {result.passed ? 'Try again' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      )}

      {questions.map((q, idx) => {
        const pickedId = answers[q.id] ?? null;
        const pickedChoice = q.choices.find((c) => c.id === pickedId);
        const correctChoice = q.choices.find((c) => c.correct);
        const isCorrect = !!pickedChoice?.correct;
        const explanation = explanationById.get(q.id);

        return (
          <Card
            key={q.id}
            className={cn(
              submitted && (isCorrect ? 'border-status-success/40' : 'border-status-warning/40'),
            )}
          >
            <CardContent className="py-3 space-y-2">
              <div className="flex items-start gap-2">
                {submitted &&
                  (isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-status-success shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-status-warning shrink-0 mt-0.5" />
                  ))}
                <div className="text-sm font-medium">
                  {idx + 1}. {q.prompt}
                </div>
              </div>

              <div className="space-y-1.5">
                {q.choices.map((c) => {
                  const isPicked = answers[q.id] === c.id;
                  const showAsCorrect = submitted && c.correct;
                  const showAsWrongPick = submitted && isPicked && !c.correct;
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        'flex items-center gap-2 text-sm rounded-md border px-2.5 py-1.5 transition-colors',
                        submitted ? 'cursor-default' : 'cursor-pointer hover:bg-muted/40',
                        showAsCorrect && 'border-status-success/50 bg-status-success/5',
                        showAsWrongPick && 'border-status-warning/50 bg-status-warning/5',
                        !submitted && isPicked && 'border-primary bg-primary/5',
                      )}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={isPicked}
                        disabled={submitted}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: c.id }))}
                      />
                      <span className="flex-1">{c.text}</span>
                      {showAsCorrect && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-status-success shrink-0" />
                      )}
                      {showAsWrongPick && (
                        <XCircle className="h-3.5 w-3.5 text-status-warning shrink-0" />
                      )}
                    </label>
                  );
                })}
              </div>

              {submitted && (
                <div className="space-y-1.5 pt-1">
                  {!pickedChoice && (
                    <div className="text-xs text-muted-foreground italic">
                      You did not answer this question.
                    </div>
                  )}
                  {!isCorrect && correctChoice && (
                    <div className="text-xs text-status-success">
                      Correct answer: {correctChoice.text}
                    </div>
                  )}
                  {explanation && (
                    <div className="flex items-start gap-1.5 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>
                        <span className="font-medium text-foreground">Why: </span>
                        {explanation}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={submit.isPending}>
          Submit quiz
        </Button>
      )}
    </div>
  );
}
