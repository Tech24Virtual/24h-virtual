import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { BreakButtons, BreakTimer, type BreakType } from '@/components/staff/BreakControls';
import { computeBreakEndDeductionMinutes, useBathroomAllowanceMinutes, useLunchMinutesSetting } from '@/lib/shiftBreaks';
import { useShiftHeartbeat } from '@/hooks/useShiftHeartbeat';
import { syncTrackabi } from '@/lib/trackabiSync';
import { cn } from '@/lib/utils';

interface ActiveBreak {
  id: string;
  shift_id: string;
  break_duration_minutes: number | null;
  break_type: string | null;
  started_at: string;
  ended_at: string | null;
}

/** Compact single-row shift/break status bar shown at the top of the agent workspace. */
export function WorkspaceShiftBar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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

  useShiftHeartbeat(activeShift?.id);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agent_shifts')
        .insert({
          agent_id: user!.id,
          clock_in: new Date().toISOString(),
          status: 'active',
          agent_status: 'available',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast({ title: 'Clocked in successfully' });
    },
    onError: (e: Error) => toast({ title: 'Clock in failed', description: e.message, variant: 'destructive' }),
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('agent_shifts')
        .update({
          clock_out: new Date().toISOString(),
          status: 'completed',
          agent_status: 'available',
        })
        .eq('id', activeShift!.id);
      if (error) throw error;
      return activeShift!.id;
    },
    onSuccess: (shiftId: string) => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast({ title: 'Clocked out successfully' });
      syncTrackabi({
        action: 'clock_out',
        agent_id: user?.id,
        agent_email: user?.email,
        shift_id: shiftId,
        timestamp: new Date().toISOString(),
      });
    },
    onError: (e: Error) => toast({ title: 'Clock out failed', description: e.message, variant: 'destructive' }),
  });

  useEffect(() => {
    if (!activeBreak) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeBreak]);

  const startBreakMutation = useMutation({
    mutationFn: async ({ type, durationMinutes }: { type: 'lunch' | 'bathroom'; durationMinutes: number }) => {
      const { error: breakError } = await (supabase as any).from('agent_shift_breaks').insert({
        shift_id: activeShift!.id,
        break_type: type,
        break_duration_minutes: durationMinutes,
      });
      if (breakError) throw breakError;
      const { error: statusError } = await (supabase as any)
        .from('agent_shifts')
        .update({ agent_status: type === 'bathroom' ? 'on_break_bathroom' : 'on_break_lunch' })
        .eq('id', activeShift!.id);
      if (statusError) throw statusError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['active-break'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast({ title: 'Break started' });
      syncTrackabi({
        action: 'break_start',
        agent_id: user?.id,
        agent_email: user?.email,
        shift_id: activeShift!.id,
        timestamp: new Date().toISOString(),
        break_type: variables.type,
      });
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
      const { error: incrementError } = await (supabase as any).rpc('increment_break_minutes', {
        shift_id: activeShift!.id,
        minutes: deductMinutes,
      });
      if (incrementError) throw incrementError;
      const { error: shiftError } = await (supabase as any)
        .from('agent_shifts')
        .update({ agent_status: 'available' })
        .eq('id', activeShift!.id);
      if (shiftError) throw shiftError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-break'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast({ title: 'Break ended', description: 'Welcome back!' });
    },
  });

  const formatCountdown = (seconds: number) => {
    const sign = seconds < 0 ? '-' : '';
    const abs = Math.abs(seconds);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return `${sign}${m}:${String(s).padStart(2, '0')}`;
  };

  const isOnBreak = !!activeShift && !!activeBreak;
  const isClockedIn = !!activeShift && !activeBreak;

  const breakTotalSeconds = activeBreak ? Math.max(0, (activeBreak.break_duration_minutes ?? 0) * 60) : 0;
  const breakElapsedSeconds = activeBreak ? Math.floor((now - new Date(activeBreak.started_at).getTime()) / 1000) : 0;
  const breakRemainingSeconds = breakTotalSeconds - breakElapsedSeconds;

  const dotColor = isOnBreak
    ? activeBreak?.break_type === 'bathroom'
      ? 'bg-yellow-500'
      : 'bg-orange-500'
    : isClockedIn
      ? 'bg-green-500'
      : 'bg-red-500';

  const statusText = isOnBreak
    ? `${activeBreak?.break_type === 'bathroom' ? 'Bathroom Break' : 'Lunch Break'} - ${formatCountdown(breakRemainingSeconds)} remaining`
    : isClockedIn
      ? 'Available'
      : 'Not Clocked In';

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-1.5 border-b bg-card shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', dotColor)} />
        <span className="text-sm font-medium truncate">{statusText}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isClockedIn && (
          <>
            <BreakButtons
              onStartBreak={(type, durationMinutes) => startBreakMutation.mutate({ type, durationMinutes })}
              isPending={startBreakMutation.isPending}
              bathroomAllowanceMinutes={bathroomAllowance}
              lunchMinutes={lunchMinutesDefault}
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
            >
              {clockOutMutation.isPending ? 'Clocking out...' : 'Clock Out'}
            </Button>
          </>
        )}
        {isOnBreak && (
          <div className="w-56">
            <BreakTimer
              breakType={(activeBreak!.break_type as BreakType) ?? 'general'}
              durationMinutes={activeBreak!.break_duration_minutes ?? 0}
              startedAt={activeBreak!.started_at}
              onEndBreak={() => endBreakMutation.mutate()}
              isPending={endBreakMutation.isPending}
            />
          </div>
        )}
        {!activeShift && (
          <Button size="sm" onClick={() => clockInMutation.mutate()} disabled={clockInMutation.isPending}>
            {clockInMutation.isPending ? 'Clocking in...' : 'Clock In'}
          </Button>
        )}
      </div>
    </div>
  );
}
