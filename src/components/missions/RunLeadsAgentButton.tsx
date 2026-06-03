import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Zap } from 'lucide-react';

export function RunLeadsAgentButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-leads-agent', {
        body: { initiated_by: user?.id || 'manual' },
      });

      if (error) throw error;

      if (data?.status === 'blocked') {
        toast({ title: 'Agent Blocked', description: 'LeadsAgent is disabled. Enable it in Mission Control.', variant: 'destructive' });
      } else {
        toast({
          title: 'Leads Agent Complete',
          description: `Scored ${data?.scored || 0} leads, assigned ${data?.assigned || 0} reps (${data?.mode} mode).`,
        });
      }
      setOpen(false);
    } catch (err) {
      toast({ title: 'Leads agent failed', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Zap className="w-4 h-4" />
        Run Leads Agent
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Leads Agent</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will score unscored leads, update pipeline stages, and assign qualified leads to sales reps via round-robin.
            The agent will use its current mode (simulation, sandbox, or live).
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleRun} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Run Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
