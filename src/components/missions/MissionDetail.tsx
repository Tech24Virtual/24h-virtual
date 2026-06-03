import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface MissionDetailProps {
  missionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MissionDetail({ missionId, open, onOpenChange }: MissionDetailProps) {
  const { data: mission } = useQuery({
    queryKey: ['mission', missionId],
    queryFn: async () => {
      if (!missionId) return null;
      const { data } = await supabase.from('missions').select('*').eq('id', missionId).single();
      return data;
    },
    enabled: !!missionId,
  });

  const { data: runs } = useQuery({
    queryKey: ['agent-runs', missionId],
    queryFn: async () => {
      if (!missionId) return [];
      const { data } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('mission_id', missionId)
        .order('created_at');
      return data || [];
    },
    enabled: !!missionId,
  });

  const { data: events } = useQuery({
    queryKey: ['mission-events', missionId],
    queryFn: async () => {
      if (!missionId) return [];
      const { data } = await supabase
        .from('mission_control_events')
        .select('*')
        .eq('mission_id', missionId)
        .order('created_at');
      return data || [];
    },
    enabled: !!missionId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Mission Detail
            {mission && (
              <Badge variant="outline" className="capitalize">
                {mission.mission_type === 'call_billing' ? 'Billing' : 'Payroll'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {mission && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>{' '}
                <Badge>{mission.status}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Started:</span>{' '}
                {format(new Date(mission.created_at), 'MMM d, h:mm:ss a')}
              </div>
              <div>
                <span className="text-muted-foreground">Period:</span>{' '}
                {mission.period_start && format(new Date(mission.period_start), 'MMM d')} to{' '}
                {mission.period_end && format(new Date(mission.period_end), 'MMM d')}
              </div>
              <div>
                <span className="text-muted-foreground">Completed:</span>{' '}
                {mission.completed_at ? format(new Date(mission.completed_at), 'MMM d, h:mm:ss a') : 'In progress'}
              </div>
            </div>
            <p className="text-sm bg-muted p-3 rounded">{mission.summary}</p>

            <Tabs defaultValue="timeline">
              <TabsList>
                <TabsTrigger value="timeline">Timeline ({events?.length || 0})</TabsTrigger>
                <TabsTrigger value="steps">Steps ({runs?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-3 space-y-2">
                {events?.map((evt: any) => (
                  <div key={evt.id} className="flex gap-3 text-sm border-l-2 border-muted pl-3 py-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(evt.created_at), 'h:mm:ss a')}
                    </span>
                    <div>
                      <Badge variant="outline" className="text-xs mr-2">{evt.event_type}</Badge>
                      {evt.message}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="steps" className="mt-3 space-y-2">
                {runs?.map((run: any) => (
                  <div key={run.id} className="flex items-start gap-2 text-sm p-2 rounded border">
                    {run.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{run.step_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(run.created_at), 'h:mm:ss a')}
                        </span>
                      </div>
                      {run.error_message && (
                        <p className="text-destructive text-xs mt-1">{run.error_message}</p>
                      )}
                      {run.output_snapshot && (
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                          {JSON.stringify(run.output_snapshot, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
