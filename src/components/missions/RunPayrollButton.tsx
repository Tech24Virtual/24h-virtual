import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, DollarSign } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface RunPayrollButtonProps {
  onSuccess?: () => void;
}

export function RunPayrollButton({ onSuccess }: RunPayrollButtonProps = {}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const today = new Date();
  const [periodStart, setPeriodStart] = useState(format(subDays(today, 15), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(today, 'yyyy-MM-dd'));

  const handleRun = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-payroll', {
        body: {
          period_start: periodStart,
          period_end: periodEnd,
          initiated_by: user?.id || 'manual',
        },
      });

      if (error) throw error;

      if (data?.status === 'blocked') {
        toast({ title: 'Agent Blocked', description: 'PayrollAgent is disabled. Enable it in Mission Control.', variant: 'destructive' });
      } else {
        toast({
          title: 'Payroll Run Complete',
          description: `${data?.agents_processed || 0} agents processed. Total: $${data?.total_payroll?.toFixed(2) || '0.00'} (${data?.mode} mode).`,
        });
        onSuccess?.();
      }
      setOpen(false);
    } catch (err) {
      toast({ title: 'Payroll run failed', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <DollarSign className="w-4 h-4" />
        Run Payroll
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will run the PayrollAgent to compute pay for all agents with approved shifts in the selected period.
              The agent will use its current mode (simulation, sandbox, or live).
            </p>
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
              Run Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
