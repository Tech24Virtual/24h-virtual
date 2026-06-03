import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format, isToday, isPast, isThisWeek, addDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { ExternalLink, Clock, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Task {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  created_at: string;
  lead?: {
    name: string;
    company: string | null;
  };
}

export function GlobalTaskList() {
  const [activeTab, setActiveTab] = useState('overdue');
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['global-crm-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*, lead:leads(name, company)')
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data as Task[];
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('crm_tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-crm-tasks'] });
      toast.success('Task completed');
    },
    onError: (error) => {
      toast.error('Failed to complete task');
      console.error(error);
    },
  });

  const categorizedTasks = {
    overdue: tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))),
    today: tasks.filter(t => t.due_date && isToday(new Date(t.due_date))),
    week: tasks.filter(t => t.due_date && isThisWeek(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && !isPast(new Date(t.due_date))),
    later: tasks.filter(t => !t.due_date || (!isPast(new Date(t.due_date)) && !isThisWeek(new Date(t.due_date)))),
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      urgent: 'bg-destructive text-destructive-foreground',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-muted text-muted-foreground',
    };
    return variants[priority] || variants.medium;
  };

  const renderTaskList = (taskList: Task[], emptyMessage: string) => {
    if (taskList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {taskList.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              checked={false}
              onCheckedChange={() => completeTaskMutation.mutate(task.id)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{task.title}</span>
                <Badge className={cn('text-xs', getPriorityBadge(task.priority))}>
                  {task.priority}
                </Badge>
              </div>
              {task.lead && (
                <Link
                  to={`/admin/leads/${task.lead_id}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  {task.lead.name}
                  {task.lead.company && ` • ${task.lead.company}`}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(task.due_date), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overdue" className="relative">
              Overdue
              {categorizedTasks.overdue.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {categorizedTasks.overdue.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="today">
              Today
              {categorizedTasks.today.length > 0 && (
                <Badge className="ml-1 bg-yellow-500 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {categorizedTasks.today.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="later">Later</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
          ) : (
            <>
              <TabsContent value="overdue" className="mt-0">
                {renderTaskList(categorizedTasks.overdue, 'No overdue tasks!')}
              </TabsContent>
              <TabsContent value="today" className="mt-0">
                {renderTaskList(categorizedTasks.today, 'No tasks due today')}
              </TabsContent>
              <TabsContent value="week" className="mt-0">
                {renderTaskList(categorizedTasks.week, 'No tasks this week')}
              </TabsContent>
              <TabsContent value="later" className="mt-0">
                {renderTaskList(categorizedTasks.later, 'No upcoming tasks')}
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
