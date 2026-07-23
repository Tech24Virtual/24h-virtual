import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookiiEmbed } from '@/components/shared/BookiiEmbed';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getPayCycleBounds, getNextPayCycle, getPrevPayCycle } from '@/lib/payCycle';

type EventType = 'scheduled' | 'actual' | 'time_off' | 'claimed' | 'google';

interface CalEvent {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: EventType;
  label: string;
  allDay?: boolean;
}

const TYPE_CONFIG: Record<EventType, { classes: string; legendLabel: string }> = {
  scheduled: {
    classes: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300',
    legendLabel: 'Scheduled',
  },
  actual: {
    classes: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300',
    legendLabel: 'Actual Shift',
  },
  time_off: {
    classes: 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300',
    legendLabel: 'Time Off',
  },
  claimed: {
    classes: 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300',
    legendLabel: 'Claimed Shift',
  },
  google: {
    classes: 'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-300',
    legendLabel: 'Google Calendar',
  },
};

function fmtTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`;
}

function AdminGoogleCalendar() {
  const { user } = useAuth();
  const [cycleAnchor, setCycleAnchor] = useState(() => new Date());

  const cycle = useMemo(() => getPayCycleBounds(cycleAnchor), [cycleAnchor]);

  const days = useMemo(() => {
    const result: Date[] = [];
    let d = cycle.start;
    while (d <= cycle.end) {
      result.push(new Date(d));
      d = addDays(d, 1);
    }
    return result;
  }, [cycle]);

  const rangeStart = format(cycle.start, 'yyyy-MM-dd');
  const rangeEnd = format(cycle.end, 'yyyy-MM-dd');

  const { data: connectionStatus } = useQuery({
    queryKey: ['google-cal-connection', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_google_connection_status')
        .select('is_connected, google_email')
        .maybeSingle();
      return data;
    },
  });

  const isConnected = connectionStatus?.is_connected ?? false;
  const googleEmail = connectionStatus?.google_email ?? null;

  const { data: googleEventsData } = useQuery({
    queryKey: ['google-cal-events', user?.id, rangeStart],
    enabled: isConnected === true,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar-events', {
        body: { date_start: rangeStart, date_end: rangeEnd },
      });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (googleEventsData?.needs_reconnect) {
      toast.warning('Your Google Calendar connection expired. Please reconnect.');
    }
  }, [googleEventsData?.needs_reconnect]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleEvents: any[] = googleEventsData?.events ?? [];

  const handleConnectGoogle = async () => {
    const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
      body: { action: 'get-url' },
    });
    if (error || !data?.url) {
      toast.error('Failed to start Google Calendar connection.');
      return;
    }
    window.open(data.url, '_blank');
    toast('Complete the Google sign-in in the new tab. Come back here when done and refresh the page.');
  };

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    days.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    googleEvents.forEach((ev: any) => {
      const dateStr = ev.start?.dateTime || ev.start?.date;
      if (!dateStr) return;
      const date = (dateStr as string).slice(0, 10);
      const list = map.get(date);
      if (!list) return;
      const allDay = !ev.start?.dateTime;
      list.push({
        id: ev.id,
        date,
        startTime: ev.start?.dateTime ? (ev.start.dateTime as string).slice(11, 16) : '',
        endTime: ev.end?.dateTime ? (ev.end.dateTime as string).slice(11, 16) : '',
        type: 'google',
        label: ev.summary,
        allDay,
      });
    });

    return map;
  }, [googleEvents, days]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{cycle.label}</h2>
          <p className="text-sm text-muted-foreground">
            {cycle.isFirstHalf ? 'First half' : 'Second half'} pay cycle · {days.length} days
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setCycleAnchor(getPrevPayCycle(cycle).start)}>
            <ChevronLeft className="h-4 w-4" />
            Prev Cycle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCycleAnchor(new Date())}
          >
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCycleAnchor(getNextPayCycle(cycle).start)}>
            Next Cycle
            <ChevronRight className="h-4 w-4" />
          </Button>
          {isConnected ? (
            <Badge className="bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700 gap-1.5 py-1.5 px-3">
              <CheckCircle className="h-3.5 w-3.5" />
              Google Calendar connected{googleEmail ? ` — ${googleEmail}` : ''}
            </Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={handleConnectGoogle}>
              <CalendarDays className="h-4 w-4 mr-1" />
              Connect Google Calendar
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-8 gap-2 min-w-[720px]">
          {days.map(day => {
            const ds = format(day, 'yyyy-MM-dd');
            const events = eventsByDay.get(ds) ?? [];
            const today = isToday(day);

            return (
              <div
                key={ds}
                className={cn(
                  'rounded-lg border p-2 min-h-[130px] flex flex-col gap-1',
                  today
                    ? 'border-primary/60 bg-primary/5 dark:bg-primary/10'
                    : 'border-border bg-card'
                )}
              >
                {/* Day header */}
                <div className={cn('text-center pb-1 border-b border-border mb-1', today && 'border-primary/30')}>
                  <p className={cn('text-[10px] font-semibold uppercase tracking-wide', today ? 'text-primary' : 'text-muted-foreground')}>
                    {format(day, 'EEE')}
                  </p>
                  <p className={cn('text-base font-bold leading-tight', today ? 'text-primary' : '')}>
                    {format(day, 'd')}
                  </p>
                </div>

                {/* Events */}
                {events.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center pt-1 flex-1 flex items-center justify-center">
                    Day off
                  </p>
                ) : (
                  events.map(ev => (
                    <div
                      key={ev.id}
                      title={ev.label}
                      className={cn(
                        'rounded px-1.5 py-1 text-[11px] border leading-tight',
                        TYPE_CONFIG[ev.type].classes
                      )}
                    >
                      <div className="font-medium truncate">{ev.label}</div>
                      {ev.allDay ? (
                        <div className="opacity-70">All day</div>
                      ) : ev.startTime ? (
                        <div className="opacity-70">
                          {fmtTime(ev.startTime)}{ev.endTime ? `–${fmtTime(ev.endTime)}` : ''}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className={cn('w-3 h-3 rounded border shrink-0', TYPE_CONFIG.google.classes)} />
          {TYPE_CONFIG.google.legendLabel}
        </div>
      </div>
    </div>
  );
}

export default function AdminCalendar() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-heading">Appointments</h1>
        <p className="text-muted-foreground mt-1">Manage appointments and calendars via Bookii</p>
      </div>

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="my-calendar">My Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-4">
          <BookiiEmbed title="Admin Appointments" />
        </TabsContent>

        <TabsContent value="my-calendar" className="mt-4">
          <AdminGoogleCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
