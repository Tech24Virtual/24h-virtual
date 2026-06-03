import { useQuery } from '@tanstack/react-query';
import { format, isPast, isToday } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentScheduleViewProps {
  compact?: boolean;
}

export function AgentScheduleView({ compact = false }: AgentScheduleViewProps) {
  const { user } = useAuth();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['agent-schedules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_schedules')
        .select('*')
        .eq('agent_id', user!.id)
        .order('shift_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const upcoming = schedules.filter(s => s.status === 'scheduled' && !isPast(new Date(s.shift_date + 'T' + s.end_time)));
  const display = compact ? upcoming.slice(0, 3) : upcoming;

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
          <p className="text-sm text-muted-foreground text-center py-4">No upcoming scheduled shifts</p>
        ) : (
          <div className="space-y-3">
            {display.map(s => (
              <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="font-medium text-sm">
                    {isToday(new Date(s.shift_date)) ? 'Today' : format(new Date(s.shift_date), 'EEE, MMM d')}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                  </p>
                  {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                </div>
                <Badge variant="outline" className="text-xs">
                  {s.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
