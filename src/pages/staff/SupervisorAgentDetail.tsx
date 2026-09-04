import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import {
  ArrowLeft, Clock, Users, GraduationCap, BarChart2,
  CheckCircle2, Circle, Plus, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ── Helpers ───────────────────────────────────────────────────────────────────

function shiftDuration(clockIn: string, clockOut: string | null, breakMins: number): string {
  const end = clockOut ? new Date(clockOut) : new Date();
  const mins = Math.max(0, differenceInMinutes(end, new Date(clockIn)) - (breakMins ?? 0));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

const ONBOARDING_STYLES: Record<string, string> = {
  completed:     'bg-green-100 text-green-800',
  hired:         'bg-green-100 text-green-800',
  training:      'bg-amber-100 text-amber-800',
  offer_pending: 'bg-blue-100 text-blue-800',
  rejected:      'bg-red-100 text-red-800',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrainingRow {
  moduleId: string;
  moduleTitle: string;
  status: 'not_started' | 'pending_signoff' | 'completed';
  completionId: string | null;
  campaignId: string | null;
  dueDate: string | null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SupervisorAgentDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState('');

  // ── Main data query ────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['supervisor-agent-detail', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const [
        profileR, roleR, onboardingR, activeShiftR,
        assignmentsR, trainingAssignR, completionsR, signoffsR,
        recentShiftsR, performanceR,
      ] = await Promise.all([
        supabase.from('profiles').select('full_name, phone').eq('id', userId!).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId!).maybeSingle(),
        supabase.from('agent_onboarding').select('status').eq('applicant_user_id', userId!).maybeSingle(),
        supabase.from('agent_shifts')
          .select('id, clock_in, total_break_minutes')
          .eq('agent_id', userId!)
          .eq('status', 'active')
          .maybeSingle(),
        supabase.from('client_agent_assignments')
          .select('client_id, is_primary')
          .eq('agent_id', userId!),
        supabase.from('campaign_training_assignments')
          .select('id, module_id, due_date')
          .eq('agent_id', userId!),
        supabase.from('campaign_training_completions')
          .select('id, module_id, campaign_id, completed_at')
          .eq('agent_id', userId!),
        (supabase as any)
          .from('campaign_training_signoffs')
          .select('completion_id')
          .eq('agent_id', userId!),
        supabase.from('agent_shifts')
          .select('id, clock_in, clock_out, status, total_break_minutes')
          .eq('agent_id', userId!)
          .order('clock_in', { ascending: false })
          .limit(5),
        supabase.from('agent_performance_reviews')
          .select('period_start, period_end, quality_score, attendance_score, communication_score, overall_score, strengths, areas_for_improvement, status')
          .eq('agent_id', userId!)
          .order('period_end', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Fetch client details
      const clientIds = (assignmentsR.data ?? []).map((a) => a.client_id).filter(Boolean);
      const leadsR = clientIds.length > 0
        ? await supabase.from('leads').select('id, name, company, pipeline_stage').in('id', clientIds)
        : { data: [] as Array<{ id: string; name: string | null; company: string | null; pipeline_stage: string | null }> };

      // Fetch module titles
      const moduleIds = (trainingAssignR.data ?? []).map((a) => a.module_id).filter(Boolean);
      const modulesR = moduleIds.length > 0
        ? await supabase.from('campaign_training_modules').select('id, title').in('id', moduleIds)
        : { data: [] as Array<{ id: string; title: string | null }> };

      // Fetch unassigned leads for assign dialog
      const unassignedR = await supabase
        .from('leads')
        .select('id, name, company')
        .in('pipeline_stage', ['active', 'onboarding'])
        .not('id', 'in', clientIds.length > 0 ? `(${clientIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)');

      // Build training rows
      const completionsByModule = new Map(
        (completionsR.data ?? []).map((c) => [c.module_id, c]),
      );
      const signedOffIds = new Set<string>(
        ((signoffsR.data ?? []) as Array<{ completion_id: string }>).map((s) => s.completion_id),
      );
      const moduleTitleMap = new Map(
        (modulesR.data ?? []).map((m) => [m.id, m.title ?? m.id]),
      );

      const training: TrainingRow[] = (trainingAssignR.data ?? []).map((a) => {
        const completion = completionsByModule.get(a.module_id);
        let status: TrainingRow['status'] = 'not_started';
        if (completion) {
          status = signedOffIds.has(completion.id) ? 'completed' : 'pending_signoff';
        }
        return {
          moduleId:    a.module_id,
          moduleTitle: moduleTitleMap.get(a.module_id) ?? 'Unknown module',
          status,
          completionId: completion?.id ?? null,
          campaignId:   completion?.campaign_id ?? null,
          dueDate:      a.due_date,
        };
      });

      // Build client rows — dedupe by client_id since a client can have
      // multiple assignment rows (e.g. re-assignment history) for the same agent
      const leadMap = new Map((leadsR.data ?? []).map((l) => [l.id, l]));
      const clientsById = new Map(
        (assignmentsR.data ?? []).map((a) => [a.client_id, {
          clientId:      a.client_id,
          isPrimary:     a.is_primary ?? false,
          name:          leadMap.get(a.client_id)?.name ?? null,
          company:       leadMap.get(a.client_id)?.company ?? null,
          pipelineStage: leadMap.get(a.client_id)?.pipeline_stage ?? null,
        }]),
      );
      const clients = Array.from(clientsById.values());

      return {
        fullName:         profileR.data?.full_name ?? null,
        phone:            profileR.data?.phone ?? null,
        role:             roleR.data?.role ?? null,
        onboardingStatus: onboardingR.data?.status ?? null,
        activeShift:      activeShiftR.data ?? null,
        clients,
        training,
        recentShifts:     recentShiftsR.data ?? [],
        performance:      performanceR.data ?? null,
        unassignedLeads:  (unassignedR.data ?? []) as Array<{ id: string; name: string | null; company: string | null }>,
      };
    },
  });

  // ── Sign-off mutation ──────────────────────────────────────────────────────

  const signOff = useMutation({
    mutationFn: async ({ completionId, moduleId, campaignId }: { completionId: string; moduleId: string; campaignId: string | null }) => {
      const { error } = await (supabase as any)
        .from('campaign_training_signoffs')
        .insert({
          completion_id:  completionId,
          module_id:      moduleId,
          campaign_id:    campaignId,
          agent_id:       userId,
          signed_off_by:  user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-agent-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-agents-full'] });
      toast.success('Training signed off');
    },
    onError: () => toast.error('Failed to sign off'),
  });

  // ── Assign client mutation ─────────────────────────────────────────────────

  const assignClient = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('client_agent_assignments')
        .insert({ client_id: clientId, agent_id: userId!, assigned_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-agent-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-agents-full'] });
      setAssignOpen(false);
      setSelectedLead('');
      toast.success('Client assigned');
    },
    onError: () => toast.error('Failed to assign client'),
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!userId) return null;

  const d = data;

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6 max-w-4xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border border-border px-6 py-5">
          <Link
            to="/staff/supervisor/agents"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Team
          </Link>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{d?.fullName ?? 'Unknown agent'}</h1>
              {d?.phone && <p className="text-sm text-muted-foreground mt-0.5">{d.phone}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {d?.role && (
                  <Badge variant="secondary" className="capitalize">{d.role}</Badge>
                )}
                {d?.onboardingStatus && (
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full capitalize ${ONBOARDING_STYLES[d.onboardingStatus] ?? 'bg-muted text-muted-foreground'}`}
                  >
                    {d.onboardingStatus.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Section 1 — Current Status ──────────────────────────────────── */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-64" />
            ) : d?.activeShift ? (
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge className="bg-green-500 hover:bg-green-500 text-white">On Shift</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Clocked in</p>
                  <p className="text-sm font-medium">
                    {format(new Date(d.activeShift.clock_in), 'h:mm a')}
                    <span className="text-muted-foreground ml-1">
                      ({formatDistanceToNow(new Date(d.activeShift.clock_in), { addSuffix: false })} ago)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="text-sm font-medium">
                    {shiftDuration(d.activeShift.clock_in, null, d.activeShift.total_break_minutes)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Break time</p>
                  <p className="text-sm font-medium">{d.activeShift.total_break_minutes ?? 0}m</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not currently on shift</p>
            )}
          </CardContent>
        </Card>

        {/* ── Section 2 — Client Assignments ──────────────────────────────── */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Client Assignments
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setAssignOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Assign Client
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : d?.clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clients assigned</p>
            ) : (
              <div className="divide-y">
                {d!.clients.map((c) => (
                  <div key={c.clientId} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{c.name ?? 'Unnamed client'}</p>
                      {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.isPrimary && <Badge variant="outline" className="text-xs">Primary</Badge>}
                      {c.pipelineStage && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {c.pipelineStage.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Section 3 — Training Progress ───────────────────────────────── */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Training Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : d?.training.length === 0 ? (
              <p className="text-sm text-muted-foreground">No training assigned</p>
            ) : (
              <div className="divide-y">
                {d!.training.map((t) => (
                  <div key={t.moduleId} className="flex items-center justify-between py-2.5 gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      {t.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.moduleTitle}</p>
                        {t.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(t.dueDate), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.status === 'not_started' && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Not started</Badge>
                      )}
                      {t.status === 'pending_signoff' && (
                        <>
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                            Pending signoff
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={signOff.isPending}
                            onClick={() =>
                              signOff.mutate({
                                completionId: t.completionId!,
                                moduleId:     t.moduleId,
                                campaignId:   t.campaignId,
                              })
                            }
                          >
                            Sign Off
                          </Button>
                        </>
                      )}
                      {t.status === 'completed' && (
                        <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Section 4 — Recent Shifts ────────────────────────────────────── */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Recent Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : d?.recentShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shifts recorded</p>
            ) : (
              <div className="divide-y">
                {d!.recentShifts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(s.clock_in), 'EEE, MMM d')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.clock_in), 'h:mm a')}
                        {s.clock_out && ` – ${format(new Date(s.clock_out), 'h:mm a')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {shiftDuration(s.clock_in, s.clock_out, s.total_break_minutes)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${s.status === 'active' ? 'border-green-300 text-green-700' : s.status === 'void' ? 'border-red-300 text-red-700' : ''}`}
                      >
                        {s.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Section 5 — Performance ─────────────────────────────────────── */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart2 className="h-4 w-4" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !d?.performance ? (
              <p className="text-sm text-muted-foreground">No performance reviews on record</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(d.performance.period_start), 'MMM d')}
                    {' – '}
                    {format(new Date(d.performance.period_end), 'MMM d, yyyy')}
                  </p>
                  {d.performance.status && (
                    <Badge variant="secondary" className="capitalize text-xs">
                      {d.performance.status}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Overall',       score: d.performance.overall_score },
                    { label: 'Quality',       score: d.performance.quality_score },
                    { label: 'Attendance',    score: d.performance.attendance_score },
                    { label: 'Communication', score: d.performance.communication_score },
                  ].map(({ label, score }) => (
                    <div key={label} className="text-center">
                      <p className={`text-2xl font-bold ${scoreColor(score)}`}>
                        {score !== null && score !== undefined ? score : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                {d.performance.strengths && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Strengths</p>
                    <p className="text-sm">{d.performance.strengths}</p>
                  </div>
                )}
                {d.performance.areas_for_improvement && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Areas for improvement</p>
                    <p className="text-sm">{d.performance.areas_for_improvement}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Assign Client Dialog ─────────────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={(o) => { setAssignOpen(o); if (!o) setSelectedLead(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={selectedLead} onValueChange={setSelectedLead}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client…" />
              </SelectTrigger>
              <SelectContent>
                {(data?.unassignedLeads ?? []).length === 0 ? (
                  <SelectItem value="none" disabled>No unassigned clients</SelectItem>
                ) : (
                  data!.unassignedLeads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name ?? 'Unnamed'}{l.company ? ` — ${l.company}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button
                disabled={!selectedLead || selectedLead === 'none' || assignClient.isPending}
                onClick={() => assignClient.mutate(selectedLead)}
              >
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </StaffLayout>
  );
}
