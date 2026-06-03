import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDepartments } from '@/hooks/campaign-os/useDepartments';
import { useFive9NativeVariables } from '@/hooks/campaign-os/useFive9NativeVariables';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Five9DriftPanel } from '@/components/campaign-os/five9/Five9DriftPanel';
import { toast } from 'sonner';

export default function CampaignOsFive9() {
  const { data: departments = [] } = useDepartments();
  const { data: nativeVars = [] } = useFive9NativeVariables();
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const addMappingMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!departmentId) throw new Error('No call flow selected');

      // 1. Fetch the department to get tenant identity
      const { data: dept, error: deptErr } = await (supabase as any)
        .from('client_departments')
        .select('client_lead_id, wl_client_id')
        .eq('id', departmentId)
        .single();

      if (deptErr || !dept) throw new Error('Could not resolve department');

      const tenantIdentity = dept.wl_client_id
        ? { wl_client_id: dept.wl_client_id, tenant_kind: 'wl_partner' }
        : { client_lead_id: dept.client_lead_id, tenant_kind: 'direct_24h' };

      // 2. Insert with tenant identity included
      const { error } = await (supabase as any)
        .from('five9_variable_mappings')
        .insert({
          ...tenantIdentity,
          client_department_id: departmentId,
          five9_variable_name: name,
          data_type: 'text',
          five9_variable_kind: 'custom',
          direction: ['in'],
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: (_, name) => {
      toast.success(`"${name}" added to mappings`);
      queryClient.invalidateQueries({ queryKey: ['campaign-os', 'five9-mappings', departmentId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['campaign-os', 'five9-mappings', departmentId],
    enabled: !!departmentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('five9_variable_mappings')
        .select('*')
        .eq('client_department_id', departmentId);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="mappings">
        <TabsList>
          <TabsTrigger value="mappings">Call Flow Mappings</TabsTrigger>
          <TabsTrigger value="drift">Drift Check</TabsTrigger>
          <TabsTrigger value="native">Standard 12 Native</TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap">Call Flow</Label>
            <Select value={departmentId ?? ''} onValueChange={(v) => setDepartmentId(v || null)}>
              <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select a call flow" /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.department_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!departmentId ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a call flow to view its Five9 variable mappings.</CardContent></Card>
          ) : mappings.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No mappings configured.</CardContent></Card>
          ) : (
            <div className="grid gap-2">
              {mappings.map((m: any) => (
                <Card key={m.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{m.five9_variable_name}</p>
                      <p className="text-xs text-muted-foreground">{m.data_type} · {Array.isArray(m.direction) ? m.direction.join(', ') : m.direction}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{m.five9_variable_kind}</Badge>
                      {m.is_active ? <Badge>active</Badge> : <Badge variant="secondary">inactive</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drift" className="space-y-4 mt-4">
          {!departmentId ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a call flow above to run a drift check.</CardContent></Card>
          ) : (
            <Five9DriftPanel
              departmentId={departmentId}
              onAddToMappings={(name) => addMappingMutation.mutate(name)}
            />
          )}
        </TabsContent>

        <TabsContent value="native" className="space-y-2 mt-4">
          <p className="text-sm text-muted-foreground">Standard 12 Five9 native variables seeded for all tenants.</p>
          <div className="grid gap-2">
            {nativeVars.map((v) => (
              <Card key={v.variable_name}>
                <CardContent className="pt-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium font-mono">{v.variable_name}</p>
                    <p className="text-xs text-muted-foreground">{v.display_label} · {v.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant="outline">{v.data_type}</Badge>
                    <Badge variant="secondary">{v.direction}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
