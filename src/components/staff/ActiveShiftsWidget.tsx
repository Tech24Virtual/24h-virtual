import { useQuery } from '@tanstack/react-query';
import { Users, Coffee } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function ActiveShiftsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['active-shifts-supervisor'],
    queryFn: async () => {
      // Get all active shifts
      const { data: shifts, error } = await supabase
        .from('agent_shifts')
        .select('id, agent_id, clock_in, total_break_minutes')
        .eq('status', 'active');
      if (error) throw error;
      if (!shifts?.length) return { count: 0, agents: [] };

      // Get profile names
      const agentIds = [...new Set(shifts.map((s) => s.agent_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', agentIds);

      // Check for active breaks
      const shiftIds = shifts.map((s) => s.id);
      const { data: breaks } = await supabase
        .from('agent_shift_breaks')
        .select('shift_id')
        .in('shift_id', shiftIds)
        .is('ended_at', null);

      const breakShiftIds = new Set(breaks?.map((b) => b.shift_id) || []);
      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      return {
        count: shifts.length,
        agents: shifts.map((s) => ({
          id: s.agent_id,
          name: profileMap.get(s.agent_id) || 'Unknown',
          clockIn: s.clock_in,
          onBreak: breakShiftIds.has(s.id),
        })),
      };
    },
    refetchInterval: 30000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Agents Online</CardTitle>
        <Users className="h-4 w-4 text-green-500" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <div className="text-2xl font-bold text-green-600">{data?.count || 0}</div>
            {data?.agents && data.agents.length > 0 && (
              <div className="mt-2 space-y-1">
                {data.agents.slice(0, 5).map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{agent.name}</span>
                    {agent.onBreak ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-300 text-[10px] px-1">
                        <Coffee className="h-2.5 w-2.5 mr-0.5" />
                        Break
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-300 text-[10px] px-1">
                        Active
                      </Badge>
                    )}
                  </div>
                ))}
                {data.agents.length > 5 && (
                  <p className="text-[10px] text-muted-foreground">+{data.agents.length - 5} more</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
