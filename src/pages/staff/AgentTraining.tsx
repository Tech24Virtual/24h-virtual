import { useMemo, useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { isAfter } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, CheckCircle2, Clock, GraduationCap, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useMyAssignedModules,
  useMySignoffsWithExpiry,
  type AssignedModuleRow,
  type SignoffWithExpiry,
} from '@/hooks/campaign-os/useTrainingAssignments';
import {
  useMyCompletions,
  useMarkComplete,
  type TrainingCompletion,
} from '@/hooks/campaign-os/useTrainingCompletions';
import {
  useModuleLessons,
  useQuizQuestions,
  useSubmitQuizAttempt,
  useMyQuizAttempts,
  type TrainingLesson,
} from '@/hooks/campaign-os/useTrainingQuizzes';

// ─── Stable empty-array sentinels ─────────────────────────────────────────────
const EMPTY_ASSIGNMENTS: AssignedModuleRow[] = [];
const EMPTY_COMPLETIONS: TrainingCompletion[] = [];
const EMPTY_LESSONS: TrainingLesson[] = [];
const EMPTY_SIGNOFFS: SignoffWithExpiry[] = [];

// ─── Types ─────────────────────────────────────────────────────────────────────
type ModuleStatus = 'upcoming' | 'overdue' | 'completed' | 'signed-off' | 'needs-refresh';

type Tab = 'current' | 'in-progress' | 'completed';

// ─── Status helpers ────────────────────────────────────────────────────────────
function getModuleStatus(
  assignment: AssignedModuleRow,
  completion: TrainingCompletion | null,
  signoff: SignoffWithExpiry | null,
): ModuleStatus {
  if (signoff) return signoff.needs_refresh ? 'needs-refresh' : 'signed-off';
  if (completion) return 'completed';
  if (assignment.due_date && isAfter(new Date(), new Date(assignment.due_date)))
    return 'overdue';
  return 'upcoming';
}

