import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, UserCheck } from 'lucide-react';

export function RunHiringAgentButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-hiring-agent', {
        body: { initiated_by: user?.id || 'manual' },
      });

      if (error) throw error;

      if (data?.status === 'blocked') {
        toast({ title: 'Agent Blocked', description: 'HiringAgent is disabled. Enable it in Mission Control.', variant: 'destructive' });
      } else {
        toast({
          title: 'Hiring Agent Complete',
          description: `Screened ${data?.screened || 0} applicants, ${data?.shortlisted || 0} shortlisted (${data?.mode} mode).`,
        });
      }
      setOpen(false);
    } catch (err) {
      toast({ title: 'Hiring agent failed', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <UserCheck className="w-4 h-4" />
        Run Hiring Agent
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Hiring Agent</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will screen new and reviewing applications, score candidates based on cover letter quality and keyword matching,
            and update statuses accordingly. The agent will use its current mode (simulation, sandbox, or live).
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
