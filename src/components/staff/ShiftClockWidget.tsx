import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Coffee, Play, Square, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

export function ShiftClockWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [breakRemaining, setBreakRemaining] = useState(0);
  const breakEndedRef = useRef(false);

  const { data: activeShift, isLoading } = useQuery({
    queryKey: ['active-shift', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: activeBreak } = useQuery({
    queryKey: ['active-break', activeShift?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_shift_breaks')
        .select('*')
        .eq('shift_id', activeShift!.id)
        .is('ended_at', null)
        .maybeSingle();
      return data;
    },
    enabled: !!activeShift?.id,
  });

  // Elapsed timer - ALWAYS counts from clock_in, never pauses for breaks
  useEffect(() => {
    if (!activeShift) return;
    const clockIn = new Date(activeShift.clock_in).getTime();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - clockIn) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeShift]);

  // Break countdown ticker
  useEffect(() => {
    if (!activeBreak) {
      breakEndedRef.current = false;
      return;
    }
    const startedAt = new Date(activeBreak.started_at).getTime();
    const duration = activeBreak.break_type * 60 * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((startedAt + duration - Date.now()) / 1000));
      setBreakRemaining(remaining);
      if (remaining <= 0 && !breakEndedRef.current) {
        breakEndedRef.current = true;
        toast({ title: 'Break over!', description: 'Please resume work.' });
        endBreakMutation.mutate();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeBreak]);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('agent_shifts').insert({ agent_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast({ title: 'Clocked in', description: 'Your shift has started.' });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('agent_shifts')
        .update({ clock_out: new Date().toISOString(), status: 'completed' })
        .eq('id', activeShift!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['agent-shifts'] });
      toast({ title: 'Clocked out', description: 'Your shift has ended.' });
    },
  });

  const startBreakMutation = useMutation({
    mutationFn: async (breakType: number) => {
      const { error } = await supabase.from('agent_shift_breaks').insert({
        shift_id: activeShift!.id,
        break_type: breakType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-break'] });
      toast({ title: 'Break started' });
    },
  });

  const endBreakMutation = useMutation({
    mutationFn: async () => {
      if (!activeBreak) return;
      const startedAt = new Date(activeBreak.started_at).getTime();
      const actualMinutes = Math.ceil((Date.now() - startedAt) / 60000);

      const { error: breakError } = await supabase
        .from('agent_shift_breaks')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', activeBreak.id);
      if (breakError) throw breakError;

      const { error: shiftError } = await supabase
        .from('agent_shifts')
        .update({ total_break_minutes: (activeShift!.total_break_minutes || 0) + actualMinutes })
        .eq('id', activeShift!.id);
      if (shiftError) throw shiftError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-break'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast({ title: 'Break ended', description: 'Welcome back!' });
    },
  });

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatCountdown = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  /** Returns the clock-in time formatted for display (e.g. "9:02 AM") */
  const clockInTimeLabel = activeShift
    ? format(new Date(activeShift.clock_in), 'h:mm a')
    : null;

  if (isLoading) return null;

  // On break state — main timer still visible, break overlay on top
  if (activeShift && activeBreak) {
    const totalBreakSecs = activeBreak.break_type * 60;
    const progress = ((totalBreakSecs - breakRemaining) / totalBreakSecs) * 100;

    return (
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Coffee className="h-4 w-4 text-orange-500" />
            On Break — {activeBreak.break_type} min
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Main elapsed timer continues */}
          <div className="text-lg font-mono text-muted-foreground text-center">
            Shift: {formatTime(Math.max(0, elapsed))}
          </div>
          <div className="text-3xl font-mono font-bold text-orange-600 text-center">
            {formatCountdown(breakRemaining)}
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Clocked in at {clockInTimeLabel}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => endBreakMutation.mutate()}
            disabled={endBreakMutation.isPending}
          >
            End Break Early
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Clocked in state
  if (activeShift) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Timer className="h-4 w-4 text-green-600" />
            Shift Active
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-mono font-bold text-green-700 text-center">
            {formatTime(Math.max(0, elapsed))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Clocked in at {clockInTimeLabel}
          </p>
          <div className="flex gap-2 flex-wrap">
            {[15, 30, 45, 60].map((mins) => (
              <Button
                key={mins}
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => startBreakMutation.mutate(mins)}
                disabled={startBreakMutation.isPending}
              >
                <Coffee className="h-3 w-3 mr-1" />
                {mins}m
              </Button>
            ))}
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => clockOutMutation.mutate()}
            disabled={clockOutMutation.isPending}
          >
            <Square className="h-3 w-3 mr-1" />
            Clock Out
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not clocked in
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Shift Clock
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={() => clockInMutation.mutate()}
          disabled={clockInMutation.isPending}
        >
          <Play className="h-4 w-4 mr-2" />
          Clock In
        </Button>
      </CardContent>
    </Card>
  );
}

/** Hook to get the active shift clock-in time for sidebar display */
export function useActiveShiftTime(enabled = true) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['active-shift-time', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_shifts')
        .select('clock_in')
        .eq('agent_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && enabled,
    refetchInterval: 30000,
  });
  if (!enabled) return null;
  return data ? format(new Date(data.clock_in), 'h:mm a') : null;
}
