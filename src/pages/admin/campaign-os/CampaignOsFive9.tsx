import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDepartments } from '@/hooks/campaign-os/useDepartments';
import { useFive9NativeVariables } from '@/hooks/campaign-os/useFive9NativeVariables';
import {
  useFive9Campaigns,
  useCampaignMapping,
  useSaveCampaignMapping,
  useVariableCoverage,
  useVerifyMapping,
} from '@/hooks/campaign-os/useFive9CampaignMapping';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Five9DriftPanel } from '@/components/campaign-os/five9/Five9DriftPanel';
import { CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const REQUIRED_VARIABLE_COUNT = 8;

export default function CampaignOsFive9() {
  const { data: departments = [] } = useDepartments();
  const {
    data: nativeVars = [],
    isLoading: nativeVarsLoading,
    isError: nativeVarsError,
  } = useFive9NativeVariables();
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [selectedFive9Campaign, setSelectedFive9Campaign] = useState<string>('');
  const queryClient = useQueryClient();

  // Campaign Link tab data
  const {
    data: campaigns = [],
    isLoading: campaignsLoading,
    isError: campaignsError,
  } = useQuery({
    queryKey: ['campaign-os', 'all-campaigns-for-link'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaigns')
        .select('id, display_name, client_department_id, status')
        .neq('status', 'archived')
        .order('display_name');
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; display_name: string; client_department_id: string | null; status: string }>;
    },
  });

  const selectedCampaign = campaigns.find((c) => c.id === campaignId) ?? null;
  const selectedCampaignDeptId = selectedCampaign?.client_department_id ?? null;

  const {
    data: five9Campaigns = [],
    isLoading: five9Loading,
    isError: five9Error,
    refetch: refetchFive9,
  } = useFive9Campaigns();
  const {
    data: existingMapping,
    isLoading: mappingLoading,
    isError: mappingError,
  } = useCampaignMapping(campaignId);
  const { data: variableCoverage = 0 } = useVariableCoverage(selectedCampaignDeptId);
  const saveMapping = useSaveCampaignMapping();
  const verifyMapping = useVerifyMapping();

  // Call Flow Mappings tab
  const addMappingMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!departmentId) throw new Error('No call flow selected');

      const { data: dept, error: deptErr } = await (supabase as any)
        .from('client_departments')
        .select('client_lead_id, wl_client_id')
        .eq('id', departmentId)
        .single();

      if (deptErr || !dept) throw new Error('Could not resolve department');

      const tenantIdentity = dept.wl_client_id
        ? { wl_client_id: dept.wl_client_id, tenant_kind: 'wl_partner' }
        : { client_lead_id: dept.client_lead_id, tenant_kind: 'direct_24h' };

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

  const { data: mappings = [], isError: mappingsError } = useQuery({
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

  const handleSaveMapping = async () => {
    if (!campaignId || !selectedFive9Campaign) return;
    const campaign = five9Campaigns.find((c) => c.name === selectedFive9Campaign);
    try {
      await saveMapping.mutateAsync({
        campaignId,
        five9CampaignName: selectedFive9Campaign,
        five9CampaignType: campaign?.type ?? null,
      });
      toast.success('Five9 campaign mapping saved');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleVerify = async () => {
    if (!campaignId || !existingMapping) return;
    try {
      await verifyMapping.mutateAsync({ campaignId, mappedName: existingMapping.five9_campaign_name });
      toast.success('Verified — campaign still exists in Five9');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const coverageOk = variableCoverage >= REQUIRED_VARIABLE_COUNT;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="mappings">
        <TabsList>
          <TabsTrigger value="mappings">Call Flow Mappings</TabsTrigger>
          <TabsTrigger value="drift">Drift Check</TabsTrigger>
          <TabsTrigger value="native">Standard 12 Native</TabsTrigger>
          <TabsTrigger value="campaign-link">Campaign Link</TabsTrigger>
        </TabsList>

        {/* ── Call Flow Mappings ── */}
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
          ) : mappingsError ? (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <AlertTriangle className="h-6 w-6 text-destructive mx-auto" />
                <p className="text-sm text-destructive">Failed to load mappings for this call flow.</p>
              </CardContent>
            </Card>
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

        {/* ── Drift Check ── */}
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

        {/* ── Standard 12 Native ── */}
        <TabsContent value="native" className="space-y-2 mt-4">
          <p className="text-sm text-muted-foreground">Standard 12 Five9 native variables seeded for all tenants.</p>
          {nativeVarsLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : nativeVarsError ? (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <AlertTriangle className="h-6 w-6 text-destructive mx-auto" />
                <p className="text-sm text-destructive">Failed to load native variables.</p>
              </CardContent>
            </Card>
          ) : (
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
          )}
        </TabsContent>

        {/* ── Campaign Link ── */}
        <TabsContent value="campaign-link" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Link a Campaign to Five9</CardTitle>
              <CardDescription>
                Select a campaign and map it to a live Five9 campaign. This satisfies the Five9 gate in the go-live checklist.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Campaign selector */}
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap w-28 shrink-0">Campaign</Label>
                {campaignsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : campaignsError ? (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Failed to load campaigns
                  </div>
                ) : (
                  <Select
                    value={campaignId ?? ''}
                    onValueChange={(v) => {
                      setCampaignId(v || null);
                      setSelectedFive9Campaign('');
                    }}
                  >
                    <SelectTrigger className="w-[320px]"><SelectValue placeholder="Select a campaign" /></SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {campaignId && (
                <>
                  {/* Variable coverage status */}
                  <div className="flex items-center gap-3">
                    <Label className="whitespace-nowrap w-28 shrink-0">Variable coverage</Label>
                    <div className="flex items-center gap-2">
                      {coverageOk
                        ? <CheckCircle2 className="h-4 w-4 text-status-success" />
                        : <XCircle className="h-4 w-4 text-status-warning" />}
                      <span className="text-sm">
                        {variableCoverage} active mapping{variableCoverage !== 1 ? 's' : ''}
                        {' '}({coverageOk ? `≥${REQUIRED_VARIABLE_COUNT} required — ✓` : `${REQUIRED_VARIABLE_COUNT} required — configure in Call Flow Mappings`})
                      </span>
                    </div>
                  </div>

                  {/* Current mapping display */}
                  {mappingLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Checking existing mapping…
                    </div>
                  ) : mappingError ? (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" /> Failed to load existing mapping
                    </div>
                  ) : existingMapping ? (
                    <div className="rounded-md border p-3 bg-status-success-bg/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-status-success" />
                          <span className="text-sm font-medium">Mapped to: {existingMapping.five9_campaign_name}</span>
                          {existingMapping.five9_campaign_type && (
                            <Badge variant="outline" className="text-xs">{existingMapping.five9_campaign_type}</Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleVerify}
                          disabled={verifyMapping.isPending}
                        >
                          {verifyMapping.isPending
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Verifying…</>
                            : <><RefreshCw className="h-3.5 w-3.5 mr-1" />Verify</>}
                        </Button>
                      </div>
                      {existingMapping.verified_at && (
                        <p className="text-xs text-muted-foreground pl-6">
                          Verified {format(new Date(existingMapping.verified_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-3 bg-status-warning-bg/20">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-status-warning" />
                        <span className="text-sm text-muted-foreground">No Five9 campaign linked yet</span>
                      </div>
                    </div>
                  )}

                  {/* Five9 campaign selector */}
                  <div className="flex items-center gap-3">
                    <Label className="whitespace-nowrap w-28 shrink-0">Five9 campaign</Label>
                    {five9Loading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading live campaigns…
                      </div>
                    ) : five9Error ? (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">Five9 API unavailable</span>
                        <Button size="sm" variant="outline" onClick={() => refetchFive9()} className="ml-1">
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <Select value={selectedFive9Campaign} onValueChange={setSelectedFive9Campaign}>
                          <SelectTrigger className="w-[320px]">
                            <SelectValue placeholder="Select a Five9 campaign" />
                          </SelectTrigger>
                          <SelectContent>
                            {five9Campaigns.map((c) => (
                              <SelectItem key={c.name} value={c.name}>
                                <span>{c.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{c.type}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => refetchFive9()}
                          disabled={five9Loading}
                          aria-label="Refresh Five9 campaign list"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSaveMapping}
                    disabled={!selectedFive9Campaign || saveMapping.isPending || !!five9Error}
                  >
                    {saveMapping.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save Mapping'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Info card about what five9_ok requires */}
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Go-live Five9 gate passes when:</strong>
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                <li>A Five9 campaign is linked to this campaign record</li>
                <li>The campaign's call flow has ≥{REQUIRED_VARIABLE_COUNT} active variable mappings configured</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
