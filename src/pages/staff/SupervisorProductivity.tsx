import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getPayCycleBounds, getNextPayCycle, getPrevPayCycle } from '@/lib/payCycle';

interface ProductivityRow {
  agentId: string;
  name: string;
  shiftHours: number;
  breakMinutes: number;
  callsHandled: number;
  avgHandleTimeSeconds: number | null;
  outboundCompleted: number;
  adherencePct: number | null; // null = no scheduled shifts this cycle
  trainingPct: number | null; // null = no required modules assigned
  currentStatus: string | null; // null = not currently clocked in
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  if (status === 'on_break_bathroom') return <span>🚻 Bathroom Break</span>;
  if (status === 'on_break_lunch') return <span>🍽️ Lunch Break</span>;
  if (status === 'not_ready') return <span>⛔ Not Ready</span>;
  return <span>🟢 Available</span>;
}

function fmtHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function fmtSeconds(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtPct(pct: number | null): string {
  return pct === null ? '—' : `${Math.round(pct)}%`;
}

export default function SupervisorProductivity() {
  const queryClient = useQueryClient();
  const [cycleAnchor, setCycleAnchor] = useState(() => new Date());
  const cycle = useMemo(() => getPayCycleBounds(cycleAnchor), [cycleAnchor]);

  useEffect(() => {
    const channel = supabase
      .channel('supervisor-break-monitor')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_shift_breaks',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['supervisor-productivity'] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'agent_shifts',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['supervisor-productivity'] });
        queryClient.invalidateQueries({ queryKey: ['supervisor-agent-status'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const rangeStart = cycle.start.toISOString();
  const rangeEnd = cycle.end.toISOString();
  const rangeStartDate = rangeStart.slice(0, 10);
  const rangeEndDate = rangeEnd.slice(0, 10);

  const { data: rows = [], isLoading } = useQuery<ProductivityRow[]>({
    queryKey: ['supervisor-productivity', rangeStartDate, rangeEndDate],
    queryFn: async () => {
      // 1. Agents
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');
      if (rolesErr) throw rolesErr;
      const agentIds = (roles ?? []).map((r) => r.user_id);
      if (agentIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', agentIds);
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? 'Unknown']));

      // Live status — current active shift's agent_status, independent of the pay cycle window
      const { data: liveShifts } = await (supabase as any)
        .from('agent_shifts')
        .select('agent_id, agent_status')
        .in('agent_id', agentIds)
        .eq('status', 'active');
      const statusByAgent = new Map<string, string>(
        (liveShifts ?? []).map((s: any) => [s.agent_id, s.agent_status ?? 'available'])
      );

      // 2. Shifts within the cycle
      const { data: shifts } = await supabase
        .from('agent_shifts')
        .select('id, agent_id, clock_in, clock_out, status')
        .in('agent_id', agentIds)
        .neq('status', 'voided')
        .gte('clock_in', rangeStart)
        .lte('clock_in', rangeEnd);
      const shiftRows = shifts ?? [];
      const shiftIds = shiftRows.map((s) => s.id);
      const shiftAgentById = new Map(shiftRows.map((s) => [s.id, s.agent_id]));

      // 3. Breaks on those shifts (bathroom + lunch only) — includes in-progress breaks (ended_at IS NULL)
      const { data: breaks } = shiftIds.length
        ? await (supabase as any)
            .from('agent_shift_breaks')
            .select('shift_id, break_type, started_at, ended_at')
            .in('shift_id', shiftIds)
            .in('break_type', ['bathroom', 'lunch'])
        : { data: [] as any[] };

      // 4. Five9 usernames — one row per agent, most recent agent_onboarding record wins
      // (agent_onboarding can have multiple rows per agent; do NOT use .maybeSingle() here).
      const { data: onboardingRows } = await (supabase as any)
        .from('agent_onboarding')
        .select('applicant_user_id, five9_username, created_at')
        .in('applicant_user_id', agentIds)
        .order('created_at', { ascending: false });
      const five9ByAgent = new Map<string, string>();
      for (const o of onboardingRows ?? []) {
        if (o.five9_username && !five9ByAgent.has(o.applicant_user_id)) {
          five9ByAgent.set(o.applicant_user_id, o.five9_username);
        }
      }
      const five9Usernames = Array.from(five9ByAgent.values());
      const agentByFive9 = new Map(Array.from(five9ByAgent.entries()).map(([agentId, u]) => [u, agentId]));

      // 5. Call logs for those usernames within the cycle
      const { data: callLogs } = five9Usernames.length
        ? await supabase
            .from('call_logs')
            .select('agent_name, handle_time_seconds, call_date')
            .in('agent_name', five9Usernames)
            .gte('call_date', rangeStartDate)
            .lte('call_date', rangeEndDate)
        : { data: [] as any[] };

      // 6. Outbound completed within the cycle
      const { data: outbound } = await supabase
        .from('outbound_call_requests')
        .select('claimed_by, completed_at')
        .in('claimed_by', agentIds)
        .not('completed_at', 'is', null)
        .gte('completed_at', rangeStart)
        .lte('completed_at', rangeEnd);

      // 7. Schedules within the cycle (for adherence)
      const { data: schedules } = await supabase
        .from('agent_schedules')
        .select('agent_id, shift_date, start_time')
        .in('agent_id', agentIds)
        .neq('status', 'cancelled')
        .gte('shift_date', rangeStartDate)
        .lte('shift_date', rangeEndDate);

      // 8. Training: required+published modules actually assigned to each agent,
      // and their currently-valid (non-expired, non-needs-refresh) signoffs.
      const { data: assignments } = await (supabase as any)
        .from('campaign_training_assignments')
        .select('agent_id, module_id')
        .in('agent_id', agentIds);
      const moduleIds: string[] = Array.from(
        new Set<string>((assignments ?? []).map((a: any) => a.module_id as string))
      );
      const { data: requiredModules } = moduleIds.length
        ? await supabase
            .from('campaign_training_modules')
            .select('id')
            .in('id', moduleIds)
            .eq('required', true)
            .eq('status', 'published')
        : { data: [] as any[] };
      const requiredModuleIds = new Set((requiredModules ?? []).map((m) => m.id));
      const { data: signoffs } = await (supabase as any)
        .from('campaign_training_signoffs')
        .select('agent_id, module_id, expires_at, needs_refresh')
        .in('agent_id', agentIds);

      // ── Aggregate per agent ──────────────────────────────────────────────
      const nowIso = new Date().toISOString();

      return agentIds.map((agentId): ProductivityRow => {
        const agentShiftIds = new Set(
          shiftRows.filter((s) => s.agent_id === agentId).map((s) => s.id)
        );

        const shiftHours = shiftRows
          .filter((s) => s.agent_id === agentId && s.clock_out)
          .reduce((sum, s) => sum + (new Date(s.clock_out!).getTime() - new Date(s.clock_in).getTime()) / 3_600_000, 0);

        const breakMinutes = (breaks ?? [])
          .filter((b: any) => agentShiftIds.has(b.shift_id))
          .reduce((sum: number, b: any) => {
            // In-progress breaks (ended_at IS NULL) count elapsed time so far, not just completed ones.
            const endTime = b.ended_at ? new Date(b.ended_at).getTime() : Date.now();
            return sum + (endTime - new Date(b.started_at).getTime()) / 60_000;
          }, 0);

        const five9Username = five9ByAgent.get(agentId);
        const agentCalls = (callLogs ?? []).filter((c: any) => c.agent_name === five9Username);
        const callsHandled = agentCalls.length;
        const handleTimes = agentCalls.map((c: any) => c.handle_time_seconds).filter((v: any): v is number => typeof v === 'number');
        const avgHandleTimeSeconds = handleTimes.length
          ? handleTimes.reduce((a: number, b: number) => a + b, 0) / handleTimes.length
          : null;

        const outboundCompleted = (outbound ?? []).filter((o) => o.claimed_by === agentId).length;

        const agentSchedules = (schedules ?? []).filter((s) => s.agent_id === agentId);
        let adherencePct: number | null = null;
        if (agentSchedules.length > 0) {
          const agentClockIns = shiftRows
            .filter((s) => s.agent_id === agentId)
            .map((s) => new Date(s.clock_in).getTime());
          const onTimeCount = agentSchedules.filter((sched) => {
            const scheduledStart = new Date(`${sched.shift_date}T${sched.start_time}`).getTime();
            return agentClockIns.some((t) => Math.abs(t - scheduledStart) <= 5 * 60_000);
          }).length;
          adherencePct = (onTimeCount / agentSchedules.length) * 100;
        }

        let trainingPct: number | null = null;
        const agentRequiredModuleIds = new Set(
          (assignments ?? [])
            .filter((a: any) => a.agent_id === agentId && requiredModuleIds.has(a.module_id))
            .map((a: any) => a.module_id)
        );
        if (agentRequiredModuleIds.size > 0) {
          const validSignedOffModuleIds = new Set(
            (signoffs ?? [])
              .filter(
                (s: any) =>
                  s.agent_id === agentId &&
                  agentRequiredModuleIds.has(s.module_id) &&
                  !s.needs_refresh &&
                  (!s.expires_at || s.expires_at > nowIso)
              )
              .map((s: any) => s.module_id)
          );
          trainingPct = (validSignedOffModuleIds.size / agentRequiredModuleIds.size) * 100;
        }

        return {
          agentId,
          name: nameById.get(agentId) ?? 'Unknown',
          shiftHours,
          breakMinutes,
          callsHandled,
          avgHandleTimeSeconds,
          outboundCompleted,
          adherencePct,
          trainingPct,
          currentStatus: statusByAgent.get(agentId) ?? null,
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Agent Productivity</h1>
                <p className="text-muted-foreground mt-0.5">{cycle.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCycleAnchor(getPrevPayCycle(cycle).start)}>
                <ChevronLeft className="h-4 w-4" />
                Prev Cycle
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCycleAnchor(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCycleAnchor(getNextPayCycle(cycle).start)}>
                Next Cycle
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {cycle.isFirstHalf ? 'First half' : 'Second half'} pay cycle — {rows.length} agent{rows.length === 1 ? '' : 's'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No agents found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead className="text-right">Shift Hours</TableHead>
                      <TableHead className="text-right">Break Time</TableHead>
                      <TableHead className="text-right">Calls Handled</TableHead>
                      <TableHead className="text-right">Avg Handle Time</TableHead>
                      <TableHead className="text-right">Outbound Completed</TableHead>
                      <TableHead className="text-right">Schedule Adherence</TableHead>
                      <TableHead className="text-right">Training Complete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.agentId}>
                        <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge status={r.currentStatus} />
                        </TableCell>
                        <TableCell className="text-right">{fmtHours(r.shiftHours)}</TableCell>
                        <TableCell className="text-right">{Math.round(r.breakMinutes)} min</TableCell>
                        <TableCell className="text-right">{r.callsHandled}</TableCell>
                        <TableCell className="text-right">{fmtSeconds(r.avgHandleTimeSeconds)}</TableCell>
                        <TableCell className="text-right">{r.outboundCompleted}</TableCell>
                        <TableCell className="text-right">{fmtPct(r.adherencePct)}</TableCell>
                        <TableCell className="text-right">{fmtPct(r.trainingPct)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
