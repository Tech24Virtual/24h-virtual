import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function AgentConfigPanel() {
  const queryClient = useQueryClient();

  const { data: configs, isLoading, error } = useQuery({
    queryKey: ['agent-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_configs')
        .select('*')
        .order('agent_name');
      if (error) throw error;
      return data;
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('agent_configs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] });
      toast({ title: 'Agent config updated' });
    },
    onError: (err) => {
      toast({ title: 'Failed to update config', description: String(err), variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <Card><CardContent className="p-6 text-muted-foreground">Loading agents...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Agents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Failed to load agent configs: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : !configs || configs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agent configs found.</p>
        ) : (
          configs.map((config: any) => (
          <div
            key={config.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{config.agent_name}</p>
                <Badge variant={config.enabled ? 'default' : 'secondary'}>
                  {config.enabled ? 'Active' : 'Disabled'}
                </Badge>
                {config.error_count > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {config.error_count} errors
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Mode: {config.mode} · Last run: {config.last_run_at ? format(new Date(config.last_run_at), 'MMM d, h:mm a') : 'Never'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={config.mode}
                onValueChange={(mode) => updateConfig.mutate({ id: config.id, updates: { mode } })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulation">Simulation</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
              <Switch
                checked={config.enabled}
                onCheckedChange={(enabled) => updateConfig.mutate({ id: config.id, updates: { enabled } })}
              />
            </div>
          </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
