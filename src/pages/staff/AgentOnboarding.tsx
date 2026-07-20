import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap, BookOpen, CheckCircle, Check, ClipboardCheck,
  Calendar, User, Mail, Phone, Building, ChevronDown, ChevronUp,
  AlertCircle, FileCheck, Banknote, Settings, MonitorCheck, Users, Award,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { MeetingsCalendarView, type CalendarMeeting } from '@/components/staff/MeetingsCalendarView';
import { OnboardingChecklist } from '@/components/admin/OnboardingChecklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─── Client onboarding checklist keys (for leads) ─────────────────────────────
const CHECKLIST_KEYS = [
  'consultation_completed',
  'call_flows_created',
  'scripts_written',
  'dispositions_configured',
  'post_call_flow_setup',
  'forwarding_number_assigned',
  'test_call_completed',
];

// ─── Agent onboarding journey stages ──────────────────────────────────────────
type OnboardingStatus =
  | 'offer_pending' | 'offer_accepted' | 'contract_signed'
  | 'banking_pending' | 'provisioning' | 'training'
  | 'live_training' | 'completed';

const JOURNEY_STAGES: {
  key: OnboardingStatus;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'offer_pending',   label: 'Offer Sent',       shortLabel: 'Offer',      description: 'Your offer package has been sent', icon: FileCheck },
  { key: 'offer_accepted',  label: 'Offer Accepted',   shortLabel: 'Accepted',   description: 'You accepted the offer',            icon: CheckCircle },
  { key: 'contract_signed', label: 'Contract Signed',  shortLabel: 'Contract',   description: 'Employment contract signed',        icon: FileCheck },
  { key: 'banking_pending', label: 'Banking Details',  shortLabel: 'Banking',    description: 'Banking information submitted',     icon: Banknote },
  { key: 'provisioning',   label: 'Account Setup',    shortLabel: 'Setup',      description: 'Google & Five9 accounts created',  icon: Settings },
  { key: 'training',       label: 'Self-Training',    shortLabel: 'Training',   description: 'Complete your training checklist', icon: BookOpen },
  { key: 'live_training',  label: 'Live Training',    shortLabel: 'Live',       description: 'Hands-on training with supervisor', icon: MonitorCheck },
  { key: 'completed',      label: 'Complete!',        shortLabel: 'Done',       description: 'Welcome to the team!',             icon: Award },
];

