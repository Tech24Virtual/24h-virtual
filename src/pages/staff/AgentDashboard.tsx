import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Play, Square,
  Users, MessageSquare, ClipboardList,
  Layers, Search, CalendarDays, FileText,
  ChevronRight, Bell, Building2, ArrowRight, Send, PhoneCall,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BreakButtons, BreakTimer, type BreakType } from '@/components/staff/BreakControls';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { usePageView } from '@/lib/analytics';
import { computeBreakEndDeductionMinutes, useBathroomAllowanceMinutes, useLunchMinutesSetting } from '@/lib/shiftBreaks';
import { useShiftHeartbeat } from '@/hooks/useShiftHeartbeat';
import { SendToChannelDialog } from '@/components/staff/SendToChannelDialog';

interface ActiveShift {
  id: string;
  clock_in: string;
  clock_out: string | null;
  status: string;
  total_break_minutes: number | null;
}

interface ActiveBreak {
  id: string;
  shift_id: string;
  break_duration_minutes: number | null;
  break_type: string | null;
  started_at: string;
  ended_at: string | null;
}

interface AssignedClient {
  id: string;
  name: string | null;
  company: string | null;
  lastCall: string | null;
}

interface RecentNotification {
  id: string;
  title: string;
  message: string | null;
  created_at: string | null;
  is_read: boolean | null;
  action_url: string | null;
}

interface Five9AgentState {
  state: string;
  calls_handled: number;
  time_in_state: number; // seconds
}

