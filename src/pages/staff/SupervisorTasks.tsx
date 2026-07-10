/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { TaskDetailDialog } from '@/components/staff/TaskDetailDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ListTodo,
  AlertTriangle,
  Plus,
  Loader2,
  CheckSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { getExpirationStatus } from '@/lib/taskPriority';
import { toast } from 'sonner';

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
  assigned_department: string | null;
  lead_id: string | null;
  visibility: string | null;
  lead?: { name: string; company: string | null } | null;
}

interface StaffProfile {
  id: string;
  full_name: string | null;
  role: string;
}

const STAFF_ROLES_FOR_ASSIGNMENT = ['agent', 'supervisor', 'sales', 'billing', 'tech', 'hr'] as const;

// Departments at top (role-based, not profiles.department — profiles.department
// is an unrelated free-text field, not the admin/agent/supervisor/... taxonomy)
const DEPARTMENT_OPTIONS = [
  { value: 'dept:admin', label: '📋 Admin Team', department: 'admin' },
  { value: 'dept:agent', label: '📋 Agent Team', department: 'agent' },
  { value: 'dept:supervisor', label: '📋 Supervisor Team', department: 'supervisor' },
  { value: 'dept:sales', label: '📋 Sales Team', department: 'sales' },
  { value: 'dept:billing', label: '📋 Billing Team', department: 'billing' },
  { value: 'dept:tech', label: '📋 Tech Team', department: 'tech' },
  { value: 'dept:hr', label: '📋 HR Team', department: 'hr' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  assignedTo: 'none',
  assignedDepartment: '',
  priority: 'medium',
  dueDate: '',
};

export default function SupervisorTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_FORM);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: tasks, isLoading, isError, refetch } = useQuery({
    queryKey: ['supervisor-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*, lead:leads(name, company)')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: allStaffProfiles = [] } = useQuery<StaffProfile[]>({
    queryKey: ['staff-profiles-for-tasks'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', STAFF_ROLES_FOR_ASSIGNMENT);
      if (error) throw error;
      if (!roles?.length) return [];
      // A user can hold multiple roles — keep the first one encountered per
      // user so each person appears once in the "By Name" list.
      const roleByUser = new Map<string, string>();
      roles.forEach((r: { user_id: string; role: string }) => {
        if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role);
      });
      const ids = [...roleByUser.keys()];
      const { data: profiles, error: pe } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);
      if (pe) throw pe;
      return (profiles ?? []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        role: roleByUser.get(p.id) ?? '',
      }));
    },
    enabled: newTaskOpen,
  });

  const handleAssigneeChange = (value: string) => {
    if (value.startsWith('dept:')) {
      const dept = value.replace('dept:', '');
      setTaskForm(f => ({ ...f, assignedTo: 'none', assignedDepartment: dept }));
    } else {
      setTaskForm(f => ({ ...f, assignedTo: value, assignedDepartment: '' }));
    }
  };

  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const { data, error } = await supabase
        .from('crm_tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select('id');
      if (error) {
        console.error('crm_tasks toggle error:', error);
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error('Task not found or you do not have permission to update it');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-tasks'] });
      toast.success('Task updated');
    },
    onError: (error) => {
      console.error('Task toggle error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update task');
    },
  });

  const createTask = useMutation({
    mutationFn: async (form: typeof EMPTY_FORM) => {
      const { error } = await (supabase as any).from('crm_tasks').insert({
        title: form.title,
        description: form.description || null,
        assigned_to: form.assignedTo !== 'none' ? form.assignedTo : null,
        assigned_department: form.assignedDepartment || null,
        created_by: user?.id ?? null,
        priority: form.priority,
        due_date: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        status: 'pending',
        visibility: 'universal',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-tasks'] });
      toast.success('Task created');
      setNewTaskOpen(false);
      setTaskForm(EMPTY_FORM);
    },
    onError: (error) => {
      console.error('Task create error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
    },
  });

  const filtered = tasks?.filter(task => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || task.title.toLowerCase().includes(q) || task.lead?.name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: tasks?.length || 0,
    pending: tasks?.filter(t => t.status === 'pending')?.length || 0,
    completed: tasks?.filter(t => t.status === 'completed')?.length || 0,
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { className: string; label: string }> = {
      urgent: { className: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Urgent' },
      high: { className: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'High' },
      medium: { className: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Medium' },
      low: { className: 'bg-gray-500/10 text-gray-600 border-gray-500/20', label: 'Low' },
    };
    const c = config[priority];
    return c ? <Badge className={c.className}>{c.label}</Badge> : <Badge variant="secondary">{priority}</Badge>;
  };

  if (isError) return (
    <StaffLayout role="supervisor">
      <Card className="p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
        <p className="font-medium">Failed to load tasks</p>
        <p className="text-sm text-muted-foreground mt-1">Check your permissions or try refreshing</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
      </Card>
    </StaffLayout>
  );

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Team Tasks</h1>
                <p className="text-muted-foreground mt-0.5">All tasks across the team</p>
              </div>
            </div>
            <Button onClick={() => setNewTaskOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.pending}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.completed}</div></CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))
              ) : filtered?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tasks found</p>
                </div>
              ) : (
                filtered?.map((task) => {
                  const expirationStatus = getExpirationStatus(task.due_date, task.created_at, task.status);
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'p-4 flex items-start gap-4 transition-colors',
                        expirationStatus === 'expired' && 'bg-destructive/10 border-l-4 border-l-destructive',
                        expirationStatus === 'warning' && 'bg-yellow-500/10 border-l-4 border-l-yellow-500',
                        expirationStatus === 'normal' && 'hover:bg-muted/50'
                      )}
                    >
                      <button
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center mt-1 shrink-0',
                          task.status === 'completed'
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus.mutate({ id: task.id, currentStatus: task.status });
                        }}
                      >
                        {task.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                      </button>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn('font-medium', task.status === 'completed' && 'line-through text-muted-foreground')}>
                            {task.title}
                          </p>
                          {expirationStatus === 'expired' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          {expirationStatus === 'warning' && <Clock className="h-4 w-4 text-yellow-600" />}
                          {task.assigned_department && (
                            <Badge variant="outline" className="text-xs">
                              📋 {task.assigned_department.charAt(0).toUpperCase() + task.assigned_department.slice(1)} Team
                            </Badge>
                          )}
                        </div>
                        {task.lead && (
                          <p className="text-sm text-muted-foreground">
                            {task.lead.name}{task.lead.company && ` • ${task.lead.company}`}
                          </p>
                        )}
                        {task.due_date && (
                          <p className={cn(
                            'text-xs mt-1',
                            expirationStatus === 'expired' ? 'text-destructive font-medium' : 'text-muted-foreground'
                          )}>
                            Due: {format(new Date(task.due_date), 'MMM d, h:mm a')}
                          </p>
                        )}
                      </div>
                      <div onClick={() => setSelectedTask(task)} className="cursor-pointer">
                        {getPriorityBadge(task.priority)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={newTaskOpen}
        onOpenChange={(open) => {
          setNewTaskOpen(open);
          if (!open) setTaskForm(EMPTY_FORM);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional details"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>Assignee</Label>
              <Select
                value={taskForm.assignedDepartment ? `dept:${taskForm.assignedDepartment}` : taskForm.assignedTo}
                onValueChange={handleAssigneeChange}
              >
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  <SelectGroup>
                    <SelectLabel>── By Department ──</SelectLabel>
                    {DEPARTMENT_OPTIONS.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>── By Name ──</SelectLabel>
                    {allStaffProfiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        👤 {p.full_name ?? 'Unknown'} ({p.role})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTaskOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createTask.mutate(taskForm)}
              disabled={!taskForm.title.trim() || createTask.isPending}
            >
              {createTask.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</>
              ) : (
                'Create Task'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
      />
    </StaffLayout>
  );
}