const STATUS_INDEX: Record<string, number> = {
  offer_pending: 0, offer_accepted: 1, contract_signed: 2, banking_pending: 3,
  provisioning: 4, training: 5, live_training: 6, completed: 7,
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  offer_pending:   { label: 'Offer Pending',   className: 'bg-amber-100 text-amber-800 border-amber-200' },
  offer_accepted:  { label: 'Offer Accepted',  className: 'bg-blue-100 text-blue-800 border-blue-200' },
  contract_signed: { label: 'Contract Signed', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  banking_pending: { label: 'Banking Pending', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  provisioning:    { label: 'Provisioning',    className: 'bg-purple-100 text-purple-800 border-purple-200' },
  training:        { label: 'In Training',     className: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  live_training:   { label: 'Live Training',   className: 'bg-teal-100 text-teal-800 border-teal-200' },
  completed:       { label: 'Completed',       className: 'bg-green-100 text-green-800 border-green-200' },
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AgentOnboardingRow {
  id: string;
  status: string;
  training_checklist: unknown;
  training_completed_at: string | null;
  supervisor_id: string | null;
  contract_signed_at: string | null;
  banking_submitted: boolean;
  google_email: string | null;
  five9_username: string | null;
  live_training_scheduled_at: string | null;
  live_training_completed_at: string | null;
  completed_at: string | null;
}

type ChecklistItem = { label: string; completed: boolean; key?: string; who?: string };

interface OnboardingLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  onboarding_checklist: Record<string, boolean> | null;
  pipeline_stage: string | null;
  meetings: CalendarMeeting[];
}

// ─── Journey timeline ──────────────────────────────────────────────────────────
function JourneyTimeline({ status }: { status: string }) {
  const currentIdx = STATUS_INDEX[status] ?? 0;

  return (
    <div className="space-y-1">
      {/* Desktop: horizontal row */}
      <div className="hidden sm:block relative py-2">
        {/* Background track */}
        <div className="absolute top-[19px] left-4 right-4 h-0.5 bg-slate-100" />
        {/* Progress fill */}
        <div
          className="absolute top-[19px] left-4 h-0.5 bg-blue-500 transition-all duration-500"
          style={{ right: `calc(100% - ${4 + ((currentIdx) / 7) * 92}%)` }}
        />
        <div className="relative grid grid-cols-8 gap-0">
          {JOURNEY_STAGES.map((stage, i) => {
            const done    = i < currentIdx || (i === currentIdx && status === 'completed');
            const current = i === currentIdx && status !== 'completed';
            const Icon    = stage.icon;
            return (
              <div key={stage.key} className="flex flex-col items-center gap-1.5 px-1">
                <div className={cn(
                  'relative z-10 h-9 w-9 rounded-full border-2 flex items-center justify-center transition-colors',
                  done    ? 'bg-green-500 border-green-500 text-white' :
                  current ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100' :
                            'bg-white border-slate-200 text-slate-300',
                )}>
                  {done
                    ? <Check className="h-4 w-4" />
                    : <Icon className="h-4 w-4" />
                  }
                </div>
                <span className={cn(
                  'text-center text-[10px] leading-tight font-medium',
                  done    ? 'text-green-700' :
                  current ? 'text-blue-700' :
                            'text-slate-400',
                )}>
                  {stage.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical list (show only current + adjacent) */}
      <div className="sm:hidden space-y-2">
        {JOURNEY_STAGES.map((stage, i) => {
          const done    = i < currentIdx || (i === currentIdx && status === 'completed');
          const current = i === currentIdx && status !== 'completed';
          const Icon    = stage.icon;
          return (
            <div key={stage.key} className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl',
              current ? 'bg-blue-50 border border-blue-200' :
              done    ? 'opacity-60' : 'opacity-30',
            )}>
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center shrink-0',
                done    ? 'bg-green-500 text-white' :
                current ? 'bg-blue-600 text-white' :
                          'bg-slate-100 text-slate-400',
              )}>
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', current ? 'text-blue-800' : done ? 'text-slate-600' : 'text-slate-400')}>
                  {stage.label}
                </p>
                {current && <p className="text-xs text-blue-600">{stage.description}</p>}
              </div>
              {current && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">Current</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Milestone row ─────────────────────────────────────────────────────────────
function Milestone({ label, value, done }: { label: string; value: string | null; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn('h-5 w-5 rounded-full flex items-center justify-center shrink-0', done ? 'bg-green-500' : 'bg-slate-100')}>
        {done ? <Check className="h-3 w-3 text-white" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
      </div>
      <div className="flex-1 flex items-center justify-between gap-2">
        <span className={cn('text-xs', done ? 'text-slate-700 font-medium' : 'text-slate-400')}>{label}</span>
        {value && <span className="text-[11px] text-slate-500">{value}</span>}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AgentOnboarding() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  // ── Client leads assigned to this agent for onboarding ────────────────────
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['agent-onboarding-leads', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, company, onboarding_checklist, pipeline_stage')
        .eq('pipeline_stage', 'onboarding')
        .eq('assigned_onboarding_rep', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const leadIds = useMemo(() => leads.map(l => l.id), [leads]);

  const { data: meetings = [] } = useQuery({
    queryKey: ['agent-onboarding-meetings', leadIds],
    queryFn: async () => {
      if (leadIds.length === 0) return [];
      const { data, error } = await supabase
        .from('meetings')
        .select('*, lead:leads(name, company)')
        .in('lead_id', leadIds)
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return (data || []) as CalendarMeeting[];
    },
    enabled: leadIds.length > 0,
    staleTime: 30_000,
  });

  const updateChecklist = useMutation({
    mutationFn: async ({ leadId, checklist }: { leadId: string; checklist: Record<string, boolean> }) => {
      const { error } = await supabase.from('leads').update({ onboarding_checklist: checklist }).eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-onboarding-leads'] });
      toast({ title: 'Checklist updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update checklist.', variant: 'destructive' }),
  });

  const updateMeetingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('meetings').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-onboarding-meetings'] });
      toast({ title: 'Meeting updated' });
    },
  });

  // ── Agent's own onboarding record ─────────────────────────────────────────
  const { data: myOnboarding, isLoading: onboardingLoading, refetch: refetchMyOnboarding } = useQuery({
    queryKey: ['my-agent-onboarding', user?.id],
    queryFn: async (): Promise<AgentOnboardingRow | null> => {
      if (!user?.id) return null;
      // Order by created_at DESC so if duplicate rows exist the newest wins.
      // Use limit(1) + data[0] instead of maybeSingle() — maybeSingle() returns
      // null when multiple rows match (PostgREST 406), hiding valid records.
      const { data } = await supabase
        .from('agent_onboarding')
        .select('id, status, training_checklist, training_completed_at, supervisor_id, contract_signed_at, banking_submitted, google_email, five9_username, live_training_scheduled_at, live_training_completed_at, completed_at')
        .eq('applicant_user_id', user.id)
        .neq('status', 'offer_pending')
        .order('created_at', { ascending: false })
        .limit(1);
      return (data && data.length > 0 ? data[0] : null) as AgentOnboardingRow | null;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const myTrainingChecklist: ChecklistItem[] = Array.isArray(myOnboarding?.training_checklist)
    ? (myOnboarding!.training_checklist as ChecklistItem[])
    : [];

  const myTrainingCompletedCount = myTrainingChecklist.filter(i => i.completed).length;
  const myTrainingProgress = myTrainingChecklist.length > 0
    ? Math.round((myTrainingCompletedCount / myTrainingChecklist.length) * 100)
    : 0;

  const updateMyTrainingChecklist = useMutation({
    mutationFn: async (newChecklist: ChecklistItem[]) => {
      if (!myOnboarding) return;
      const allComplete = newChecklist.length > 0 && newChecklist.every(i => i.completed);
      const updates: Record<string, unknown> = { training_checklist: newChecklist };
      if (allComplete && !myOnboarding.training_completed_at) {
        updates.training_completed_at = new Date().toISOString();
        updates.status = 'live_training';
      }
      const { error } = await supabase.from('agent_onboarding').update(updates).eq('id', myOnboarding.id);
      if (error) throw error;
      if (allComplete && !myOnboarding.training_completed_at && myOnboarding.supervisor_id) {
        await supabase.from('notifications').insert({
          user_id: myOnboarding.supervisor_id,
          title: 'Agent Training Complete',
          message: 'An agent has completed all self-training items. Schedule live training.',
          category: 'onboarding',
          action_url: '/staff/supervisor/agent-onboarding',
        });
      }
    },
    onSuccess: () => refetchMyOnboarding(),
    onError: () => toast({ title: 'Error', description: 'Failed to update training item.', variant: 'destructive' }),
  });

  // ── Lead helpers ──────────────────────────────────────────────────────────
  const leadsWithMeetings: OnboardingLead[] = useMemo(() => leads.map(lead => ({
    ...lead,
    onboarding_checklist: (lead.onboarding_checklist || {}) as Record<string, boolean>,
    meetings: meetings.filter(m => m.lead_id === lead.id),
  })), [leads, meetings]);

  const getProgress = (checklist: Record<string, boolean> | null) => {
    if (!checklist) return 0;
    const done = CHECKLIST_KEYS.filter(k => checklist[k]).length;
    return Math.round((done / CHECKLIST_KEYS.length) * 100);
  };

  const totalLeads = leads.length;
  const fullyOnboarded = leads.filter(l => getProgress(l.onboarding_checklist as Record<string, boolean> | null) === 100).length;

  const statusBadge = myOnboarding ? (STATUS_BADGE[myOnboarding.status] ?? { label: myOnboarding.status, className: 'bg-slate-100 text-slate-700' }) : null;

  return (
    <StaffLayout role="agent">
      <div className="-m-6 lg:-m-8 min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="px-6 py-6 lg:px-8 lg:py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Onboarding</h1>
              <p className="text-sm text-slate-500 mt-1">Your onboarding journey and client progress</p>
            </div>
            {(profile as any)?.is_ready_for_live_calls && (
              <Badge className="bg-green-600 hover:bg-green-600 text-white">
                ✅ Ready for Live Calls
              </Badge>
            )}
          </div>

          {/* ── My Onboarding Journey ─────────────────────────────────────── */}
          {onboardingLoading ? (
            <div className="h-48 bg-white rounded-2xl animate-pulse border" />
          ) : myOnboarding === null ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No onboarding record found.</p>
              <p className="text-sm mt-1">Contact your supervisor if you believe this is an error.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900 text-sm">Your Onboarding Journey</h2>
                    <p className="text-xs text-slate-400 mt-0.5">8-step process from offer to active agent</p>
                  </div>
                </div>
                {statusBadge && (
                  <span className={cn('text-xs font-semibold px-3 py-1 rounded-full border', statusBadge.className)}>
                    {statusBadge.label}
                  </span>
                )}
              </div>

              {/* Timeline */}
              <div className="px-5 py-5">
                <JourneyTimeline status={myOnboarding.status} />
              </div>

              {/* Key milestones */}
              <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-50 pt-4">
                <Milestone
                  label="Contract signed"
                  done={!!myOnboarding.contract_signed_at}
                  value={myOnboarding.contract_signed_at
                    ? new Date(myOnboarding.contract_signed_at).toLocaleDateString()
                    : null}
                />
                <Milestone
                  label="Banking details submitted"
                  done={myOnboarding.banking_submitted}
                  value={null}
                />
                <Milestone
                  label="Google account assigned"
                  done={!!myOnboarding.google_email}
                  value={myOnboarding.google_email}
                />
                <Milestone
                  label="Five9 account assigned"
                  done={!!myOnboarding.five9_username}
                  value={myOnboarding.five9_username}
                />
                <Milestone
                  label="Self-training completed"
                  done={!!myOnboarding.training_completed_at}
                  value={myOnboarding.training_completed_at
                    ? new Date(myOnboarding.training_completed_at).toLocaleDateString()
                    : null}
                />
                <Milestone
                  label="Live training completed"
                  done={!!myOnboarding.live_training_completed_at}
                  value={myOnboarding.live_training_completed_at
                    ? new Date(myOnboarding.live_training_completed_at).toLocaleDateString()
                    : myOnboarding.live_training_scheduled_at
                    ? `Scheduled ${new Date(myOnboarding.live_training_scheduled_at).toLocaleDateString()}`
                    : null}
                />
              </div>
            </div>
          )}

          {/* ── My Self-Training Checklist ────────────────────────────────── */}
          {myOnboarding && myTrainingChecklist.length > 0 && (
            <div className="bg-white rounded-2xl border border-blue-100 border-l-4 border-l-blue-400 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="font-semibold text-slate-900 text-sm">My Self-Training</h2>
                </div>
                <span className={cn(
                  'text-xs font-semibold px-3 py-1 rounded-full border',
                  myTrainingProgress === 100
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200',
                )}>
                  {myTrainingCompletedCount}/{myTrainingChecklist.length} done
                </span>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Progress bar */}
                {myTrainingProgress === 100 ? (
                  <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-green-800">
                    <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                    <span className="text-sm font-medium">All training items complete! Your supervisor has been notified.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Progress</span>
                      <span className="font-medium">{myTrainingProgress}%</span>
                    </div>
                    <Progress value={myTrainingProgress} className="h-2" />
                  </div>
                )}

                {/* Checklist items */}
                <div className="space-y-2">
                  {myTrainingChecklist.map((item, idx) => (
                    <div key={item.key ?? idx} className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                      item.completed ? 'bg-green-50' : 'bg-slate-50 hover:bg-slate-100',
                    )}>
                      <Checkbox
                        id={`training-item-${idx}`}
                        checked={item.completed}
                        disabled={updateMyTrainingChecklist.isPending}
                        onCheckedChange={(checked) => {
                          // Use index-based matching to support items without a key property
                          const updated = myTrainingChecklist.map((i, j) =>
                            j === idx ? { ...i, completed: !!checked } : i
                          );
                          updateMyTrainingChecklist.mutate(updated);
                        }}
                      />
                      <label
                        htmlFor={`training-item-${idx}`}
                        className={cn(
                          'flex-1 text-sm cursor-pointer select-none',
                          item.completed ? 'line-through text-slate-400' : 'text-slate-700',
                        )}
                      >
                        {item.label}
                      </label>
                      {item.completed && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                    </div>
                  ))}
                </div>

                {!myOnboarding.banking_submitted && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">Banking details not yet submitted. Contact your supervisor to provide your payment information.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Client Stats ──────────────────────────────────────────────── */}
          {(leads.length > 0 || leadsLoading) && (
            <>
              <div className="pt-2">
                <h2 className="text-base font-semibold text-slate-800">Client Onboarding</h2>
                <p className="text-xs text-slate-400 mt-0.5">Clients you are onboarding</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: ClipboardCheck, value: totalLeads,      label: 'Assigned Clients' },
                  { icon: Calendar,       value: meetings.length,  label: 'Onboarding Meetings' },
                  { icon: Users,          value: fullyOnboarded,   label: 'Fully Onboarded' },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{value}</p>
                      <p className="text-xs text-slate-400">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Calendar */}
          {meetings.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 text-sm">Onboarding Meetings Calendar</h2>
              </div>
              <div className="p-5">
                <MeetingsCalendarView
                  meetings={meetings}
                  onMarkCompleted={(id) => updateMeetingStatus.mutate({ id, status: 'completed' })}
                  onMarkNoShow={(id) => updateMeetingStatus.mutate({ id, status: 'no_show' })}
                />
              </div>
            </div>
          )}

          {/* Lead cards */}
          {leadsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border" />)}
            </div>
          ) : leadsWithMeetings.length === 0 && !onboardingLoading && myOnboarding !== null ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-600">No onboarding clients assigned yet.</p>
              <p className="text-sm mt-1">When a lead moves to onboarding and is assigned to you, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leadsWithMeetings.map((lead) => {
                const progress   = getProgress(lead.onboarding_checklist);
                const isExpanded = expandedLead === lead.id;

                return (
                  <div
                    key={lead.id}
                    className={cn(
                      'bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md',
                      progress === 100 ? 'border-l-4 border-green-300' : 'border-l-4 border-blue-200',
                    )}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900">{lead.name}</h3>
                            {progress === 100 && (
                              <span className="text-[10px] font-bold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                                Complete
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                            {lead.company && <span className="flex items-center gap-1"><Building className="h-3 w-3" />{lead.company}</span>}
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                            {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedLead(isExpanded ? null : lead.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>

                      {/* Progress */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Onboarding Progress</span>
                          <span className={cn('font-semibold', progress === 100 ? 'text-green-600' : 'text-slate-600')}>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>

                      {lead.meetings.length > 0 && (
                        <p className="text-xs text-slate-400 mt-2">
                          {lead.meetings.filter(m => m.status === 'scheduled').length} upcoming meeting(s)
                        </p>
                      )}

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <OnboardingChecklist
                            checklist={lead.onboarding_checklist || {}}
                            onChange={(key, value) => {
                              const updated = { ...(lead.onboarding_checklist || {}), [key]: value };
                              updateChecklist.mutate({ leadId: lead.id, checklist: updated });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}
