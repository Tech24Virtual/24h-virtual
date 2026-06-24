import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  role: 'agent' | 'supervisor';
}

export function OpenShiftBoard({ role }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['open-shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('open_shifts')
        .select('*')
        .order('shift_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: agentSkills = [] } = useQuery({
    queryKey: ['agent-skills', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('agent_skills').select('skill_name').eq('agent_id', user!.id);
      return (data || []).map(s => s.skill_name);
    },
    enabled: role === 'agent' && !!user?.id,
  });

  const { data: mySchedules = [] } = useQuery({
    queryKey: ['agent-schedules', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('agent_schedules').select('shift_date, start_time, end_time').eq('agent_id', user!.id).eq('status', 'scheduled');
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

  const claimMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) throw new Error('Shift not found');
      // Create schedule entry for claimer
      const { error: schedError } = await supabase.from('agent_schedules').insert({
        agent_id: user!.id,
        created_by: user!.id,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        notes: `Coverage for open shift`,
      });
      if (schedError) throw schedError;
      const { error } = await supabase.from('open_shifts').update({ claimed_by: user!.id, claimed_at: new Date().toISOString(), status: 'claimed' }).eq('id', shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['agent-schedules'] });
      toast({ title: 'Shift claimed!', description: 'Added to your schedule.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to claim shift.', variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('open_shifts').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] });
      toast({ title: 'Shift cancelled' });
    },
  });

  const hasOverlap = (shiftDate: string, start: string, end: string) => {
    return mySchedules.some(s => s.shift_date === shiftDate && s.start_time < end && s.end_time > start);
  };

  const getName = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Unknown';

  const displayed = role === 'agent'
    ? shifts.filter(s => s.status === 'open' && ((s.required_skills ?? []).length === 0 || (s.required_skills ?? []).some((sk: string) => agentSkills.includes(sk))))
    : shifts.filter(s => s.status !== 'cancelled');

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading...</p>;

  return (
    <>
    <div className="space-y-3">
      {displayed.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No open shifts</CardContent></Card>
      ) : (
        displayed.map(shift => {
          const overlap = role === 'agent' && hasOverlap(shift.shift_date, shift.start_time, shift.end_time);
          return (
            <Card key={shift.id} className={shift.status === 'claimed' ? 'border-green-200 dark:border-green-800' : ''}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{format(new Date(shift.shift_date), 'EEE, MMM d')}</h3>
                      <Badge variant={shift.status === 'claimed' ? 'default' : 'secondary'}>
                        {shift.status === 'claimed' ? '✓ Claimed' : 'Open'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                    </p>
                    <p className="text-sm flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> Covering for: {getName(shift.original_agent_id)}
                    </p>
                    {shift.required_skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {shift.required_skills.map((s: string) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                      </div>
                    )}
                    {shift.claimed_by && <p className="text-sm text-green-600">Claimed by: {getName(shift.claimed_by)}</p>}
                    {shift.notes && <p className="text-xs text-muted-foreground mt-1">{shift.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    {role === 'agent' && shift.status === 'open' && (
                      overlap ? (
                        <Button variant="outline" size="sm" disabled>
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Overlaps
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => claimMutation.mutate(shift.id)} disabled={claimMutation.isPending}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Claim Shift
                        </Button>
                      )
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
            Agents who have arranged their schedules around this shift will be affected. This cannot be undone.
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
    </>
  );
}
