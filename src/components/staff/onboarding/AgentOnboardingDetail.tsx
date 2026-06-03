import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle, Circle, Send, FileSignature, Landmark,
  Mail, Phone, MessageSquare, BookOpen, Video, Hash, Loader2, UserCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ProvisioningForm } from './ProvisioningForm';
import { TrainingAssignment } from './TrainingAssignment';

const steps = [
  { key: 'offer_pending', label: 'Offer Sent', icon: Send, who: 'Agent' },
  { key: 'offer_accepted', label: 'Offer Accepted', icon: CheckCircle, who: 'Agent' },
  { key: 'contract_signed', label: 'Contract Signed', icon: FileSignature, who: 'Agent' },
  { key: 'banking_pending', label: 'Banking Info', icon: Landmark, who: 'Agent' },
  { key: 'provisioning', label: 'Provisioning', icon: Mail, who: 'Supervisor' },
  { key: 'training', label: 'Self Training', icon: BookOpen, who: 'Agent' },
  { key: 'live_training', label: 'Live Training', icon: Video, who: 'Supervisor' },
  { key: 'activation_in_progress', label: 'HR Sign-off', icon: UserCheck, who: 'HR' },
  { key: 'completed', label: 'Channels & Done', icon: Hash, who: 'Supervisor' },
];

const statusIndex = (status: string) => steps.findIndex(s => s.key === status);

interface AgentOnboardingDetailProps {
  onboarding: any;
  onBack: () => void;
  onRefresh: () => void;
}

export function AgentOnboardingDetail({ onboarding, onBack, onRefresh }: AgentOnboardingDetailProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentIdx = statusIndex(onboarding.status);
  const [scheduledAt, setScheduledAt] = useState('');
  const [editingSchedule, setEditingSchedule] = useState(false);

  const { data: logs } = useQuery({
    queryKey: ['onboarding-logs', onboarding.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_onboarding_log')
        .select('*')
        .eq('onboarding_id', onboarding.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ newStatus, updates = {}, logAction, logDetails = {} }: {
      newStatus: string;
      updates?: Record<string, any>;
      logAction: string;
      logDetails?: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from('agent_onboarding')
        .update({ status: newStatus, ...updates })
        .eq('id', onboarding.id);
      if (error) throw error;

      await supabase.from('agent_onboarding_log').insert({
        onboarding_id: onboarding.id,
        action: logAction,
        performed_by: user!.id,
        details: logDetails,
      });
    },
    onSuccess: () => {
      toast.success('Onboarding updated');
      onRefresh();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleMarkLiveTrainingComplete = () => {
    updateStatusMutation.mutate({
      newStatus: 'activation_in_progress',
      updates: { live_training_completed_at: new Date().toISOString() },
      logAction: 'live_training_completed',
    });
  };

  const handleMarkSlackChannelsDone = () => {
    updateStatusMutation.mutate({
      newStatus: 'completed',
      updates: { slack_channels_assigned: true, completed_at: new Date().toISOString() },
      logAction: 'onboarding_completed',
    });
  };

  const scheduleMutation = useMutation({
    mutationFn: async (newDateTime: string) => {
      const { error } = await supabase
        .from('agent_onboarding')
        .update({ live_training_scheduled_at: newDateTime })
        .eq('id', onboarding.id);
      if (error) throw error;
      await supabase.from('agent_onboarding_log').insert({
        onboarding_id: onboarding.id,
        action: 'live_training_scheduled',
        performed_by: user!.id,
        details: { scheduled_at: newDateTime },
      });
    },
    onSuccess: () => {
      toast.success('Live training scheduled');
      setScheduledAt('');
      setEditingSchedule(false);
      onRefresh();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-bold">
            {onboarding.profiles?.full_name || 'Agent'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Started {format(new Date(onboarding.created_at), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Progress stepper */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {steps.map((step, idx) => {
              const isComplete = idx < currentIdx || (idx === currentIdx && onboarding.status === 'completed');
              const isCurrent = idx === currentIdx && onboarding.status !== 'completed';
              const StepIcon = step.icon;
              return (
                <div key={step.key} className="flex flex-col items-center min-w-[80px]">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center mb-1',
                      isComplete ? 'bg-primary text-primary-foreground' :
                        isCurrent ? 'bg-primary/20 text-primary ring-2 ring-primary' :
                          'bg-muted text-muted-foreground'
                    )}
                  >
                    {isComplete ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-center font-medium">{step.label}</span>
                  <span className="text-[10px] text-muted-foreground">{step.who}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Offer details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Offer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Pay Rate</p>
              <p className="font-medium">${onboarding.pay_rate}/{onboarding.pay_type === 'hourly' ? 'hr' : 'min'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Schedule</p>
              <p className="font-medium capitalize">{onboarding.schedule_type?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contract Signed</p>
              <p className="font-medium">
                {onboarding.contract_signed_at
                  ? format(new Date(onboarding.contract_signed_at), 'MMM d, yyyy')
                  : 'Pending'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Banking</p>
              <Badge variant={onboarding.banking_submitted ? 'default' : 'secondary'}>
                {onboarding.banking_submitted ? 'Submitted' : 'Pending'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provisioning section - active when status is provisioning */}
      {(onboarding.status === 'provisioning' || onboarding.google_email) && (
        <ProvisioningForm onboarding={onboarding} onRefresh={onRefresh} />
      )}

      {/* Training section */}
      {(currentIdx >= 5 || onboarding.training_checklist?.length > 0) && (
        <TrainingAssignment onboarding={onboarding} onRefresh={onRefresh} />
      )}

      {/* Live training + channels */}
      {onboarding.status === 'live_training' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Live Training</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {onboarding.live_training_scheduled_at && !editingSchedule ? (
              <div className="flex items-center gap-3">
                <p className="text-sm">
                  Scheduled: {format(new Date(onboarding.live_training_scheduled_at), 'MMMM d, yyyy h:mm a')}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const iso = onboarding.live_training_scheduled_at.slice(0, 16);
                    setScheduledAt(iso);
                    setEditingSchedule(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="live-training-dt">
                  {onboarding.live_training_scheduled_at ? 'Reschedule' : 'Schedule live training session'}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="live-training-dt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-auto"
                  />
                  <Button
                    size="sm"
                    onClick={() => scheduleMutation.mutate(new Date(scheduledAt).toISOString())}
                    disabled={!scheduledAt || scheduleMutation.isPending}
                  >
                    {scheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule'}
                  </Button>
                  {editingSchedule && (
                    <Button size="sm" variant="ghost" onClick={() => setEditingSchedule(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
            <Button onClick={handleMarkLiveTrainingComplete} disabled={updateStatusMutation.isPending}>
              Mark Live Training Complete
            </Button>
          </CardContent>
        </Card>
      )}

      {(onboarding.status === 'activation_in_progress' || onboarding.status === 'live_training') && !onboarding.slack_channels_assigned && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assign Slack Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Connect the agent to the required Slack channels to complete onboarding.
            </p>
            <Button onClick={handleMarkSlackChannelsDone} disabled={updateStatusMutation.isPending}>
              <Hash className="w-4 h-4 mr-2" />
              Mark Channels Assigned & Complete
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Audit log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {(logs || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {(logs || []).map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
