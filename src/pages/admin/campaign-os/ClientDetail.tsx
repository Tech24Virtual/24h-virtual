import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useClientsList } from '@/hooks/campaign-os/useClientsList';
import { useClientLocations, useCreateLocation } from '@/hooks/campaign-os/useClientLocations';
import { useCallFlows, useCreateCallFlow } from '@/hooks/campaign-os/useCallFlows';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, MapPin, PhoneCall, Plus, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { RoutingEntryType } from '@/lib/campaign-os/types';

export default function ClientDetail() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const [params] = useSearchParams();
  const kind = (params.get('kind') as 'direct_24h' | 'wl_client') ?? 'direct_24h';

  const { data: clients = [] } = useClientsList();
  const client = useMemo(() => clients.find((c) => c.id === clientId && c.kind === kind), [clients, clientId, kind]);

  const isDirect = kind === 'direct_24h';
  const filterArgs = isDirect ? { clientLeadId: clientId } : { wlClientId: clientId };

  const { data: locations = [], isLoading: loadingLocations, isError: errorLocations } = useClientLocations(filterArgs);
  const { data: clientCallFlows = [], isLoading: loadingFlows, isError: errorFlows } = useCallFlows({ ...filterArgs, ownerKind: 'client' });

  const [locOpen, setLocOpen] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);
  const [locName, setLocName] = useState('');
  const [flowName, setFlowName] = useState('');
  const [flowRouting, setFlowRouting] = useState<RoutingEntryType>('direct');

  const createLocation = useCreateLocation();
  const createFlow = useCreateCallFlow();

  const tenantPayload = isDirect
    ? { client_lead_id: clientId }
    : { wl_client_id: clientId, wl_partner_id: client?.partner_id ?? null };

  async function handleCreateLocation() {
    if (!locName.trim()) return;
    try {
      await createLocation.mutateAsync({ ...tenantPayload, name: locName.trim() });
      toast.success('Location added.');
      setLocOpen(false);
      setLocName('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add location');
    }
  }

  async function handleCreateClientFlow() {
    if (!flowName.trim()) return;
    try {
      const r = await createFlow.mutateAsync({
        ...tenantPayload,
        display_name: flowName.trim(),
        routing_entry_type: flowRouting,
      });
      toast.success('Call flow created. Campaign auto-created.');
      setFlowOpen(false);
      setFlowName('');
      setFlowRouting('direct');
      void r;
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to create call flow');
    }
  }

  if (!client) {
    return (
      <div className="text-sm text-muted-foreground">
        <Link to="/admin/campaign-os/clients" className="text-primary hover:underline">← Back to clients</Link>
        <p className="mt-4">Client not found or not accessible.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/admin/campaign-os/clients" className="text-xs text-muted-foreground hover:text-foreground">← Clients</Link>
          <h2 className="text-xl font-semibold mt-1 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            {client.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage this client's locations and call flows. A call flow can live directly under the client or under a location.
          </p>
        </div>
        <Badge variant={isDirect ? 'outline' : 'secondary'}>{isDirect ? 'Direct' : 'White-label'}</Badge>
      </div>

      {/* Locations */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Locations
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Use locations for branches, offices, or franchise sites. Optional — a client can operate without locations.
            </p>
          </div>
          <Dialog open={locOpen} onOpenChange={setLocOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add location</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add location</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="Hamilton branch" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLocOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateLocation} disabled={createLocation.isPending}>
                  {createLocation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingLocations ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
            </div>
          ) : errorLocations ? (
            <div className="flex items-center gap-2 text-sm text-destructive py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Failed to load locations
            </div>
          ) : locations.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No locations yet.</div>
          ) : (
            <div className="grid gap-2">
              {locations.map((l) => (
                <Link key={l.id} to={`/admin/campaign-os/clients/${clientId}/locations/${l.id}?kind=${kind}`}>
                  <div className="flex items-center justify-between border rounded-md px-3 py-2 hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{l.name}</span>
                      <Badge variant="outline" className="text-xs">{l.status}</Badge>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client-level call flows */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="h-4 w-4" /> Call flows (client-level)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Call flows that live directly under this client (e.g. main line, sales, billing). A campaign is created automatically for each call flow.
            </p>
          </div>
          <Dialog open={flowOpen} onOpenChange={setFlowOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add call flow</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add call flow</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="Main line" />
                </div>
                <div>
                  <Label>Routing entry</Label>
                  <Select value={flowRouting} onValueChange={(v) => setFlowRouting(v as RoutingEntryType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct number</SelectItem>
                      <SelectItem value="ivr">IVR-routed</SelectItem>
                      <SelectItem value="both">Both (direct + IVR)</SelectItem>
                      <SelectItem value="logical">Logical (no number)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFlowOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateClientFlow} disabled={createFlow.isPending}>
                  {createFlow.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingFlows ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
            </div>
          ) : errorFlows ? (
            <div className="flex items-center gap-2 text-sm text-destructive py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Failed to load call flows
            </div>
          ) : clientCallFlows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              No client-level call flows yet. Add one (e.g. "Main line", "Sales", "Switchboard") or create one under a location.
            </div>
          ) : (
            <div className="grid gap-2">
              {clientCallFlows.map((f) => (
                <Link key={f.id} to={`/admin/campaign-os/call-flows/${f.id}`}>
                  <div className="flex items-center justify-between border rounded-md px-3 py-2 hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-2 text-sm">
                      <PhoneCall className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{f.display_name ?? f.department_name}</span>
                      <Badge variant="outline" className="text-xs">{f.routing_entry_type}</Badge>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
