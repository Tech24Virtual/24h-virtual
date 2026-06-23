import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { TaskDetailDialog } from '@/components/staff/TaskDetailDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Search, Plus, CheckCircle2, Clock, CheckSquare, AlertTriangle, ListTodo } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { getPriorityDueDate, getExpirationStatus, getPriorityTimeFrame } from '@/lib/taskPriority';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  created_by: string | null;
  assigned_to: string | null;
  lead_id: string | null;
  visibility: string | null;
  lead?: { name: string; company: string | null } | null;
}

const priorityBadge = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <Badge className="bg-red-100 text-red-800 border border-red-200 shrink-0">Urgent</Badge>;
    case 'high':
      return <Badge className="bg-red-100 text-red-800 border border-red-200 shrink-0">High</Badge>;
    case 'medium':
      return <Badge className="bg-amber-100 text-amber-800 border border-amber-200 shrink-0">Medium</Badge>;
    case 'normal':
      return <Badge className="bg-blue-100 text-blue-800 border border-blue-200 shrink-0">Normal</Badge>;
    case 'low':
      return <Badge className="bg-gray-100 text-gray-600 border border-gray-200 shrink-0">Low</Badge>;
    default:
      return <Badge variant="secondary" className="shrink-0">{priority}</Badge>;
  }
};

const dueDateLabel = (due: string | null, status: string) => {
  if (!due || status === 'completed') return null;
  const date = new Date(due);
  const overdue = isPast(date);
  const daysLeft = differenceInDays(date, new Date());
  const soon = daysLeft >= 0 && daysLeft <= 2;
  return (
    <span className={cn(
      'text-xs flex items-center gap-1',
      overdue ? 'text-red-600 font-medium' : soon ? 'text-amber-600' : 'text-muted-foreground'
    )}>
      {overdue && <AlertTriangle className="h-3 w-3" />}
      {overdue ? 'Overdue · ' : soon ? 'Due soon · ' : 'Due · '}
      {format(date, 'MMM d')}
    </span>
  );
};

export default function AgentTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    lead_id: '',
    task_type: 'general',
    visibility: 'universal',
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['agent-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*, lead:leads(name, company)')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).filter(task => {
        if (task.visibility === 'self') {
          return task.created_by === user?.id || task.assigned_to === user?.id;
        }
        return true;
      }) as Task[];
    },
    enabled: !!user?.id,
  });

  const { data: leads } = useQuery({
    queryKey: ['leads-for-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('id, name, company').order('name');
      if (error) throw error;
      return data;
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const dueDate = getPriorityDueDate(newTask.priority);
      const { error } = await supabase.from('crm_tasks').insert({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        lead_id: newTask.task_type === 'lead' && newTask.lead_id ? newTask.lead_id : null,
        assigned_to: user?.id,
        created_by: user?.id,
        due_date: dueDate.toISOString(),
        visibility: newTask.visibility,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      toast.success('Task created');
      setIsDialogOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', lead_id: '', task_type: 'general', visibility: 'universal' });
    },
    onError: () => toast.error('Failed to create task'),
  });

  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_tasks').update({ status: 'completed' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['agent-open-tasks'] });
      toast.success('Task marked complete');
    },
    onError: () => toast.error('Failed to update task'),
  });

  const isActive = (status: string) => status === 'open' || status === 'pending' || status === 'in_progress';

  const filteredTasks = (tasks ?? []).filter(task => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      task.title.toLowerCase().includes(term) ||
      (task.description?.toLowerCase().includes(term) ?? false) ||
      (task.lead?.name?.toLowerCase().includes(term) ?? false);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' ? isActive(task.status) : task.status === statusFilter);

    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const activeCount = (tasks ?? []).filter(t => isActive(t.status)).length;
  const completedCount = (tasks ?? []).filter(t => t.status === 'completed').length;

  return (
    <StaffLayout role="agent">
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-muted-foreground">Manage your assigned tasks</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Task description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task_type">Task Type</Label>
                  <Select value={newTask.task_type} onValueChange={v => setNewTask({ ...newTask, task_type: v, lead_id: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Task</SelectItem>
                      <SelectItem value="lead">Lead Follow-up</SelectItem>
                      <SelectItem value="internal">Internal Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newTask.task_type === 'lead' && (
                  <div className="space-y-2">
                    <Label htmlFor="lead">Linked Lead</Label>
                    <Select value={newTask.lead_id} onValueChange={v => setNewTask({ ...newTask, lead_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger>
                      <SelectContent>
                        {leads?.map(lead => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.name} {lead.company && `(${lead.company})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newTask.priority} onValueChange={v => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low – {getPriorityTimeFrame('low')}</SelectItem>
                      <SelectItem value="medium">Medium – {getPriorityTimeFrame('medium')}</SelectItem>
                      <SelectItem value="high">High – {getPriorityTimeFrame('high')}</SelectItem>
                      <SelectItem value="urgent">Urgent – {getPriorityTimeFrame('urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="visibility">Self Task Only</Label>
                    <p className="text-xs text-muted-foreground">
                      {newTask.visibility === 'self' ? 'Only visible to you' : 'Visible to all team members'}
                    </p>
                  </div>
                  <Switch
                    id="visibility"
                    checked={newTask.visibility === 'self'}
                    onCheckedChange={checked => setNewTask({ ...newTask, visibility: checked ? 'self' : 'universal' })}
                  />
                </div>
                <Button
                  onClick={() => createTaskMutation.mutate()}
                  disabled={!newTask.title || createTaskMutation.isPending}
                  className="w-full"
                >
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{activeCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task list */}
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))
              ) : filteredTasks.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No tasks found</p>
                  <p className="text-sm mt-1 opacity-70">
                    {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create a task to get started'}
                  </p>
                </div>
              ) : (
                filteredTasks.map(task => {
                  const expirationStatus = getExpirationStatus(task.due_date, task.created_at, task.status);
                  const done = task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'p-4 flex items-start gap-4 transition-colors',
                        expirationStatus === 'expired' && !done && 'bg-red-50/60 border-l-4 border-l-red-400',
                        expirationStatus === 'warning' && !done && 'bg-amber-50/60 border-l-4 border-l-amber-400',
                        expirationStatus === 'normal' && 'hover:bg-muted/40'
                      )}
                    >
                      {/* Complete checkbox — click area */}
                      <button
                        disabled={done || completeTask.isPending}
                        onClick={() => !done && completeTask.mutate(task.id)}
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors',
                          done
                            ? 'bg-green-500 border-green-500 text-white cursor-default'
                            : 'border-muted-foreground/30 hover:border-green-500 cursor-pointer'
                        )}
                        title={done ? 'Completed' : 'Mark complete'}
                      >
                        {done && <CheckCircle2 className="h-3 w-3" />}
                      </button>

                      {/* Content — click to open detail */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => { setSelectedTask(task); setTaskDetailOpen(true); }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn('font-medium text-sm', done && 'line-through text-muted-foreground')}>
                            {task.title}
                          </p>
                          {task.visibility === 'self' && (
                            <Badge variant="outline" className="text-xs">Self</Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                        {task.lead && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {task.lead.name}{task.lead.company && ` · ${task.lead.company}`}
                          </p>
                        )}
                        <div className="mt-1">
                          {dueDateLabel(task.due_date, task.status)}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {priorityBadge(task.priority)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
      />
    </StaffLayout>
  );
}
