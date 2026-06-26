import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { CalendarOff, Thermometer, Check, X, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface Props {
  role: 'agent' | 'supervisor';
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  denied: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

// Minimum fraction of an agent's clients that a covering agent must handle
const COVERAGE_THRESHOLD = 0.8;

// Create smart open shifts for eligible agents when a time-off request is approved.
// Eligible = handles >= 80% of the requesting agent's clients.
// Shifts > 4h are split into two blocks (first block fixed at 4h, second takes the rest).
async function createSmartOpenShifts(
  agentId: string,
  schedules: Array<{ id: string; shift_date: string; start_time: string; end_time: string }>,
  postedBy: string
): Promise<void> {
  if (schedules.length === 0) return;

  // Step 1: get the requesting agent's clients
  const { data: agentClients } = await supabase
    .from('client_agent_assignments')
    .select('client_id')
    .eq('agent_id', agentId);

  const clientIds = agentClients?.map(c => c.client_id) ?? [];
  if (clientIds.length === 0) return;

  // Step 2: find other agents who share those clients
  const { data: otherAssignments } = await supabase
    .from('client_agent_assignments')
    .select('agent_id, client_id')
    .in('client_id', clientIds)
    .neq('agent_id', agentId);

  // Count how many of the agent's clients each covering agent handles
  const coverageCount: Record<string, number> = {};
  otherAssignments?.forEach(a => {
    coverageCount[a.agent_id] = (coverageCount[a.agent_id] ?? 0) + 1;
  });

  const eligibleAgents = Object.entries(coverageCount)
    .filter(([, count]) => count / clientIds.length >= COVERAGE_THRESHOLD)
    .map(([id]) => id);

  if (eligibleAgents.length === 0) return;

  // Step 3: build open shift rows (with split logic)
  const rows: Record<string, unknown>[] = [];

  for (const s of schedules) {
    const shiftStart = new Date(`${s.shift_date}T${s.start_time}`);
    const shiftEnd = new Date(`${s.shift_date}T${s.end_time}`);
    const totalHours = (shiftEnd.getTime() - shiftStart.getTime()) / 3600000;

    if (totalHours <= 4) {
      // Single block — no split needed
      rows.push({
        shift_date: s.shift_date,
        start_time: s.start_time,
        end_time: s.end_time,
        status: 'open',
        original_agent_id: agentId,
        original_schedule_id: s.id,
        posted_by: postedBy,
        block_start: shiftStart.toISOString(),
        block_end: shiftEnd.toISOString(),
        total_blocks: 1,
        required_skills: [],
      });
    } else {
      // Split into 2×4h blocks
      const midPoint = new Date(shiftStart.getTime() + 4 * 3600 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const midTimeStr = `${pad(midPoint.getHours())}:${pad(midPoint.getMinutes())}:00`;
      const parentId = crypto.randomUUID();

      // Block 1 — acts as the parent; does not have parent_shift_id
      rows.push({
        id: parentId,
        shift_date: s.shift_date,
        start_time: s.start_time,
        end_time: midTimeStr,
        status: 'open',
        original_agent_id: agentId,
        original_schedule_id: s.id,
        posted_by: postedBy,
        block_start: shiftStart.toISOString(),
        block_end: midPoint.toISOString(),
        total_blocks: 2,
        required_skills: [],
      });

      // Block 2 — child; references parentId
      rows.push({
        parent_shift_id: parentId,
        shift_date: s.shift_date,
        start_time: midTimeStr,
        end_time: s.end_time,
        status: 'open',
        original_agent_id: agentId,
        original_schedule_id: s.id,
        posted_by: postedBy,
        block_start: midPoint.toISOString(),
        block_end: shiftEnd.toISOString(),
        total_blocks: 2,
        required_skills: [],
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('open_shifts').insert(rows as any);
    if (error) console.error('Smart open_shifts insert failed:', error);
  }

  // Step 4: notify eligible agents
  const notifications = eligibleAgents.map(agId => ({
    user_id: agId,
    title: 'New Available Shift',
    message: "A shift is available due to a colleague's approved time off. Check Available Shifts.",
    category: 'shift',
    action_url: '/staff/agent/schedule',
  }));
  const { error: notifError } = await supabase.from('notifications').insert(notifications);
  if (notifError) console.error('Shift notification insert failed:', notifError);
}

export function TimeOffRequestsList({ role }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [postCoverage, setPostCoverage] = useState<Record<string, boolean>>({});
  const [confirmApprove, setConfirmApprove] = useState<{
    id: string; agentId: string; startDate: string; endDate: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['time-off-requests', role, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase.from('time_off_requests').select('*').order('created_at', { ascending: false });
      if (role === 'agent') q = q.eq('agent_id', user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-map'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data || [];
    },
    enabled: role === 'supervisor',
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id, status, agentId, startDate, endDate,
    }: { id: string; status: 'approved' | 'denied'; agentId: string; startDate: string; endDate: string }) => {
      const { error } = await supabase.from('time_off_requests').update({
        status,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;

      if (status === 'approved') {
        // Fetch and cancel the agent's scheduled shifts in the approved date range
        const { data: schedules } = await supabase
          .from('agent_schedules')
          .select('id, shift_date, start_time, end_time')
          .eq('agent_id', agentId)
          .eq('status', 'scheduled')
          .gte('shift_date', startDate)
          .lte('shift_date', endDate);

        if (schedules?.length) {
          await supabase
            .from('agent_schedules')
            .update({ status: 'cancelled' })
            .eq('agent_id', agentId)
            .eq('status', 'scheduled')
            .gte('shift_date', startDate)
            .lte('shift_date', endDate);

          if (postCoverage[id]) {
            // Smart open shifts: only notify agents who cover 80%+ of the same clients
            await createSmartOpenShifts(agentId, schedules, user!.id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['agent-schedules'] });
      toast({ title: 'Request updated' });
    },
    onError: (error: Error) => {
      console.error('Time-off review mutation error:', error);
      toast({ title: 'Error', description: 'Failed to update request.', variant: 'destructive' });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
      toast({ title: 'Request reset to pending' });
    },
    onError: (error: Error) => {
      console.error('Reset mutation error:', error);
      toast({ title: 'Error', description: 'Failed to reset request.', variant: 'destructive' });
    },
  });

  const getName = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Agent';

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading...</p>;

  const pending = requests.filter(r => r.status === 'pending');
  const past = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-4">
      {role === 'supervisor' && pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pending Requests</h3>
          {pending.map(req => (
            <Card key={req.id} className={req.request_type === 'sick' ? 'border-destructive/50 bg-destructive/5' : ''}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {req.request_type === 'sick'
                        ? <Thermometer className="h-4 w-4 text-destructive" />
                        : <CalendarOff className="h-4 w-4" />}
                      <h3 className="font-semibold">{getName(req.agent_id)}</h3>
                      <Badge className={req.request_type === 'sick' ? 'bg-destructive text-destructive-foreground' : ''}>
                        {req.request_type === 'sick' ? '🔴 Sick' : 'Day Off'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(req.start_date), 'MMM d')}
                      {req.start_date !== req.end_date && ` – ${format(new Date(req.end_date), 'MMM d')}`}
                    </p>
                    {req.reason && <p className="text-sm">{req.reason}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`coverage-${req.id}`}
                        checked={postCoverage[req.id] || false}
                        onCheckedChange={(c) => setPostCoverage(prev => ({ ...prev, [req.id]: !!c }))}
                      />
                      <Label htmlFor={`coverage-${req.id}`} className="text-xs">Post for coverage</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setConfirmApprove({
                          id: req.id,
                          agentId: req.agent_id,
                          startDate: req.start_date,
                          endDate: req.end_date,
                        })}
                        disabled={reviewMutation.isPending}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reviewMutation.mutate({
                          id: req.id,
                          status: 'denied',
                          agentId: req.agent_id,
                          startDate: req.start_date,
                          endDate: req.end_date,
                        })}
                        disabled={reviewMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Deny
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(role === 'agent' ? requests : past).length > 0 && (
        <div className="space-y-3">
          {role === 'supervisor' && (
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">History</h3>
          )}
          {(role === 'agent' ? requests : past).map(req => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {req.request_type === 'sick'
                        ? <Thermometer className="h-4 w-4 text-destructive" />
                        : <CalendarOff className="h-4 w-4" />}
                      {role === 'supervisor' && <span className="font-medium">{getName(req.agent_id)}</span>}
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(req.start_date), 'MMM d')}
                        {req.start_date !== req.end_date && ` – ${format(new Date(req.end_date), 'MMM d')}`}
                      </span>
                    </div>
                    {req.reason && <p className="text-xs text-muted-foreground">{req.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={statusColors[req.status]}>{req.status}</Badge>
                    {role === 'supervisor' && req.status === 'approved' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setConfirmReset(req.id)}
                        disabled={resetMutation.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">No time off requests</CardContent>
        </Card>
      )}

      <AlertDialog
        open={!!confirmApprove}
        onOpenChange={open => { if (!open) setConfirmApprove(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this time-off request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel all of the agent's scheduled shifts in this date range.
              {postCoverage[confirmApprove?.id ?? ''] &&
                ' Eligible colleagues (covering 80%+ of their clients) will be notified of available shifts.'}
              {' '}This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmApprove) {
                  reviewMutation.mutate({ ...confirmApprove, status: 'approved' });
                  setConfirmApprove(null);
                }
              }}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={!!confirmReset}
        onOpenChange={open => { if (!open) setConfirmReset(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this approval?</AlertDialogTitle>
            <AlertDialogDescription>
              The request will return to pending status and will need to be reviewed again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmReset) {
                  resetMutation.mutate(confirmReset);
                  setConfirmReset(null);
                }
              }}
            >
              Reset to Pending
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
