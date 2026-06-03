import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';

export function RunIdentitySyncButton() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-fabric-identity-sync', {
        body: { initiated_by: user?.id || 'manual' },
      });

      if (error) throw error;

      if (data?.status === 'blocked') {
        toast({ title: 'Agent Blocked', description: 'FabricIdentitySyncAgent is disabled. Enable it in Mission Control.', variant: 'destructive' });
      } else {
        toast({
          title: 'Identity Sync Complete',
          description: `${data?.agents_synced || 0} agents, ${data?.clients_synced || 0} clients synced. ${data?.merged || 0} merged.`,
        });
      }
    } catch (err) {
      toast({ title: 'Identity sync failed', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleRun} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
      Sync Identities
    </Button>
  );
}
