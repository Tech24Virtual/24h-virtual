import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CRMStatsCards } from '@/components/admin/crm/CRMStatsCards';
import { GlobalTaskList } from '@/components/admin/crm/GlobalTaskList';
import { GlobalActivityFeed } from '@/components/admin/crm/GlobalActivityFeed';
import { QuickAddTaskDialog } from '@/components/admin/crm/QuickAddTaskDialog';
import { OverdueFollowupsWidget } from '@/components/admin/crm/OverdueFollowupsWidget';
import { SlackMessenger } from '@/components/admin/crm/SlackMessenger';
import { SlackUserMappings } from '@/components/admin/crm/SlackUserMappings';
import { LeadPipelineBoard } from '@/components/crm/LeadPipelineBoard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isToday, isPast, isThisWeek, subDays } from 'date-fns';
import { TrackedTabsTrigger } from '@/lib/analytics/tracked';
import { usePageView } from '@/lib/analytics';

export default function AdminCRM() {
  usePageView('admin_crm', 'admin');
  const [quickAddTaskOpen, setQuickAddTaskOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch task statistics
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['crm-task-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('id, due_date, status')
        .neq('status', 'completed')
        .neq('status', 'cancelled');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch activity count for the last 7 days
  const { data: activityCount = 0, isLoading: activitiesLoading } = useQuery({
    queryKey: ['crm-activity-count'],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { count, error } = await supabase
        .from('crm_activities')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Calculate task statistics
  const taskStats = {
    overdue: tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))).length,
    today: tasks.filter(t => t.due_date && isToday(new Date(t.due_date))).length,
    week: tasks.filter(t => t.due_date && isThisWeek(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && !isPast(new Date(t.due_date))).length,
  };

  const isLoading = tasksLoading || activitiesLoading;

  const handleTaskCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['crm-task-stats'] });
    queryClient.invalidateQueries({ queryKey: ['global-crm-tasks'] });
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">CRM Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage tasks and track activities across all leads</p>
          </div>
          <Button onClick={() => setQuickAddTaskOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Quick Add Task
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TrackedTabsTrigger surface="admin_crm" persona="admin" value="overview">Overview</TrackedTabsTrigger>
          <TrackedTabsTrigger surface="admin_crm" persona="admin" value="pipeline">Pipeline</TrackedTabsTrigger>
          <TrackedTabsTrigger surface="admin_crm" persona="admin" value="messages">Messages</TrackedTabsTrigger>
          <TrackedTabsTrigger surface="admin_crm" persona="admin" value="mappings">Slack Mappings</TrackedTabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Stats Cards */}
          <CRMStatsCards
            overdueTasks={taskStats.overdue}
            todayTasks={taskStats.today}
            weekTasks={taskStats.week}
            totalActivities={activityCount}
            isLoading={isLoading}
          />

          {/* Overdue Follow-ups Widget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <OverdueFollowupsWidget />
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            <GlobalTaskList />
            <GlobalActivityFeed limit={25} />
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <LeadPipelineBoard adminMode />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <SlackMessenger />
        </TabsContent>

        <TabsContent value="mappings" className="mt-4">
          <SlackUserMappings />
        </TabsContent>
      </Tabs>

      {/* Quick Add Task Dialog */}
      <QuickAddTaskDialog
        open={quickAddTaskOpen}
        onOpenChange={setQuickAddTaskOpen}
        onSuccess={handleTaskCreated}
      />
    </div>
  );
}
