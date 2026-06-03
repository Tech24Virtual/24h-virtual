import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Activity, Bot, Loader2, Wand2 } from 'lucide-react';
import { RecommendationsPanel } from '@/components/admin/mission-control/RecommendationsPanel';
import { AutomationHealthPanel } from '@/components/admin/mission-control/AutomationHealthPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AgentConfigPanel } from '@/components/missions/AgentConfigPanel';
import { MissionsList } from '@/components/missions/MissionsList';
import { RunBillingButton } from '@/components/missions/RunBillingButton';
import { RunPayrollButton } from '@/components/missions/RunPayrollButton';
import { RunLeadsAgentButton } from '@/components/missions/RunLeadsAgentButton';
import { RunHiringAgentButton } from '@/components/missions/RunHiringAgentButton';
import { RunIdentitySyncButton } from '@/components/missions/RunIdentitySyncButton';
import { RunLifecycleAgentButton } from '@/components/missions/RunLifecycleAgentButton';
import { ReadinessTileCard } from '@/components/admin/mission-control/ReadinessTileCard';
import { MissionEventStream } from '@/components/admin/mission-control/MissionEventStream';
import { BlastRadiusPanel } from '@/components/admin/mission-control/BlastRadiusPanel';
import { buildReadinessTiles, type DomainReadinessTile } from '@/lib/governance/missionControl';

function EmergencySimulationToggle() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_settings').select('*').limit(1).single();
      if (error) throw error;
      return data;
    },
  });
  const toggleMutation = useMutation({
    mutationFn: async (forceSimulation: boolean) => {
      const { error } = await supabase
        .from('platform_settings')
        .update({ force_simulation_mode: forceSimulation, updated_at: new Date().toISOString() })
        .eq('id', settings?.id);
      if (error) throw error;
    },
    onSuccess: (_, forceSimulation) => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({
        title: forceSimulation ? '🚨 Emergency Simulation Mode ENABLED' : 'Emergency Simulation Mode disabled',
        description: forceSimulation
          ? 'All agents are now forced into simulation mode regardless of individual settings.'
          : 'Agents will use their individual mode settings.',
        variant: forceSimulation ? 'destructive' : 'default',
      });
    },
    onError: (err) => {
      toast({ title: 'Failed to update', description: String(err), variant: 'destructive' });
    },
  });
  if (isLoading || !settings) return null;
  const isActive = settings.force_simulation_mode;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${isActive ? 'border-destructive bg-destructive/10' : 'border-border bg-card'}`}>
      <ShieldAlert className={`w-5 h-5 ${isActive ? 'text-destructive' : 'text-muted-foreground'}`} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Emergency Simulation Mode</span>
          {isActive && <Badge variant="destructive" className="text-xs">ACTIVE</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {isActive ? 'All agents forced to simulation — no external calls' : 'Override all agents to simulation mode'}
        </p>
      </div>
      <Switch checked={isActive} onCheckedChange={(checked) => toggleMutation.mutate(checked)} />
    </div>
  );
}

function CommandCenterTab() {
  const [tiles, setTiles] = useState<DomainReadinessTile[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildReadinessTiles()
      .then((d) => { if (!cancelled) setTiles(d); })
      .catch(() => { if (!cancelled) setTiles([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cross-Domain Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          {tiles === null ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {tiles.map((t) => <ReadinessTileCard key={t.domain} tile={t} />)}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MissionEventStream />
        </div>
        <div>
          <BlastRadiusPanel />
        </div>
      </div>
    </div>
  );
}

function AgentsTab() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <RunBillingButton />
        <RunPayrollButton />
        <RunLeadsAgentButton />
        <RunHiringAgentButton />
        <RunIdentitySyncButton />
        <RunLifecycleAgentButton />
      </div>
      <EmergencySimulationToggle />
      <AgentConfigPanel />
      <MissionsList />
    </div>
  );
}

export default function AdminMissionControl() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mission Control</h1>
        <p className="text-muted-foreground">SuperAdmin Command Center · cross-domain readiness, lifecycle events, and AI agent governance</p>
      </div>

      <Tabs defaultValue="command" className="w-full">
        <TabsList>
          <TabsTrigger value="command"><Activity className="h-4 w-4 mr-1" /> Command Center</TabsTrigger>
          <TabsTrigger value="automation"><Wand2 className="h-4 w-4 mr-1" /> Automation</TabsTrigger>
          <TabsTrigger value="agents"><Bot className="h-4 w-4 mr-1" /> AI Agents</TabsTrigger>
        </TabsList>
        <TabsContent value="command" className="mt-6">
          <CommandCenterTab />
        </TabsContent>
        <TabsContent value="automation" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><RecommendationsPanel /></div>
            <div><AutomationHealthPanel /></div>
          </div>
        </TabsContent>
        <TabsContent value="agents" className="mt-6">
          <AgentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
