import { useQuery } from '@tanstack/react-query';
import { format, isPast, isToday, subDays } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AgentScheduleViewProps {
  compact?: boolean;
}

export function AgentScheduleView({ compact = false }: AgentScheduleViewProps) {
  const { user } = useAuth();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['agent-schedules', user?.id],
    queryFn: async () => {
      // Fetch from 7 days ago through all future shifts so recent past shifts are visible
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('agent_schedules')
        .select('*')
        .eq('agent_id', user!.id)
        .neq('status', 'cancelled')
        .gte('shift_date', sevenDaysAgo)
        .order('shift_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Compact mode (dashboard widget): next 3 upcoming only
  // Full mode (schedule page): all shifts — recent past + upcoming
  const isShiftPast = (s: { shift_date: string; end_time: string }) =>
    isPast(new Date(s.shift_date + 'T' + s.end_time));

  const display = compact
    ? schedules.filter(s => s.status === 'scheduled' && !isShiftPast(s)).slice(0, 3)
    : schedules;

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading schedule...</p>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {compact ? 'Upcoming Schedule' : 'My Schedule'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {display.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No scheduled shifts</p>
        ) : (
          <div className="space-y-3">
            {display.map(s => {
              const past = isShiftPast(s);
              const today = isToday(new Date(s.shift_date));
              return (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-center justify-between border rounded-lg p-3',
                    past ? 'opacity-60 bg-muted/30' : today ? 'border-primary/40 bg-primary/5' : ''
                  )}
                >
                  <div>
                    <p className={cn('font-medium text-sm', past && 'text-muted-foreground')}>
                      {today ? 'Today' : format(new Date(s.shift_date), 'EEE, MMM d')}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                    </p>
                    {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                  </div>
                  <Badge variant={past ? 'secondary' : 'outline'} className="text-xs">
                    {past && s.status === 'scheduled' ? 'completed' : s.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
