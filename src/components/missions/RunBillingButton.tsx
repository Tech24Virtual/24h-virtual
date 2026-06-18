import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, CreditCard, CalendarClock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

function getNextScheduledRun(): string {
  const now = new Date();
  // 1st of next month at 6:00 AM UTC
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 6, 0, 0));
  return format(next, 'MMM d, yyyy') + ' at 6:00 AM UTC';
}

export function RunBillingButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastMonth = subMonths(new Date(), 1);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));

  const { data: agentConfig } = useQuery({
    queryKey: ['agent-config-call-report'],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_configs')
        .select('last_run_at, enabled')
        .eq('agent_name', 'CallReportAgent')
        .single();
      return data;
    },
  });

  const handleRun = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-call-billing', {
        body: {
          period_start: periodStart,
          period_end: periodEnd,
          initiated_by: user?.id || 'manual',
        },
      });

      if (error) throw error;

      if (data?.status === 'blocked') {
        toast({ title: 'Agent Blocked', description: 'CallReportAgent is disabled. Enable it in Mission Control.', variant: 'destructive' });
      } else {
        toast({
          title: 'Billing Run Complete',
          description: `${data?.clients_processed || 0} clients processed in ${data?.mode} mode.`,
        });
      }
      setOpen(false);
    } catch (err) {
      toast({ title: 'Billing run failed', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const nextRun = getNextScheduledRun();
  const lastRun = agentConfig?.last_run_at
    ? format(new Date(agentConfig.last_run_at), 'MMM d, h:mm a')
    : 'Never';

  return (
    <>
      <div className="flex flex-col gap-1">
        <Button onClick={() => setOpen(true)} className="gap-2">
          <CreditCard className="w-4 h-4" />
          Run Monthly Billing
        </Button>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <CalendarClock className="w-3 h-3 shrink-0" />
          <span>Auto: {nextRun}</span>
          {agentConfig?.last_run_at && (
            <Badge variant="outline" className="h-4 px-1 text-[10px] ml-1">
              Last: {lastRun}
            </Badge>
          )}
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Monthly Billing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will run the CallReportAgent to compute billing for all active clients in the selected period.
              The agent will use its current mode (simulation, sandbox, or live).
            </p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
              <span>
                Next automatic run: <span className="font-medium text-foreground">{nextRun}</span>
                {agentConfig?.last_run_at && (
                  <> · Last run: <span className="font-medium text-foreground">{lastRun}</span></>
                )}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label>Period End</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleRun} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Run Billing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
