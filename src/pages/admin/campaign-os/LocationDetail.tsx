import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useClientLocation } from '@/hooks/campaign-os/useClientLocations';
import { useCallFlows, useCreateCallFlow } from '@/hooks/campaign-os/useCallFlows';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, PhoneCall, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { RoutingEntryType } from '@/lib/campaign-os/types';

export default function LocationDetail() {
  const { clientId = '', locId = '' } = useParams<{ clientId: string; locId: string }>();
  const [params] = useSearchParams();
  const kind = (params.get('kind') as 'direct_24h' | 'wl_client') ?? 'direct_24h';
  const isDirect = kind === 'direct_24h';

  const { data: location } = useClientLocation(locId);
  const { data: flows = [], isLoading } = useCallFlows({ clientLocationId: locId, ownerKind: 'location' });
  const createFlow = useCreateCallFlow();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [routing, setRouting] = useState<RoutingEntryType>('direct');

  async function handleCreate() {
    if (!name.trim() || !location) return;
    const tenantPayload = isDirect
      ? { client_lead_id: clientId }
      : { wl_client_id: clientId, wl_partner_id: location.wl_partner_id };
    try {
      await createFlow.mutateAsync({
        ...tenantPayload,
        client_location_id: locId,
        display_name: name.trim(),
        routing_entry_type: routing,
      });
      toast.success('Call flow created. Campaign auto-created.');
      setOpen(false);
      setName('');
      setRouting('direct');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to create call flow');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/admin/campaign-os/clients/${clientId}?kind=${kind}`} className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to client
        </Link>
        <h2 className="text-xl font-semibold mt-1 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          {location?.name ?? 'Location'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage call flows for this location.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="h-4 w-4" /> Call flows at this location
            </CardTitle>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add call flow</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add call flow</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Reception line" />
                </div>
                <div>
                  <Label>Routing entry</Label>
                  <Select value={routing} onValueChange={(v) => setRouting(v as RoutingEntryType)}>
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
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createFlow.isPending}>
                  {createFlow.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : flows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No call flows at this location yet.</div>
          ) : (
            <div className="grid gap-2">
              {flows.map((f) => (
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