function extractExcerpt(md: string | null, maxLen = 110): string {
  if (!md) return '';
  const plain = md
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*|__|\*|_|~~|`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  return plain.length > maxLen ? plain.slice(0, maxLen).trimEnd() + '…' : plain;
}

// Unescape literal \n sequences stored in DB as escaped strings
function unescape(md: string | null): string {
  if (!md) return '';
  return md.replace(/\\n/g, '\n');
}

// ─── Status visual config ──────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ModuleStatus, {
  border: string; bg: string; dot: string; label: string; labelColor: string;
}> = {
  upcoming:      { border: 'border-blue-200',   bg: 'bg-blue-50/40',   dot: 'bg-blue-400',   label: 'Upcoming',      labelColor: 'text-blue-700'   },
  overdue:       { border: 'border-red-200',    bg: 'bg-red-50/40',    dot: 'bg-red-500',    label: 'Overdue',       labelColor: 'text-red-700'    },
  completed:     { border: 'border-teal-200',   bg: 'bg-teal-50/40',   dot: 'bg-teal-500',   label: 'Completed',     labelColor: 'text-teal-700'   },
  'signed-off':  { border: 'border-green-200',  bg: 'bg-green-50/40',  dot: 'bg-green-500',  label: 'Signed Off',    labelColor: 'text-green-700'  },
  'needs-refresh': { border: 'border-amber-200', bg: 'bg-amber-50/40', dot: 'bg-amber-500',  label: 'Needs Refresh', labelColor: 'text-amber-700'  },
};

// ─── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ModuleStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border', cfg.bg, cfg.border, cfg.labelColor)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── StatPill ──────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-full px-4 py-1.5 shadow-sm border flex items-center gap-2">
      <Icon className={cn('h-4 w-4', color)} />
      <span className="text-sm font-semibold text-slate-800">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

// ─── SectionHeader ─────────────────────────────────────────────────────────────
function SectionHeader({ label, count, status }: { label: string; count: number; status: ModuleStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className={cn('h-2 w-2 rounded-full shrink-0', cfg.dot)} />
      <span className={cn('text-[11px] font-semibold uppercase tracking-widest', cfg.labelColor)}>
        {label} <span className="text-slate-400 font-normal">({count})</span>
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

// ─── ModuleCard ────────────────────────────────────────────────────────────────
function ModuleCard({
  assignment,
  status,
  onOpen,
}: {
  assignment: AssignedModuleRow;
  status: ModuleStatus;
  onOpen: () => void;
}) {
  const cfg = STATUS_CONFIG[status];
  const mod = assignment.module;
  const excerpt = extractExcerpt(mod?.body_md ?? mod?.summary ?? null);

  return (
    <div
      className={cn(
        'p-5 rounded-2xl shadow-sm hover:shadow-md border-l-4 border border-r border-t border-b transition-shadow cursor-pointer',
        cfg.bg,
        cfg.border,
      )}
      style={{ borderLeftColor: cfg.dot.replace('bg-', '').includes('-') ? undefined : undefined }}
    >
      {/* Row 1: title + badges */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{mod?.title ?? 'Untitled Module'}</h3>
          {mod?.campaign?.display_name && (
            <p className="text-[11px] text-slate-400 mt-0.5">{mod.campaign.display_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mod?.required && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
              Required
            </span>
          )}
          {assignment.trigger_type === 'refresher' && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              🔄 Refresher
            </Badge>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Row 2: excerpt */}
      {excerpt && <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">{excerpt}</p>}

      {/* Row 3: due date + action */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-400">
          {assignment.due_date
            ? <span className={status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                Due {new Date(assignment.due_date).toLocaleDateString()}
              </span>
            : <span>No due date</span>}
        </div>
        <Button
          size="sm"
          onClick={onOpen}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl px-5 py-2 text-xs font-semibold shadow-sm hover:shadow-md transition-shadow"
        >
          {status === 'completed' ? 'View Submission' : status === 'signed-off' ? 'Review' : 'Start Training'}
        </Button>
      </div>
    </div>
  );
}

// ─── ModuleGroup ───────────────────────────────────────────────────────────────
function ModuleGroup({
  label,
  status,
  modules,
  completionByModule,
  signoffByCompletion,
  onOpen,
}: {
  label: string;
  status: ModuleStatus;
  modules: AssignedModuleRow[];
  completionByModule: Map<string, TrainingCompletion>;
  signoffByCompletion: Map<string, SignoffWithExpiry>;
  onOpen: (a: AssignedModuleRow) => void;
}) {
  if (!modules.length) return null;
  return (
    <div className="space-y-3">
      <SectionHeader label={label} count={modules.length} status={status} />
      {modules.map((a) => (
        <ModuleCard
          key={a.id}
          assignment={a}
          status={getModuleStatus(a, completionByModule.get(a.module_id) ?? null, signoffByCompletion.get(a.module_id) ?? null)}
          onOpen={() => onOpen(a)}
        />
      ))}
    </div>
  );
}

// ─── QuizLesson ────────────────────────────────────────────────────────────────
function QuizLesson({ lesson, campaignId, moduleId, onDone }: {
  lesson: TrainingLesson;
  campaignId: string | null;
  moduleId: string;
  onDone: () => void;
}) {
  const questionsQ = useQuizQuestions(lesson.id);
  const submitAttempt = useSubmitQuizAttempt();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState(false);
  const [scorePct, setScorePct] = useState(0);

  const questions = questionsQ.data ?? [];
  const passing = lesson.passing_score ?? 90;

  const handleSubmit = async () => {
    const correct = questions.filter(q => Number(answers[q.id]) === q.correct_index).length;
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const didPass = score >= passing;

    try {
      await submitAttempt.mutateAsync({
        lesson_id: lesson.id,
        module_id: moduleId,
        campaign_id: campaignId ?? '',
        score_pct: score,
        passed: didPass,
        answers,
      });
    } catch {
      // non-fatal — still show result
    }

    setScorePct(score);
    setSubmitted(true);
    setPassed(didPass);
    if (didPass) onDone();
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
  };

  if (questionsQ.isLoading) {
    return <div className="text-sm text-slate-500 py-4 text-center">Loading questions…</div>;
  }

  if (submitted) {
    return (
      <div className={cn('rounded-xl p-4 text-center', passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200')}>
        <p className={cn('font-semibold text-sm', passed ? 'text-green-700' : 'text-red-700')}>
          {passed
            ? `Quiz passed! You scored ${scorePct}%.`
            : `You scored ${scorePct}%. You need ${passing}% or higher to pass. Please retake the quiz.`}
        </p>
        {!passed && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={handleRetake}
          >
            Retake Quiz
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <p className="text-sm font-medium text-slate-800">{i + 1}. {q.question}</p>
          <div className="space-y-1.5">
            {q.choices.map((choiceText, idx) => (
              <label key={idx} className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name={q.id}
                  value={idx}
                  checked={answers[q.id] === String(idx)}
                  onChange={() => setAnswers(prev => ({ ...prev, [q.id]: String(idx) }))}
                  className="mt-0.5 accent-blue-600"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">{choiceText}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button
        onClick={handleSubmit}
        disabled={Object.keys(answers).length < questions.length || submitAttempt.isPending}
        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl"
      >
        Submit Quiz
      </Button>
    </div>
  );
}

// ─── LessonCard ────────────────────────────────────────────────────────────────
function LessonCard({ lesson, index, isDone, onDone, campaignId, moduleId }: {
  lesson: TrainingLesson;
  index: number;
  isDone: boolean;
  onDone: () => void;
  campaignId: string | null;
  moduleId: string;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className={cn('rounded-xl border transition-colors', isDone ? 'border-green-200 bg-green-50/40' : 'border-slate-200 bg-white')}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <span className={cn(
          'h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
          isDone ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500',
        )}>
          {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
        </span>
        <span className="flex-1 text-sm font-medium text-slate-800">{lesson.title}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {lesson.kind === 'quiz' ? 'Quiz' : lesson.kind === 'acknowledgement' ? 'Acknowledge' : 'Read'}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
          {lesson.body_md && (
            <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-700 prose-li:text-slate-700">
              <Markdown>{unescape(lesson.body_md)}</Markdown>
            </div>
          )}

          {lesson.kind === 'quiz' ? (
            <QuizLesson
              lesson={lesson}
              campaignId={campaignId}
              moduleId={moduleId}
              onDone={onDone}
            />
          ) : isDone ? (
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              {lesson.kind === 'acknowledgement' ? 'Acknowledged' : 'Marked as read'}
            </div>
          ) : (
            <Button
              size="sm"
              onClick={onDone}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl"
            >
              {lesson.kind === 'acknowledgement' ? 'I Understand & Agree' : 'Mark as Read'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TrainingDialog ────────────────────────────────────────────────────────────
// assignment is always non-null here (dialog only renders when active !== null)
function TrainingDialog({
  assignment,
  completion,
  onClose,
}: {
  assignment: AssignedModuleRow;
  completion: TrainingCompletion | null;
  onClose: () => void;
}) {
  const lessonsQ = useModuleLessons(assignment.module_id);
  const markComplete = useMarkComplete();
  const [doneLessons, setDoneLessons] = useState<Set<string>>(new Set());
  const [acknowledged, setAcknowledged] = useState(false);

  const mod = assignment.module;
  const lessons = lessonsQ.data ?? EMPTY_LESSONS;
  const noLessons = !lessonsQ.isLoading && lessons.length === 0;

  // Quiz pass/fail is persisted server-side — re-derive from it (not just local
  // doneLessons state) so a passed quiz still counts if the dialog is reopened.
  const quizLessonIds = useMemo(() => lessons.filter(l => l.kind === 'quiz').map(l => l.id), [lessons]);
  const myAttemptsQ = useMyQuizAttempts(quizLessonIds);

  useEffect(() => {
    if (!myAttemptsQ.data) return;
    const passedIds = myAttemptsQ.data.filter(a => a.passed).map(a => a.lesson_id);
    if (!passedIds.length) return;
    setDoneLessons(prev => {
      const next = new Set(prev);
      passedIds.forEach(id => next.add(id));
      return next;
    });
  }, [myAttemptsQ.data]);

  const allQuizzesPassed = quizLessonIds.every(id =>
    (myAttemptsQ.data ?? []).some(a => a.lesson_id === id && a.passed)
  );

  // Complete is enabled when: all lessons done (if lessons exist), or acknowledged (if no lessons) — and every quiz passed at 90%+
  const allDone = noLessons ? acknowledged : lessons.length > 0 && lessons.every(l => doneLessons.has(l.id));
  const canComplete = allDone && allQuizzesPassed;
  const alreadyCompleted = !!completion;

  const handleMarkDone = (lessonId: string) => {
    setDoneLessons(prev => new Set([...prev, lessonId]));
  };

  const handleComplete = async () => {
    try {
      await markComplete.mutateAsync({
        module_id: assignment.module_id,
        campaign_id: mod?.campaign_id ?? '',
      });
      toast.success('Module submitted for supervisor approval.');

      // Fire-and-forget: notify all supervisors — non-blocking
      void (async () => {
        try {
          const { data: supervisors } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'supervisor');
          if (!supervisors?.length) return;
          await supabase.from('notifications').insert(
            supervisors.map(s => ({
              user_id: s.user_id,
              title: 'Training Completion Pending Review',
              message: `An agent has completed a training module and needs your sign-off.`,
              type: 'training',
              action_url: '/staff/supervisor/training-signoffs',
            }))
          );
        } catch {
          // non-fatal
        }
      })();

      onClose();
    } catch {
      toast.error('Failed to mark complete. Please try again.');
    }
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {mod?.title ?? 'Training Module'}
          </DialogTitle>
          {mod?.campaign?.display_name && (
            <p className="text-sm text-slate-500 mt-0.5">{mod.campaign.display_name}</p>
          )}
        </DialogHeader>

        {mod?.summary && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 leading-relaxed">
            {mod.summary}
          </div>
        )}

        {lessonsQ.isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : noLessons ? (
          // Fallback when no lessons are configured: show body_md + acknowledgement
          <div className="space-y-4">
            {mod?.body_md ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-700 prose-li:text-slate-700">
                  <Markdown>{unescape(mod.body_md)}</Markdown>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 text-center">
                No additional content for this module.
              </div>
            )}
            {!alreadyCompleted && (
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={e => setAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900 leading-relaxed">
                  I have read and understood this material.
                </span>
              </label>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson, i) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                index={i}
                isDone={doneLessons.has(lesson.id)}
                onDone={() => handleMarkDone(lesson.id)}
                campaignId={mod?.campaign_id ?? null}
                moduleId={assignment.module_id}
              />
            ))}
          </div>
        )}

        {!alreadyCompleted && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            {!allQuizzesPassed && (
              <p className="text-sm text-amber-600">
                Complete all quizzes with 90% or higher to mark this module as complete.
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Submission requires supervisor approval before being marked complete.
              </p>
              <Button
                onClick={handleComplete}
                disabled={!canComplete || markComplete.isPending}
                className="shrink-0 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl"
              >
                {markComplete.isPending ? 'Submitting…' : 'Mark as Complete'}
              </Button>
            </div>
          </div>
        )}

        {alreadyCompleted && (
          <div className="flex items-center gap-2 justify-center pt-2 border-t border-slate-100 text-amber-700 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Submitted {new Date(completion!.completed_at).toLocaleDateString()} — awaiting supervisor approval
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AgentTraining() {
  const assignedQ = useMyAssignedModules();
  const completionsQ = useMyCompletions();
  const signoffsQ = useMySignoffsWithExpiry();
  const [active, setActive] = useState<AssignedModuleRow | null>(null);
  const [tab, setTab] = useState<Tab>('current');

  const assignments  = assignedQ.data  ?? EMPTY_ASSIGNMENTS;
  const completions  = completionsQ.data ?? EMPTY_COMPLETIONS;
  const signoffs     = signoffsQ.data   ?? EMPTY_SIGNOFFS;

  const completionByModule = useMemo(() => {
    const m = new Map<string, TrainingCompletion>();
    for (const c of completions) m.set(c.module_id, c);
    return m;
  }, [completions]);

  const signoffByModule = useMemo(() => {
    const m = new Map<string, SignoffWithExpiry>();
    for (const s of signoffs) m.set(s.module_id, s);
    return m;
  }, [signoffs]);

  const { overdue, needsRefresh, upcoming, completed, signedOff } = useMemo(() => {
    const overdue: AssignedModuleRow[]     = [];
    const needsRefresh: AssignedModuleRow[] = [];
    const upcoming: AssignedModuleRow[]    = [];
    const completed: AssignedModuleRow[]   = [];
    const signedOff: AssignedModuleRow[]   = [];

    for (const a of assignments) {
      const status = getModuleStatus(
        a,
        completionByModule.get(a.module_id) ?? null,
        signoffByModule.get(a.module_id) ?? null,
      );
      if (status === 'overdue')         overdue.push(a);
      else if (status === 'needs-refresh') needsRefresh.push(a);
      else if (status === 'upcoming')   upcoming.push(a);
      else if (status === 'completed')  completed.push(a);
      else if (status === 'signed-off') signedOff.push(a);
    }
    return { overdue, needsRefresh, upcoming, completed, signedOff };
  }, [assignments, completionByModule, signoffByModule]);

  // Only supervisor-signed-off modules count as truly completed
  const doneCount   = signedOff.length;
  const dueSoonCount = assignments.filter(a => {
    if (!a.due_date) return false;
    const due = new Date(a.due_date);
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    return due <= soon && !completionByModule.has(a.module_id);
  }).length;

  const activeCompletion = active ? (completionByModule.get(active.module_id) ?? null) : null;

  const isLoading = assignedQ.isLoading || completionsQ.isLoading || signoffsQ.isLoading;

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'current',     label: 'Current',     count: overdue.length + needsRefresh.length + upcoming.length },
    { id: 'in-progress', label: 'In Progress', count: completed.length },
    { id: 'completed',   label: 'Completed',   count: signedOff.length },
  ];

  return (
    <StaffLayout role="agent">
      <div className="-m-6 lg:-m-8 min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="px-6 py-6 lg:px-8 lg:py-8 space-y-6">

          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Training</h1>
            <p className="text-sm text-slate-500 mt-1">Complete your assigned modules to stay certified.</p>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-3">
            <StatPill icon={BookOpen}      label="Assigned"  value={assignments.length} color="text-blue-500" />
            <StatPill icon={CheckCircle2}  label="Completed" value={doneCount}           color="text-green-500" />
            <StatPill icon={Clock}         label="Due Soon"  value={dueSoonCount}        color="text-amber-500" />
          </div>

          {/* Motivational banner */}
          {assignments.length > 0 && doneCount === assignments.length && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800 flex items-center gap-3">
              <Star className="h-5 w-5 shrink-0 text-blue-500" />
              <span>All modules completed — great work! Check back for new assignments.</span>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-1 inline-flex gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                  tab === t.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {t.label}
                {!!t.count && (
                  <span className={cn(
                    'text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none',
                    tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                  )}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {tab === 'current' ? (
                <>
                  <ModuleGroup label="Overdue"       status="overdue"       modules={overdue}      completionByModule={completionByModule} signoffByCompletion={signoffByModule} onOpen={setActive} />
                  <ModuleGroup label="Needs Refresh" status="needs-refresh" modules={needsRefresh} completionByModule={completionByModule} signoffByCompletion={signoffByModule} onOpen={setActive} />
                  <ModuleGroup label="Upcoming"      status="upcoming"      modules={upcoming}     completionByModule={completionByModule} signoffByCompletion={signoffByModule} onOpen={setActive} />
                  {overdue.length === 0 && needsRefresh.length === 0 && upcoming.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No current assignments — all caught up!</p>
                    </div>
                  )}
                </>
              ) : tab === 'in-progress' ? (
                <>
                  <ModuleGroup label="Awaiting Approval" status="completed" modules={completed} completionByModule={completionByModule} signoffByCompletion={signoffByModule} onOpen={setActive} />
                  {completed.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No modules pending supervisor approval.</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <ModuleGroup label="Signed Off" status="signed-off" modules={signedOff} completionByModule={completionByModule} signoffByCompletion={signoffByModule} onOpen={setActive} />
                  {signedOff.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <RefreshCw className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No supervisor-approved modules yet.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {active && (
        <TrainingDialog
          assignment={active}
          completion={activeCompletion}
          onClose={() => setActive(null)}
        />
      )}
    </StaffLayout>
  );
}
