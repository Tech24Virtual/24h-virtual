import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Calendar, User, Mail, Phone, Building, ChevronDown, ChevronUp, BookOpen, CheckCircle } from 'lucide-react';
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

const CHECKLIST_KEYS = [
  'consultation_completed',
  'call_flows_created',
  'scripts_written',
  'dispositions_configured',
  'post_call_flow_setup',
  'forwarding_number_assigned',
  'test_call_completed',
];

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

export default function AgentOnboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery({
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
  });

  const updateChecklist = useMutation({
    mutationFn: async ({ leadId, checklist }: { leadId: string; checklist: Record<string, boolean> }) => {
      const { error } = await supabase
        .from('leads')
        .update({ onboarding_checklist: checklist })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-onboarding-leads'] });
      toast({ title: 'Checklist updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update checklist.', variant: 'destructive' });
    },
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

  // Agent's own HR onboarding training checklist
  const { data: myOnboarding, refetch: refetchMyOnboarding } = useQuery({
    queryKey: ['my-agent-onboarding', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('agent_onboarding')
        .select('id, status, training_checklist, training_completed_at, supervisor_id')
        .eq('applicant_user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const myTrainingChecklist: Array<{ key: string; label: string; completed: boolean }> =
    (myOnboarding?.training_checklist as any[]) || [];

  const myTrainingCompletedCount = myTrainingChecklist.filter(i => i.completed).length;
  const myTrainingProgress = myTrainingChecklist.length > 0
    ? Math.round((myTrainingCompletedCount / myTrainingChecklist.length) * 100)
    : 0;

  const updateMyTrainingChecklist = useMutation({
    mutationFn: async (newChecklist: Array<{ key: string; label: string; completed: boolean }>) => {
      if (!myOnboarding) return;
      const allComplete = newChecklist.length > 0 && newChecklist.every(i => i.completed);
      const updates: Record<string, any> = { training_checklist: newChecklist };
      if (allComplete && !myOnboarding.training_completed_at) {
        updates.training_completed_at = new Date().toISOString();
        updates.status = 'live_training';
      }
      const { error } = await supabase
        .from('agent_onboarding')
        .update(updates)
        .eq('id', myOnboarding.id);
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

  const leadsWithMeetings: OnboardingLead[] = useMemo(() => {
    return leads.map(lead => ({
      ...lead,
      onboarding_checklist: (lead.onboarding_checklist || {}) as Record<string, boolean>,
      meetings: meetings.filter(m => m.lead_id === lead.id),
    }));
  }, [leads, meetings]);

  const getProgress = (checklist: Record<string, boolean> | null) => {
    if (!checklist) return 0;
    const completed = CHECKLIST_KEYS.filter(k => checklist[k]).length;
    return Math.round((completed / CHECKLIST_KEYS.length) * 100);
  };

  const totalLeads = leads.length;
  const fullyOnboarded = leads.filter(l => getProgress(l.onboarding_checklist as Record<string, boolean> | null) === 100).length;

  return (
    <StaffLayout role="agent">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Onboarding</h1>
          <p className="text-muted-foreground">Manage client onboarding progress</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{totalLeads}</p><p className="text-sm text-muted-foreground">Assigned Clients</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{meetings.length}</p><p className="text-sm text-muted-foreground">Onboarding Meetings</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><User className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{fullyOnboarded}</p><p className="text-sm text-muted-foreground">Fully Onboarded</p></div></div></CardContent></Card>
        </div>

        {/* My training checklist */}
        {myOnboarding && myTrainingChecklist.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  My Training Checklist
                </CardTitle>
                <Badge variant={myTrainingProgress === 100 ? 'default' : 'secondary'}>
                  {myTrainingCompletedCount}/{myTrainingChecklist.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {myTrainingProgress === 100 ? (
                <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-4 py-3 text-green-800 dark:text-green-300">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span className="font-medium">Training Complete! Your supervisor has been notified.</span>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{myTrainingProgress}%</span>
                  </div>
                  <Progress value={myTrainingProgress} className="h-2" />
                </div>
              )}
              <div className="space-y-2">
                {myTrainingChecklist.map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <Checkbox
                      id={`training-${item.key}`}
                      checked={item.completed}
                      disabled={updateMyTrainingChecklist.isPending}
                      onCheckedChange={(checked) => {
                        const updated = myTrainingChecklist.map(i =>
                          i.key === item.key ? { ...i, completed: !!checked } : i
                        );
                        updateMyTrainingChecklist.mutate(updated);
                      }}
                    />
                    <label
                      htmlFor={`training-${item.key}`}
                      className={item.completed ? 'line-through text-muted-foreground cursor-pointer' : 'cursor-pointer'}
                    >
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar overview */}
        {meetings.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Onboarding Meetings Calendar</CardTitle></CardHeader>
            <CardContent>
              <MeetingsCalendarView
                meetings={meetings}
                onMarkCompleted={(id) => updateMeetingStatus.mutate({ id, status: 'completed' })}
                onMarkNoShow={(id) => updateMeetingStatus.mutate({ id, status: 'no_show' })}
              />
            </CardContent>
          </Card>
        )}

        {/* Lead cards */}
        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>)}</div>
        ) : leadsWithMeetings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No onboarding clients assigned to you yet.</p>
              <p className="text-sm mt-1">When a lead moves to onboarding and is assigned to you, it will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {leadsWithMeetings.map((lead) => {
              const progress = getProgress(lead.onboarding_checklist);
              const isExpanded = expandedLead === lead.id;

              return (
                <Card key={lead.id}>
                  <CardContent className="p-5">
                    {/* Lead header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{lead.name}</h3>
                          {progress === 100 && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Complete</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {lead.company && <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" />{lead.company}</span>}
                          <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{lead.email}</span>
                          {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{lead.phone}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setExpandedLead(isExpanded ? null : lead.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Onboarding Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Upcoming meetings count */}
                    {lead.meetings.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {lead.meetings.filter(m => m.status === 'scheduled').length} upcoming meeting(s)
                      </p>
                    )}

                    {/* Expanded: checklist */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <OnboardingChecklist
                          checklist={lead.onboarding_checklist || {}}
                          onChange={(key, value) => {
                            const updated = { ...(lead.onboarding_checklist || {}), [key]: value };
                            updateChecklist.mutate({ leadId: lead.id, checklist: updated });
                          }}
                        />

                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
