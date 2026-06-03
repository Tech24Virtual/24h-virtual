import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, User, Search, List, LayoutGrid, CalendarPlus, ShieldAlert, CalendarOff } from 'lucide-react';
import { ScheduleBuilder } from '@/components/staff/ScheduleBuilder';
import { PostOpenShiftDialog } from '@/components/staff/PostOpenShiftDialog';
import { OpenShiftBoard } from '@/components/staff/OpenShiftBoard';
import { TimeOffRequestsList } from '@/components/staff/TimeOffRequestsList';
import { format, startOfDay, endOfDay, endOfWeek, isToday, isTomorrow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { MeetingsCalendarView, type CalendarMeeting } from '@/components/staff/MeetingsCalendarView';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  no_show: { label: 'No Show', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
};

export default function SupervisorSchedule() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);
  const [showPostShift, setShowPostShift] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['supervisor-meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, lead:leads(name, company)')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return (data || []) as CalendarMeeting[];
    },
  });

  const { data: pendingTimeOff = 0 } = useQuery({
    queryKey: ['time-off-pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('time_off_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: openShiftCount = 0 } = useQuery({
    queryKey: ['open-shift-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('open_shifts').select('id', { count: 'exact', head: true }).eq('status', 'open');
      if (error) throw error;
      return count || 0;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('meetings').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-meetings'] });
      toast({ title: 'Meeting updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update meeting.', variant: 'destructive' });
    },
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now);

  const meetingsToday = meetings.filter(m => {
    const d = new Date(m.scheduled_at);
    return d >= todayStart && d <= todayEnd && m.status !== 'cancelled';
  });
  const meetingsThisWeek = meetings.filter(m => {
    const d = new Date(m.scheduled_at);
    return d >= todayStart && d <= weekEnd && m.status !== 'cancelled';
  });
  const totalScheduled = meetings.filter(m => m.status === 'scheduled').length;

  const filtered = meetings.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.attendee_name?.toLowerCase().includes(q) ||
      m.attendee_email?.toLowerCase().includes(q) ||
      m.event_type?.toLowerCase().includes(q) ||
      m.lead?.name?.toLowerCase().includes(q)
    );
  });

  const formatRelativeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return `Today ${format(d, 'h:mm a')}`;
    if (isTomorrow(d)) return `Tomorrow ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, h:mm a');
  };

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team Schedule</h1>
          <p className="text-muted-foreground">Overview of meetings, shifts, and time-off</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{meetingsToday.length}</p><p className="text-sm text-muted-foreground">Today</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{meetingsThisWeek.length}</p><p className="text-sm text-muted-foreground">This Week</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ShieldAlert className="h-5 w-5 text-orange-500" /><div><p className="text-2xl font-bold">{openShiftCount}</p><p className="text-sm text-muted-foreground">Open Shifts</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CalendarOff className="h-5 w-5 text-destructive" /><div><p className="text-2xl font-bold">{pendingTimeOff}</p><p className="text-sm text-muted-foreground">Time Off Pending</p></div></div></CardContent></Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search meetings..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button onClick={() => setShowScheduleBuilder(true)}>
              <CalendarPlus className="h-4 w-4 mr-2" /> Create Schedule
            </Button>
            <Button variant="outline" onClick={() => setShowPostShift(true)}>
              <ShieldAlert className="h-4 w-4 mr-2" /> Post Open Shift
            </Button>
          </div>
        </div>

        <Tabs defaultValue="meetings">
          <TabsList>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="open-shifts">
              Open Shifts {openShiftCount > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{openShiftCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="time-off">
              Time Off {pendingTimeOff > 0 && <Badge variant="destructive" className="ml-1.5 text-xs">{pendingTimeOff}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meetings" className="mt-4">
            <div className="flex gap-1 border rounded-lg p-1 w-fit mb-4">
              <Button variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('calendar')}>
                <LayoutGrid className="h-4 w-4 mr-1" /> Calendar
              </Button>
              <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>
                <List className="h-4 w-4 mr-1" /> List
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>)}</div>
            ) : viewMode === 'calendar' ? (
              <MeetingsCalendarView
                meetings={filtered}
                onMarkCompleted={(id) => updateStatus.mutate({ id, status: 'completed' })}
                onMarkNoShow={(id) => updateStatus.mutate({ id, status: 'no_show' })}
              />
            ) : (
              <div className="space-y-3">
                {filtered.length === 0 ? (
                  <Card><CardContent className="p-8 text-center text-muted-foreground">No meetings found</CardContent></Card>
                ) : (
                  filtered.filter(m => m.status !== 'cancelled').map((meeting) => {
                    const sc = statusConfig[meeting.status] || statusConfig.scheduled;
                    return (
                      <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold">{meeting.event_type || 'Meeting'}</h3>
                                <Badge className={sc.className}>{sc.label}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{formatRelativeDate(meeting.scheduled_at)}{meeting.duration_minutes && ` · ${meeting.duration_minutes} min`}</p>
                              {meeting.attendee_name && <p className="text-sm flex items-center gap-1"><User className="h-3.5 w-3.5" />{meeting.attendee_name}</p>}
                              {meeting.lead && <p className="text-sm text-primary">{meeting.lead.name}{meeting.lead.company && ` (${meeting.lead.company})`}</p>}
                            </div>
                            {meeting.status === 'scheduled' && (
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: meeting.id, status: 'completed' })}>✓ Done</Button>
                                <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: meeting.id, status: 'no_show' })}>No Show</Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="open-shifts" className="mt-4">
            <OpenShiftBoard role="supervisor" />
          </TabsContent>

          <TabsContent value="time-off" className="mt-4">
            <TimeOffRequestsList role="supervisor" />
          </TabsContent>
        </Tabs>

        <ScheduleBuilder open={showScheduleBuilder} onOpenChange={setShowScheduleBuilder} />
        <PostOpenShiftDialog open={showPostShift} onOpenChange={setShowPostShift} />
      </div>
    </StaffLayout>
  );
}
