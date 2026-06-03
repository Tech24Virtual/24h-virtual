import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Search, CheckCircle2, Clock, AlertCircle, ListTodo, AlertTriangle } from 'lucide-react';
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
  assigned_to: string | null;
  lead_id: string | null;
  visibility: string | null;
  lead?: { name: string; company: string | null } | null;
}

export default function SupervisorTasks() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data: tasks, isLoading } = useQuery({
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

  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const { error } = await supabase.from('crm_tasks').update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-tasks'] });
      toast.success('Task updated');
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

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team Tasks</h1>
          <p className="text-muted-foreground">All tasks across the team</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><ListTodo className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle><Clock className="h-4 w-4 text-yellow-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.pending}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle><CheckCircle2 className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.completed}</div></CardContent></Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
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
                  <div key={i} className="p-4 flex items-center gap-4"><Skeleton className="h-5 w-5 rounded" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div><Skeleton className="h-6 w-16" /></div>
                ))
              ) : filtered?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground"><AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No tasks found</p></div>
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
                          task.status === 'completed' ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'
                        )}
                        onClick={() => toggleStatus.mutate({ id: task.id, currentStatus: task.status })}
                      >
                        {task.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn('font-medium', task.status === 'completed' && 'line-through text-muted-foreground')}>{task.title}</p>
                          {expirationStatus === 'expired' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          {expirationStatus === 'warning' && <Clock className="h-4 w-4 text-yellow-600" />}
                        </div>
                        {task.lead && <p className="text-sm text-muted-foreground">{task.lead.name}{task.lead.company && ` • ${task.lead.company}`}</p>}
                        {task.due_date && (
                          <p className={cn('text-xs mt-1', expirationStatus === 'expired' ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                            Due: {format(new Date(task.due_date), 'MMM d, h:mm a')}
                          </p>
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
    </StaffLayout>
  );
}
