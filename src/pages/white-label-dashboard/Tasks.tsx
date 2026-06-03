import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WhiteLabelLayout } from '@/components/white-label/WhiteLabelLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useWLPartnerTasks,
  useWLPartnerTaskMutations,
  type WLTaskStatus,
  type WLTaskPriority,
  type WLTaskSource,
} from '@/hooks/wl/useWLPartnerTasks';
import { SEO } from '@/components/SEO';

const PRIORITY_VARIANT: Record<WLTaskPriority, 'default' | 'secondary' | 'outline'> = {
  high: 'default',
  medium: 'secondary',
  low: 'outline',
};

const SOURCE_LABEL: Record<WLTaskSource, string> = {
  proposal_accepted: 'Proposal accepted',
  proposal_viewed: 'Proposal viewed',
  proposal_declined: 'Proposal declined',
  proposal_past_due: 'Proposal past due',
  handoff_created: 'Handoff created',
  manual: 'Manual',
};

const FILTERS_KEY = 'wl-tasks-filters-v1';
const SOON_MS = 72 * 60 * 60 * 1000;

interface PersistedFilters {
  status: WLTaskStatus | 'all';
  priority: WLTaskPriority | 'all';
  source: WLTaskSource | 'all';
}

function loadFilters(): PersistedFilters {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedFilters>;
      return {
        status: (parsed.status as PersistedFilters['status']) ?? 'open',
        priority: (parsed.priority as PersistedFilters['priority']) ?? 'all',
        source: (parsed.source as PersistedFilters['source']) ?? 'all',
      };
    }
  } catch {
    /* ignore */
  }
  return { status: 'open', priority: 'all', source: 'all' };
}

type DueState = 'overdue' | 'soon' | 'normal' | 'none';

function getDueState(dueAt: string | null, status: WLTaskStatus): DueState {
  if (!dueAt) return 'none';
  if (status === 'completed' || status === 'cancelled') return 'none';
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms < 0) return 'overdue';
  if (ms <= SOON_MS) return 'soon';
  return 'normal';
}

export default function WLTasks() {
  const { data: tasks, isLoading } = useWLPartnerTasks();
  const { createTask, setStatus, deleteTask } = useWLPartnerTaskMutations();

  const initial = loadFilters();
  const [statusFilter, setStatusFilter] = useState<WLTaskStatus | 'all'>(initial.status);
  const [priorityFilter, setPriorityFilter] = useState<WLTaskPriority | 'all'>(initial.priority);
  const [sourceFilter, setSourceFilter] = useState<WLTaskSource | 'all'>(initial.source);

  useEffect(() => {
    try {
      localStorage.setItem(
        FILTERS_KEY,
        JSON.stringify({
          status: statusFilter,
          priority: priorityFilter,
          source: sourceFilter,
        }),
      );
    } catch {
      /* ignore quota errors */
    }
  }, [statusFilter, priorityFilter, sourceFilter]);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WLTaskPriority>('medium');
  const [dueAt, setDueAt] = useState('');

  const filtered = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (sourceFilter !== 'all' && t.source_event !== sourceFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, sourceFilter]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createTask.mutateAsync({
      title,
      description: description || null,
      priority,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    });
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueAt('');
    setOpen(false);
  };

  return (
    <WhiteLabelLayout>
      <SEO title="Tasks — White Label Dashboard" description="Partner tasks and reminders" suppressBranding />
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-sm text-muted-foreground">
              Follow-ups, reminders, and onboarding work surfaced from your proposals and leads.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create task</DialogTitle>
                <DialogDescription>
                  Add a manual reminder or follow-up not tied to a specific event.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="t-title">Title</Label>
                  <Input
                    id="t-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                    placeholder="Call client back tomorrow"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-desc">Description</Label>
                  <Textarea
                    id="t-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={(v) => setPriority(v as WLTaskPriority)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="t-due">Due date</Label>
                    <Input
                      id="t-due"
                      type="date"
                      value={dueAt}
                      onChange={(e) => setDueAt(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!title.trim() || createTask.isPending}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WLTaskStatus | 'all')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as WLTaskPriority | 'all')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as WLTaskSource | 'all')}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="proposal_accepted">Proposal accepted</SelectItem>
                  <SelectItem value="proposal_viewed">Proposal viewed</SelectItem>
                  <SelectItem value="proposal_declined">Proposal declined</SelectItem>
                  <SelectItem value="proposal_past_due">Proposal past due</SelectItem>
                  <SelectItem value="handoff_created">Handoff created</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="font-medium">No tasks match these filters.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tasks are created automatically when proposals move forward, or you can add one manually.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => {
              const dueState = getDueState(task.due_at, task.status);
              const completed = task.status === 'completed';
              return (
                <Card
                  key={task.id}
                  className={cn(
                    'p-4 transition-colors',
                    dueState === 'overdue' && 'border-destructive/40 bg-destructive/5',
                    dueState === 'soon' && 'border-amber-500/40 bg-amber-500/5',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() =>
                        setStatus.mutate({
                          id: task.id,
                          status: completed ? 'open' : 'completed',
                        })
                      }
                      className="mt-0.5 text-muted-foreground hover:text-foreground transition"
                      aria-label={completed ? 'Reopen task' : 'Complete task'}
                    >
                      {completed ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`font-medium ${
                            completed ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        <Badge variant={PRIORITY_VARIANT[task.priority]} className="capitalize">
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {task.task_type.replace('_', ' ')}
                        </Badge>
                        {dueState === 'overdue' && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                        {dueState === 'soon' && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                          >
                            Due soon
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                        <span>{SOURCE_LABEL[task.source_event]}</span>
                        {task.due_at && (
                          <span>Due {new Date(task.due_at).toLocaleDateString()}</span>
                        )}
                        {task.proposal && (
                          <Link
                            to={`/white-label-dashboard/clients/proposals/${task.proposal.id}`}
                            className="text-primary hover:underline"
                          >
                            {task.proposal.proposal_number}
                          </Link>
                        )}
                        {task.handoff_id && (
                          <Link
                            to={`/white-label-dashboard/clients/onboarding/${task.handoff_id}`}
                            className="text-primary hover:underline"
                          >
                            View handoff
                          </Link>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTask.mutate(task.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </WhiteLabelLayout>
  );
}
