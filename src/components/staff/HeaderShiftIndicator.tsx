import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Play, Square } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { BreakButtons, BreakTimer, type BreakType } from '@/components/staff/BreakControls';
import { computeBreakEndDeductionMinutes, useBathroomAllowanceMinutes, useLunchMinutesSetting } from '@/lib/shiftBreaks';

interface ActiveBreak {
  id: string;
  shift_id: string;
  break_duration_minutes: number | null;
  break_type: string | null;
  started_at: string;
  ended_at: string | null;
}

export function HeaderShiftIndicator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [now, setNow] = useState(() => Date.now());

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

  const { data: activeBreak } = useQuery<ActiveBreak | null>({
    queryKey: ['active-break', activeShift?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('agent_shift_breaks')
        .select('*')
        .eq('shift_id', activeShift!.id)
        .is('ended_at', null)
        .maybeSingle();
      return data;
    },
    enabled: !!activeShift?.id,
  });

  const bathroomAllowance = useBathroomAllowanceMinutes();
  const lunchMinutesDefault = useLunchMinutesSetting();

  useEffect(() => {
    if (!activeShift) return;
    const clockIn = new Date(activeShift.clock_in).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - clockIn) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeShift]);

  // Drives the compact header pill's live countdown (BreakTimer owns the detailed popover display).
  useEffect(() => {
    if (!activeBreak) return;
    const tick = () => setNow(Date.now());
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
    mutationFn: async ({ type, durationMinutes }: { type: 'lunch' | 'bathroom'; durationMinutes: number }) => {
      const { error } = await (supabase as any).from('agent_shift_breaks').insert({
        shift_id: activeShift!.id,
        break_type: type,
        break_duration_minutes: durationMinutes,
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
      const deductMinutes = computeBreakEndDeductionMinutes(activeBreak.break_type, actualMinutes, bathroomAllowance);
      const { error: breakError } = await supabase
        .from('agent_shift_breaks')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', activeBreak.id);
      if (breakError) throw breakError;
      const { error: shiftError } = await supabase
        .from('agent_shifts')
        .update({ total_break_minutes: (activeShift!.total_break_minutes || 0) + deductMinutes })
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

  const breakTotalSeconds = activeBreak ? Math.max(0, (activeBreak.break_duration_minutes ?? 0) * 60) : 0;
  const breakElapsedSeconds = activeBreak ? Math.floor((now - new Date(activeBreak.started_at).getTime()) / 1000) : 0;
  const breakRemainingSeconds = breakTotalSeconds - breakElapsedSeconds;
  const breakIsOvertime = breakRemainingSeconds <= 0;

  // Trigger badge content
  const renderTrigger = () => {
    if (isOnBreak) {
      return (
        <Button variant="ghost" size="sm" className="gap-2 px-2 h-9 relative">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${breakIsOvertime ? 'bg-red-400' : 'bg-orange-400'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${breakIsOvertime ? 'bg-red-500' : 'bg-orange-500'}`} />
          </span>
          <span className={`font-mono text-sm ${breakIsOvertime ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
            {breakIsOvertime ? `⚠️ ${formatCountdown(Math.abs(breakRemainingSeconds))}` : formatCountdown(breakRemainingSeconds)}
          </span>
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
      return (
        <div className="space-y-3 w-56">
          <div className="text-lg font-mono text-muted-foreground text-center">
            Shift: {formatTime(Math.max(0, elapsed))}
          </div>
          <BreakTimer
            breakType={(activeBreak!.break_type as BreakType) ?? 'general'}
            durationMinutes={activeBreak!.break_duration_minutes ?? 0}
            startedAt={activeBreak!.started_at}
            onEndBreak={() => endBreakMutation.mutate()}
            isPending={endBreakMutation.isPending}
          />
          <p className="text-xs text-muted-foreground text-center">
            Clocked in at {format(new Date(activeShift!.clock_in), 'h:mm a')}
          </p>
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
          <BreakButtons
            onStartBreak={(type, durationMinutes) => startBreakMutation.mutate({ type, durationMinutes })}
            isPending={startBreakMutation.isPending}
            bathroomAllowanceMinutes={bathroomAllowance}
            lunchMinutes={lunchMinutesDefault}
          />
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
