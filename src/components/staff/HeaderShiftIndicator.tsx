import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Coffee, Play, Square } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';

export function HeaderShiftIndicator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [breakRemaining, setBreakRemaining] = useState(0);
  const breakEndedRef = useRef(false);

  const { data: activeShift } = useQuery({
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

  useEffect(() => {
    if (!activeShift) return;
    const clockIn = new Date(activeShift.clock_in).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - clockIn) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeShift]);

  useEffect(() => {
    if (!activeBreak) { breakEndedRef.current = false; return; }
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

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const isOnBreak = !!activeShift && !!activeBreak;
  const isClockedIn = !!activeShift && !activeBreak;

  // Trigger badge content
  const renderTrigger = () => {
    if (isOnBreak) {
      return (
        <Button variant="ghost" size="sm" className="gap-2 px-2 h-9 relative">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
          </span>
          <span className="font-mono text-sm text-orange-600 dark:text-orange-400">{formatCountdown(breakRemaining)}</span>
        </Button>
      );
    }
    if (isClockedIn) {
      return (
        <Button variant="ghost" size="sm" className="gap-2 px-2 h-9 relative">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="font-mono text-sm text-green-700 dark:text-green-400">{formatTime(Math.max(0, elapsed))}</span>
        </Button>
      );
    }
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Clock className="h-5 w-5 text-muted-foreground" />
      </Button>
    );
  };

  // Popover content
  const renderContent = () => {
    if (isOnBreak) {
      const totalBreakSecs = activeBreak!.break_type * 60;
      const progress = ((totalBreakSecs - breakRemaining) / totalBreakSecs) * 100;
      return (
        <div className="space-y-3 w-56">
          <div className="flex items-center gap-2 text-orange-600">
            <Coffee className="h-4 w-4" />
            <span className="text-sm font-medium">On Break — {activeBreak!.break_type}m</span>
          </div>
          <div className="text-lg font-mono text-muted-foreground text-center">
            Shift: {formatTime(Math.max(0, elapsed))}
          </div>
          <div className="text-3xl font-mono font-bold text-orange-600 text-center">
            {formatCountdown(breakRemaining)}
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Clocked in at {format(new Date(activeShift!.clock_in), 'h:mm a')}
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={() => endBreakMutation.mutate()} disabled={endBreakMutation.isPending}>
            End Break Early
          </Button>
        </div>
      );
    }

    if (isClockedIn) {
      return (
        <div className="space-y-3 w-56">
          <div className="text-3xl font-mono font-bold text-green-700 dark:text-green-400 text-center">
            {formatTime(Math.max(0, elapsed))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Clocked in at {format(new Date(activeShift!.clock_in), 'h:mm a')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[15, 30, 45, 60].map((mins) => (
              <Button key={mins} variant="outline" size="sm" onClick={() => startBreakMutation.mutate(mins)} disabled={startBreakMutation.isPending}>
                <Coffee className="h-3 w-3 mr-1" />{mins}m
              </Button>
            ))}
          </div>
          <Button variant="destructive" size="sm" className="w-full" onClick={() => clockOutMutation.mutate()} disabled={clockOutMutation.isPending}>
            <Square className="h-3 w-3 mr-1" /> Clock Out
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3 w-56">
        <p className="text-sm text-muted-foreground text-center">You're not clocked in</p>
        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => clockInMutation.mutate()} disabled={clockInMutation.isPending}>
          <Play className="h-4 w-4 mr-2" /> Clock In
        </Button>
      </div>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{renderTrigger()}</PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="end">{renderContent()}</PopoverContent>
    </Popover>
  );
}
