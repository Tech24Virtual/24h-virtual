import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, User, Search, List, LayoutGrid, CalendarPlus, ShieldAlert, CalendarOff, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScheduleBuilder } from '@/components/staff/ScheduleBuilder';
import { PostOpenShiftDialog } from '@/components/staff/PostOpenShiftDialog';
import { OpenShiftBoard } from '@/components/staff/OpenShiftBoard';
import { TimeOffRequestsList } from '@/components/staff/TimeOffRequestsList';
import { format, startOfDay, endOfDay, endOfWeek, startOfWeek, addDays, addWeeks, subWeeks, isToday, isTomorrow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { MeetingsCalendarView, type CalendarMeeting } from '@/components/staff/MeetingsCalendarView';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WeekScheduleRow {
  id: string;
  agent_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  agent_name: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  no_show:   { label: 'No Show',   className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorSchedule() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);
  const [showPostShift, setShowPostShift] = useState(false);
  const [teamWeekStart, setTeamWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Stable date anchors for meetings/stats (always current week)
  const now        = new Date();
  const todayStart = startOfDay(now);
  const todayEnd   = endOfDay(now);
  const weekEnd    = endOfWeek(now);

  // Team calendar week (navigable)
  const teamWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(teamWeekStart, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [format(teamWeekStart, 'yyyy-MM-dd')],
  );
  const teamWeekKey  = format(teamWeekStart, 'yyyy-MM-dd');
  const teamRangeEnd = format(addDays(teamWeekStart, 6), 'yyyy-MM-dd');

  // ── Meetings ───────────────────────────────────────────────────────────────

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

  // ── Badge counts ───────────────────────────────────────────────────────────

  const { data: pendingTimeOff = 0 } = useQuery({
    queryKey: ['time-off-pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('time_off_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: openShiftCount = 0 } = useQuery({
    queryKey: ['open-shift-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('open_shifts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      if (error) throw error;
      return count || 0;
    },
  });

  // ── Team schedule (current week) ───────────────────────────────────────────

  const { data: weekSchedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['team-schedule-week', teamWeekKey],
    staleTime: 60_000,
    queryFn: async (): Promise<WeekScheduleRow[]> => {
      const { data: raw, error } = await (supabase as any)
        .from('agent_schedules')
        .select('id, agent_id, shift_date, start_time, end_time')
        .gte('shift_date', teamWeekKey)
        .lte('shift_date', teamRangeEnd)
        .eq('status', 'scheduled');
      if (error) throw error;
      if (!raw?.length) return [];

      const rows = raw as Array<{ id: string; agent_id: string; shift_date: string; start_time: string | null; end_time: string | null }>;
      const agentIds = [...new Set(rows.map(r => r.agent_id))];
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', agentIds);

      const nameMap = new Map((profs ?? []).map(p => [p.id, p.full_name]));
      return rows.map(r => ({
        ...r,
        agent_name: nameMap.get(r.agent_id) ?? 'Unknown',
      }));
    },
  });

  const agentRows = useMemo(() => {
    const seen = new Map<string, string>();
    weekSchedules.forEach(s => { if (!seen.has(s.agent_id)) seen.set(s.agent_id, s.agent_name); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [weekSchedules]);

  const scheduleGrid = useMemo(() => {
    const grid = new Map<string, Map<string, WeekScheduleRow>>();
    weekSchedules.forEach(s => {
      if (!grid.has(s.agent_id)) grid.set(s.agent_id, new Map());
      grid.get(s.agent_id)!.set(s.shift_date, s);
    });
    return grid;
  }, [weekSchedules]);

  // ── Team calendar supplemental queries ────────────────────────────────────

  const { data: teamActualShifts = [] } = useQuery({
    queryKey: ['team-actual-shifts', teamWeekKey],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_shifts')
        .select('id, agent_id, clock_in, clock_out')
        .gte('clock_in', `${teamWeekKey}T00:00:00`)
        .lte('clock_in', `${teamRangeEnd}T23:59:59`);
      if (error) throw error;
      return (data ?? []) as { id: string; agent_id: string; clock_in: string; clock_out: string | null }[];
    },
  });

  const { data: teamTimeOff = [] } = useQuery({
    queryKey: ['team-time-off-cal', teamWeekKey],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('id, agent_id, start_date, end_date, request_type')
        .eq('status', 'approved')
        .lte('start_date', teamRangeEnd)
        .gte('end_date', teamWeekKey);
      if (error) throw error;
      return (data ?? []) as { id: string; agent_id: string; start_date: string; end_date: string; request_type: string }[];
    },
  });

  const { data: teamClaimedShifts = [] } = useQuery({
    queryKey: ['team-claimed-shifts-cal', teamWeekKey],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('open_shifts')
        .select('id, claimed_by, shift_date, start_time, end_time')
        .eq('status', 'claimed')
        .gte('shift_date', teamWeekKey)
        .lte('shift_date', teamRangeEnd)
        .not('claimed_by', 'is', null);
      if (error) throw error;
      return (data ?? []) as { id: string; claimed_by: string; shift_date: string; start_time: string | null; end_time: string | null }[];
    },
  });

  const actualByAgentDay = useMemo(() => {
    const map = new Map<string, Map<string, { id: string; clock_in: string; clock_out: string | null }[]>>();
    teamActualShifts.forEach(s => {
      const date = s.clock_in.slice(0, 10);
      if (!map.has(s.agent_id)) map.set(s.agent_id, new Map());
      const dayMap = map.get(s.agent_id)!;
      if (!dayMap.has(date)) dayMap.set(date, []);
      dayMap.get(date)!.push(s);
    });
    return map;
  }, [teamActualShifts]);

  const timeOffByAgentDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    teamTimeOff.forEach(t => {
      teamWeekDays.forEach(d => {
        const ds = format(d, 'yyyy-MM-dd');
        if (ds < t.start_date || ds > t.end_date) return;
        if (!map.has(t.agent_id)) map.set(t.agent_id, new Set());
        map.get(t.agent_id)!.add(ds);
      });
    });
    return map;
  }, [teamTimeOff, teamWeekDays]);

  const claimedByAgentDay = useMemo(() => {
    const map = new Map<string, Map<string, { id: string; start_time: string | null; end_time: string | null }[]>>();
    teamClaimedShifts.forEach(s => {
      const agentId = s.claimed_by;
      if (!map.has(agentId)) map.set(agentId, new Map());
      const dayMap = map.get(agentId)!;
      if (!dayMap.has(s.shift_date)) dayMap.set(s.shift_date, []);
      dayMap.get(s.shift_date)!.push(s);
    });
    return map;
  }, [teamClaimedShifts]);

  // ── Meeting mutation ───────────────────────────────────────────────────────

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('meetings').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-meetings'] });
      toast({ title: 'Meeting updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update meeting.', variant: 'destructive' }),
  });

  // ── Derived meeting data ───────────────────────────────────────────────────

  const meetingsToday    = meetings.filter(m => { if (!m.scheduled_at) return false; const d = new Date(m.scheduled_at); return d >= todayStart && d <= todayEnd && m.status !== 'cancelled'; });
  const meetingsThisWeek = meetings.filter(m => { if (!m.scheduled_at) return false; const d = new Date(m.scheduled_at); return d >= todayStart && d <= weekEnd  && m.status !== 'cancelled'; });

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
    if (isToday(d))    return `Today ${format(d, 'h:mm a')}`;
    if (isTomorrow(d)) return `Tomorrow ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, h:mm a');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">

        {/* Header */}
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
              <CalendarPlus className="h-4 w-4 mr-2" /> Post Open Shift
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('https://bookii.io', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4 mr-2" /> Schedule via Bookii
            </Button>
          </div>
        </div>

        <Tabs defaultValue="meetings">
          <TabsList>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="team-schedule">Team Schedule</TabsTrigger>
            <TabsTrigger value="open-shifts">
              Open Shifts {openShiftCount > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{openShiftCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="time-off">
              Time Off {pendingTimeOff > 0 && <Badge variant="destructive" className="ml-1.5 text-xs">{pendingTimeOff}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* ── Meetings tab ────────────────────────────────────────────── */}
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
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
                ))}
              </div>
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
                ) : filtered.filter(m => m.status !== 'cancelled').map((meeting) => {
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
                            <p className="text-sm text-muted-foreground">
                              {meeting.scheduled_at ? formatRelativeDate(meeting.scheduled_at) : 'No date set'}
                              {meeting.duration_minutes && ` · ${meeting.duration_minutes} min`}
                            </p>
                            {meeting.attendee_name && (
                              <p className="text-sm flex items-center gap-1"><User className="h-3.5 w-3.5" />{meeting.attendee_name}</p>
                            )}
                            {meeting.lead && (
                              <p className="text-sm text-primary">{meeting.lead.name}{meeting.lead.company && ` (${meeting.lead.company})`}</p>
                            )}
                          </div>
                          {meeting.status === 'scheduled' && (
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: meeting.id, status: 'completed' })}>✓ Done</Button>
                              <Button variant="ghost"   size="sm" onClick={() => updateStatus.mutate({ id: meeting.id, status: 'no_show' })}>No Show</Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Team Schedule tab ──────────────────────────────────────── */}
          <TabsContent value="team-schedule" className="mt-4 space-y-4">
            {/* Week navigation */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {format(teamWeekStart, 'MMM d')} – {format(teamWeekDays[6], 'MMM d, yyyy')}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setTeamWeekStart(w => subWeeks(w, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTeamWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTeamWeekStart(w => addWeeks(w, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px] sticky left-0 bg-background z-10">Agent</TableHead>
                      {teamWeekDays.map(d => {
                        const ds = format(d, 'yyyy-MM-dd');
                        return (
                          <TableHead
                            key={ds}
                            className={`text-center min-w-[120px]${isToday(d) ? ' bg-primary/5' : ''}`}
                          >
                            <div className="font-medium">{format(d, 'EEE')}</div>
                            <div className="text-xs text-muted-foreground font-normal">{format(d, 'MMM d')}</div>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedulesLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : agentRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          No agents scheduled this period
                        </TableCell>
                      </TableRow>
                    ) : agentRows.map(agent => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium sticky left-0 bg-background z-10">{agent.name}</TableCell>
                        {teamWeekDays.map(d => {
                          const ds = format(d, 'yyyy-MM-dd');
                          const sched = scheduleGrid.get(agent.id)?.get(ds);
                          const actualShifts = actualByAgentDay.get(agent.id)?.get(ds) ?? [];
                          const isTimeOff = timeOffByAgentDay.get(agent.id)?.has(ds) ?? false;
                          const claimedShifts = claimedByAgentDay.get(agent.id)?.get(ds) ?? [];
                          const hasEvent = sched || actualShifts.length > 0 || isTimeOff || claimedShifts.length > 0;
                          return (
                            <TableCell key={ds} className={`align-top py-2${isToday(d) ? ' bg-primary/5' : ''}`}>
                              <div className="flex flex-col gap-1 min-h-[40px]">
                                {sched && (
                                  <div className="rounded bg-green-100 text-green-800 px-1.5 py-0.5 text-[11px] font-medium text-center">
                                    {sched.start_time?.slice(0, 5) ?? '?'}–{sched.end_time?.slice(0, 5) ?? '?'}
                                  </div>
                                )}
                                {actualShifts.map(s => (
                                  <div key={s.id} className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[11px] text-center">
                                    {s.clock_in.slice(11, 16)}{s.clock_out ? `–${s.clock_out.slice(11, 16)}` : ' ●'}
                                  </div>
                                ))}
                                {isTimeOff && (
                                  <div className="rounded bg-red-100 text-red-700 px-1.5 py-0.5 text-[11px] text-center">
                                    Time Off
                                  </div>
                                )}
                                {claimedShifts.map(s => (
                                  <div key={s.id} className="rounded bg-purple-100 text-purple-800 px-1.5 py-0.5 text-[11px] text-center">
                                    {s.start_time?.slice(0, 5) ?? '?'}–{s.end_time?.slice(0, 5) ?? '?'}
                                  </div>
                                ))}
                                {!hasEvent && (
                                  <span className="text-muted-foreground/30 text-sm text-center block select-none">—</span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {[
                { cls: 'bg-green-100', label: 'Scheduled' },
                { cls: 'bg-blue-100', label: 'Actual Shift' },
                { cls: 'bg-red-100', label: 'Time Off' },
                { cls: 'bg-purple-100', label: 'Claimed Shift' },
              ].map(({ cls, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded shrink-0 ${cls}`} />
                  {label}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Open Shifts tab ───────────────────────────────────────── */}
          <TabsContent value="open-shifts" className="mt-4">
            <OpenShiftBoard role="supervisor" />
          </TabsContent>

          {/* ── Time Off tab ──────────────────────────────────────────── */}
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
