import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getPayCycleBounds, getNextPayCycle, getPrevPayCycle } from '@/lib/payCycle';

type EventType = 'scheduled' | 'actual' | 'time_off' | 'claimed';

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
};

function fmtTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`;
}

export default function AgentCalendar() {
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

  const { data: schedules = [] } = useQuery({
    queryKey: ['cal-schedules', user?.id, rangeStart],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_schedules')
        .select('id, shift_date, start_time, end_time, notes')
        .eq('agent_id', user!.id)
        .neq('status', 'cancelled')
        .gte('shift_date', rangeStart)
        .lte('shift_date', rangeEnd);
      return data ?? [];
    },
  });

  const { data: agentShifts = [] } = useQuery({
    queryKey: ['cal-agent-shifts', user?.id, rangeStart],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_shifts')
        .select('id, clock_in, clock_out')
        .eq('agent_id', user!.id)
        .gte('clock_in', `${rangeStart}T00:00:00`)
        .lte('clock_in', `${rangeEnd}T23:59:59`);
      if (error) return [];
      return data ?? [];
    },
  });

  const { data: timeOff = [] } = useQuery({
    queryKey: ['cal-time-off', user?.id, rangeStart],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('time_off_requests')
        .select('id, start_date, end_date, request_type')
        .eq('agent_id', user!.id)
        .eq('status', 'approved')
        .lte('start_date', rangeEnd)
        .gte('end_date', rangeStart);
      return data ?? [];
    },
  });

  const { data: claimedShifts = [] } = useQuery({
    queryKey: ['cal-claimed-shifts', user?.id, rangeStart],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('open_shifts')
        .select('id, shift_date, start_time, end_time')
        .eq('claimed_by', user!.id)
        .eq('status', 'claimed')
        .gte('shift_date', rangeStart)
        .lte('shift_date', rangeEnd);
      return data ?? [];
    },
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    days.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []));

    schedules.forEach(s => {
      const list = map.get(s.shift_date);
      if (!list) return;
      list.push({
        id: s.id,
        date: s.shift_date,
        startTime: (s.start_time ?? '').slice(0, 5),
        endTime: (s.end_time ?? '').slice(0, 5),
        type: 'scheduled',
        label: s.notes ? `Shift — ${s.notes}` : 'Scheduled Shift',
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agentShifts.forEach((s: any) => {
      if (!s.clock_in) return;
      const date = (s.clock_in as string).slice(0, 10);
      const list = map.get(date);
      if (!list) return;
      const startTime = (s.clock_in as string).slice(11, 16);
      const endTime = s.clock_out ? (s.clock_out as string).slice(11, 16) : '';
      list.push({
        id: s.id,
        date,
        startTime,
        endTime,
        type: 'actual',
        label: endTime
          ? `Worked ${fmtTime(startTime)}–${fmtTime(endTime)}`
          : `Clocked in ${fmtTime(startTime)}`,
      });
    });

    timeOff.forEach(t => {
      days.forEach(d => {
        const ds = format(d, 'yyyy-MM-dd');
        if (ds < t.start_date || ds > t.end_date) return;
        const list = map.get(ds);
        if (!list) return;
        list.push({
          id: `${t.id}-${ds}`,
          date: ds,
          startTime: '',
          endTime: '',
          type: 'time_off',
          label: t.request_type === 'sick' ? 'Sick Day' : 'Time Off',
          allDay: true,
        });
      });
    });

    claimedShifts.forEach(s => {
      const list = map.get(s.shift_date);
      if (!list) return;
      list.push({
        id: s.id,
        date: s.shift_date,
        startTime: (s.start_time ?? '').slice(0, 5),
        endTime: (s.end_time ?? '').slice(0, 5),
        type: 'claimed',
        label: 'Coverage Shift',
      });
    });

    return map;
  }, [schedules, agentShifts, timeOff, claimedShifts, days]);

  return (
    <StaffLayout role="agent">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Calendar</h1>
            <h2 className="text-lg font-semibold">{cycle.label}</h2>
            <p className="text-sm text-muted-foreground">
              {cycle.isFirstHalf ? 'First half' : 'Second half'} pay cycle · {days.length} days
            </p>
          </div>
          <div className="flex items-center gap-2">
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
          {(Object.entries(TYPE_CONFIG) as [EventType, { classes: string; legendLabel: string }][]).map(
            ([type, cfg]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={cn('w-3 h-3 rounded border shrink-0', cfg.classes)} />
                {cfg.legendLabel}
              </div>
            )
          )}
        </div>
      </div>
    </StaffLayout>
  );
}