function five9StateBadgeClasses(state: string): string {
  const s = state.toLowerCase();
  if (s.includes('available')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (s.includes('call')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  if (s.includes('not ready') || s.includes('notready')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (s.includes('logged out') || s.includes('loggedout') || s.includes('offline')) return 'bg-muted text-muted-foreground';
  return 'bg-muted text-muted-foreground';
}

/** HH:MM:SS elapsed display for the clocked-in card */
function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}


function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function AgentDashboard() {
  usePageView('agent_dashboard', 'agent');
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [sendToChannelOpen, setSendToChannelOpen] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || 'Agent';
  const todayLabel = format(new Date(), 'EEEE, MMMM d');

  // ── Shift state — shares queryKey cache with ShiftClockWidget ─────────────
  const { data: activeShift, isLoading: shiftLoading } = useQuery<ActiveShift | null>({
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

  // Bathroom breaks are paid up to this allowance; only the excess is deducted.
  const bathroomAllowance = useBathroomAllowanceMinutes();
  const lunchMinutesDefault = useLunchMinutesSetting();

  useShiftHeartbeat(activeShift?.id);

  // Most recent shift — used to show a banner if it was auto-clocked-out (browser closed / crash).
  // .limit(1) before .maybeSingle() keeps this safe even if an agent somehow has zero shifts.
  const { data: lastShift } = useQuery({
    queryKey: ['last-shift', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('agent_shifts')
        .select('id, clock_out, auto_clocked_out, auto_clockout_reason')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!activeShift) return;
    const clockIn = new Date(activeShift.clock_in).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - clockIn) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeShift]);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      console.log('[ClockIn] auth user id:', user?.id);

      // Pre-check: catch any open shift that the status query might miss
      const { data: existing, error: checkErr } = await supabase
        .from('agent_shifts')
        .select('id, clock_in, status')
        .eq('agent_id', user!.id)
        .is('clock_out', null)
        .maybeSingle();

      console.log('[ClockIn] pre-check result:', { existing, checkErr });

      if (existing) {
        await queryClient.invalidateQueries({ queryKey: ['active-shift', user?.id] });
        throw new Error(
          `You already have an open shift (started ${format(new Date(existing.clock_in), 'h:mm a')}). The page has been refreshed.`,
        );
      }

      console.log('[ClockIn] inserting shift for agent_id:', user!.id);
      const { data: inserted, error } = await supabase.from('agent_shifts').insert({
        agent_id: user!.id,
        clock_in: new Date().toISOString(),
        status: 'active',
      }).select('id, agent_id, status').single();

      console.log('[ClockIn] insert result:', { inserted, error });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast({ title: 'Clocked in', description: 'Your shift has started.' });
    },
    onError: (err: unknown) => {
      // Log full error object so the exact Supabase error code is visible in console
      console.error('[ClockIn] full error object:', err);
      const supaErr = err as { message?: string; code?: string; details?: string; hint?: string };
      const detail = [supaErr.code, supaErr.message, supaErr.details, supaErr.hint]
        .filter(Boolean)
        .join(' | ');
      toast({
        title: 'Clock-in failed',
        description: detail || 'Unknown error — check browser console',
        variant: 'destructive',
      });
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
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not end your shift.';
      toast({ title: 'Clock-out failed', description: msg, variant: 'destructive' });
    },
  });

  const startBreakMutation = useMutation({
    mutationFn: async ({ type, durationMinutes }: { type: 'lunch' | 'bathroom'; durationMinutes: number }) => {
      const { error } = await (supabase as any).from('agent_shift_breaks').insert({
        shift_id: activeShift!.id,
        started_at: new Date().toISOString(),
        break_type: type,
        break_duration_minutes: durationMinutes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-break'] });
      toast({ title: 'Break started', description: 'Enjoy your break!' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to start break';
      toast({ title: 'Break failed', description: msg, variant: 'destructive' });
    },
  });

  const endBreakMutation = useMutation({
    mutationFn: async () => {
      if (!activeBreak) return;
      const actualMinutes = Math.ceil(
        (Date.now() - new Date(activeBreak.started_at).getTime()) / 60000,
      );
      const deductMinutes = computeBreakEndDeductionMinutes(activeBreak.break_type, actualMinutes, bathroomAllowance);
      const { error: breakError } = await supabase
        .from('agent_shift_breaks')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', activeBreak.id);
      if (breakError) throw breakError;
      const { error: shiftError } = await supabase
        .from('agent_shifts')
        .update({
          total_break_minutes: (activeShift!.total_break_minutes || 0) + deductMinutes,
        })
        .eq('id', activeShift!.id);
      if (shiftError) throw shiftError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-break'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast({ title: 'Break ended', description: 'Welcome back!' });
    },
  });

  // ── Five9 username (same pattern as AgentCallLogs.tsx) ────────────────────
  const { data: onboarding } = useQuery({
    queryKey: ['agent-onboarding-username', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_onboarding')
        .select('five9_username')
        .eq('applicant_user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });
  const five9Username = onboarding?.five9_username ?? null;

  // ── Five9 live ACD status (same fetch pattern as useFive9CampaignMapping.ts) ─
  const { data: five9AgentState, isError: five9StateError, isLoading: five9StateLoading } = useQuery<Five9AgentState | null>({
    queryKey: ['five9-agent-state', five9Username],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      let res: Response;
      try {
        res = await fetch(
          `${supabaseUrl}/functions/v1/five9-proxy?action=getAgentState&username=${encodeURIComponent(five9Username!)}`,
          {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${authToken}`,
            },
            signal: AbortSignal.timeout(10_000),
          }
        );
      } catch (e: any) {
        if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
          throw new Error('Five9 API timed out — check Five9 connectivity');
        }
        throw e;
      }
      if (!res.ok) throw new Error('Five9 API unavailable');
      const json = await res.json();
      return json.data as Five9AgentState;
    },
    enabled: !!five9Username && !!activeShift,
    refetchInterval: 30_000,
    retry: 1,
  });

  // ── Today at a Glance ─────────────────────────────────────────────────────
  const { data: myClientsCount = 0 } = useQuery({
    queryKey: ['my-assigned-clients-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('client_agent_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', user!.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['agent-unread-notifications', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const { data: openTaskCount = 0 } = useQuery({
    queryKey: ['agent-open-tasks', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('crm_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', user!.id)
        .neq('status', 'completed')
        .neq('status', 'closed');
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // ── Assigned clients list (max 5) ─────────────────────────────────────────
  const { data: assignedClients = [], isLoading: clientsLoading } = useQuery<AssignedClient[]>({
    queryKey: ['agent-clients-list', user?.id],
    queryFn: async () => {
      const { data: assignments } = await supabase
        .from('client_agent_assignments')
        .select('client_id')
        .eq('agent_id', user!.id)
        .limit(5);

      if (!assignments?.length) return [];

      const clientIds = assignments.map((a) => a.client_id);

      const [leadsRes, callsRes] = await Promise.all([
        supabase.from('leads').select('id, name, company').in('id', clientIds),
        supabase
          .from('call_logs')
          .select('client_id, created_at')
          .in('client_id', clientIds)
          .order('created_at', { ascending: false }),
      ]);

      const callMap = new Map<string, string>();
      for (const c of callsRes.data || []) {
        if (!callMap.has(c.client_id)) callMap.set(c.client_id, c.created_at);
      }

      return (leadsRes.data ?? []).map((lead) => ({
        ...lead,
        lastCall: callMap.get(lead.id) ?? null,
      }));
    },
    enabled: !!user?.id,
  });

  // ── Recent activity (last 3 notifications) ────────────────────────────────
  const { data: recentActivity = [] } = useQuery<RecentNotification[]>({
    queryKey: ['agent-recent-activity', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, created_at, is_read, action_url')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const clockInLabel = activeShift ? format(new Date(activeShift.clock_in), 'h:mm a') : null;

  return (
    <StaffLayout role="agent">
      {/* Full-bleed gradient background */}
      <div className="-m-6 lg:-m-8 min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:from-background dark:via-background dark:to-slate-900/50">
        <div className="px-6 py-6 lg:px-8 lg:py-8 space-y-5">

          {/* ── Page Header ─────────────────────────────────────────────────── */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Good {getTimeOfDay()}, {firstName} 👋
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{todayLabel}</p>
          </div>

          {/* ── Auto-clockout notice ──────────────────────────────────────────── */}
          {lastShift?.auto_clocked_out && !activeShift && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                ⚠️ Your last shift was automatically ended — your browser was closed or you lost connection.
                Please review your shift time and clock back in when ready.
              </p>
            </div>
          )}

          {/* ── Section 1: Shift Status Card ─────────────────────────────────── */}
          {shiftLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : activeBreak ? (
            // On break
            <Card className="border-l-4 border-l-orange-400 border-orange-100 dark:border-orange-900 bg-background">
              <CardContent className="p-6">
                <BreakTimer
                  breakType={(activeBreak.break_type as BreakType) ?? 'general'}
                  durationMinutes={activeBreak.break_duration_minutes ?? 0}
                  startedAt={activeBreak.started_at}
                  onEndBreak={() => endBreakMutation.mutate()}
                  isPending={endBreakMutation.isPending}
                />
              </CardContent>
            </Card>
          ) : activeShift ? (
            // Clocked in
            <Card className="border-l-4 border-l-green-500 border-green-100 dark:border-green-900 bg-background">
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                    <p className="text-sm font-medium text-muted-foreground">
                      On Shift · Started {clockInLabel}
                    </p>
                  </div>
                  <p className="text-4xl font-mono font-bold text-green-600 dark:text-green-400 tracking-tight">
                    {formatHMS(elapsed)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0 items-start sm:items-center">
                  <BreakButtons
                    onStartBreak={(type, durationMinutes) => startBreakMutation.mutate({ type, durationMinutes })}
                    isPending={startBreakMutation.isPending}
                    bathroomAllowanceMinutes={bathroomAllowance}
                    lunchMinutes={lunchMinutesDefault}
                  />
                  <Button
                    variant="outline"
                    onClick={() => clockOutMutation.mutate()}
                    disabled={clockOutMutation.isPending}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Clock Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Not clocked in
            <Card className="border-l-4 border-l-amber-400 border-amber-100 dark:border-amber-900 bg-background">
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
                  <div>
                    <p className="font-semibold">Not on shift</p>
                    <p className="text-sm text-muted-foreground">Clock in when you're ready to start</p>
                  </div>
                </div>
                <Button
                  className="shrink-0 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => clockInMutation.mutate()}
                  disabled={clockInMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {clockInMutation.isPending ? 'Starting…' : 'Clock In'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Section 2: Today at a Glance ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm rounded-2xl h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      <PhoneCall className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Five9 Status</p>
                  </div>
                  {five9AgentState && !five9StateError && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                {!five9Username ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Five9 not configured</p>
                    <Link to="/staff/agent/onboarding" className="text-xs text-primary hover:underline">
                      Complete onboarding
                    </Link>
                  </div>
                ) : !activeShift ? (
                  <p className="text-sm text-muted-foreground">Clock in to see live status</p>
                ) : five9StateLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : five9StateError || !five9AgentState ? (
                  <p className="text-sm text-muted-foreground">Five9 status unavailable</p>
                ) : (
                  <div className="space-y-1.5">
                    <Badge className={cn('capitalize', five9StateBadgeClasses(five9AgentState.state))}>
                      {five9AgentState.state}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatHMS(five9AgentState.time_in_state)} in state
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {five9AgentState.calls_handled} calls handled today
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Link to="/staff/agent/clients" className="block">
              <Card className="shadow-sm rounded-2xl hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer h-full">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold leading-none">{myClientsCount}</p>
                    <p className="mt-1 text-sm text-muted-foreground">My Clients</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/staff/agent/notifications" className="block">
              <Card className="shadow-sm rounded-2xl hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all cursor-pointer h-full">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-bold leading-none">{unreadCount}</p>
                      {unreadCount > 0 && <Badge className="h-5 px-1.5 text-xs">New</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Notifications</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Link to /tasks — the Tasks child of the Workspace group */}
            <Link to="/staff/agent/tasks" className="block">
              <Card className="shadow-sm rounded-2xl hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800 transition-all cursor-pointer h-full">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold leading-none">{openTaskCount}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Open Tasks</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* ── Section 3: Quick Actions ──────────────────────────────────────── */}
          <div className="space-y-3">
            <Button
              asChild
              size="lg"
              className="w-full h-14 justify-start text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md border-0"
            >
              <Link to="/staff/agent/workspace">
                <Layers className="h-5 w-5 mr-3 shrink-0" />
                Open Workspace
                <ArrowRight className="h-5 w-5 ml-auto shrink-0" />
              </Link>
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 justify-start bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:border-slate-700"
              >
                <Link to="/staff/agent/scripts">
                  <Search className="h-4 w-4 mr-2 shrink-0 text-green-600 dark:text-green-400" />
                  Search FAQs
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 justify-start bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:border-slate-700"
              >
                <Link to="/staff/agent/schedule">
                  <CalendarDays className="h-4 w-4 mr-2 shrink-0 text-purple-600 dark:text-purple-400" />
                  My Schedule
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 justify-start bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:border-slate-700"
              >
                <Link to="/staff/agent/shifts">
                  <FileText className="h-4 w-4 mr-2 shrink-0 text-orange-600 dark:text-orange-400" />
                  Submit Timesheet
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 justify-start bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:border-slate-700"
                onClick={() => setSendToChannelOpen(true)}
              >
                <Send className="h-4 w-4 mr-2 shrink-0 text-blue-600 dark:text-blue-400" />
                Send to Channel
              </Button>
            </div>
          </div>

          {/* ── Section 4: My Assigned Clients ───────────────────────────────── */}
          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                My Clients Today
              </CardTitle>
              <Badge variant="secondary" className="font-mono tabular-nums">
                {assignedClients.length}
              </Badge>
            </CardHeader>
            <CardContent className="pt-0">
              {clientsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-2">
                      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              ) : assignedClients.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No clients assigned yet — contact your supervisor</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {assignedClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {(client.name ?? '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {client.name ?? 'Unnamed client'}
                          </p>
                          {client.company && (
                            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3 shrink-0" />
                              {client.company}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="shrink-0 pl-3 text-xs text-muted-foreground">
                        {client.lastCall
                          ? formatDistanceToNow(new Date(client.lastCall), { addSuffix: true })
                          : 'No calls yet'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {assignedClients.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <Link
                    to="/staff/agent/clients"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View all clients <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Section 5: Recent Activity ────────────────────────────────────── */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {recentActivity.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <div className="h-10 w-10 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm font-medium">You&apos;re all caught up!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No new activity since your last visit.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentActivity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          item.is_read ? 'bg-muted-foreground/30' : 'bg-primary',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        {item.action_url ? (
                          <Link
                            to={item.action_url}
                            className="block truncate text-sm font-medium hover:underline"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-medium">{item.title}</p>
                        )}
                        {item.message && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {item.message}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 pl-2 text-xs text-muted-foreground">
                        {item.created_at
                          ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
                          : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      <SendToChannelDialog open={sendToChannelOpen} onOpenChange={setSendToChannelOpen} />
    </StaffLayout>
  );
}
