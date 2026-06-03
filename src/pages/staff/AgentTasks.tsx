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
import { Search, Plus, CheckCircle2, Clock, AlertCircle, ListTodo, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
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

export default function AgentTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
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
    visibility: 'universal'
  });

  // Fetch ALL tasks for team collaboration with visibility filter
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['agent-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*, lead:leads(name, company)')
        .order('due_date', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      
      // Filter based on visibility - show universal tasks and self tasks that belong to the user
      const filtered = data?.filter(task => {
        if (task.visibility === 'self') {
          return task.created_by === user?.id || task.assigned_to === user?.id;
        }
        return true; // Universal tasks are visible to all
      });
      
      return filtered as Task[];
    },
    enabled: !!user?.id,
  });

  const { data: leads } = useQuery({
    queryKey: ['leads-for-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, company')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      // Calculate due date based on priority
      const dueDate = getPriorityDueDate(newTask.priority);
      
      const { error } = await supabase
        .from('crm_tasks')
        .insert({
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
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  const filteredTasks = tasks?.filter(task => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      task.title.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower) ||
      task.lead?.name?.toLowerCase().includes(searchLower)
    );
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
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">High</Badge>;
      case 'medium':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Medium</Badge>;
      case 'low':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  return (
    <StaffLayout role="agent">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-muted-foreground">Manage your assigned tasks</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
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
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Task description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task_type">Task Type</Label>
                  <Select value={newTask.task_type} onValueChange={(v) => setNewTask({ ...newTask, task_type: v, lead_id: '' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <Select value={newTask.lead_id} onValueChange={(v) => setNewTask({ ...newTask, lead_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lead" />
                      </SelectTrigger>
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
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - {getPriorityTimeFrame('low')}</SelectItem>
                      <SelectItem value="medium">Medium - {getPriorityTimeFrame('medium')}</SelectItem>
                      <SelectItem value="high">High - {getPriorityTimeFrame('high')}</SelectItem>
                      <SelectItem value="urgent">Urgent - {getPriorityTimeFrame('urgent')}</SelectItem>
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
                    onCheckedChange={(checked) => setNewTask({ ...newTask, visibility: checked ? 'self' : 'universal' })}
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tasks List */}
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
              ) : filteredTasks?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tasks found</p>
                </div>
              ) : (
                filteredTasks?.map((task) => {
                  const expirationStatus = getExpirationStatus(task.due_date, task.created_at, task.status);
                  
                  return (
                    <div 
                      key={task.id} 
                      className={cn(
                        "p-4 flex items-start gap-4 transition-colors cursor-pointer",
                        expirationStatus === 'expired' && "bg-destructive/10 border-l-4 border-l-destructive",
                        expirationStatus === 'warning' && "bg-yellow-500/10 dark:bg-yellow-900/20 border-l-4 border-l-yellow-500",
                        expirationStatus === 'normal' && "hover:bg-muted/50"
                      )}
                      onClick={() => handleTaskClick(task)}
                    >
                      <div 
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center mt-1",
                          task.status === 'completed' 
                            ? 'bg-primary border-primary text-primary-foreground' 
                            : 'border-muted-foreground/30'
                        )}
                      >
                        {task.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("font-medium", task.status === 'completed' && "line-through text-muted-foreground")}>
                            {task.title}
                          </p>
                          {expirationStatus === 'expired' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          {expirationStatus === 'warning' && <Clock className="h-4 w-4 text-yellow-600" />}
                          {task.visibility === 'self' && <Badge variant="outline" className="text-xs">Self</Badge>}
                        </div>
                        {task.lead && (
                          <p className="text-sm text-muted-foreground">
                            {task.lead.name} {task.lead.company && `• ${task.lead.company}`}
                          </p>
                        )}
                        {task.due_date && (
                          <p className={cn(
                            "text-xs mt-1",
                            expirationStatus === 'expired' ? 'text-destructive font-medium' : 'text-muted-foreground'
                          )}>
                            Due: {format(new Date(task.due_date), 'MMM d, h:mm a')}
                          </p>
                        )}
                        {task.created_by === user?.id && (
                          <span className="text-xs text-primary">Created by you</span>
                        )}
                      </div>
                      {getPriorityBadge(task.priority)}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
      />
    </StaffLayout>
  );
}
