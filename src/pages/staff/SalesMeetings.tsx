import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Video, ExternalLink, Clock, User, Search, CheckCircle, XCircle, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isTomorrow, isPast, startOfDay, endOfDay, endOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { MeetingsCalendarView, type CalendarMeeting } from '@/components/staff/MeetingsCalendarView';
import { BookiiEmbed } from '@/components/shared/BookiiEmbed';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface Meeting extends CalendarMeeting {
  notes: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  no_show: { label: 'No Show', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
};

export default function SalesMeetings() {
  const [outerTab, setOuterTab] = useState<'book' | 'history'>('book');
  const [historyTab, setHistoryTab] = useState('upcoming');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['sales-meetings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, lead:leads(name, company)')
        .eq('assigned_to', user!.id)
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Meeting[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('meetings').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-meetings'] });
      toast({ title: 'Meeting updated', description: 'Status has been changed.' });
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

  const filteredByTab = meetings.filter(m => {
    const d = new Date(m.scheduled_at);
    if (historyTab === 'upcoming') return d >= todayStart && m.status !== 'cancelled';
    if (historyTab === 'past') return d < todayStart || m.status === 'completed' || m.status === 'no_show';
    return true;
  });

  const filtered = filteredByTab.filter(m => {
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
    <StaffLayout role="sales">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-muted-foreground">Book and manage scheduled meetings</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{meetingsToday.length}</p>
                  <p className="text-sm text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{meetingsThisWeek.length}</p>
                  <p className="text-sm text-muted-foreground">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalScheduled}</p>
                  <p className="text-sm text-muted-foreground">Total Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outer tabs: Book / History */}
        <Tabs value={outerTab} onValueChange={(v) => setOuterTab(v as 'book' | 'history')}>
          <TabsList>
            <TabsTrigger value="book">Book a Meeting</TabsTrigger>
            <TabsTrigger value="history">Meeting History</TabsTrigger>
          </TabsList>

          {/* ── Book a Meeting ── */}
          <TabsContent value="book" className="mt-4">
            <BookiiEmbed title="Book a Meeting" height="500px" />
          </TabsContent>

          {/* ── Meeting History ── */}
          <TabsContent value="history" className="mt-4 space-y-4">
            {/* View mode toggle + search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-1 border rounded-lg p-1 w-fit">
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4 mr-1" /> List
                </Button>
                <Button variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('calendar')}>
                  <LayoutGrid className="h-4 w-4 mr-1" /> Calendar
                </Button>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meetings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {viewMode === 'calendar' ? (
              <MeetingsCalendarView
                meetings={filtered.length > 0 ? filtered : meetings}
                onMarkCompleted={(id) => updateStatus.mutate({ id, status: 'completed' })}
                onMarkNoShow={(id) => updateStatus.mutate({ id, status: 'no_show' })}
              />
            ) : (
              <Tabs value={historyTab} onValueChange={setHistoryTab}>
                <TabsList>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="past">Past</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>

                <TabsContent value={historyTab} className="mt-4 space-y-3">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <Skeleton className="h-20 w-full" />
                        </CardContent>
                      </Card>
                    ))
                  ) : filtered.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No meetings found
                      </CardContent>
                    </Card>
                  ) : (
                    filtered.map((meeting) => {
                      const sc = statusConfig[meeting.status] || statusConfig.scheduled;
                      const meetingDate = new Date(meeting.scheduled_at);
                      const isPastMeeting = isPast(meetingDate) && meeting.status === 'scheduled';

                      return (
                        <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Left: Date + Info */}
                              <div className="flex items-start gap-4">
                                <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-primary/10 text-primary shrink-0">
                                  <span className="text-xs font-medium">{format(meetingDate, 'MMM')}</span>
                                  <span className="text-lg font-bold leading-none">{format(meetingDate, 'd')}</span>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold">{meeting.event_type || 'Meeting'}</h3>
                                    <Badge className={sc.className}>{sc.label}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {formatRelativeDate(meeting.scheduled_at)}
                                    {meeting.duration_minutes && ` · ${meeting.duration_minutes} min`}
                                    {meeting.location && ` · ${meeting.location}`}
                                  </p>
                                  <div className="flex items-center gap-3 text-sm">
                                    {meeting.attendee_name && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3.5 w-3.5" />
                                        {meeting.attendee_name}
                                      </span>
                                    )}
                                    {meeting.attendee_email && (
                                      <span className="text-muted-foreground">{meeting.attendee_email}</span>
                                    )}
                                  </div>
                                  {meeting.lead && (
                                    <Link
                                      to={`/staff/sales/leads/${meeting.lead_id}`}
                                      className="text-sm text-primary hover:underline"
                                    >
                                      {meeting.lead.name}
                                      {meeting.lead.company && ` (${meeting.lead.company})`}
                                    </Link>
                                  )}
                                </div>
                              </div>

                              {/* Right: Actions */}
                              <div className="flex items-center gap-2 shrink-0">
                                {meeting.meeting_link && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                                      <Video className="h-4 w-4 mr-1" />
                                      Join
                                    </a>
                                  </Button>
                                )}
                                {meeting.calendly_event_url && (
                                  <Button variant="ghost" size="sm" asChild title="View booking details">
                                    <a href={meeting.calendly_event_url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                {(meeting.status === 'scheduled' || isPastMeeting) && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updateStatus.mutate({ id: meeting.id, status: 'completed' })}
                                      title="Mark as completed"
                                    >
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updateStatus.mutate({ id: meeting.id, status: 'no_show' })}
                                      title="Mark as no-show"
                                    >
                                      <XCircle className="h-4 w-4 text-orange-600" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}
