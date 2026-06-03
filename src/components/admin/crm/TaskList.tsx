import { useState, useEffect } from 'react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { CheckCircle2, Circle, Clock, AlertCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddTaskDialog } from './AddTaskDialog';

interface Task {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

interface TaskListProps {
  leadId: string;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export function TaskList({ leadId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, [leadId]);

  const fetchTasks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('crm_tasks')
      .select('*')
      .eq('lead_id', leadId)
      .order('status', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false });

    if (error) {
      toast({
        title: 'Error loading tasks',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setTasks(data || []);
    }
    setIsLoading(false);
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('crm_tasks')
      .update({ status: newStatus, completed_at: completedAt })
      .eq('id', task.id);

    if (error) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      fetchTasks();
    }
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date)) return `Overdue - ${format(date, 'MMM d')}`;
    return format(date, 'MMM d');
  };

  const getDueDateColor = (dateStr: string | null, status: string) => {
    if (!dateStr || status === 'completed') return 'text-muted-foreground';
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return 'text-red-600 dark:text-red-400';
    if (isToday(date)) return 'text-orange-600 dark:text-orange-400';
    return 'text-muted-foreground';
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Tasks
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No tasks yet</p>
              <p className="text-xs">Create a task to track follow-ups</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Circle className="h-5 w-5" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">{task.title}</p>
                          <Badge variant="secondary" className={priorityColors[task.priority]}>
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {task.description}
                          </p>
                        )}
                        {task.due_date && (
                          <div className={`mt-1 flex items-center gap-1 text-xs ${getDueDateColor(task.due_date, task.status)}`}>
                            {isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) ? (
                              <AlertCircle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {formatDueDate(task.due_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Completed ({completedTasks.length})
                  </p>
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors opacity-60"
                    >
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className="mt-0.5 text-green-600 hover:text-green-700 transition-colors"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight line-through">
                          {task.title}
                        </p>
                        {task.completed_at && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Completed {format(new Date(task.completed_at), 'MMM d')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <AddTaskDialog
        leadId={leadId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          fetchTasks();
          setDialogOpen(false);
        }}
      />
    </Card>
  );
}
