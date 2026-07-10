import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, User, AlertTriangle, CheckCircle, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  role: 'agent' | 'supervisor';
}

// Extended type — includes columns added in migration 20260626000013
interface OpenShift {
  id: string;
  original_agent_id: string;
  original_schedule_id: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  required_skills: string[];
  notes: string | null;
  status: string;
  claimed_by: string | null;
  claimed_at: string | null;
  posted_by: string;
  created_at: string;
  // Split shift columns
  parent_shift_id: string | null;
  block_start: string | null;
  block_end: string | null;
  total_blocks: number;
  claimed_blocks: number;
  client_coverage_threshold: number;
}

const MAX_DAILY_HOURS = 12;

function shiftMinutes(startTime: string, endTime: string): number {
  const s = new Date(`2000-01-01T${startTime}`);
  const e = new Date(`2000-01-01T${endTime}`);
  return (e.getTime() - s.getTime()) / 60000;
}

function formatHours(startTime: string, endTime: string): string {
  const mins = shiftMinutes(startTime, endTime);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function OpenShiftBoard({ role }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; shiftId: string | null }>({ open: false, shiftId: null });
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['open-shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('open_shifts')
        .select('*')
        .order('shift_date', { ascending: true });
      if (error) throw error;
      return data as unknown as OpenShift[];
    },
  });

  const { data: agentSkills = [] } = useQuery({
    queryKey: ['agent-skills', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_skills')
        .select('skill_name')
        .eq('agent_id', user!.id);
      return (data || []).map(s => s.skill_name);
    },
    enabled: role === 'agent' && !!user?.id,
  });

  // Used for overlap check and 12h daily limit check — refreshed after each claim
  const { data: mySchedules = [] } = useQuery({
    queryKey: ['agent-schedules', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_schedules')
        .select('shift_date, start_time, end_time')
        .eq('agent_id', user!.id)
        .eq('status', 'scheduled');
      return data || [];
    },
    enabled: role === 'agent' && !!user?.id,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-map'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data || [];
    },
  });

  // Agents eligible for direct assignment (supervisor only)
  const { data: agentRoles = [] } = useQuery({
    queryKey: ['agents-for-assignment'],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('user_id').eq('role', 'agent');
      return data ?? [];
    },
    enabled: role === 'supervisor',
  });

  const agents = agentRoles.map(r => ({
    id: r.user_id,
    full_name: profiles.find(p => p.id === r.user_id)?.full_name || 'Unknown agent',
  }));

  // Synchronous eligibility check using cached schedules — avoids async race before insert
  const getClaimError = (shift: OpenShift): string | null => {
    // Overlap: any existing schedule overlaps with this shift's time
    const hasOverlap = mySchedules.some(
      s => s.shift_date === shift.shift_date &&
           s.start_time < shift.end_time &&
           s.end_time > shift.start_time
    );
    if (hasOverlap) return 'You already have a shift scheduled at this time';

    // 12h daily cap: sum existing scheduled minutes for the same day
    const existingMinutes = mySchedules
      .filter(s => s.shift_date === shift.shift_date)
      .reduce((acc, s) => acc + shiftMinutes(s.start_time, s.end_time), 0);

    if (existingMinutes + shiftMinutes(shift.start_time, shift.end_time) > MAX_DAILY_HOURS * 60) {
      return `Claiming this shift would exceed the ${MAX_DAILY_HOURS}-hour daily limit`;
    }

    return null;
  };

  const claimMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) throw new Error('Shift not found');

      // Eligibility checks (synchronous, uses cached data)
      const eligibilityError = getClaimError(shift);
      if (eligibilityError) throw new Error(eligibilityError);

      // Create agent_schedules entry
      const { error: schedError } = await supabase.from('agent_schedules').insert({
        agent_id: user!.id,
        created_by: user!.id,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        notes: 'Coverage for open shift',
      });
      if (schedError) throw schedError;

      // Mark shift as claimed
      const { error } = await supabase
        .from('open_shifts')
        .update({ claimed_by: user!.id, claimed_at: new Date().toISOString(), status: 'claimed' })
        .eq('id', shiftId);
      if (error) throw error;

      // For split shifts: check if all blocks are now claimed → notify original agent
      if ((shift.total_blocks ?? 1) > 1) {
        const rootId = shift.parent_shift_id ?? shift.id;
        const { data: allBlocks } = await supabase
          .from('open_shifts')
          .select('id, status')
          .or(`id.eq.${rootId},parent_shift_id.eq.${rootId}`);

        // Treat the just-claimed block as claimed (DB update may not be visible yet)
        const allClaimed = allBlocks?.every(b => b.id === shiftId || b.status === 'claimed');

        if (allClaimed && shift.original_agent_id) {
          await supabase.from('notifications').insert({
            user_id: shift.original_agent_id,
            title: 'Your Shift Has Been Covered!',
            message: 'All blocks of your shift have been claimed by other agents.',
            category: 'shift',
            action_url: '/staff/agent/schedule',
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['open-shift-count'] });
      queryClient.invalidateQueries({ queryKey: ['agent-schedules'] });
      toast.success('Shift claimed!', { description: 'Added to your schedule.' });
    },
    onError: (error: Error) => {
      toast.error('Cannot claim shift', { description: error.message || 'Failed to claim shift.' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('open_shifts').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['open-shift-count'] });
      toast.success('Shift cancelled');
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ shiftId, agentId }: { shiftId: string; agentId: string }) => {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) throw new Error('Shift not found');

      // 1. Update open_shifts
      const { error: shiftError } = await supabase
        .from('open_shifts')
        .update({ claimed_by: agentId, claimed_at: new Date().toISOString(), status: 'claimed' })
        .eq('id', shiftId);
      if (shiftError) throw shiftError;

      // 2. Insert agent_schedules row for the assigned agent
      const { error: schedError } = await supabase.from('agent_schedules').insert({
        agent_id: agentId,
        created_by: user!.id,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        notes: 'Supervisor-assigned coverage shift',
      });
      if (schedError) throw schedError;

      // 3. Notify the agent
      await supabase.from('notifications').insert({
        user_id: agentId,
        title: 'You have been assigned a shift',
        message: `A supervisor has assigned you a coverage shift on ${shift.shift_date}`,
        category: 'schedule',
        action_url: '/staff/agent/schedule',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['open-shift-count'] });
      queryClient.invalidateQueries({ queryKey: ['agent-schedules'] });
      setAssignDialog({ open: false, shiftId: null });
      setSelectedAgentId('');
      toast.success('Shift assigned successfully');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to assign shift.'),
  });

  const getName = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Unknown';

  const displayed = role === 'agent'
    ? shifts.filter(s =>
        s.status === 'open' &&
        ((s.required_skills ?? []).length === 0 ||
         (s.required_skills ?? []).some((sk: string) => agentSkills.includes(sk)))
      )
    : shifts.filter(s => s.status !== 'cancelled');

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading...</p>;

  return (
    <>
      <div className="space-y-3">
        {displayed.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">No open shifts</CardContent>
          </Card>
        ) : (
          displayed.map(shift => {
            const claimError = role === 'agent' ? getClaimError(shift) : null;
            const isSplitShift = (shift.total_blocks ?? 1) > 1;
            // TODO: Block numbering assumes max 2 blocks. Update if 3+ block splits are needed.
            const blockNumber = isSplitShift ? (shift.parent_shift_id ? 2 : 1) : null;

            return (
              <Card
                key={shift.id}
                className={shift.status === 'claimed' ? 'border-green-200 dark:border-green-800' : ''}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">
                          {format(new Date(shift.shift_date), 'EEE, MMM d')}
                        </h3>
                        <Badge variant={shift.status === 'claimed' ? 'default' : 'secondary'}>
                          {shift.status === 'claimed' ? '✓ Claimed' : 'Open'}
                        </Badge>
                        {isSplitShift && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Layers className="h-3 w-3" />
                            Block {blockNumber} of {shift.total_blocks}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                        <span className="ml-1 text-xs">
                          ({formatHours(shift.start_time, shift.end_time)})
                        </span>
                      </p>

                      {isSplitShift && (
                        <p className="text-xs text-muted-foreground">
                          Original shift split into {shift.total_blocks}×4h blocks — claim one or both
                        </p>
                      )}

                      <p className="text-sm flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        Covering for: {getName(shift.original_agent_id)}
                      </p>

                      {(shift.required_skills ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {shift.required_skills.map((s: string) => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      )}

                      {shift.claimed_by && (
                        <p className="text-sm text-green-600">Claimed by: {getName(shift.claimed_by)}</p>
                      )}

                      {shift.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{shift.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {role === 'agent' && shift.status === 'open' && (
                        claimError ? (
                          <Button variant="outline" size="sm" disabled title={claimError}>
                            <AlertTriangle className="h-3.5 w-3.5 mr-1 text-yellow-600" />
                            {claimError.startsWith('You already') ? 'Overlaps' : '12h limit'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => claimMutation.mutate(shift.id)}
                            disabled={claimMutation.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Claim Shift
                          </Button>
                        )
                      )}

                      {role === 'supervisor' && shift.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAssignDialog({ open: true, shiftId: shift.id })}
                        >
                          Assign to Agent
                        </Button>
                      )}

                      {role === 'supervisor' && shift.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmCancelId(shift.id)}
                        >
                          Cancel Shift
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog
        open={!!confirmCancelId}
        onOpenChange={open => { if (!open) setConfirmCancelId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this open shift?</AlertDialogTitle>
            <AlertDialogDescription>
              Agents who have arranged their schedules around this shift will be affected.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmCancelId && cancelMutation.mutate(confirmCancelId)}
            >
              Cancel Shift
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={assignDialog.open}
        onOpenChange={open => { if (!open) { setAssignDialog({ open: false, shiftId: null }); setSelectedAgentId(''); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign shift to an agent</AlertDialogTitle>
            <AlertDialogDescription>
              Select an agent to directly assign this open shift to. They'll be notified and it'll be added to their schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger>
              <SelectContent>
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAgentId('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedAgentId || assignMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (assignDialog.shiftId && selectedAgentId) {
                  assignMutation.mutate({ shiftId: assignDialog.shiftId, agentId: selectedAgentId });
                }
              }}
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
